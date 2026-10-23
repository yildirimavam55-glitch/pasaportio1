"""Destructive only in the disposable runner database; no existing database URL accepted."""
import subprocess,json,os,urllib.request,urllib.error,time,hmac,hashlib,base64,concurrent.futures,sys
from pathlib import Path
assert os.environ.get('BUILDER_ISOLATED_TEST')=='1', 'isolated opt-in required'
assert os.environ.get('PGHOST')=='127.0.0.1' and os.environ.get('PGDATABASE')=='builder_isolated' and os.environ.get('PGPORT')=='5432','unexpected database target'
checks=0
def diagnostic(typ,value,traceback):
 Path('artifacts/builder-preview').mkdir(parents=True,exist_ok=True)
 Path('artifacts/builder-preview/postgres-error.json').write_text(json.dumps({'checksCompleted':checks,'errorType':typ.__name__,'message':str(value)[:500]},indent=2))
 sys.__excepthook__(typ,value,traceback)
sys.excepthook=diagnostic

def sql(query,ok=True):
 r=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,timeout=30)
 if ok and r.returncode: raise RuntimeError('ISOLATED_SQL_FAILURE '+r.stderr[:400])
 return r.stdout.strip() if ok else r

def check(condition,label):
 global checks
 assert condition,label
 checks+=1

def role_query(role,subject,query,ok=True):
 return sql(f"SET ROLE {role};SET request.jwt.claim.sub='{subject}';"+query,ok)

sql(Path('scripts/fixtures/builder-test-schema.sql').read_text())
check('PRIVATE_DRAFT' in role_query('anon','','SELECT data FROM public.cms_documents;'),'fixture reproduces confirmed draft exposure')
for f in ['v2_publication_boundary_proposal.sql','v2_builder_atomicity_proposal.sql','unified_builder_storage.sql']:
 data=(Path('docs/migration/pending')/f).read_text();check(data.count('\nROLLBACK;')==1,'review script remains rollback by default')
 sql(data.replace('\nROLLBACK;','\nCOMMIT;'))
admin='10000000-0000-4000-8000-000000000001';customers=['10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003']
for role,subject in [('anon','')]+[('authenticated',s) for s in customers]:
 for query in ['SELECT data FROM public.cms_documents;','SELECT draft FROM public.theme_settings;','SELECT snapshot FROM public.cms_versions;']:
  check(role_query(role,subject,query,False).returncode!=0,'raw drafts/history denied')
 check('PRIVATE_' not in role_query(role,subject,'SELECT public_data FROM public.cms_documents;'),'projection contains no private drafts')
 check(role_query(role,subject,"SELECT public.builder_read('storefront_v2_esim');",False).returncode!=0,'admin read denied')
 check(role_query(role,subject,"SELECT public.builder_write('storefront_v2_esim',0,'draft','{}');",False).returncode!=0,'admin write denied')
check('PRIVATE_DRAFT' in role_query('authenticated',admin,"SELECT public.builder_read('storefront_v2_esim');"),'admin editor read works')
check(sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('public','pasaport_cms_private') AND p.proname IN ('builder_read','builder_write') AND a.grantee=0 AND a.privilege_type='EXECUTE';")=='0','no PUBLIC execute grants on new RPC boundaries')
def read(key='storefront_v2_esim'):return json.loads(role_query('authenticated',admin,f"SELECT public.builder_read('{key}');"))
def write(key,rev,action,cfg=None,version=None):
 args=["'"+key+"'",str(rev) if rev is not None else 'NULL',"'"+action+"'","'"+json.dumps(cfg).replace("'","''")+"'::jsonb" if cfg is not None else 'NULL',"'"+version+"'::uuid" if version else 'NULL']
 return role_query('authenticated',admin,'SELECT public.builder_write('+','.join(args)+');')
old=read();write('storefront_v2_esim',old['revision'],'draft',{'page':'esim','sections':[],'title':'NEXT_DRAFT'})
row=read();check(row['published']['title']=='PUBLIC','draft save leaves published unchanged');check(row['draft']['title']=='NEXT_DRAFT','persist/reload draft');check(row['revision']==old['revision']+1,'revision advances')
check(role_query('authenticated',admin,"SELECT public.builder_write('storefront_v2_esim',0,'draft','{\"page\":\"esim\",\"sections\":[]}');",False).returncode!=0,'stale writer rejected')
write('storefront_v2_esim',row['revision'],'publish',row['draft']);published=read();check(published['published']['title']=='NEXT_DRAFT','explicit publish')
version=published['versions'][-1]['id'];write('storefront_v2_esim',published['revision'],'restore',version=version);restored=read();check(restored['published']==published['published'] and restored['publishedAt']==published['publishedAt'],'restore never publishes');check(restored['draft']['title']=='NEXT_DRAFT','restore persists draft')
# Atomic failure injection: history and audit errors must roll back the document too.
for table in ['cms_versions','synthetic_audit']:
 sql(f"CREATE FUNCTION public.fail_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure';END;$$;CREATE TRIGGER fail_test BEFORE INSERT ON public.{table} FOR EACH ROW EXECUTE FUNCTION public.fail_test();")
 before=read();check(role_query('authenticated',admin,f"SELECT public.builder_write('storefront_v2_esim',{before['revision']},'draft','{{\"page\":\"esim\",\"sections\":[],\"title\":\"ROLLBACK\"}}');",False).returncode!=0,'write fails on dependent insert')
 check(read()==before,'full atomic rollback');sql(f'DROP TRIGGER fail_test ON public.{table};DROP FUNCTION public.fail_test();')
# Truly concurrent sessions with the same expected revision: exactly one winner.
revision=read()['revision']
def race(n):return role_query('authenticated',admin,f"SELECT public.builder_write('storefront_v2_esim',{revision},'draft','{{\"page\":\"esim\",\"sections\":[],\"race\":{n}}}');",False).returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(race,[1,2]))
check(sum(code==0 for code in results)==1,'two concurrent admins one winner')
for key,cfg in [('storefront_global',{'navigation':[]}),('storefront_theme',{'headingFont':'Manrope'})]:
 row=read(key);write(key,row['revision'],'draft',cfg);check(read(key)['draft']==cfg,'global/theme persisted');write(key,read(key)['revision'],'publish',cfg);check(read(key)['published']==cfg,'global/theme explicit publication')
check('PRIVATE_' not in role_query('anon','','SELECT public_data FROM public.cms_documents;'),'final public isolation')
# PostgREST: real HTTP/JWT role transitions, synthetic subjects only. Not Supabase Auth/GoTrue.
sql("NOTIFY pgrst,'reload schema';")
secret=b'isolated-builder-jwt-fixture-32-bytes-minimum'
def token(subject):
 enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=')
 msg=enc({'alg':'HS256','typ':'JWT'})+b'.'+enc({'role':'authenticated','sub':subject,'exp':int(time.time())+600});return (msg+b'.'+base64.urlsafe_b64encode(hmac.new(secret,msg,hashlib.sha256).digest()).rstrip(b'=')).decode()
def http(path,subject=None,payload=None):
 headers={'Content-Type':'application/json'}
 if subject:headers['Authorization']='Bearer '+token(subject)
 req=urllib.request.Request('http://127.0.0.1:3001/'+path,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=5) as res:return res.status,res.read().decode()
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
for attempt in range(20):
 try:
  status,_=http('cms_documents?select=public_data')
  if status==200:break
  time.sleep(1)
 except (urllib.error.URLError,ConnectionError):time.sleep(1)
else:raise RuntimeError('ISOLATED_POSTGREST_UNAVAILABLE')
check(status==200,'anonymous PostgREST public projection')
# A projection can be cached before the newly created RPCs. Wait only for that explicit cache miss.
for attempt in range(20):
 rpc_status,rpc_body=http('rpc/builder_read',admin,{'_key':'storefront_v2_esim'})
 if rpc_status==200:break
 try:rpc_code=json.loads(rpc_body).get('code','UNKNOWN')
 except ValueError:rpc_code='INVALID_RESPONSE'
 if rpc_code not in ['PGRST202','PGRST200']:raise RuntimeError(f'ISOLATED_RPC_FAILURE status={rpc_status} code={rpc_code}')
 time.sleep(1)
check(rpc_status==200,'PostgREST RPC schema cache ready')

for subject in [None]+customers:
 for path in ['cms_documents?select=data','theme_settings?select=draft','cms_versions?select=snapshot']:
  check(http(path,subject)[0]>=400,'PostgREST raw draft/history denied')
 check(http('rpc/builder_read',subject,{'_key':'storefront_v2_esim'})[0] in [401,403],'PostgREST nonadmin RPC denied (not a missing RPC)')
check(http('rpc/builder_read',admin,{'_key':'storefront_v2_esim'})[0]==200,'PostgREST admin read')
state=json.loads(http('rpc/builder_read',admin,{'_key':'storefront_v2_esim'})[1])
status,_=http('rpc/builder_write',admin,{'_key':'storefront_v2_esim','_expected_revision':state['revision'],'_action':'draft','_config':{'page':'esim','sections':[],'title':'HTTP_DRAFT'}})
check(status==200,'real HTTP draft write')
next_state=json.loads(http('rpc/builder_read',admin,{'_key':'storefront_v2_esim'})[1]);check(next_state['draft']['title']=='HTTP_DRAFT' and next_state['published']==state['published'],'HTTP reload and published isolation')
check(http('rpc/builder_write',admin,{'_key':'storefront_v2_esim','_expected_revision':state['revision'],'_action':'draft','_config':{'page':'esim','sections':[]}})[0]==409,'HTTP stale revision rejected without transaction retry')
# Registered cards persist as editorial JSON; hidden items, media and manual translations survive.
cards={'page':'esim','version':1,'sections':[{'id':'security-check','type':'INFO_GRID','variant':'security','schemaVersion':1,'items':[{'id':'card-'+str(i),'visible':i!=0,'icon':['ShieldCheck','Zap','Smartphone'][i],'title':{'tr':'Bilgi','de':'Manuell'},'mediaId':'synthetic-media','cardDesign':{'mobile':{'iconSize':22},'desktop':{'iconSize':46}}} for i in [0,2,1]]}]}
cards['sections'].append({'id':'free-test','type':'EDITORIAL_SECTION','schemaVersion':1,'editorialLayout':{'mobile':{'layout':'image-top'},'desktop':{'layout':'image-left'}},'items':[{'id':'free-group','elementType':'GRID','elements':[{'id':'free-child','elementType':'IMAGE','mediaId':'synthetic-media','title':{'tr':'Bilgi','de':'Manuell'}}]}]})
state=read();write('storefront_v2_esim',state['revision'],'draft',cards)
check(read()['draft']==cards,'registered cards JSON roundtrip includes hidden items/media/manual text')
version=sql("SELECT id FROM public.cms_versions WHERE document_id=(SELECT id FROM public.cms_documents WHERE key='storefront_v2_esim') ORDER BY created_at DESC LIMIT 1;")
check(bool(version),'registered cards version recorded')
write('storefront_v2_esim',read()['revision'],'draft',{'page':'esim','sections':[]})
write('storefront_v2_esim',read()['revision'],'restore',version=version)
check(read()['draft']==cards,'registered cards history restores exact original payload')
check(read()['published']==state['published'],'card restore leaves publication unchanged')
Path('artifacts/builder-preview').mkdir(parents=True,exist_ok=True)
Path('artifacts/builder-preview/postgres-result.json').write_text(json.dumps({'result':'PASS','checks':checks,'syntheticOnly':True,'managedSupabaseAuthTested':False},indent=2))
print(f'PASS: {checks} isolated PostgreSQL/PostgREST checks; no existing databases accessed')
