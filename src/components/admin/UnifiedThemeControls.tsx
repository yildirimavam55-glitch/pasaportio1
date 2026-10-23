import { sanitizeTheme,type ThemeConfig } from '@/domain/theme/config';
/** Same controls in authenticated Admin and isolated acceptance workspace. */
export function UnifiedThemeControls({value,onChange}:{value:ThemeConfig;onChange:(value:ThemeConfig)=>void}){
 const set=(patch:Partial<ThemeConfig>)=>onChange(sanitizeTheme({...value,...patch}));
 return <fieldset className="grid gap-3 min-w-0"><legend>Global tasarım</legend>
 {(['primary','background','text','cta'] as const).map(key=><label key={key}>{key}<input aria-label={`theme-${key}`} type="color" value={value.colors[key]} onChange={e=>set({colors:{...value.colors,[key]:e.target.value}})}/></label>)}
 <label><input type="checkbox" aria-label="theme-applyToDark" checked={value.applyToDark===true} onChange={e=>set({applyToDark:e.target.checked})}/>Koyu temada da uygula (açık tercih)</label>
 <label>Başlık fontu<select aria-label="theme-headingFont" value={value.headingFont} onChange={e=>set({headingFont:e.target.value as ThemeConfig['headingFont']})}>{['Outfit','Manrope','Sora','Urbanist'].map(v=><option key={v}>{v}</option>)}</select></label>
 {(['headingScale','bodyScale','sectionSpacing'] as const).map(key=><label key={key}>{key}<select aria-label={`theme-${key}`} value={value[key]} onChange={e=>set({[key]:e.target.value})}>{['compact','default','large'].map(v=><option key={v}>{v}</option>)}</select></label>)}
 <label>Buton<select aria-label="theme-buttonStyle" value={value.buttonStyle} onChange={e=>set({buttonStyle:e.target.value as ThemeConfig['buttonStyle']})}>{['solid','outline','pill'].map(v=><option key={v}>{v}</option>)}</select></label>
 {(['mobile','tablet','desktop'] as const).map(device=><fieldset key={device}><legend>{device} · px</legend>{(['headingSize','bodySize'] as const).map(key=><label key={key}>{key}<input type="number" aria-label={`theme-${device}-${key}`} value={value.responsive?.[device]?.[key]??''} min={key==='headingSize'?16:12} max={key==='headingSize'?96:32} onChange={e=>set({responsive:{...value.responsive,[device]:{...value.responsive?.[device],[key]:e.target.value?Number(e.target.value):undefined}}})}/></label>)}</fieldset>)}
 </fieldset>;
}
