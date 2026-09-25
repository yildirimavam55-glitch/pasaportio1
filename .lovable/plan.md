# V2 global Unlimited kartları — görsel düzeltme

## Kapsam
- Yalnız `/design-v2/esim` ana sayfasındaki “Dünya çapında sınırsız internet” kart sunumunu değiştir.
- Seçili ürünler, ürün kimlikleri, fiyatlar, süreler, kapsam, sıralama, katalog ve Unlimited mantığını aynen koru.
- Sticky ülke araması, diğer V2 bölümleri ve production sayfalarını değiştirme; yayınlama yapma.

## Uygulama
- Mobilde üç sütunlu düzeni native yatay kaydırma ve scroll-snap rayına çevir; 360–430 px genişliklerde yaklaşık 1.6–1.8 kart ve sonraki kart ipucu göster.
- Kartları mevcut V2 renk, yüzey, kenarlık, gölge ve radius sistemiyle kompaktlaştır; sınırsız başlık, belirgin süre, gerçek kapsam, fiyat ve yerelleştirilmiş CTA’yı taşmadan sırala.
- Tablet/masaüstünde üç kartlık normal satır düzenini koru.
- Carousel’i sayfa yatay taşmasına yol açmayacak şekilde sınırla; WhatsApp ve alt navigasyon için mevcut güvenli alanı gerçek görünümde kontrol edip yalnız gerekirse konum boşluğunu ayarla.

## Doğrulama
- 360, 390 ve 430 px’de TR/DE/EN metinleri, 1.5–2 kart görünümü, swipe/snap, okunabilir süre-kapsam-fiyat-CTA ve sıfır kırpılma kontrolü.
- Sticky arama açıkken carousel kaydırma, sayfa yatay taşması, WhatsApp ve alt navigasyon çakışmalarını kontrol et.
- Üç ürünün ID, fiyat, süre ve kapsam değerlerini değişiklik öncesi/sonrası karşılaştır; derleme ve konsol hatalarını doğrula.
