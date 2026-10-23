import type {UiLocale} from '@/i18n/locales';
/** Reviewed static title fallbacks; stored CMS translations always take precedence. */
export const HERO_TITLE:Record<UiLocale,{titleA:string;titleB:string}>={
 tr:{titleA:'Her Zaman',titleB:'Bağlantıda Kal'},
 en:{titleA:'Always',titleB:'Stay Connected'},
 de:{titleA:'Jederzeit',titleB:'verbunden bleiben'},
 fr:{titleA:'Toujours',titleB:'Restez connecté'},
 es:{titleA:'Siempre',titleB:'Mantente conectado'},
 it:{titleA:'Sempre',titleB:'Resta connesso'},
 pt:{titleA:'Sempre',titleB:'Mantém-te ligado'},
 nl:{titleA:'Altijd',titleB:'Blijf verbonden'},
 pl:{titleA:'Zawsze',titleB:'Bądź w kontakcie'},
 ar:{titleA:'ابقَ على',titleB:'اتصال دائم'},
 ru:{titleA:'Всегда',titleB:'Оставайтесь на связи'},
 ja:{titleA:'いつでも',titleB:'つながる旅を'},
 ko:{titleA:'언제나',titleB:'연결된 여행'},
 zh:{titleA:'随时随地',titleB:'保持连接'},
};
