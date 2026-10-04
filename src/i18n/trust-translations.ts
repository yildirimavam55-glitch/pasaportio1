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

const extraSource = [
  "Why Travely?", "Less risk. Better-value internet. Easier travel.",
  "Choose an eSIM plan, see the price up front and get connected in a few steps.",
  "An alternative to roaming", "Choose destination", "For unused eSIMs, within 14 days of purchase",
  "Editorial examples · not customer reviews", "Flexible plans", "Installed in 60 seconds",
  "14-Day Refund Guarantee", "Sample rating · not a customer rating",
] as const;

const extraRows: Partial<Record<UiLocale, readonly string[]>> = {
  fr: ["Pourquoi Travely ?", "Moins de risques. Internet à prix avantageux. Voyager plus simplement.", "Choisissez un forfait eSIM, découvrez le prix à l’avance et connectez-vous en quelques étapes.", "Une alternative au roaming", "Choisir une destination", "Pour les eSIM non utilisées, dans les 14 jours suivant l’achat", "Exemples éditoriaux · pas des avis clients", "Forfaits flexibles", "Installation en 60 secondes", "Garantie de remboursement sous 14 jours", "Note d’exemple · pas une note client"],
  es: ["¿Por qué Travely?", "Menos riesgos. Internet a mejor precio. Viajes más sencillos.", "Elige un plan eSIM, consulta el precio por adelantado y conéctate en pocos pasos.", "Una alternativa al roaming", "Elegir destino", "Para eSIM sin usar, durante los 14 días posteriores a la compra", "Ejemplos editoriales · no son opiniones de clientes", "Planes flexibles", "Instalación en 60 segundos", "Garantía de devolución de 14 días", "Valoración de ejemplo · no es una valoración de clientes"],
  it: ["Perché Travely?", "Meno rischi. Internet conveniente. Viaggi più semplici.", "Scegli un piano eSIM, conosci il prezzo in anticipo e connettiti in pochi passaggi.", "Un’alternativa al roaming", "Scegli la destinazione", "Per le eSIM non utilizzate, entro 14 giorni dall’acquisto", "Esempi editoriali · non sono recensioni dei clienti", "Piani flessibili", "Installazione in 60 secondi", "Garanzia di rimborso entro 14 giorni", "Valutazione di esempio · non una valutazione dei clienti"],
  pt: ["Porquê Travely?", "Menos riscos. Internet com melhor preço. Viajar sem complicações.", "Escolhe um plano eSIM, vê o preço antecipadamente e liga-te em poucos passos.", "Uma alternativa ao roaming", "Escolher destino", "Para eSIM não utilizados, até 14 dias após a compra", "Exemplos editoriais · não são avaliações de clientes", "Planos flexíveis", "Instalação em 60 segundos", "Garantia de reembolso em 14 dias", "Avaliação de exemplo · não é avaliação de clientes"],
  nl: ["Waarom Travely?", "Minder risico. Voordeliger internet. Makkelijker reizen.", "Kies een eSIM-bundel, zie vooraf de prijs en maak in een paar stappen verbinding.", "Een alternatief voor roaming", "Bestemming kiezen", "Voor ongebruikte eSIMs, binnen 14 dagen na aankoop", "Redactionele voorbeelden · geen klantbeoordelingen", "Flexibele bundels", "Installatie in 60 seconden", "14 dagen terugbetalingsgarantie", "Voorbeeldscore · geen klantbeoordeling"],
  pl: ["Dlaczego Travely?", "Mniej ryzyka. Internet w korzystniejszej cenie. Łatwiejsze podróże.", "Wybierz pakiet eSIM, poznaj cenę z góry i połącz się w kilku krokach.", "Alternatywa dla roamingu", "Wybierz kierunek", "Dla niewykorzystanych eSIM, w ciągu 14 dni od zakupu", "Przykłady redakcyjne · nie są opiniami klientów", "Elastyczne pakiety", "Instalacja w 60 sekund", "14-dniowa gwarancja zwrotu", "Przykładowa ocena · nie jest oceną klientów"],
  ru: ["Почему Travely?", "Меньше рисков. Выгоднее интернет. Проще путешествовать.", "Выберите тариф eSIM, узнайте цену заранее и подключитесь за несколько шагов.", "Альтернатива роумингу", "Выбрать направление", "Для неиспользованных eSIM, в течение 14 дней после покупки", "Редакционные примеры · не отзывы клиентов", "Гибкие тарифы", "Установка за 60 секунд", "Гарантия возврата в течение 14 дней", "Пример оценки · не оценка клиентов"],
  ar: ["لماذا Travely؟", "مخاطر أقل. إنترنت بقيمة أفضل. سفر أسهل.", "اختر باقة eSIM واطّلع على السعر مقدمًا واتصل في خطوات قليلة.", "بديل للتجوال", "اختر وجهتك", "لشرائح eSIM غير المستخدمة، خلال 14 يومًا من الشراء", "أمثلة تحريرية · ليست آراء عملاء", "باقات مرنة", "التثبيت في 60 ثانية", "ضمان استرداد خلال 14 يومًا", "تقييم تجريبي · ليس تقييم عملاء"],
  ja: ["Travelyを選ぶ理由", "リスクを減らし、通信費を抑えて、もっと気軽な旅を。", "eSIMプランを選び、料金を事前に確認して、数ステップで接続できます。", "ローミングに代わる選択肢", "旅行先を選ぶ", "未使用のeSIMは購入から14日以内", "編集用サンプル · お客様の声ではありません", "柔軟なプラン", "60秒でインストール", "14日間の返金保証", "サンプル評価 · お客様の評価ではありません"],
  ko: ["왜 Travely인가요?", "위험은 줄이고, 인터넷은 합리적으로, 여행은 더 쉽게.", "eSIM 요금제를 고르고 가격을 미리 확인한 뒤 몇 단계만 거치면 연결할 수 있어요.", "로밍을 대신할 선택지", "여행지 선택", "미사용 eSIM은 구매 후 14일 이내", "편집용 예시 · 고객 후기가 아닙니다", "유연한 요금제", "60초 만에 설치", "14일 환불 보장", "예시 평점 · 고객 평점이 아닙니다"],
  zh: ["为什么选择 Travely？", "风险更少。流量更划算。旅行更轻松。", "选择 eSIM 套餐，提前查看价格，只需几步即可连接。", "漫游之外的选择", "选择目的地", "未使用的 eSIM，可在购买后 14 天内申请", "编辑示例 · 非真实客户评价", "灵活套餐", "60 秒即可安装", "14 天退款保障", "示例评分 · 非客户评分"],
};


// Roaming comparison component copy (numbers are never translated; they are locale-formatted).
const compareSource = [
  "The alternative to roaming", "Up to", "cheaper*", "Compare eSIM prices with selected roaming offers.",
  "See eSIM prices", "Carrier roaming", "You save", "Price advantage",
  "* Example comparison. Prices may vary by provider, country and period.", "Price comparison",
  "Internet abroad – transparent, with no surprise roaming charges.", "Compare our eSIM packages for your destination.",
] as const;

const compareRows: Partial<Record<UiLocale, readonly string[]>> = {
  fr: ["L’alternative au roaming", "Jusqu’à", "moins cher*", "Comparez les prix eSIM avec des offres de roaming sélectionnées.", "Voir les prix eSIM", "Roaming opérateur", "Vous économisez", "Avantage prix", "* Exemple de comparaison. Les prix peuvent varier selon l’opérateur, le pays et la période.", "Comparaison des prix", "Internet à l’étranger – transparent, sans frais de roaming surprises.", "Comparez nos forfaits eSIM pour votre destination."],
  es: ["La alternativa al roaming", "Hasta un", "más barato*", "Compara los precios eSIM con ofertas de roaming seleccionadas.", "Ver precios eSIM", "Roaming del operador", "Ahorras", "Ventaja de precio", "* Comparación de ejemplo. Los precios pueden variar según el operador, el país y el periodo.", "Comparación de precios", "Internet en el extranjero: transparente y sin cargos de roaming inesperados.", "Compara nuestros planes eSIM para tu destino."],
  it: ["L’alternativa al roaming", "Fino al", "in meno*", "Confronta i prezzi eSIM con offerte roaming selezionate.", "Vedi i prezzi eSIM", "Roaming dell’operatore", "Risparmi", "Vantaggio di prezzo", "* Confronto di esempio. I prezzi possono variare in base a operatore, paese e periodo.", "Confronto prezzi", "Internet all’estero: trasparente e senza costi di roaming a sorpresa.", "Confronta i nostri piani eSIM per la tua destinazione."],
  pt: ["A alternativa ao roaming", "Até", "mais barato*", "Compara os preços eSIM com ofertas de roaming selecionadas.", "Ver preços eSIM", "Roaming do operador", "Poupas", "Vantagem de preço", "* Comparação de exemplo. Os preços podem variar consoante o operador, o país e o período.", "Comparação de preços", "Internet no estrangeiro – transparente e sem custos de roaming inesperados.", "Compara os nossos planos eSIM para o teu destino."],
  nl: ["Het alternatief voor roaming", "Tot", "goedkoper*", "Vergelijk eSIM-prijzen met geselecteerde roamingaanbiedingen.", "Bekijk eSIM-prijzen", "Roaming via provider", "Je bespaart", "Prijsvoordeel", "* Voorbeeldvergelijking. Prijzen kunnen per provider, land en periode verschillen.", "Prijsvergelijking", "Internet in het buitenland – transparant, zonder verrassende roamingkosten.", "Vergelijk onze eSIM-bundels voor je bestemming."],
  pl: ["Alternatywa dla roamingu", "Do", "taniej*", "Porównaj ceny eSIM z wybranymi ofertami roamingu.", "Zobacz ceny eSIM", "Roaming operatora", "Oszczędzasz", "Przewaga cenowa", "* Przykładowe porównanie. Ceny mogą się różnić w zależności od operatora, kraju i okresu.", "Porównanie cen", "Internet za granicą – przejrzyście i bez niespodziewanych opłat za roaming.", "Porównaj nasze pakiety eSIM dla swojego kierunku."],
  ru: ["Альтернатива роумингу", "До", "дешевле*", "Сравните цены eSIM с выбранными роуминговыми предложениями.", "Смотреть цены eSIM", "Роуминг оператора", "Вы экономите", "Ценовое преимущество", "* Пример сравнения. Цены могут различаться в зависимости от оператора, страны и периода.", "Сравнение цен", "Интернет за границей — прозрачно и без неожиданных расходов на роуминг.", "Сравните наши тарифы eSIM для вашего направления."],
  ar: ["البديل عن التجوال", "حتى", "أرخص*", "قارن أسعار eSIM مع عروض تجوال مختارة.", "عرض أسعار eSIM", "تجوال المشغّل", "توفّر", "ميزة السعر", "* مقارنة توضيحية. قد تختلف الأسعار حسب المشغّل والبلد والفترة.", "مقارنة الأسعار", "إنترنت في الخارج – بشفافية ودون رسوم تجوال مفاجئة.", "قارن باقات eSIM لوجهتك."],
  ja: ["ローミングに代わる選択肢", "最大", "お得*", "eSIMの料金を、選ばれたローミングプランと比較できます。", "eSIMの料金を見る", "携帯会社のローミング", "節約額", "価格メリット", "* 比較例です。料金は通信会社・国・期間により異なる場合があります。", "料金比較", "海外でのインターネットを、明確な料金で。思わぬローミング料金の心配なし。", "旅行先のeSIMプランを比較しましょう。"],
  ko: ["로밍을 대신할 선택", "최대", "저렴*", "eSIM 가격을 선별한 로밍 요금과 비교해 보세요.", "eSIM 가격 보기", "통신사 로밍", "절약 금액", "가격 혜택", "* 비교 예시입니다. 가격은 통신사, 국가, 기간에 따라 달라질 수 있습니다.", "가격 비교", "해외 인터넷을 투명하게, 예상치 못한 로밍 요금 없이.", "여행지에 맞는 eSIM 요금제를 비교해 보세요."],
  zh: ["漫游之外的选择", "最高便宜", "*", "将 eSIM 价格与精选漫游方案进行比较。", "查看 eSIM 价格", "运营商漫游", "您可节省", "价格优势", "* 示例比较。价格可能因运营商、国家和时间而异。", "价格比较", "出境上网——价格透明，没有意外的漫游费用。", "为您的目的地比较我们的 eSIM 套餐。"],
};

export const TRUST_TRANSLATIONS: Partial<Record<UiLocale, Record<string, string>>> = Object.fromEntries(
  Object.entries(rows).map(([locale, values]) => [locale, {
    ...Object.fromEntries(source.map((key, index) => [key, values[index]])),
    ...Object.fromEntries(extraSource.map((key, index) => [key, extraRows[locale as UiLocale]?.[index]])),
    ...Object.fromEntries(compareSource.map((key, index) => [key, compareRows[locale as UiLocale]?.[index]])),
  }]),
);
