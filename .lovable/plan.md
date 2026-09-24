# Travely homepage finalization

## Uygulama
- `/` için mevcut `index.tsx → TravelExperience → PublicShell` render yolunu koru; eSIM ana sayfasını tek, açık bir kompozisyona indir.
- Hero ve mevcut `QuickSearch` akışını destination-first tut; doğrulanamayan sabit ülke sayısı yerine canlı katalog sayısından türetilen yerelleştirilmiş metin kullan.
- Tek sıralı ticari akış oluştur: Hero/Search → servis seçici → Trust → canlı Popular Destinations → kompakt mevcut Finder girişi → canlı Regional Discovery → güvenli Sıla Yolu rotası.
- Alt alanı How It Works → Device Compatibility → Guides → tek güçlü güven/destek alanı → Footer olarak sadeleştir; tekrar eden Lounge cross-sell, delivery, FAQ, final CTA ve ayrı “all destinations” promosyonunu ana sayfadan kaldır, diğer servis sayfalarını değiştirme.
- `DestinationDiscovery` çağrılarını belirgin popular/region bileşimine indir; ürün, fiyat ve bölge verisini yalnız mevcut yayınlanmış/müşteriye görünür katalog kaynağından almaya devam et.
- Mobil kart raylarını, boşlukları, fiyat renklerini, odak/touch durumlarını ve masaüstü gridlerini son hâline getir; hero ve üst ekran görsellerinde responsive/eager, alt görsellerde lazy loading kullan.
- Tema başlangıcını ve kalıcılığını doğrula: kayıtsız ziyaretçi Light, açık/koyu seçimleri kalıcı, System yalnız seçildiğinde işletim sistemini izler. Mevcut yayımlanmış tema tokenlarını koru.
- Güven şeridindeki iddiaları üretim gerçekleriyle uyumlu tut; QR, güvenlik ve destek ikonlarını anlamlarıyla eşleştir.

## Teknik ayrıntılar
- Ana değişiklikler `TravelExperience.tsx`, `DestinationDiscovery.tsx`, `PublicVisualSections.tsx` ve `styles.css` içinde olacak; yalnız gerekli olursa tema veya arama sunumuna dokunulacak.
- Finder hesapları, katalog/supplier sync, pricing, publish filtreleri, checkout, payment, orders, provisioning, auth, account, Admin, Guides veri sistemi ve veritabanı değişmeyecek.
- Obsolete ana sayfa dalları yalnız artık `/` üzerinde kullanılmıyorsa kaldırılacak; `/esim` ve `/lounge` davranışları korunacak.

## Doğrulama
- 360/375/390/412/430 ve 1440 px; TR/DE/EN; Light/Dark/System kalıcılığı; overflow, clipping, focus, touch hedefleri ve section sırası.
- Fresh visitor → search → Türkiye → gerçek paketler; popular → paketler; Finder → mevcut Finder; region → mevcut bölge akışı.
- Mevcut uygun testler, TypeScript kontrolü, otomatik build, runtime/console kontrolleri; hiçbir gerçek tedarikçi siparişi tetiklenmeyecek.
