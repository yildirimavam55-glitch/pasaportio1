import { Bell, Bluetooth, Check, ChevronLeft, ChevronRight, Globe, Monitor, Plane, Plus, QrCode, Search, Settings, ShieldCheck, Signal, Smartphone, User, Volume2, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';
import { CENTRAL_GUIDE_COPY, type GuidePlatform } from './central-installation-content';
import { EDUCATION_COPY, type EducationScene } from './educational-installation';
import { DecorativeQr, TapIndicator } from './InstallationExperience';
import { MANUAL_DEMO, MANUAL_OS_COPY } from './manual-phone-content';

function useCopy() { const { locale } = useI18n(); return { c:CENTRAL_GUIDE_COPY[locale], e:EDUCATION_COPY[locale], m:MANUAL_OS_COPY[locale] }; }
function Row({ label, detail, icon, active=false, toggle=false, on=true, value }: { label:string; detail?:string; icon?:ReactNode; active?:boolean; toggle?:boolean; on?:boolean; value?:string }) {
 return <div className={`os-row ${active?'os-row-target':''}`}><span className="os-row-icon">{icon}</span><div className="os-row-label">{label}{detail&&<small>{detail}</small>}</div>{value&&<small className="os-row-value">{value}</small>}{toggle?<span className="os-toggle" data-on={on}/>:<ChevronRight className="os-chevron"/>}{active&&<TapIndicator className="end-4 bottom-1"/>}</div>;
}
function Group({children}:{children:ReactNode}) { return <div className="os-group">{children}</div>; }
function Nav({title,root=false,ios=false,action}:{title:string;root?:boolean;ios?:boolean;action?:string}) {
 return <div className={`os-nav ${root?'os-nav-root':''}`}><span className="os-back">{!root&&<ChevronLeft/>}</span><h3>{title}</h3><span className="os-nav-action">{action??(root?<Search/>:null)}</span></div>;
}
function Keyboard() { return <div className="os-keyboard" dir="ltr"><div className="os-keyboard-tools"><span>⋯</span><span>☺</span><span>⚙</span></div>{['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map(line=><div className="os-keyboard-line" key={line}>{line.split('').map(letter=><span key={letter}>{letter}</span>)}</div>)}<div className="os-keyboard-line os-keyboard-bottom"><span>123</span><span>⌕</span><span>English</span><span>↵</span></div></div>; }
function Action({label}:{label:string}) { return <div className="os-action">{label}<TapIndicator className="end-5 bottom-1"/></div>; }

export function AndroidSettingsScreen() {
 const {c,e,m}=useCopy(); return <><Nav title={c.settings} root/><div className="os-account"><span className="os-avatar"><User/></span><div>{m.account}<small>{c.settings}</small></div></div><Group><Row label={e.connections} detail={`${e.wifi}, ${e.bluetooth}, ${e.airplane}`} icon={<Wifi/>} active/><Row label={m.sounds} icon={<Volume2/>}/><Row label={e.notifications} icon={<Bell/>}/><Row label={m.display} icon={<Monitor/>}/><Row label={m.battery} icon={<ShieldCheck/>}/></Group></>;
}
export function AndroidConnectionsScreen() {
 const {e,m}=useCopy(); return <><Nav title={e.connections}/><Group><Row label={e.wifi} detail="Wi-Fi" toggle/><Row label={e.bluetooth} detail={e.off} toggle on={false}/></Group><Group><Row label={e.airplane} icon={<Plane/>}/><Row label={e.sims} detail="SIM 1, eSIM" icon={<Smartphone/>} active/><Row label={m.data} icon={<Signal/>}/></Group><Group><Row label={m.hotspot}/><Row label={m.other}/></Group></>;
}
export function AndroidSimManagerScreen() {
 const {c,e,m}=useCopy(); return <><Nav title={e.sims}/><p className="os-section-label">SIM</p><Group><Row label="SIM 1" detail={e.primary} icon={<Smartphone/>} toggle/></Group><p className="os-section-label">eSIM</p><Group><Row label="eSIM 1" detail={e.off} icon={<Smartphone/>}/><Row label={c.add} icon={<Plus/>} active/></Group><p className="os-section-label">{m.preferred}</p><Group><Row label={m.calls} value="SIM 1"/><Row label={m.messages} value="SIM 1"/><Row label={m.data} value="SIM 1"/></Group></>;
}
export function AndroidAddEsimScreen() { const {c,e,m}=useCopy(); return <><Nav title={c.add}/><p className="os-intro">{m.addBody}</p><Group><Row label={e.scan} icon={<QrCode/>} active/><Row label={e.enterCode} icon={<Smartphone/>}/></Group><p className="os-footnote">{c.sample}</p></>; }
export function AndroidActivationCodeScreen({filled=false}:{filled?:boolean}) {
 const {e,m}=useCopy(); return <><Nav title={e.enterCode}/><p className="os-intro">{m.entry}</p><div className="os-android-input"><label>{e.enterCode}</label><div className="os-lpa-value" dir="ltr">{filled?MANUAL_DEMO.lpa:<span className="os-caret"/>}</div></div><p className="os-demo">{m.demo}</p><Action label={e.next}/><Keyboard/></>;
}
export function AndroidInstallationScreen({done=false}:{done?:boolean}) {
 const {c,e,m}=useCopy(); return <><Nav title={c.add}/><div className="os-install-summary"><span className="os-sim-symbol"><Smartphone/></span><h4>{done?e.installed:m.download}</h4><p>{done?m.installedBody:e.reviewBody}</p></div><Group><Row label={m.carrier} detail={done?e.on:e.download} icon={<Signal/>}/><Row label="SIM 1" detail={e.primary} icon={<Smartphone/>}/></Group>{done?<div className="os-added"><Check/>{e.installed}</div>:<div className="os-install-meter"><span/><small>{e.download}</small></div>}<Action label={done?m.finish:e.next}/></>;
}
export function IOSSettingsScreen() {
 const {c,e,m}=useCopy(); return <><Nav title={c.settings} root ios/><div className="os-search"><Search/>{c.settings}</div><div className="os-account"><span className="os-avatar"><User/></span><div>{m.appleAccount}<small>iCloud</small></div><ChevronRight/></div><Group><Row label={e.airplane} icon={<Plane/>} toggle on={false}/><Row label={e.wifi} icon={<Wifi/>} value={e.on}/><Row label={e.bluetooth} icon={<Bluetooth/>} value={e.on}/><Row label={e.cellular} icon={<Signal/>} active/><Row label={m.hotspot} icon={<Globe/>}/></Group><Group><Row label={m.general} icon={<Settings/>}/><Row label={m.display} icon={<Monitor/>}/></Group></>;
}
export function IOSCellularScreen() {
 const {c,e,m}=useCopy(); return <><Nav title={e.cellular} ios/><Group><Row label={m.data} value={e.primary}/><Row label={m.hotspot} value={e.off}/></Group><p className="os-section-label">SIMs</p><Group><Row label={e.primary} detail="SIM 1" value={e.on}/><Row label={m.carrier} detail="eSIM" value={e.off}/></Group><Group><Row label={c.add} icon={<Plus/>} active/></Group><p className="os-footnote">{m.addBody}</p></>;
}
export function IOSAddEsimScreen() { const {e,m}=useCopy(); return <><Nav title={m.setup} ios/><div className="os-install-summary"><span className="os-sim-symbol"><Signal/></span><h4>{m.setup}</h4><p>{m.addBody}</p></div><Group><Row label={m.nearby}/><Row label={e.scan} icon={<QrCode/>} active/></Group></>; }
export function IOSManualEntryScreen({filled=false}:{filled?:boolean}) {
 const {c,e,m}=useCopy(); return <><Nav title={e.manual} ios action={e.next}/><p className="os-intro">{m.instruction}</p><p className="os-demo">{m.demo}</p><Group>{[[c.address,MANUAL_DEMO.address],[c.code,MANUAL_DEMO.code],[c.confirmation,m.optional]].map(([label,value],i)=><div className="os-ios-field" key={label}><label>{label}</label><span dir="ltr">{filled||i===2?value:<span className="os-caret"/>}</span></div>)}</Group><Keyboard/></>;
}
export function IOSInstallationScreen({done=false}:{done?:boolean}) {
 const {c,e,m}=useCopy(); return <><Nav title={c.add} ios/><div className="os-install-summary"><span className="os-sim-symbol">{done?<Check/>:<Signal/>}</span><h4>{done?e.installed:c.add}</h4><p>{done?m.installedBody:m.download}</p></div><Group><Row label={m.carrier} detail={done?e.on:e.download} icon={<Signal/>}/></Group>{!done&&<div className="os-install-meter"><span/><small>{e.download}</small></div>}<Action label={done?m.finish:e.next}/></>; }
function ManualScannerScreen({android}:{android:boolean}) { const {c,e}=useCopy(); return <><Nav title={e.scan} ios={!android}/><p className="os-intro">{c.scan}</p><div className="os-camera"><DecorativeQr/><span className="education-scan-beam"/></div><Group><Row label={android?e.enterCode:e.manual} active/></Group></>; }

export function ManualPhoneScreen({platform,scene}:{platform:GuidePlatform;scene:EducationScene}) {
 const android=platform==='android'; let screen:ReactNode;
 if(android) { switch(scene) { case 'settings':screen=<AndroidSettingsScreen/>;break;case 'connections':screen=<AndroidConnectionsScreen/>;break;case 'sims':screen=<AndroidSimManagerScreen/>;break;case 'add':screen=<AndroidAddEsimScreen/>;break;case 'manual':screen=<AndroidActivationCodeScreen/>;break;case 'lpa':screen=<AndroidActivationCodeScreen filled/>;break;case 'review':screen=<AndroidInstallationScreen/>;break;case 'installed':screen=<AndroidInstallationScreen done/>;break;default:screen=<ManualScannerScreen android/>; } }
 else { switch(scene) { case 'settings':screen=<IOSSettingsScreen/>;break;case 'cellular':screen=<IOSCellularScreen/>;break;case 'add':screen=<IOSAddEsimScreen/>;break;case 'scanner':screen=<ManualScannerScreen android={false}/>;break;case 'manual':screen=<IOSManualEntryScreen/>;break;case 'details':screen=<IOSManualEntryScreen filled/>;break;case 'review':screen=<IOSInstallationScreen/>;break;case 'installed':screen=<IOSInstallationScreen done/>;break;default:screen=<IOSSettingsScreen/>; } }
 return <div className={`manual-os ${android?'os-android':'os-ios'}`} data-education-platform={platform} data-education-scene={scene}><div className="os-status" dir="ltr"><strong>9:41</strong><span><Signal/><Wifi/><span className="os-battery"/></span></div><div className="os-page">{screen}</div>{android&&<div className="os-android-navigation" dir="ltr"><span>Ⅲ</span><span>□</span><ChevronLeft/></div>}</div>;
}