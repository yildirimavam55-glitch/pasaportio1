# Travely kontrollü storefront UI/UX iyileştirmesi

## Hedef
Seçilen “Refined mobile travel commerce experience” yönünü mevcut Travely tasarımına uyarlamak; cream/petrol/orange kimliğini, gerçek fotoğrafları, katalog fiyatlarını ve tüm çalışan iş akışlarını korurken mobil öncelikli satın alma yolunu daha net ve tutarlı yapmak.

## Uygulama
- Ana sayfanın ilk ekranını sıkılaştır: mevcut fotoğraf, mesaj, tek destinasyon araması, eSIM/Lounge seçici ve güven göstergelerini koru; tipografi, boşluk, kart yoğunluğu ve CTA hiyerarşisini seçilen yön doğrultusunda normalize et.
- Popüler destinasyonları gerçek katalog fiyatları ve mevcut ülke fotoğraflarıyla daha düzenli, fiyat odaklı kartlar olarak sun; bölgesel paketleri ayrı ve ikincil tut.
- Finder başlığını mobilde görünür kıl; arama, öneri ve ürün geçişlerindeki mevcut veri/routing davranışını değiştirme.
- Paket sayfasında seçim öncesi eylem beklentisini görünür hale getir; Standard/Unlimited ve paket seçimini erişilebilir kıl; sabit satın alma kartının küçük ekranlarda içeriği örtmesini önle.
- Sepet, giriş ve ortak kabukta doğrulanmış erişilebilirlik sorunlarını düzelt: yerelleştirilmiş giriş metinleri, durum bildirimleri, parola görünürlüğü etiketi, ürün-bazlı adet/kaldır etiketleri, filtre seçili durumları ve 44px dokunma hedefleri.
- Kırık/dead-end gezinmeleri düzelt: destek bağlantısını gerçek destek yoluna bağla ve sayfa bağlamını bozan menü bağlantılarını doğru hedeflere yönlendir.
- Mevcut responsive görsel dosyalarını kullanarak mobil/desktop hero yüklemesini iyileştir; ilk görünür destinasyon görsellerini önceliklendir.

## Kapsam koruması
- Yeni alt navigasyon, sahte fiyat/puan/ürün, otel-uçuş akışı veya yeni işlev eklenmeyecek.
- Backend, katalog, fiyatlandırma, sipariş, provisioning, ödeme, auth mimarisi, Admin, CMS, SEO, Guides ve Lounge iş mantığı değişmeyecek.
- Tasarım tokenları ve mevcut Button bileşenleri korunacak; yeni görsel değerler semantik tokenlarla uygulanacak.

## Doğrulama
- Ana sayfa → ülke → Standard/Unlimited → gerçek paket → sepet yolunu TR/DE/EN’de doğrula.
- 360, 375, 390, 412, 430 px ile 1280 ve 1440 px görünümde taşma, örtüşme, klavye erişimi, menü/sticky katmanları ve dokunma hedeflerini kontrol et.
- Auth, Lounge, Guides ve hesap girişlerinin bozulmadığını; fiyatların gerçek katalogdan geldiğini doğrula.
- İlgili testleri ve önizleme tanılarını çalıştır; derleme, çalışma zamanı ve konsol hatası bırakma.
