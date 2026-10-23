import type { StorefrontConfig } from './registry';
import { createV2Section, type V2PageConfig } from './v2';
/** Adapter to the single V2 translation engine; not a second content store. */
export function chromeTranslationPage(config:StorefrontConfig):V2PageConfig{
 const sections=[...config.navigation.map(row=>{const s=createV2Section('NOTICE');s.id=`nav-${row.id}`;s.text={title:row.label};return s;}),...config.footerLinks.map(row=>{const s=createV2Section('NOTICE');s.id=`footer-${row.id}`;s.text={title:row.label};return s;})];
 for(const key of ['newsletterTitle','newsletterDescription','newsletterPlaceholder','newsletterCta'] as const){const n=createV2Section('NOTICE');n.id=`newsletter-${key}`;n.text={title:config.footer[key]};sections.push(n);}
 for(const key of ['services','help','legal'] as const)if(config.footer.groupLabels?.[key]){const n=createV2Section('NOTICE');n.id=`group-${key}`;n.text={title:config.footer.groupLabels[key]};sections.push(n);}
 const s=createV2Section('NOTICE');s.id='chrome-copy';s.text={title:config.footerText,text:config.copyright};sections.push(s);
 if(config.accountPresentation){const a=createV2Section('NOTICE');a.id='account-copy';a.text={title:config.accountPresentation.title,text:config.accountPresentation.text};sections.push(a);}
 return {page:'esim',version:1,sections};
}
export function applyChromeTranslation(config:StorefrontConfig,page:V2PageConfig):StorefrontConfig{
 const title=(id:string)=>page.sections.find(s=>s.id===id)?.text['title'];const copy=page.sections.find(s=>s.id==='chrome-copy');const account=page.sections.find(s=>s.id==='account-copy');
 return {...config,footer:{...config.footer,...Object.fromEntries(['newsletterTitle','newsletterDescription','newsletterPlaceholder','newsletterCta'].map(key=>[key,title(`newsletter-${key}`)??config.footer[key as keyof typeof config.footer]])),...(config.footer.groupLabels?{groupLabels:{services:title('group-services')??config.footer.groupLabels.services,help:title('group-help')??config.footer.groupLabels.help,legal:title('group-legal')??config.footer.groupLabels.legal}}:{})},navigation:config.navigation.map(row=>({...row,label:title(`nav-${row.id}`)??row.label})),footerLinks:config.footerLinks.map(row=>({...row,label:title(`footer-${row.id}`)??row.label})),footerText:copy?.text['title']??config.footerText,copyright:copy?.text['text']??config.copyright,...(config.accountPresentation&&account?{accountPresentation:{...config.accountPresentation,title:account.text['title']!,text:account.text['text']!}}:{})};
}
