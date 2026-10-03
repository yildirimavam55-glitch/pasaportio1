import type { UiLocale } from "./locales";

// Static translations for built-in V2 trust copy. Custom CMS text falls back to English.
const source = [
  "Built for travellers",
  "Real travellers.",
  "Real experiences.",
  "From city breaks and backpacking to business travel, our eSIMs keep travellers connected in over 190 countries.",
  "Traveller overlooking a Mediterranean coastal city",
  "Flexible plans",
  "For every trip",
  "For holidays, business & more",
  "190+ countries",
  "Connected worldwide",
  "14-day return",
  "Easily return unused eSIMs",
  "Installed in 60 seconds",
  "Directly on your device",
  "Secure payment",
  "Trusted payment methods",
  "Verified customer reviews",
  "{rating} out of 5 stars",
  "Customer reviews",
  "Based on real customer reviews",
  "DEMO / TEST — not a real customer review",
  "Review {index}",
  "Country"
] as const;

const rows: Partial<Record<UiLocale, readonly string[]>> = {
  fr: ["Conçu pour les voyageurs", "De vrais voyageurs.", "De vraies expériences.", "Escapades urbaines, voyages en sac à dos ou déplacements professionnels : nos eSIM accompagnent les voyageurs dans plus de 190 pays.", "Voyageuse admirant une ville côtière méditerranéenne", "Forfaits flexibles", "pour chaque voyage", "Pour les vacances, le travail et plus", "Plus de 190 pays", "Connecté dans le monde entier", "Retour sous 14 jours", "Retournez facilement les eSIM non utilisées", "Installation en 60 secondes", "Directement sur votre appareil", "Paiement sécurisé", "Moyens de paiement fiables", "Avis clients vérifiés", "{rating} étoiles sur 5", "Avis clients", "Basé sur de vrais avis clients", "DÉMO / TEST — pas un véritable avis client", "Avis {index}", "Pays"],
  es: ["Creado para viajeros", "Viajeros reales.", "Experiencias reales.", "Desde escapadas urbanas y viajes con mochila hasta viajes de trabajo, nuestras eSIM acompañan a los viajeros en más de 190 países.", "Viajera contemplando una ciudad costera mediterránea", "Planes flexibles", "para cada viaje", "Para vacaciones, trabajo y más", "Más de 190 países", "Conectado en todo el mundo", "Devolución en 14 días", "Devuelve fácilmente las eSIM sin usar", "Instalación en 60 segundos", "Directamente en tu dispositivo", "Pago seguro", "Métodos de pago de confianza", "Opiniones verificadas", "{rating} de 5 estrellas", "Opiniones de clientes", "Basado en opiniones reales", "DEMO / PRUEBA — no es una opinión real", "Opinión {index}", "País"],
  it: ["Pensato per chi viaggia", "Viaggiatori veri.", "Esperienze vere.", "Dalle gite in città ai viaggi zaino in spalla e di lavoro, le nostre eSIM accompagnano i viaggiatori in oltre 190 paesi.", "Viaggiatrice che guarda una città costiera mediterranea", "Piani flessibili", "per ogni viaggio", "Per vacanze, lavoro e altro", "Oltre 190 paesi", "Connessi in tutto il mondo", "Reso entro 14 giorni", "Restituisci facilmente le eSIM inutilizzate", "Installazione in 60 secondi", "Direttamente sul tuo dispositivo", "Pagamento sicuro", "Metodi di pagamento affidabili", "Recensioni verificate", "{rating} stelle su 5", "Recensioni dei clienti", "Basato su recensioni reali", "DEMO / TEST — non è una recensione reale", "Recensione {index}", "Paese"],
  pt: ["Feito para viajantes", "Viajantes reais.", "Experiências reais.", "De escapadinhas urbanas e viagens de mochila a viagens de negócios, os nossos eSIM acompanham viajantes em mais de 190 países.", "Viajante a observar uma cidade costeira mediterrânica", "Planos flexíveis", "para cada viagem", "Para férias, trabalho e mais", "Mais de 190 países", "Ligado em todo o mundo", "Devolução em 14 dias", "Devolve facilmente eSIM não utilizados", "Instalação em 60 segundos", "Diretamente no teu dispositivo", "Pagamento seguro", "Métodos de pagamento fiáveis", "Avaliações verificadas", "{rating} de 5 estrelas", "Avaliações de clientes", "Com base em avaliações reais", "DEMO / TESTE — não é uma avaliação real", "Avaliação {index}", "País"],
  nl: ["Gemaakt voor reizigers", "Echte reizigers.", "Echte ervaringen.", "Van stedentrips en backpacken tot zakenreizen: onze eSIMs reizen mee naar meer dan 190 landen.", "Reiziger kijkt uit over een mediterrane kuststad", "Flexibele bundels", "voor elke reis", "Voor vakanties, werk en meer", "Meer dan 190 landen", "Wereldwijd verbonden", "14 dagen retour", "Retourneer ongebruikte eSIMs eenvoudig", "Installatie in 60 seconden", "Direct op je toestel", "Veilig betalen", "Betrouwbare betaalmethoden", "Geverifieerde beoordelingen", "{rating} van 5 sterren", "Klantbeoordelingen", "Gebaseerd op echte beoordelingen", "DEMO / TEST — geen echte klantbeoordeling", "Beoordeling {index}", "Land"],
  pl: ["Stworzone dla podróżnych", "Prawdziwi podróżni.", "Prawdziwe doświadczenia.", "Od wyjazdów miejskich i podróży z plecakiem po podróże służbowe — nasze eSIM towarzyszą podróżnym w ponad 190 krajach.", "Podróżniczka patrząca na śródziemnomorskie miasto nad morzem", "Elastyczne pakiety", "na każdą podróż", "Na wakacje, do pracy i nie tylko", "Ponad 190 krajów", "Łączność na całym świecie", "Zwrot w ciągu 14 dni", "Łatwo zwróć niewykorzystane eSIM", "Instalacja w 60 sekund", "Bezpośrednio na urządzeniu", "Bezpieczna płatność", "Zaufane metody płatności", "Zweryfikowane opinie", "{rating} z 5 gwiazdek", "Opinie klientów", "Na podstawie prawdziwych opinii", "DEMO / TEST — to nie jest prawdziwa opinia", "Opinia {index}", "Kraj"],
  ar: ["صُممت للمسافرين", "مسافرون حقيقيون.", "تجارب حقيقية.", "من رحلات المدن والسفر بحقيبة الظهر إلى رحلات العمل، ترافق شرائح eSIM المسافرين في أكثر من 190 دولة.", "مسافرة تتأمل مدينة ساحلية على البحر المتوسط", "باقات مرنة", "لكل رحلة", "للعطلات، والعمل والمزيد", "أكثر من 190 دولة", "اتصال حول العالم", "إرجاع خلال 14 يومًا", "أعِد شرائح eSIM غير المستخدمة بسهولة", "التثبيت في 60 ثانية", "مباشرة على جهازك", "دفع آمن", "طرق دفع موثوقة", "تقييمات عملاء موثقة", "{rating} من أصل 5 نجوم", "آراء العملاء", "استنادًا إلى آراء حقيقية", "عرض تجريبي / اختبار — ليس رأيًا حقيقيًا", "رأي {index}", "البلد"],
  ru: ["Создано для путешественников", "Настоящие путешественники.", "Настоящие впечатления.", "От поездок по городам до путешествий с рюкзаком и командировок — наши eSIM сопровождают путешественников более чем в 190 странах.", "Путешественница смотрит на средиземноморский прибрежный город", "Гибкие тарифы", "для каждой поездки", "Для отпуска, работы и не только", "Более 190 стран", "Связь по всему миру", "Возврат в течение 14 дней", "Легко верните неиспользованные eSIM", "Установка за 60 секунд", "Прямо на вашем устройстве", "Безопасная оплата", "Надёжные способы оплаты", "Проверенные отзывы", "{rating} из 5 звёзд", "Отзывы клиентов", "На основе реальных отзывов", "ДЕМО / ТЕСТ — не настоящий отзыв", "Отзыв {index}", "Страна"],
  ja: ["旅行者のために", "本当の旅行者。", "本当の体験。", "街歩きからバックパック旅行、出張まで、190か国以上で旅行者を支えるeSIMです。", "地中海沿岸の街を眺める旅行者", "柔軟なプラン", "すべての旅に", "休暇にも、 出張などにも", "190か国以上", "世界中でつながる", "14日以内の返品", "未使用のeSIMを簡単に返品", "60秒でインストール", "お使いの端末に直接", "安全なお支払い", "信頼できるお支払い方法", "確認済みのお客様レビュー", "5点中{rating}点", "お客様の声", "実際のレビューに基づく", "デモ / テスト — 実際のお客様の声ではありません", "レビュー {index}", "国"],
  ko: ["여행자를 위해", "진짜 여행자.", "진짜 경험.", "도시 여행부터 배낭여행과 출장까지, 190개국 이상에서 여행자를 위한 eSIM입니다.", "지중해 해안 도시를 바라보는 여행자", "유연한 요금제", "모든 여행에", "휴가부터 출장까지", "190개국 이상", "전 세계 연결", "14일 이내 반품", "사용하지 않은 eSIM을 간편하게 반품", "60초 만에 설치", "기기에 직접 설치", "안전한 결제", "믿을 수 있는 결제 수단", "확인된 고객 리뷰", "별점 5점 중 {rating}점", "고객 후기", "실제 고객 후기를 바탕으로", "데모 / 테스트 — 실제 고객 후기가 아닙니다", "후기 {index}", "국가"],
  zh: ["为旅行者打造", "真实旅人。", "真实体验。", "无论城市短途游、背包旅行还是商务出行，我们的 eSIM 陪伴旅人前往 190 多个国家。", "旅人眺望地中海沿岸城市", "灵活套餐", "适合每段旅程", "度假、 商务及更多", "190 多个国家", "全球保持连接", "14 天退还", "轻松退还未使用的 eSIM", "60 秒即可安装", "直接安装到您的设备", "安全支付", "可信赖的支付方式", "已验证的客户评价", "满分 5 星中的 {rating} 星", "客户评价", "基于真实客户评价", "演示 / 测试 — 非真实客户评价", "评价 {index}", "国家"],
};

export const TRUST_TRANSLATIONS: Partial<Record<UiLocale, Record<string, string>>> = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => [locale, Object.fromEntries(source.map((key, index) => [key, values[index]]))]),
);
