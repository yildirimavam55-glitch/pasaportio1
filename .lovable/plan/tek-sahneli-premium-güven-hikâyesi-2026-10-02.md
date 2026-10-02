# Tek sahneli premium güven hikâyesi

## Uygulama
- Yalnız mevcut `V2TrustStory` bileşenini değiştir; ana sayfa ekleme noktası, sırası ve çevredeki tüm bölümler aynı kalsın.
- Seçilen “Cinematic Snap Storytelling” yönünü koyu ayrı bir alan olarak değil, Travely’nin mevcut açık yüzeyleri, mavi tonları ve tipografisiyle yorumla.
- Mobilde doğal sayfa kaydırması içinde kısa süreli sabit kalan tek görsel sahne oluştur; beş mesaj aynı telefon/seyahat kompozisyonu dönüşerek ilerlesin.
- Masaüstünde solda değişen metin, sağda sabit dönüşen telefon görseli kullan; mobil akışı yalnız büyütme.
- Kullanıcının verdiği Türkçe metinleri aynen kullan; TR/DE/EN ana kopyaları ve mevcut 14 dil statik çeviri katmanını koru.
- Fiyatları tek bir yapılandırma nesnesinden kullan; `10–15 €` ve `1,99 €'dan` değerlerini başka bileşenlerde çoğaltma.
- Son sahneden sonra yalnız iki satıra sarılabilen sade güven satırını göster; kart ızgarası kullanma.

## Hareket ve erişilebilirlik
- Sayfanın ilerlemesini `requestAnimationFrame` ile sınırlandırılmış kaydırma ölçümü üzerinden belirle; yalnız `transform`, `opacity` ve hafif `blur` kullan.
- Kaydırmayı yakalama, iç kaydırma alanı, carousel veya yatay hareket ekleme.
- Aktif sahneyi kısa bir ilerleme göstergesiyle anlaşılır kıl; tüm metni semantik olarak erişilebilir tut.
- `prefers-reduced-motion` durumunda sabit sahneyi kapatıp aynı beş mesajı doğal, hareketsiz bir akışta göster.

## Doğrulama
- 360/375/390/412/430, tablet, 1280 ve 1440 px; TR/DE/EN ve Arapça RTL.
- Taşma, doğal kaydırma, sahne geçişleri, sticky süresi, reduced-motion, klavye ve ekran okuyucu düzeni.
- Hero, Search, ülke rayı/kartları, paketler, Lounge, Vignette, uyumluluk, kurulum, rehber, header ve footer regresyonu.
- TypeScript, mevcut testler, otomatik build ve tarayıcı hataları; yayınlama yok.
