do $$
declare
  v_dest uuid;
  v_esim uuid;
  v_road uuid;
  v_route uuid;
  v_turkiye uuid;
  v_internet uuid;
  v_sila uuid;
begin
  select id into v_dest from public.guide_categories where slug = 'destinasyonlar';
  select id into v_esim from public.guide_categories where slug = 'esim-internet';
  select id into v_road from public.guide_categories where slug = 'arabayla-seyahat';

  insert into public.guide_routes (slug, country_isos, labels, active, sort_order)
  values (
    'sila-yolu',
    array['DE','AT','SI','HR','RS','BG','TR']::text[],
    '{"tr":{"name":"Sıla Yolu"},"de":{"name":"Sıla Yolu"},"en":{"name":"Sila Road"}}'::jsonb,
    true,
    10
  )
  on conflict (slug) do update set
    country_isos = excluded.country_isos,
    labels = excluded.labels,
    active = true,
    sort_order = excluded.sort_order
  returning id into v_route;

  insert into public.guides (
    slug, category_id, content_type, status, published_at, featured, sort_order,
    hero_image_url, hero_alt, reading_minutes
  )
  values (
    'turkiye-seyahat-rehberi', v_dest, 'DESTINATION', 'PUBLISHED', now(), true, 10,
    '/__l5e/assets-v1/20923f4a-6926-4cef-957b-a3e407e27826/destination-turkiye.jpg',
    'Türkiye sahilinde tarihi yarımada ve deniz manzarası',
    7
  )
  on conflict (slug) do update set
    category_id = excluded.category_id,
    content_type = excluded.content_type,
    status = 'PUBLISHED',
    published_at = coalesce(public.guides.published_at, now()),
    featured = true,
    sort_order = excluded.sort_order,
    hero_image_url = excluded.hero_image_url,
    hero_alt = excluded.hero_alt,
    reading_minutes = excluded.reading_minutes
  returning id into v_turkiye;

  insert into public.guides (
    slug, category_id, content_type, status, published_at, featured, sort_order,
    hero_image_url, hero_alt, reading_minutes
  )
  values (
    'yurt-disinda-ne-kadar-internet-gerekir', v_esim, 'HOW_TO', 'PUBLISHED', now(), true, 20,
    '/__l5e/assets-v1/3bcb14d6-175b-455b-b256-ec25681de947/esim-cross-sell.jpg',
    'Yurt dışında telefonuyla harita ve mesajlaşma kullanan gezgin',
    6
  )
  on conflict (slug) do update set
    category_id = excluded.category_id,
    content_type = excluded.content_type,
    status = 'PUBLISHED',
    published_at = coalesce(public.guides.published_at, now()),
    featured = true,
    sort_order = excluded.sort_order,
    hero_image_url = excluded.hero_image_url,
    hero_alt = excluded.hero_alt,
    reading_minutes = excluded.reading_minutes
  returning id into v_internet;

  insert into public.guides (
    slug, category_id, content_type, status, published_at, featured, sort_order,
    hero_image_url, hero_alt, reading_minutes
  )
  values (
    'sila-yolu-rehberi', v_road, 'ROAD_TRIP', 'PUBLISHED', now(), true, 30,
    '/__l5e/assets-v1/f1f06888-3e58-4791-83d2-c9363e7101fc/destination-sila-yolu.jpg',
    'Avrupa’dan Türkiye’ye uzanan otoyol rotasında gün batımı',
    9
  )
  on conflict (slug) do update set
    category_id = excluded.category_id,
    content_type = excluded.content_type,
    status = 'PUBLISHED',
    published_at = coalesce(public.guides.published_at, now()),
    featured = true,
    sort_order = excluded.sort_order,
    hero_image_url = excluded.hero_image_url,
    hero_alt = excluded.hero_alt,
    reading_minutes = excluded.reading_minutes
  returning id into v_sila;

  insert into public.guide_translations (
    guide_id, locale, slug, title, excerpt, intro, sections, faq,
    seo_title, seo_description, translation_status
  )
  values
  (
    v_turkiye,
    'tr',
    'turkiye-seyahat-rehberi',
    'Türkiye Seyahat Rehberi',
    'Türkiye’ye giderken şehir, sahil, ulaşım ve bağlantı ihtiyaçlarını tek bakışta planla.',
    'Türkiye, kısa şehir kaçamaklarından uzun aile ziyaretlerine kadar çok farklı seyahat ritimlerini aynı yolculukta birleştirir. Bu rehber; varış öncesi hazırlık, şehirler arası ulaşım, havalimanı geçişleri ve seyahatte internet ihtiyacını sade bir akışta toplar.',
    '[{"heading":"Gitmeden önce netleştirmen gerekenler","body":"Seyahat süreni, ilk ineceğin şehri, yurt içinde başka şehirlere geçip geçmeyeceğini ve yanında kaç cihaz olacağını önceden belirle. Türkiye içinde rota değişiklikleri sık olabildiği için internet erişimi; harita, araç çağırma, otel iletişimi ve banka doğrulamaları için kritik hale gelir."},{"heading":"Ulaşım ve şehir geçişleri","body":"İstanbul, Antalya, İzmir ve Ankara gibi ana giriş noktalarında havalimanından merkeze geçiş seçenekleri güçlüdür. Tatil bölgelerine geçerken uçuş, otobüs veya araç kiralama tercihini varış saatine göre planlamak rahatlık sağlar."},{"heading":"Bağlantı ihtiyacı","body":"Kısa seyahatlerde harita ve mesajlaşma ağırlıklı kullanım yeterli olabilir. Uzun konaklamalarda video, hotspot ve iş görüşmeleri için daha yüksek veri paketleri seçmek kesintisiz deneyim sağlar. Travely yalnızca Türkiye için aktif ve yayınlanmış paket varsa ilgili eSIM seçeneğini gösterir."}]'::jsonb,
    '[{"question":"Türkiye seyahatinde eSIM ne zaman alınmalı?","answer":"Yola çıkmadan önce almak en rahatı sağlar; kurulum bilgileri hazır olur ve varışta bağlantı beklemezsin."},{"question":"Bu rehberde gösterilen hizmetler sabit mi?","answer":"Hayır. Travely yalnızca o anda aktif, yayınlanmış ve satın alınabilir hizmetleri gösterir."}]'::jsonb,
    'Türkiye Seyahat Rehberi — Travely',
    'Türkiye seyahati için varış, ulaşım, bağlantı ve gerçek Travely hizmetlerini planla.',
    'PUBLISHED'
  ),
  (
    v_internet,
    'tr',
    'yurt-disinda-ne-kadar-internet-gerekir',
    'Yurt dışında ne kadar internet gerekir?',
    'Harita, mesajlaşma, sosyal medya ve hotspot kullanımına göre seyahat internet ihtiyacını hesapla.',
    'Yurt dışında internet ihtiyacı sadece gün sayısına bağlı değildir. Harita kullanımı, sosyal medya, video, iş görüşmeleri ve hotspot alışkanlığı paketin boyutunu belirler. Bu rehber, gereğinden büyük paket almadan güvenli bir aralık seçmene yardımcı olur.',
    '[{"heading":"Temel kullanım","body":"Günlük harita, mesajlaşma, e-posta ve bilet uygulamaları için düşük veri tüketimi yeterli olur. Kısa şehir tatillerinde birkaç GB çoğu kullanıcıya esneklik sağlar."},{"heading":"Orta ve yoğun kullanım","body":"Fotoğraf paylaşımı, kısa videolar, müzik ve düzenli navigasyon orta seviyeye çıkar. Görüntülü görüşme, hotspot ve uzaktan çalışma ise veri tüketimini hızlı artırır."},{"heading":"Doğru paketi seçme","body":"Gideceğin ülkeyi, kaç gün kalacağını ve kullanım tarzını birlikte düşün. Travely’de ilgili ülke için aktif ve yayınlanmış eSIM ürünü varsa seçenekler gerçek katalog fiyatıyla gösterilir; ürün yoksa satın alma çağrısı gösterilmez."}]'::jsonb,
    '[{"question":"Video izlemek eSIM paketini hızlı bitirir mi?","answer":"Evet. Video ve hotspot en yüksek tüketim yaratan kullanımlardır; bu alışkanlık varsa daha yüksek veri seçmek güvenlidir."},{"question":"Her rehberde eSIM satın alma butonu olur mu?","answer":"Hayır. Buton yalnızca ilgili ülke ve hizmet için gerçekten yayınlanmış ürün olduğunda görünür."}]'::jsonb,
    'Yurt dışında ne kadar internet gerekir? — Travely',
    'Seyahat süresi ve kullanım tarzına göre yurt dışı internet ihtiyacını planla.',
    'PUBLISHED'
  ),
  (
    v_sila,
    'tr',
    'sila-yolu-rehberi',
    'Sıla Yolu Rehberi',
    'Almanya’dan Türkiye’ye kara yoluyla giderken rota ülkeleri, sınırlar, bağlantı ve mola planı.',
    'Sıla Yolu, tek bir ülke rehberi değil; Almanya’dan başlayıp Avusturya, Slovenya, Hırvatistan, Sırbistan, Bulgaristan ve Türkiye’ye uzanan çok duraklı bir seyahat akışıdır. Hazırlık, sınır geçişleri, bağlantı ve ileride eklenecek otoyol/vignette servisleri aynı içerik modelinde birlikte yönetilmelidir.',
    '[{"heading":"Ana rota ülkeleri","body":"Yaygın rota Almanya, Avusturya, Slovenya, Hırvatistan, Sırbistan, Bulgaristan ve Türkiye üzerinden ilerler. Her ülke için geçiş kuralları, mola planı ve yoğun sınır saatleri seyahat tarihine göre değişebilir."},{"heading":"Vignette ve otoyol hazırlığı","body":"Bazı ülkelerde otoyol kullanımı için vignette veya geçiş ücreti gerekir. Travely bu rehberi gelecekte vignette ürünleriyle ilişkilendirebilecek şekilde hazırlar; ürün aktif değilse sahte satın alma butonu gösterilmez."},{"heading":"Yolda internet ve iletişim","body":"Uzun rota boyunca navigasyon, aile iletişimi, konaklama mesajları ve sınır beklemelerinde bağlantı önemlidir. Travely yalnızca ilgili ülkelerde aktif ve yayınlanmış eSIM ürünü varsa bağlama uygun hizmet kartlarını gösterir."}]'::jsonb,
    '[{"question":"Sıla Yolu tek ülke rehberi mi?","answer":"Hayır. Rota Almanya’dan Türkiye’ye uzanan birden fazla ülkeyi kapsar ve içerik ilişkileri bu yüzden çoklu ülke olarak tutulur."},{"question":"Vignette satın alma burada açık mı?","answer":"Bu V1 testinde vignette satışı açılmadı. Sistem gelecekte ürün aktif olduğunda rehberi yeniden kurmadan ilgili hizmeti gösterecek şekilde hazırdır."}]'::jsonb,
    'Sıla Yolu Rehberi — Travely',
    'Almanya’dan Türkiye’ye Sıla Yolu için rota ülkeleri, sınırlar, bağlantı ve hizmet planı.',
    'PUBLISHED'
  )
  on conflict (guide_id, locale) do update set
    slug = excluded.slug,
    title = excluded.title,
    excerpt = excluded.excerpt,
    intro = excluded.intro,
    sections = excluded.sections,
    faq = excluded.faq,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    translation_status = 'PUBLISHED';

  delete from public.guide_relations
  where guide_id in (v_turkiye, v_internet, v_sila)
    and relation_type in ('COUNTRY','ROUTE','SERVICE');

  insert into public.guide_relations (guide_id, relation_type, country_iso, service_type, route_id, cta_enabled, sort_order, meta)
  values
    (v_turkiye, 'COUNTRY', 'TR', null, null, true, 10, '{}'::jsonb),
    (v_turkiye, 'SERVICE', null, 'ESIM', null, true, 20, '{}'::jsonb),
    (v_internet, 'SERVICE', null, 'ESIM', null, false, 10, '{"intent":"education"}'::jsonb),
    (v_sila, 'ROUTE', null, null, v_route, false, 5, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'DE', null, null, true, 10, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'AT', null, null, true, 20, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'SI', null, null, true, 30, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'HR', null, null, true, 40, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'RS', null, null, true, 50, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'BG', null, null, true, 60, '{}'::jsonb),
    (v_sila, 'COUNTRY', 'TR', null, null, true, 70, '{}'::jsonb),
    (v_sila, 'SERVICE', null, 'ESIM', null, true, 80, '{}'::jsonb);
end $$;