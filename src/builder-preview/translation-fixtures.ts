import { TRANSLATION_TARGETS, mergeMachineTranslation } from "@/domain/storefront/translation-workflow";
import { sanitizeV2Page, type V2PageConfig, type LT, type V2Section } from "@/domain/storefront/v2";

// Explicitly curated acceptance fixtures, NOT an AI/provider. Exact Turkish source match only.
const ROWS = [
 ["Yolculuğuna bağlı kal", "Stay connected on your journey", "Bleib auf deiner Reise verbunden", "Reste connecté pendant ton voyage", "Mantente conectado durante tu viaje", "Resta connesso durante il viaggio", "Mantém-te ligado na tua viagem", "Blijf verbonden tijdens je reis", "Pozostań w kontakcie w podróży", "ابقَ على اتصال خلال رحلتك", "Оставайся на связи в поездке", "旅先でもつながろう", "여행 중에도 연결을 유지하세요", "旅途中保持连接"],
 ["Seyahat planına uygun eSIM paketini keşfet.", "Discover an eSIM plan for your journey.", "Entdecke ein eSIM-Paket für deine Reise.", "Découvre un forfait eSIM pour ton voyage.", "Descubre un plan eSIM para tu viaje.", "Scopri un piano eSIM per il tuo viaggio.", "Descobre um plano eSIM para a tua viagem.", "Ontdek een eSIM-bundel voor je reis.", "Odkryj pakiet eSIM na swoją podróż.", "اكتشف باقة eSIM لرحلتك.", "Найди пакет eSIM для своей поездки.", "旅に合ったeSIMプランを見つけよう。", "여행에 맞는 eSIM 요금제를 찾아보세요.", "发现适合旅程的eSIM套餐。"],
 ["Nereye seyahat ediyorsun?", "Where are you travelling?", "Wohin reist du?", "Où voyages-tu ?", "¿Adónde viajas?", "Dove viaggi?", "Para onde viajas?", "Waar reis je naartoe?", "Dokąd podróżujesz?", "إلى أين تسافر؟", "Куда ты едешь?", "どこへ旅行しますか？", "어디로 여행하시나요?", "你要去哪里旅行？"],
 ["Ülke ara", "Search countries", "Land suchen", "Chercher un pays", "Buscar país", "Cerca un paese", "Procurar país", "Land zoeken", "Szukaj kraju", "ابحث عن دولة", "Поиск страны", "国を検索", "국가 검색", "搜索国家"],
 ["Bilgi", "Information", "Information", "Information", "Información", "Informazioni", "Informação", "Informatie", "Informacje", "معلومات", "Информация", "情報", "안내", "信息"],
 ["Seyahate çıkmadan önce cihazını kontrol et.", "Check your device before travelling.", "Prüfe dein Gerät vor der Reise.", "Vérifie ton appareil avant le départ.", "Comprueba tu dispositivo antes de viajar.", "Controlla il tuo dispositivo prima del viaggio.", "Verifica o teu dispositivo antes da viagem.", "Controleer je apparaat voor vertrek.", "Sprawdź swoje urządzenie przed podróżą.", "تحقق من جهازك قبل السفر.", "Проверь своё устройство перед поездкой.", "旅行前に端末を確認しましょう。", "여행 전에 기기를 확인하세요.", "出发前请检查你的设备。"],
];
// UI_LOCALES order is tr,en,de,fr,es,it,pt,nl,pl,ar,ru,ja,ko,zh; use its shared target registry.
export const DEMO_TRANSLATIONS: Record<string, Partial<Record<typeof TRANSLATION_TARGETS[number], string>>> = Object.fromEntries(ROWS.map(([source, ...translations]) => [source!, Object.fromEntries(TRANSLATION_TARGETS.map((code, index) => [code, translations[index]!]))]));
DEMO_TRANSLATIONS["eSIM"] = Object.fromEntries(TRANSLATION_TARGETS.map(code => [code, "eSIM"]));
export const demoLT = (tr: string): LT => ({ tr, de: "", en: "" });
export function simulateSectionTranslations(section: V2Section): { section: V2Section; unknown: number } {
  let unknown = 0;
  const text = Object.fromEntries(Object.entries(section.text).map(([key, value]) => {
    const fixture = DEMO_TRANSLATIONS[value.tr];
    if (!fixture) { if (value.tr.trim()) unknown++; return [key, value]; }
    return [key, mergeMachineTranslation(value, value, fixture)];
  }));
  return { section: { ...section, text }, unknown };
}

/** Scope the isolated demo to its submitted sections; production singleton defaults stay untouched. */
export function sanitizeDemoPage(page: V2PageConfig): V2PageConfig {
 const ids=new Set(page.sections.map(s=>s.id));
 const clean=sanitizeV2Page(page,'esim');
 return {...clean,sections:clean.sections.filter(s=>ids.has(s.id))};
}
