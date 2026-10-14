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
import { CENTRAL_GUIDE_COPY, METHOD_SCENES, detectedGuidePlatform, type GuidePlatform, type GuideMethod, type GuideScene } from './central-installation-content';

import { scheduleInstallationAdvance } from './installation-autoplay';
import { EDUCATION_COPY, EDUCATION_FLOWS, educationScene } from './educational-installation';
import { EducationalPhone } from './EducationalPhone';
import { MANUAL_OS_COPY } from './manual-phone-content';
import { MANUAL_EMAIL_COPY } from './manual-email-content';

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
 const {locale}=useI18n(); const c=CENTRAL_GUIDE_COPY[locale]; const e=EDUCATION_COPY[locale];
 const [platform,setPlatform]=useState<GuidePlatform|undefined>(initialPlatform);
 const [method,setMethod]=useState<GuideMethod>(initialMethod);
 const [step,setStep]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(!preview);
 const [visible,setVisible]=useState(false);
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReducedMotion(media.matches);update();media.addEventListener('change',update);
  const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),{threshold:0.15});
  if(root.current)observer.observe(root.current);
  return()=>{observer.disconnect();media.removeEventListener('change',update);};
 },[preview]);
 useEffect(()=>{
  if(!platform||paused||!visible||reducedMotion)return;
  const count=preview?METHOD_SCENES[method].length:EDUCATION_FLOWS[platform][method].length;
  return scheduleInstallationAdvance(()=>{if(!preview&&step===count-1){setPaused(true);return;}setStep(current=>(current+1)%count);});
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
 const scenes=METHOD_SCENES[method];
 const titles=method==='quick'?c.quickTitles:method==='qr'?c.qrTitles:c.manualTitles;
 const bodies=method==='quick'?c.quickBodies:method==='qr'?platform==='android'?c.qrAndroid:c.qrIos:platform==='android'?c.manualAndroid:c.manualIos;
 const scene=scenes[step]??scenes[0]??'settings';
 const educationalScene=educationScene(platform??'ios',method,step);
 const educationalScenes=EDUCATION_FLOWS[platform??'ios'][method];
 const mail=MANUAL_EMAIL_COPY[locale];
 const emailTitles={'email-inbox':mail.inbox,email:mail.subject,'email-copy-lpa':mail.copyLpa,'email-copied-lpa':mail.copied,'email-copy-address':mail.copyAddress,'email-copied-address':mail.copied,'switch-settings':mail.settings,'address-pasted':c.address,'email-return':mail.mail,'email-copy-code':mail.copyCode,'email-copied-code':mail.copied,'return-manual':e.manual};
 const emailBodies={'email-inbox':mail.inboxBody,email:mail.emailBody,'email-copy-lpa':mail.copyLpaBody,'email-copied-lpa':mail.copiedLpaBody,'email-copy-address':mail.copyAddressBody,'email-copied-address':mail.copiedAddressBody,'switch-settings':mail.switchBody,'address-pasted':mail.addressBody,'email-return':mail.returnEmailBody,'email-copy-code':mail.copyCodeBody,'email-copied-code':mail.copiedCodeBody,'return-manual':mail.returnSettingsBody};
 const educationTitles={...emailTitles,settings:c.settings,connections:e.connections,sims:e.sims,cellular:e.cellular,add:c.add,scanner:e.scan,manual:platform==='android'?e.enterCode:e.manual,lpa:e.paste,details:e.manual,review:e.confirm,installed:e.installed,link:e.browser,unsupported:e.unsupported,alternatives:e.alternatives};
 const educationBodies={...emailBodies,settings:e.settingsBody,connections:e.connectionsBody,sims:e.simsBody,cellular:e.cellularBody,add:e.addBody,scanner:e.scannerBody,manual:platform==='android'?e.manualBodyAndroid:e.manualBodyIos,lpa:e.lpaBody,details:method==='manual'?mail.detailsBody:e.detailsBody,review:e.reviewBody,installed:e.installedBody,link:e.linkBody,unsupported:e.unsupportedBody,alternatives:e.alternativesBody};
 const selectEducationStep=(value:number)=>{setStep(value);setPaused(true);};
 return <div ref={root} data-guide-preview={preview} data-central-installation data-guide-platform={platform??'unknown'} data-guide-method={method} data-playing={!paused&&!reducedMotion} className={`grid min-w-0 gap-6 ${preview?'':'education-walkthrough'}`}>
  <div className="grid gap-3 sm:max-w-xl">
   <div role="group" aria-label={c.device} className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">{(preview?['ios','android'] as const:['android','ios'] as const).map(p=><Button key={p} variant={platform===p?'default':'ghost'} onClick={()=>{setPlatform(p);setStep(0);if(!preview)setPaused(true);}} className="min-h-11">{p==='ios'?<Apple/>:<Smartphone/>}{p==='ios'?c.ios:c.android}</Button>)}</div>
   <div role="tablist" aria-label={c.method} className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">{(['quick','qr','manual'] as const).map(m=><Button key={m} role="tab" aria-selected={method===m} variant={method===m?'default':'ghost'} onClick={()=>{setMethod(m);setStep(0);if(!preview)setPaused(true);}} className="h-auto min-h-12 min-w-0 whitespace-normal px-1 text-xs">{m==='quick'?c.link:m==='qr'?c.qr:c.manual}</Button>)}</div>
  </div>
  {method==='quick'&&<div className="grid gap-2"><p className="text-sm text-muted-foreground">{platform==='android'?c.androidLink:c.linkNotice}</p><Button disabled variant="outline" className="w-fit"><Link2/>{c.soon}</Button></div>}
  {platform&&!preview&&<>
   <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
    <div className="education-stage"><EducationalPhone platform={platform} scene={educationalScene} method={method}/>{method==='manual'&&<StepNavigation previous={c.previous} next={c.next} steps={educationalScenes.map(scene=>({label:educationTitles[scene]}))} current={step} onSelect={selectEducationStep} stepLabel={c.step}/>}<p className="text-center text-xs text-muted-foreground">{c.sample}</p></div>
    <div className="grid min-w-0 gap-5">
     <div className="education-progress" aria-hidden="true">{educationalScenes.map((_,i)=><span key={i} data-complete={i<=step}/>)}</div>
     <div className="min-h-28 lg:min-h-44" aria-live={paused?'polite':'off'}><p className="mb-2 text-xs font-semibold text-primary">{c.step} {step+1} / {educationalScenes.length}</p><h2 className="font-display text-xl font-bold lg:text-2xl">{educationTitles[educationalScene]}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{educationBodies[educationalScene]}</p></div>
     {method!=='manual'&&<StepNavigation previous={c.previous} next={c.next} steps={educationalScenes.map(scene=>({label:educationTitles[scene]}))} current={step} onSelect={selectEducationStep} stepLabel={c.step}/>}
     <Button variant="outline" className="mx-auto min-h-11" aria-label={paused?step===educationalScenes.length-1?e.restart:e.play:e.pause} onClick={()=>{if(step===educationalScenes.length-1)setStep(0);setPaused(value=>!value);}} disabled={reducedMotion}>{paused?<Play/>:<Pause/>}{paused?step===educationalScenes.length-1?e.restart:e.play:e.pause}</Button>
     {method==='quick'&&platform==='android'&&<div className="grid grid-cols-2 gap-2">{(['qr','manual'] as const).map(m=><Button key={m} variant="outline" onClick={()=>{setMethod(m);setStep(0);setPaused(true);}}>{m==='qr'?c.qr:c.manual}</Button>)}</div>}
     <p className="flex gap-2 border-t border-border pt-4 text-xs leading-6 text-muted-foreground"><Lightbulb className="size-4 shrink-0 text-primary"/>{c.wifi}</p>
     {method==='manual'&&<p className="text-xs leading-6 text-muted-foreground">{MANUAL_OS_COPY[locale].version}</p>}
    </div>
   </div>
   {method==='qr'&&<details className="text-sm leading-6"><summary className="cursor-pointer font-semibold text-primary">{c.samePhone}</summary><p className="mt-2 text-muted-foreground">{c.samePhoneBody}</p></details>}
  </>}
  {platform&&preview&&<>
   <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
    <div className="grid min-w-0 justify-items-center gap-4 rounded-lg bg-secondary px-3 py-5"><GuidePhone platform={platform} scene={scene}/><p className="text-center text-xs text-muted-foreground">{c.sample}</p><StepNavigation previous={c.previous} next={c.next} steps={titles.map(label=>({label}))} current={step} onSelect={value=>{setStep(value);if(preview)setPaused(true);}} stepLabel={c.step}/>{preview&&!reducedMotion&&<Button variant="ghost" size="icon" aria-label={paused?'Play':'Pause'} title={paused?'Play':'Pause'} onClick={()=>setPaused(value=>!value)}>{paused?<Play/>:<Pause/>}</Button>}</div>
    <div className="flex min-w-0 flex-col justify-center gap-4" aria-live="polite"><p className="text-xs font-semibold text-primary">{c.step} {step+1} / {scenes.length}</p><h2 className="font-display text-xl font-bold lg:text-2xl">{titles[step]}</h2><p className="text-sm leading-7 text-muted-foreground">{method==='quick'&&platform==='android'?c.androidLink:bodies[step]}</p><p className="flex gap-2 rounded-lg bg-secondary p-3 text-xs leading-6 text-muted-foreground"><Lightbulb className="size-4 shrink-0 text-primary"/>{c.wifi}</p></div>
   </div>
   {method==='qr'&&<details className="text-sm leading-6"><summary className="cursor-pointer font-semibold text-primary">{c.samePhone}</summary><p className="mt-2 text-muted-foreground">{c.samePhoneBody}</p></details>}
  </>}
  {realId&&<section className="grid gap-3 border-t border-border pt-5" data-owner-installation><h2 className="font-display text-lg font-bold">{c.dataTitle}</h2>{!signedIn?<Button asChild variant="outline"><Link to="/auth" search={{redirect:`/esim/kurulum?esimId=${realId}`}}>{c.signIn}</Link></Button>:detail.isError||activation.isError?<p className="text-sm text-muted-foreground">{c.denied}</p>:esim?<EsimInstallGuide embedded controlledMethod={method} locale={locale} esimId={esim.id} qrPayload={signedIn?activation.data?.qrPayload??null:null} installInfo={info} activationPolicy={detail.data?.coverage?.activationPolicy??null} expired={expired}/>:<p className="text-sm text-muted-foreground">{c.unavailable}</p>}</section>}
  {platform&&!preview&&<>
   <section className="grid gap-5 border-t border-border pt-8" data-post-installation><header><h2 className="font-display text-xl font-bold">{c.after}</h2><p className="mt-2 text-sm text-muted-foreground">{c.afterLead}</p></header><ol className="grid gap-4 lg:grid-cols-2">{[
    [e.installed,e.installedBody], [c.mobile,platform==='android'?c.dataBodyAndroid:c.dataBodyIos], [c.roaming,c.roamingBody], [c.apn,e.apnBody], [e.test,e.testBody],
   ].map(([title,body],i)=><li key={i} className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{i+1}</span><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div></li>)}</ol></section>
   <section className="grid gap-4 border-t border-border pt-8" data-troubleshooting><h2 className="font-display text-xl font-bold">{e.trouble}</h2><div className="divide-y divide-border">{e.troubleTitles.map((title,i)=><details key={i} className="py-4"><summary className="cursor-pointer text-sm font-semibold text-primary">{title}</summary><p className="mt-3 text-sm leading-7 text-muted-foreground">{e.troubleBodies[i]}</p></details>)}</div><p className="text-sm font-semibold text-primary">{c.deletion}</p><Button asChild variant="outline" className="w-fit"><Link to="/destek">{c.support}</Link></Button></section>
  </>}
  <details><summary className="cursor-pointer text-sm font-semibold text-primary">{c.checkDevice}</summary><p className="my-3 text-xs text-muted-foreground">{c.modelNote}</p><DevicePicker locale={locale} onPlatform={p=>{setPlatform(p==='iphone'?'ios':'android');setStep(0);}}/></details>
 </div>;
}
export function EsimInstallationPage({initialPlatform,initialMethod,esimId}:{initialPlatform?:GuidePlatform|undefined;initialMethod?:GuideMethod|undefined;esimId?:string|undefined}) {
 const {locale}=useI18n();const c=CENTRAL_GUIDE_COPY[locale];
 return <V2Shell service="esim" hideWhatsApp><main className="mx-auto max-w-6xl pb-20"><Button asChild variant="ghost" className="my-3"><Link to={esimId?'/account/esims':'/esim'} search={{country:''}}><ArrowLeft/>{c.back}</Link></Button><header className="mb-6"><h1 className="font-display text-2xl font-bold lg:text-3xl">{c.title}</h1><p className="mt-2 text-sm text-muted-foreground">{c.lead}</p></header><CentralInstallationWalkthrough initialPlatform={initialPlatform} initialMethod={initialMethod} esimId={esimId}/></main></V2Shell>;
}
