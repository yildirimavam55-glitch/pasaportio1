import { Bluetooth, Check, ChevronRight, Globe, Link2, Plane, QrCode, Search, Settings, ShieldCheck, Signal, Smartphone, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { CENTRAL_GUIDE_COPY, type GuidePlatform } from './central-installation-content';
import { EDUCATION_COPY, type EducationScene } from './educational-installation';
import { DecorativeQr, InstallationPhone, InstallationSuccess, TapIndicator } from './InstallationExperience';

/** Only scene IDs enter this phone. Real install data must stay outside it. */
export function EducationalPhone({ platform, scene }: { platform: GuidePlatform; scene: EducationScene }) {
 const { locale } = useI18n();
 const c = CENTRAL_GUIDE_COPY[locale]; const e = EDUCATION_COPY[locale];
 const android = platform === 'android';
 const row = (label: string, icon: ReactNode, active = false, detail?: string) => <div className={`education-menu-row ${active ? 'education-menu-active' : ''}`}><span className="education-menu-icon">{icon}</span><span>{label}{detail && <small>{detail}</small>}</span><ChevronRight className="size-3 shrink-0"/>{active && <TapIndicator className="end-4 bottom-0"/>}</div>;
 const field = (label: string) => <div className="education-field"><span>{label}</span><div>••••••••</div></div>;
 const title = scene === 'settings' ? c.settings : scene === 'connections' ? e.connections : scene === 'sims' ? e.sims : scene === 'cellular' ? e.cellular : scene === 'manual' ? android ? e.enterCode : e.manual : scene === 'lpa' ? e.enterCode : scene === 'details' ? e.manual : scene === 'scanner' ? c.scan : scene === 'installed' ? e.installed : scene === 'link' ? e.browser : scene === 'unsupported' ? e.unsupported : scene === 'alternatives' ? e.alternatives : c.add;
 return <InstallationPhone android={android} phase={`${platform}-${scene}`}><div className="education-os" data-education-scene={scene} data-education-platform={platform}>
  <div className="education-status" dir="ltr"><span>9:41</span><span><Signal className="size-3"/><Wifi className="size-3"/><span className="education-battery"/></span></div>
  <div className="education-os-heading"><ChevronRight className="size-3 rotate-180"/><strong>{title}</strong>{scene === 'settings' && <Search className="size-3"/>}</div>
  <div className="education-os-body">
   {scene === 'settings' && <><div className="education-account"><span className="education-avatar"><Smartphone className="size-5"/></span><span>{android ? 'Samsung' : c.ios}<small>{c.settings}</small></span></div>{android ? row(e.connections,<Wifi className="size-3"/>,true) : <>{row(e.airplane,<Plane className="size-3"/>)}{row(e.wifi,<Wifi className="size-3"/>)}{row(e.bluetooth,<Bluetooth className="size-3"/>)}{row(e.cellular,<Signal className="size-3"/>,true)}</>}{row(e.notifications,<Settings className="size-3"/>)}{row(c.mobile,<Smartphone className="size-3"/>)}</>}
   {scene === 'connections' && <>{row(e.wifi,<Wifi className="size-3"/>,false,e.on)}{row(e.bluetooth,<Bluetooth className="size-3"/>,false,e.off)}{row(e.airplane,<Plane className="size-3"/>,false,e.off)}{row(e.sims,<Smartphone className="size-3"/>,true)}{row(c.mobile,<Signal className="size-3"/>)}</>}
   {(scene === 'sims' || scene === 'cellular') && <><p className="education-group-label">SIM</p>{row(e.primary,<Smartphone className="size-3"/>,false,e.on)}{row(c.line,<Signal className="size-3"/>,false,e.off)}{row(c.add,<Smartphone className="size-3"/>,true)}<p className="education-group-label">{c.mobile}</p>{row(c.mobile,<Globe className="size-3"/>,false,e.primary)}</>}
   {scene === 'add' && <><Signal className="mx-auto my-5 size-9 text-primary"/><p className="text-center font-bold">{c.add}</p><p className="education-hint">{c.sample}</p>{row(e.scan,<QrCode className="size-3"/>,true)}{android && row(e.enterCode,<Smartphone className="size-3"/>)}</>}
   {scene === 'scanner' && <><p className="education-hint">{c.scan}</p><div className="education-scanner"><DecorativeQr/><span className="education-scan-beam"/><span className="education-scan-read"><Check className="size-5"/></span></div>{row(android ? e.enterCode : e.manual,<Smartphone className="size-3"/>,true)}<p className="education-hint">{c.sample}</p></>}
   {scene === 'manual' && <>{android ? <>{row(e.enterCode,<Smartphone className="size-3"/>,true)}<p className="education-hint">{e.paste}</p></> : <>{field(c.address)}{field(c.code)}<p className="education-hint">{e.optional}</p></>}<div className="education-system-action">{e.next}<TapIndicator className="end-5 bottom-0"/></div></>}
   {scene === 'lpa' && <><div className="education-field"><span>{e.paste}</span><div className="education-paste">••••••••••••••••</div></div><p className="education-hint">{e.codeNote}</p><div className="education-system-action">{e.next}<TapIndicator className="end-5 bottom-0"/></div><div className="education-keyboard" dir="ltr">{'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').map((letter,i)=><span key={i}>{letter}</span>)}</div></>}
   {scene === 'details' && <>{field(c.address)}{field(c.code)}{field(c.confirmation)}<p className="education-hint">{e.optional}</p><div className="education-system-action">{e.next}<TapIndicator className="end-5 bottom-0"/></div></>}
   {scene === 'review' && <div className="education-download"><Signal className="size-10 text-primary"/><strong>{e.confirm}</strong><p>{c.line}</p><div className="education-system-action">{e.next}<TapIndicator className="end-5 bottom-0"/></div><div className="education-download-track"><span/></div><small>{e.download}</small></div>}
   {scene === 'installed' && <div className="education-download"><InstallationSuccess label={e.installed}/><p className="education-hint">{e.ready}</p>{row(c.line,<Signal className="size-3"/>,false,e.on)}</div>}
   {scene === 'link' && <div className="education-download"><Link2 className="size-10 text-primary"/><strong>{e.browser}</strong><p className="education-hint">{c.sample}</p><div className="education-system-action">{e.open}<TapIndicator className="end-5 bottom-0"/></div><small>{c.soon}</small></div>}
   {(scene === 'unsupported' || scene === 'alternatives') && <div className="education-download"><ShieldCheck className="size-10 text-primary"/><strong>{scene === 'unsupported' ? e.unsupported : e.alternatives}</strong><p className="education-hint">{c.androidLink}</p>{row(c.qr,<QrCode className="size-3"/>)}{row(c.manual,<Smartphone className="size-3"/>)}</div>}
  </div>
 </div></InstallationPhone>;
}