import "./unified-controls.css";
import { sanitizeTheme,type ThemeConfig } from '@/domain/theme/config';
/** Same controls in authenticated Admin and isolated acceptance workspace. */
export function UnifiedThemeControls({value,onChange}:{value:ThemeConfig;onChange:(value:ThemeConfig)=>void}){
 const set=(patch:Partial<ThemeConfig>)=>onChange(sanitizeTheme({...value,...patch}));
 return <fieldset className="admin-builder-controls grid gap-3 min-w-0"><legend>Global tasarım</legend>
 {(['primary','secondary','background','text','cta','success','warning','info'] as const).map(key=><label key={key}>{key}<input aria-label={`theme-${key}`} type="color" value={value.colors[key]} onChange={e=>set({colors:{...value.colors,[key]:e.target.value}})}/></label>)}
 <label><input type="checkbox" aria-label="theme-applyToDark" checked={value.applyToDark===true} onChange={e=>set({applyToDark:e.target.checked})}/>Koyu temada da uygula (açık tercih)</label>
 <label>Başlık fontu<select aria-label="theme-headingFont" value={value.headingFont} onChange={e=>set({headingFont:e.target.value as ThemeConfig['headingFont']})}>{['Outfit','Manrope','Sora','Urbanist'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Metin fontu<select aria-label="theme-bodyFont" value={value.bodyFont} onChange={e=>set({bodyFont:e.target.value as ThemeConfig['bodyFont']})}>{['Manrope','Inter','Figtree','Work Sans'].map(v=><option key={v}>{v}</option>)}</select></label>
 {Object.entries({radius:['sharp','soft','round'],shadow:['none','subtle','raised'],surface:['light','soft','contrast'],pageWidth:['narrow','default','wide'],buttonRadius:['small','default','pill'],cardRadius:['small','default','large']}).map(([key,options])=><label key={key}>{key}<select aria-label={`theme-${key}`} value={String(value[key as keyof ThemeConfig])} onChange={e=>set({[key]:e.target.value})}>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}
 {(['headingScale','bodyScale','sectionSpacing'] as const).map(key=><label key={key}>{key}<select aria-label={`theme-${key}`} value={value[key]} onChange={e=>set({[key]:e.target.value})}>{['compact','default','large'].map(v=><option key={v}>{v}</option>)}</select></label>)}
 <label>Buton<select aria-label="theme-buttonStyle" value={value.buttonStyle} onChange={e=>set({buttonStyle:e.target.value as ThemeConfig['buttonStyle']})}>{['solid','outline','pill'].map(v=><option key={v}>{v}</option>)}</select></label>
 {(['mobile','tablet','desktop'] as const).map(device=><fieldset key={device}><legend>{device} · px</legend>{(['headingSize','bodySize'] as const).map(key=><label key={key}>{key}<input type="number" aria-label={`theme-${device}-${key}`} value={value.responsive?.[device]?.[key]??''} min={key==='headingSize'?16:12} max={key==='headingSize'?96:32} onChange={e=>set({responsive:{...value.responsive,[device]:{...value.responsive?.[device],[key]:e.target.value?Number(e.target.value):undefined}}})}/></label>)}</fieldset>)}
 </fieldset>;
}
