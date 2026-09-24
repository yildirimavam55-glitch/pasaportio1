# Mobil ana sayfa dönüşüm güncellemesi

## Hedef
Mevcut Travely mimarisini ve tüm çalışan ticaret akışlarını koruyarak mobil ana sayfayı destinasyon seçimi → gerçek katalog kartları → doğrudan paketler sırasına odaklamak.

## Yapılacaklar
- eSIM mobil hero metnini TR/DE/EN olarak destinasyon odaklı hale getir; mevcut gerçek seyahat fotoğrafını, `QuickSearch` bileşenini ve ülke → paket yönlendirmesini aynen kullan. Hızlı ülke chip’i ekleme.
- Servis seçicinin yerini ve masaüstü davranışını koru; mobil hero yoğunluğunu ve arama vurgusunu onaylanan görünüme yaklaştır.
- Mobil güven şeridini yalnız üç doğru eşleşmeli öğeye indir: QR teslimat, güvenli ödeme, 7/24 destek. Gerçek QR, kalkan ve kulaklık ikonlarını kullan; masaüstünde mevcut düzeni bozma.
- Popüler destinasyon bölümünü mobilde yaklaşık dört kartlık yatay, kaydırılabilir raya dönüştür; mevcut canlı `DestinationDiscovery` verisini, yayınlanmış ürün filtresini, ülke fotoğraflarını, gerçek minimum fiyatları ve mevcut yönlendirmeyi koru. “Tümünü gör” bağlantısını mevcut tüm ülkeler sayfasına bağla.
- Ülke ve bölge kartlarındaki standart fiyat vurgusunu petrol/yeşil marka rengine al; turuncuyu yalnız ana CTA ve promosyon vurgusunda bırak.
- Mevcut kompakt Finder girişinin metnini istenen TR/DE/EN ifadelerine güncelle; yalnız tıklanınca aynı Finder’ı açmaya devam et. Finder soruları, hesaplamaları, önerileri ve state akışı değişmeyecek.
- Popüler destinasyonlardan sonra canlı katalogdan gelen bölgesel kartları “Bölgelere göre keşfet” başlığıyla kompakt mobil rayda göster; mevcut region anahtarlarını ve `/esim/ulkeler` filtreli yönlendirmesini kullan, sahte uygunluk üretme.
- Mevcut Sıla Yolu fotoğrafını kullanan kompakt promosyon bandını bölgesel keşfin altına yerleştir; CTA’yı mevcut güvenli Sıla Yolu rota paket aramasına bağla ve TR/DE/EN metin sağla. Yeni ürün veya fiyat üretme.
- Alt bölümlerde Nasıl Çalışır, cihaz uyumluluğu, Lounge, destek/SSS, tüm destinasyonlar ve Rehberler’i silmeden koru; ilk mobil ekranları alışveriş önceliğine göre sıkılaştır.

## Teknik kapsam
- Sunum değişiklikleri `TravelExperience`, `DestinationDiscovery`, `DestinationCards`, `PublicVisualSections` ve gerekli semantik mobil stillerle sınırlı tutulacak.
- Mevcut `listEsimDestinations` / gerçek katalog minimum fiyat kaynağı, `QuickSearch`, Finder ve bölgesel navigasyon doğrudan yeniden kullanılacak.
- eSIM Go, katalog/senkronizasyon, yayınlama, fiyatlandırma, sipariş, ödeme, provisioning, auth, müşteri alanı, Admin, Guides SEO ve veritabanına dokunulmayacak.

## Doğrulama
- 360, 375, 390, 412 ve 430 px’de hero, arama, üç güven öğesi, yatay kart kaydırma, fiyat okunabilirliği, QR ikonu, Finder kapalı/açık durumu, bölgesel kartlar, promosyon CTA’sı ve yatay taşmayı kontrol et.
- 1440 px’de masaüstü regresyonunu kontrol et.
- TR/DE/EN metin taşmalarını ve ana kullanıcı yollarını gerçek tarayıcıda doğrula: hero araması → Türkiye paketleri; popüler ülke → paketler; Finder CTA → mevcut Finder.
- Gerçek paket verisi/fiyatı görünürlüğünü, konsol/çalışma zamanı hatalarını ve son derlemeyi kontrol et; final raporu yalnız istenen PASS/FAIL listesi ve değişen dosyalarla sınırla.
