import { useRef, useState } from 'react';
import type { V2PageConfig } from '@/domain/storefront/v2';
import { pageSummary, pendingPage, translatePage, type PageRun, type TranslationRequest, type TranslationResponse } from '@/domain/storefront/page-translation';
export function V2PageTranslation({page,onChange,transport,demo=false}:{page:V2PageConfig;onChange:(page:V2PageConfig)=>void;transport:(request:TranslationRequest)=>Promise<TranslationResponse>;demo?:boolean}){
 const latest=useRef(page);latest.current=page;
 const [busy,setBusy]=useState(false),[run,setRun]=useState<PageRun>(),[progress,setProgress]=useState([0,0]);
 const pending=pendingPage(page),summary=pageSummary(page);
 const start=async()=>{if(busy)return;setBusy(true);setProgress([0,pending.length]);try{
  setRun(await translatePage({getPage:()=>latest.current,apply:next=>{latest.current=next;onChange(next);},transport,maxRequests:demo?Number.MAX_SAFE_INTEGER:2,progress:(done,total)=>setProgress([done,total])}));
 }finally{setBusy(false);}};
 return <section className="rounded border border-border p-3 space-y-2" aria-label="Seitenübersetzung">
  <button type="button" disabled={busy} onClick={()=>void start()} className="rounded bg-primary text-primary-foreground p-3 w-full">{busy?'Çevriliyor…':'Tüm sayfayı 13 dile çevir'}{demo?' (DEMO)':''}</button>
  <p className="text-xs">Gesamte Seite übersetzen · Türkçe kaynak sabit. Elle düzenlenen metinler korunur. {demo?'DEMO: yalnızca hazır örnekler, yapay zekâ çağrısı yok.':'En fazla 2 istek / işlem. Limitte durur; kalanları daha sonra sürdür.'}</p>
  <p role="status" data-page-translation-status>{busy?`${progress[0]}/${progress[1]}`:run?`${demo?'DEMO · ':''}${run.completed}/${run.total} · ${run.code} · ${run.requests} istek`:`${pending.length} eksik / yenilenecek`}{run?.problems.some(p=>p.code==='E_NO_FIXTURE')?' · Keine Beispielübersetzung':''}</p>
  <details><summary className="cursor-pointer">13 dil · Durum / Restliste</summary>
   <div className="text-xs" data-page-summary>{summary.map(s=><p key={s.locale}>{s.locale.toUpperCase()}: eksik {s.MISSING} · eski {s.OUTDATED} · otomatik {s.AUTO_TRANSLATED} · elle {s.MANUALLY_EDITED}</p>)}</div>
   <p className="text-xs">Eksik çeviriler: TR Fallback. Eski manuel metinler otomatik değişmez; elle kontrol edin.</p>
   <ul className="text-xs break-all max-h-52 overflow-auto">{(run?.problems??pending).map(p=><li key={`${p.field}:${p.locale}`}>{p.field} · {p.locale} · {p.code}</li>)}</ul>
  </details>
 </section>;
}
