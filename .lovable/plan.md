# Production SEO routing — minimum correction

## Doğrulanan durum
- Production en güncel SEO route kodunu servis ediyor; yayınlanmış üç Türkçe kayıt yeni URL'lerde 200 dönüyor.
- Production ve preview aynı Lovable Cloud veritabanını kullanıyor; SEO migration alanları mevcut.
- DE/EN için yayınlanmış çeviri bulunmadığından bu dillerdeki 404 yanıtları beklenen davranış.
- `/sitemap/xml` dinamik ve doğru; yalnız PUBLISHED + indexable kayıtları içeriyor.
- Legacy `/guides/...` sayfaları çalışıyor ve canonical yeni localized URL'yi gösteriyor.
- Eksik olan tek istenen adres `/tr`: route tanımlı olmadığı için gerçek router 404'ü dönüyor.

## Uygulama
- `/tr` için küçük bir route ekle.
- Mevcut `TravelExperience` ana sayfasını aynen kullan; tasarım, section sırası ve iş mantığını değiştirme.
- Route açıldığında mevcut i18n state'i üzerinden Türkçe dili seç; katalog, Finder ve mevcut ana sayfa akışını aynen koru.
- `/tr` için kendine özgü title, description, Open Graph ve Twitter metadata ekle.

## Doğrulama
- Build durumunu kontrol et.
- Local `/tr` ve mevcut localized SEO route'larını kontrol et.
- Değişiklik yayınlandıktan sonra production `/tr`, yayınlanmış destination/article URL'leri, canonical, hreflang, JSON-LD, sitemap ve legacy URL'leri yeniden test et.
- 360/390/430 px mobil route yüklemesini doğrula.

## Değişmeyecekler
SEO veri modeli, içerikler, slug'lar, DE/EN yayın durumları, sitemap mimarisi, legacy route'lar, katalog, fiyat, Finder, checkout, auth ve Admin.
