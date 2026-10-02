# Mobil öncelikli güven hikâyesi

## Uygulama
- Mevcut ana sayfa sırasını, tasarımını ve tüm mevcut bileşenleri değiştirmeden koru.
- Yeni güven hikâyesini yalnız ana eSIM keşif sayfasında, mevcut “Bölgesel eSIM paketleri” ile “Cihaz uyumluluğu” arasına ekle.
- Tek bir sürekli anlatı oluştur: giriş → 14 gün koşulsuz iade → dakikalar içinde hazır → roaming fiyat karşılaştırması → gerçek WhatsApp desteği → kompakt güven özeti.
- Kullanıcının seçimine göre `10–15 €` ve `1,99 €'dan` metinlerini aynen kullan; bunları canlı katalog verisi gibi sunma veya başka fiyat mantığına bağlama.
- Mobilde her bölümün kendi anında görünmesini sağlayan, kaydırmayı kilitlemeyen aşamalı görünüm kullan; masaüstünde içeriği ortalanmış ve kontrollü genişlikte tut.
- Telefon/QR, kalkan ve insan desteğini mevcut Lucide/WhatsApp ikon diliyle, mevcut renk, tipografi, radius, gölge ve boşluk tokenlarıyla görselleştir.
- TR/DE/EN ana metinlerini ekle; mevcut 14 dil katmanının İngilizce kaynak + statik çeviri davranışını koru ve Arapça RTL düzenini bozma.

## Teknik ayrıntılar
- Yeni sunum bileşenini ayrı ve küçük tut; mevcut sayfa bileşimine yalnız tek bir ekleme noktası ekle.
- Mevcut hafif `IntersectionObserver`/CSS geçiş yaklaşımını yeniden kullan; her adım bir kez oynar, yaklaşık 24 px yükselerek yumuşakça görünür.
- `prefers-reduced-motion` durumunda tüm içerik doğrudan görünür; kaydırma takibi ve dekoratif hareket devre dışı kalır.
- Büyük görsel, video, yeni paket, yatay kaydırma veya gerçek müşteri QR/kurulum verisi ekleme.
- Son şeritte yalnız istenen dört özet mesajı ve mevcut ikon ailesini kullan.

## Doğrulama
- 360/375/390/412/430 ve 1280/1440 px görünüm; Light/Dark, TR/DE/EN ve Arapça RTL.
- Bölüm sırası ve mevcut Hero/Search, popüler ülke rayı/kartları, bölgesel alan, Lounge, Vignette, uyumluluk, kurulum, rehberler, FAQ, header ve footer için regresyon kontrolü.
- Kaydırma akışı, tek seferlik görünüm, reduced-motion, klavye/ekran okuyucu semantiği, taşma, layout shift, console/runtime hataları.
- TypeScript, mevcut ilgili testler, biçim ve otomatik build durumunu doğrula; yayınlama yapma.
