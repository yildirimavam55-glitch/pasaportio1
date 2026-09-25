# V2 Homepage İçerik Tamamlama

## Amaç
Onaylı V2 üst tasarımını, aramayı, popüler destinasyonları ve paket sonuçlarını değiştirmeden; yalnız eksik müşteri bilgilendirme ve güven bölümlerini mevcut V2 görsel diliyle tamamlamak.

## Mevcut Durum
- eSIM ana sayfasında gerçek rehberler, cihaz kontrolü, veri kullanım özeti, Lounge/Vignette tanıtımları, kurulum özeti ve FAQ altyapısı zaten var; bunlar yeniden yapılmayacak.
- Mevcut “Nasıl çalışır?” üç adımlı ve gerçek QR/provisioning yolculuğunu tam anlatmıyor.
- Kurulum bölümü iPhone/Android seçimi ve dört eğitim adımını göstermiyor.
- “Neden travely?” bölümü eksik; eSIM FAQ istenen QR, kapsam ve kurulum sorularını tam içermiyor.
- Lounge ve Vignette alt içerikleri gerçek/verisiz durumları doğru koruyor; yalnız kompakt FAQ eksik.

## Yapılacaklar
- eSIM “Nasıl çalışır?” alanını dört kompakt, doğru adımla güncelle: paket seçimi, gerçek provisioning sonrası QR/kurulum bilgisi, cihaz kurulumu, paketin gerçek koşullarına göre kullanım.
- Mevcut yayınlanmış rehber rayını, cihaz uyumluluk sistemini ve katalog-backed paket yardımcısını aynen yeniden kullan; sahte veri veya ikinci sistem ekleme.
- Kurulum alanına kompakt iPhone/Android seçimi, dört eğitim adımı ve mevcut destek/kurulum sayfasına CTA ekle; gerçek QR’ın yalnız müşteri hesabındaki provisioning sonucundan geldiğini açık tut.
- Yalnız doğrulanabilir dört faydayla kompakt “Neden travely?” alanı ekle.
- eSIM FAQ’yu istenen yedi satın alma sorusuyla ve aktivasyon uydurmayan cevaplarla tamamla.
- Lounge ve Vignette sayfalarına mevcut tasarımla kompakt, dürüst FAQ ekle; Lounge boş durumunu ve Vignette satışta-değil durumunu değiştirme.
- Bölüm sırasını doğal ve yoğun tut; üst sayfa, popüler kartlar, paket kartları, sepet eşlemesi ve alt navigasyona dokunma.

## Teknik Ayrıntılar
- Ortak yeni bilgi parçaları mevcut `V2DiscoveryContent` içinde tutulacak; mevcut Button, Tabs/Accordion ve semantik tasarım tokenları kullanılacak.
- TR/DE/EN metinleri mevcut locale yapısına eklenecek; uzun Almanca metinler için taşma kontrolü yapılacak.
- Cihaz verisi mevcut yönetilen cihaz kataloğu ve `listDeviceCompatibility` kaynağından gelecek.
- Rehberler yalnız mevcut `listFeaturedGuides` yayınlanmış içerik sorgusundan gelecek.
- Paket yardımcısı mevcut kullanım ayarları, tahmin ve gerçek katalog eşlemesini kullanmaya devam edecek.
- 360/390/430 px görünüm ve işlev testleri; eSIM seçim → Standard/Unlimited → detay → sepet, promosyon linkleri, rehber, uyumluluk, kurulum, FAQ, alt menü ve geri navigasyon doğrulanacak.

## Güvenlik ve Kapsam
- Katalog senkronu, veri tabanı, fiyatlar, ürün kimlikleri, Standard/Unlimited/regional mantığı, sepet/sipariş/provisioning/ödeme/Admin değişmeyecek.
- Sahte QR, ürün, fiyat, lounge veya vignette verisi oluşturulmayacak.
- Production değiştirilmeyecek ve V2 yayınlanmayacak.
