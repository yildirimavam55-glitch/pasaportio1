# SEO Content Engine — mevcut Rehberler altyapısının genişletilmesi

## Analiz özeti
Projede zaten bir içerik sistemi var: `guides`, `guide_translations` (TR/DE/EN, dil başına slug, SEO başlığı/açıklaması, bölümler, SSS), `guide_categories`, `guide_relations` (ülke/rota/havalimanı/servis/ürün bağlantıları), `guide_routes`, Admin → Rehberler, `/guides/$slug`, `/rehberler`, hreflang, Article + BreadcrumbList, `/sitemap/xml`. Ayrı bir blog/CMS **kurulmayacak**; bu sistem genişletilecek.

## 1. Veritabanı (yalnız ekleme, silme yok)
- `guides`: `content_type` değerleri `ARTICLE | CITY | DESTINATION`; yeni alanlar `country_iso`, `city_name`, `author_id`, `indexable` (varsayılan true), `canonical_override`.
- Durum: mevcut `DRAFT/PUBLISHED` sıralamasına `REVIEW` ve `ARCHIVED` eklenir (mevcut kayıtlar değişmez).
- `guide_translations`: `h1`, `hero_alt` (dil başına), `city_facts` (JSON: havalimanları, turistik bölgeler, seyahat tarzı, tipik kalış, kullanım örnekleri, ulaşım/navigasyon, yerel bağlantı notları, operatörler, 4G/5G durumu).
- Yeni `seo_authors` tablosu (isim, biyografi, fotoğraf) — GRANT + RLS: herkes okur, yalnız admin yazar.
- Yeni `seo_settings` (platform_settings içinde tek anahtar): site adı, varsayılan OG görseli, Organization bilgisi.

## 2. Public rotalar (dil başına gerçek URL)
- Ülke: `/tr/esim/$slug`, `/de/esim/$slug`, `/en/esim/$slug`
- Şehir: `/tr/rehber/$slug`, `/de/ratgeber/$slug`, `/en/guides/$slug`
- Makale: aynı rehber yolları (tür içerikten belirlenir)
- Mevcut `/guides/$slug` ve `/rehberler` çalışmaya devam eder; yeni dil URL'si varsa canonical oraya işaret eder (yönlendirme ile eski linkler bozulmaz).
- Tüm içerik sunucu tarafında render edilir (crawler erişimi), görseller `loading="lazy"` / hero `eager` + boyutlu.

## 3. Şablonlar
- **Şehir şablonu**: H1, kısa cevap, şehirde internet, havalimanında bağlanma, eSIM avantajları, yerel ağ + 4G/5G, veri ihtiyacı ve kaç GB, kurulum, uyumluluk, SSS, ilgili rehberler. Boş alanlar gösterilmez (şablon metinle doldurulmaz → spam önlenir).
- **Ülke şablonu**: özet + ülke şehirleri listesi + gerçek katalogdan başlangıç fiyatı + paket CTA.
- **Makale şablonu**: mevcut rehber görünümü.
- CTA'lar mevcut bileşenlerle: "[Ülke] paketlerini gör" → `/esim/paketler?destination=ISO`, "eSIM'imi bul" → mevcut Finder. Fiyat yalnız canlı katalogdan; ürün yoksa CTA gizli.

## 4. İç linkleme
- Makale sonunda: İlgili rehberler (manuel ilişkiler + aynı ülke/kategori), Popüler destinasyonlar (canlı katalog), Önerilen eSIM (katalog).
- Ülke sayfası ↔ o ülkenin şehir sayfaları otomatik bağlanır.

## 5. Teknik SEO
- Her sayfada title, description, canonical, robots (noindex/draft), OG, Twitter.
- hreflang: tr, de, en + x-default (yalnız yayınlanmış çeviriler).
- JSON-LD: Article/BlogPosting, BreadcrumbList; root'ta Organization + WebSite (tek kez). Sahte puan/yorum yok.
- Sitemap: mevcut `/sitemap/xml` genişletilir — ülke, şehir, makale, önemli public sayfalar; DRAFT/REVIEW/ARCHIVED/noindex hariç, yeni yayınlar otomatik.

## 6. Admin → İçerik → SEO
Mevcut Admin iskeleti ve Rehberler editörü kullanılır; alt sekmeler: Makaleler, Şehirler, Destinasyonlar, Kategoriler, Yazarlar, SEO Ayarları. Tüm listedeki alanlar düzenlenebilir (dil başına bağımsız).
- **SEO Dashboard**: yayınlanmış/taslak makale, şehir, destinasyon sayıları; eksik SEO başlığı/açıklama/ALT, iç link eksikliği, noindex, orphan sayfalar.
- **İçerik checklist**: SEO title, description, H1, canonical, ALT, iç link, CTA, structured data, indexable.

## 7. İçerik
Yeni otomatik makale üretilmez. Mevcut 3 rehber korunur. Şablonu test etmek için yalnızca **1 taslak** şehir kaydı (İstanbul, yayında değil).

## Dokunulmayacaklar
Tasarım sistemi, ana sayfa, checkout, katalog, fiyatlandırma, Finder algoritması, auth, eSIM Go, siparişler, provisioning.

## Teknik detaylar
- Yeni dosyalar: `src/routes/{tr,de,en}.*` rota dosyaları (ortak `SeoPage` bileşeni), `src/lib/seo-content.functions.ts` (public okuma + admin CRUD, `adminDb` + audit), `src/routes/_authenticated/admin.content.seo.*.tsx`.
- `src/lib/guides.functions.ts` ve `sitemap.xml.ts` genişletilir, yeniden yazılmaz.
- Doğrulama: typecheck, mevcut testler, sitemap/hreflang/JSON-LD için Playwright; 390 px mobil.
- Rapor: tablolar, rotalar, admin, metadata, hreflang, sitemap, structured data, iç link, kalan TODO'lar, test sonuçları.
