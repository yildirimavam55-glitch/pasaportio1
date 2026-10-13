import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Apple, ArrowLeft, Check, Lightbulb, Link2, Pause, Play, Plus, Signal, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerEsimActivation, getCustomerEsimDetail } from '@/lib/customer-account.functions';
import { isHistoryEsim } from '@/domain/esim/customer-esim';
import { EsimInstallGuide, DevicePicker } from '@/components/account/EsimInstallGuide';
import { V2Shell } from './V2Shell';
import { DecorativeQr, InstallationPhone, InstallationSuccess, StepNavigation, TapIndicator } from './InstallationExperience';
import { CENTRAL_GUIDE_COPY, METHOD_SCENES, detectedGuidePlatform, providerInstallValue, type GuidePlatform, type GuideMethod, type GuideScene } from './central-installation-content';

import { scheduleInstallationAdvance } from './installation-autoplay';

function PhoneRow({label,right,active=false}:{label:string;right?:ReactNode;active?:boolean}) {
 return <div className={`installation-row ${active?'bg-primary-soft text-primary':'text-foreground'}`}><span>{label}</span>{right}</div>;
}
function Toggle(){return <span className="inline-flex h-4 w-8 shrink-0 items-center justify-end rounded-full bg-primary px-0.5"><span className="size-3 rounded-full bg-card"/></span>;}
function GuidePhone({platform,scene}:{platform:GuidePlatform;scene:GuideScene}) {
 const {locale}=useI18n(); const c=CENTRAL_GUIDE_COPY[locale];
 const title=scene==='settings'?c.settings:scene==='manual'?c.manual:scene==='address'?c.address:scene==='code'?c.code:scene==='confirmation'?c.confirmation:scene==='roaming'?c.roaming:scene==='apn'?c.apn:scene==='line'?c.mobile:scene==='scan'?c.scan:scene==='link'?c.link:c.add;
 return <InstallationPhone android={platform==='android'} phase={`${platform}-${scene}`}><div className="installation-stack"><p className="font-bold">{title}</p>
  {scene==='scan'?<><DecorativeQr/><span className="installation-scanline bg-primary"/></>:scene==='confirm'?<InstallationSuccess label={c.confirm}/>:<>
   {scene==='settings'&&<PhoneRow label={platform==='ios'?c.cellular:c.sims} active right={<Signal className="size-4"/>}/>}
   {(scene==='add'||scene==='manual')&&<PhoneRow label={scene==='manual'?c.manual:c.add} active right={<Plus className="size-4"/>}/>}
   {scene==='link'&&<><Link2 className="size-8 text-primary"/><div className="installation-action bg-secondary text-muted-foreground">{c.soon}</div></>}
   {['address','code','confirmation','apn'].includes(scene)&&<PhoneRow label={title} active right={<span>••••••</span>}/>}
   {scene==='line'&&<><PhoneRow label={c.line} right={<Check className="size-4"/>} active/><PhoneRow label={c.mobile} right={<Toggle/>}/></>}
   {scene==='roaming'&&<><PhoneRow label={c.line}/><PhoneRow label={c.roaming} right={<Toggle/>} active/></>}
   {scene!=='link'&&<div className="relative h-8 w-full"><TapIndicator className="end-3 bottom-0"/></div>}
  </>}
 </div></InstallationPhone>;
}

/** One walkthrough for every entry point. Phone scenes never receive real credentials. */
export function CentralInstallationWalkthrough({initialPlatform,initialMethod='qr',esimId,preview=false}:{initialPlatform?:GuidePlatform|undefined;initialMethod?:GuideMethod|undefined;esimId?:string|undefined;preview?:boolean}) {
 const {locale}=useI18n(); const c=CENTRAL_GUIDE_COPY[locale];
 const [platform,setPlatform]=useState<GuidePlatform|undefined>(initialPlatform);
 const [method,setMethod]=useState<GuideMethod>(initialMethod);
 const [step,setStep]=useState(0);
 const [afterStep,setAfterStep]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(false);
 const [visible,setVisible]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{
  if(!preview)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReducedMotion(media.matches);update();media.addEventListener('change',update);
  const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),{threshold:0.15});
  if(root.current)observer.observe(root.current);
  return()=>{observer.disconnect();media.removeEventListener('change',update);};
 },[preview]);
 useEffect(()=>{
  if(!preview||!platform||paused||!visible||reducedMotion)return;
  return scheduleInstallationAdvance(()=>setStep(current=>(current+1)%METHOD_SCENES[method].length));
 },[preview,platform,paused,visible,reducedMotion,method,step]);
 const [ownerId,setOwnerId]=useState<string|null>(null);
 const signedIn=Boolean(ownerId);
 const realId=esimId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(esimId)?esimId:null;
 useEffect(()=>{if(initialPlatform){setPlatform(initialPlatform);return;} const detected=detectedGuidePlatform({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints});if(detected)setPlatform(detected);},[initialPlatform]);
 useEffect(()=>{if(preview)return;let alive=true;void supabase.auth.getUser().then(({data,error})=>{if(alive)setOwnerId(!error?data.user?.id??null:null);});const {data}=supabase.auth.onAuthStateChange((_event,session)=>{if(alive)setOwnerId(session?.user.id??null);});return()=>{alive=false;data.subscription.unsubscribe();};},[preview]);
 const detail=useQuery({queryKey:['central-owner-esim-detail',ownerId,realId],queryFn:()=>getCustomerEsimDetail({data:{esimId:realId??''}}),enabled:Boolean(realId&&signedIn),retry:false,staleTime:30000});
 const esim=detail.data?.esim;
 const expired=esim?isHistoryEsim({status:esim.status,totalMb:esim.totalDataMb,remainingMb:esim.remainingDataMb,expiresAt:esim.expiresAt}):false;
 const activation=useQuery({queryKey:['central-owner-esim-activation',ownerId,realId],queryFn:()=>getCustomerEsimActivation({data:{esimId:realId??''}}),enabled:Boolean(signedIn&&realId&&esim&&!expired&&(esim.hasQr||esim.hasInstallInfo)),retry:false,staleTime:60000});
 const info=signedIn?activation.data?.installInfo:null;
 const apn=providerInstallValue(info,'apn');
 const scenes=METHOD_SCENES[method];
 const titles=method==='quick'?c.quickTitles:method==='qr'?c.qrTitles:c.manualTitles;
 const bodies=method==='quick'?c.quickBodies:method==='qr'?platform==='android'?c.qrAndroid:c.qrIos:platform==='android'?c.manualAndroid:c.manualIos;
 const scene=scenes[step]??scenes[0]??'settings';
 const afterScenes:GuideScene[]=apn?['line','roaming','apn']:['line','roaming'];
 const afterTitles=apn?[c.mobile,c.roaming,c.apn]:[c.mobile,c.roaming];
 const afterBodies=[platform==='android'?c.dataBodyAndroid:c.dataBodyIos,c.roamingBody,platform==='android'?c.apnBodyAndroid:c.apnBodyIos];
 return <div ref={root} data-guide-preview={preview} data-central-installation data-guide-platform={platform??'unknown'} data-guide-method={method} className="grid min-w-0 gap-6">
  <div className="grid gap-3 sm:max-w-xl">
   <div role="group" aria-label={c.device} className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">{(['ios','android'] as const).map(p=><Button key={p} variant={platform===p?'default':'ghost'} onClick={()=>{setPlatform(p);setStep(0);setAfterStep(0);}} className="min-h-11">{p==='ios'?<Apple/>:<Smartphone/>}{p==='ios'?c.ios:c.android}</Button>)}</div>
   <div role="tablist" aria-label={c.method} className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">{(['quick','qr','manual'] as const).map(m=><Button key={m} role="tab" aria-selected={method===m} variant={method===m?'default':'ghost'} onClick={()=>{setMethod(m);setStep(0);}} className="h-auto min-h-12 min-w-0 whitespace-normal px-1 text-xs">{m==='quick'?c.link:m==='qr'?c.qr:c.manual}</Button>)}</div>
  </div>
  {method==='quick'&&<div className="grid gap-2"><p className="text-sm text-muted-foreground">{platform==='android'?c.androidLink:c.linkNotice}</p><Button disabled variant="outline" className="w-fit"><Link2/>{c.soon}</Button></div>}
  {platform&&<>
   <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
    <div className="grid min-w-0 justify-items-center gap-4 rounded-lg bg-secondary px-3 py-5"><GuidePhone platform={platform} scene={scene}/><p className="text-center text-xs text-muted-foreground">{c.sample}</p><StepNavigation previous={c.previous} next={c.next} steps={titles.map(label=>({label}))} current={step} onSelect={value=>{setStep(value);if(preview)setPaused(true);}} stepLabel={c.step}/>{preview&&!reducedMotion&&<Button variant="ghost" size="icon" aria-label={paused?'Play':'Pause'} title={paused?'Play':'Pause'} onClick={()=>setPaused(value=>!value)}>{paused?<Play/>:<Pause/>}</Button>}</div>
    <div className="flex min-w-0 flex-col justify-center gap-4" aria-live="polite"><p className="text-xs font-semibold text-primary">{c.step} {step+1} / {scenes.length}</p><h2 className="font-display text-xl font-bold lg:text-2xl">{titles[step]}</h2><p className="text-sm leading-7 text-muted-foreground">{method==='quick'&&platform==='android'?c.androidLink:bodies[step]}</p><p className="flex gap-2 rounded-lg bg-secondary p-3 text-xs leading-6 text-muted-foreground"><Lightbulb className="size-4 shrink-0 text-primary"/>{c.wifi}</p></div>
   </div>
   {method==='qr'&&<details className="text-sm leading-6"><summary className="cursor-pointer font-semibold text-primary">{c.samePhone}</summary><p className="mt-2 text-muted-foreground">{c.samePhoneBody}</p></details>}
  </>}
  {realId&&<section className="grid gap-3 border-t border-border pt-5" data-owner-installation><h2 className="font-display text-lg font-bold">{c.dataTitle}</h2>{!signedIn?<Button asChild variant="outline"><Link to="/auth" search={{redirect:`/esim/kurulum?esimId=${realId}`}}>{c.signIn}</Link></Button>:detail.isError||activation.isError?<p className="text-sm text-muted-foreground">{c.denied}</p>:esim?<EsimInstallGuide embedded controlledMethod={method} locale={locale} esimId={esim.id} qrPayload={signedIn?activation.data?.qrPayload??null:null} installInfo={info} activationPolicy={detail.data?.coverage?.activationPolicy??null} expired={expired}/>:<p className="text-sm text-muted-foreground">{c.unavailable}</p>}</section>}
  {platform&&!preview&&<section className="grid gap-5 border-t border-border pt-6" data-post-installation><header><h2 className="font-display text-xl font-bold">{c.after}</h2><p className="mt-2 text-sm text-muted-foreground">{c.afterLead}</p></header><div className="grid min-w-0 gap-5 lg:grid-cols-2"><div className="grid min-w-0 justify-items-center gap-4 rounded-lg bg-secondary px-3 py-5"><GuidePhone platform={platform} scene={afterScenes[afterStep]??'line'}/><StepNavigation previous={c.previous} next={c.next} steps={afterTitles.map(label=>({label}))} current={afterStep} onSelect={setAfterStep} stepLabel={c.step}/></div><div className="flex flex-col justify-center gap-3" aria-live="polite"><h3 className="font-display text-lg font-bold">{afterTitles[afterStep]}</h3><p className="text-sm leading-7 text-muted-foreground">{afterBodies[afterStep]}</p>{afterStep===2&&apn&&<p className="break-all text-sm font-bold">APN: {apn}</p>}<p className="text-xs text-muted-foreground">{c.wifi}</p></div></div><details data-troubleshooting><summary className="cursor-pointer font-semibold text-primary">{c.trouble}</summary><ol className="mt-3 grid list-decimal gap-2 ps-5 text-sm leading-6 text-muted-foreground">{c.checks.map(check=><li key={check}>{check}</li>)}</ol><p className="mt-4 text-sm font-semibold text-warning">{c.deletion}</p><Button asChild variant="outline" className="mt-4"><Link to="/destek">{c.support}</Link></Button></details></section>}
  <details><summary className="cursor-pointer text-sm font-semibold text-primary">{c.checkDevice}</summary><p className="my-3 text-xs text-muted-foreground">{c.modelNote}</p><DevicePicker locale={locale} onPlatform={p=>{setPlatform(p==='iphone'?'ios':'android');setStep(0);}}/></details>
 </div>;
}
export function EsimInstallationPage({initialPlatform,initialMethod,esimId}:{initialPlatform?:GuidePlatform|undefined;initialMethod?:GuideMethod|undefined;esimId?:string|undefined}) {
 const {locale}=useI18n();const c=CENTRAL_GUIDE_COPY[locale];
 return <V2Shell service="esim" hideWhatsApp><main className="mx-auto max-w-6xl pb-20"><Button asChild variant="ghost" className="my-3"><Link to={esimId?'/account/esims':'/esim'} search={{country:''}}><ArrowLeft/>{c.back}</Link></Button><header className="mb-6"><h1 className="font-display text-2xl font-bold lg:text-3xl">{c.title}</h1><p className="mt-2 text-sm text-muted-foreground">{c.lead}</p></header><CentralInstallationWalkthrough initialPlatform={initialPlatform} initialMethod={initialMethod} esimId={esimId}/></main></V2Shell>;
}
