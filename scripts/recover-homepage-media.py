"""Read-only recovery of public, attributed country photographs. Never contacts a database."""
import hashlib,json,re,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'src/assets/countries/portable';TARGET.mkdir(parents=True,exist_ok=True)
ATTR=json.loads((ROOT/'src/assets/countries/ATTRIBUTIONS.json').read_text())
REPORT={}
def read(url):
 if not url.startswith('https://'):raise ValueError('HTTPS required')
 req=urllib.request.Request(url,headers={'User-Agent':'Pasaportio-media-recovery/1.0 (public attributed images)'})
 with urllib.request.urlopen(req,timeout=12) as r:
  data=r.read(8*1024*1024+1)
  if len(data)>8*1024*1024:raise ValueError('Image size limit')
  return data

def save(iso,data,meta):
 ext='jpg' if data[:3]==b'\xff\xd8\xff' else 'png' if data[:8]==b'\x89PNG\r\n\x1a\n' else 'webp' if data[:4]==b'RIFF' and data[8:12]==b'WEBP' else None
 if not ext:raise ValueError('Not an image')
 (TARGET/(iso+'.'+ext)).write_bytes(data)
 REPORT[iso]={**meta,'file':iso+'.'+ext,'sha256':hashlib.sha256(data).hexdigest()}

for iso in ['TR','IT','FR','DE','US','AT','ES','GB','GR','CH','NL','AE']:
 if list(TARGET.glob(iso+'.*')):continue
 try:
  pointer=json.loads((ROOT/f'src/assets/countries/{iso.lower()}.webp.asset.json').read_text())
  save(iso,read('https://pasaport1.lovable.app'+pointer['url']),{'source':'original published project asset','originalAsset':pointer['asset_id']})
  print(iso,'original image recovered',flush=True);continue
 except Exception:pass
 meta=ATTR.get(iso,{})
 try:
  if not meta.get('sourceUrl','').startswith('https://www.flickr.com/'):raise ValueError('No attributed Flickr source')
  url='https://www.flickr.com/services/oembed/?format=json&url='+urllib.parse.quote(meta['sourceUrl'],safe='')
  info=json.loads(read(url));thumb=info['thumbnail_url']
  if not urllib.parse.urlparse(thumb).hostname.endswith('staticflickr.com'):raise ValueError('Unexpected image host')
  save(iso,read(thumb),meta);print(iso,'attributed original source recovered',flush=True);continue
 except Exception:pass
 try:
  query=urllib.parse.urlencode({'action':'query','format':'json','generator':'search','gsrsearch':('Istanbul Bosphorus skyline' if iso=='TR' else meta.get('country',iso)+' landmark'),'gsrnamespace':6,'gsrlimit':8,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':960})
  info=json.loads(read('https://commons.wikimedia.org/w/api.php?'+query))
  for page in info.get('query',{}).get('pages',{}).values():
   image=page.get('imageinfo',[{}])[0];m=image.get('extmetadata',{});license=m.get('LicenseShortName',{}).get('value','')
   if not re.match(r'^(CC BY|CC0|Public domain)',license):continue
   url=image.get('thumburl',image.get('url',''))
   if urllib.parse.urlparse(url).hostname!='upload.wikimedia.org':continue
   save(iso,read(url),{'title':page['title'],'creator':m.get('Artist',{}).get('value',''),'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'sourceUrl':image.get('descriptionurl',''),'replacement':True})
   print(iso,'documented licensed replacement recovered',flush=True);break
  else:raise ValueError('No portable photograph')
 except Exception:print(iso,'E_MEDIA_UNAVAILABLE',flush=True)
(TARGET/'RECOVERY.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2))
print('Portable image files:',len(list(TARGET.glob('*.jpg')))+len(list(TARGET.glob('*.webp')))+len(list(TARGET.glob('*.png'))),flush=True)
