# Homepage destinasyon bölümünü geri getirme

## Amaç
Kaybolan destinasyon bölümünü, sticky aramayı ve çalışan satış akışını değiştirmeden yeniden görünür yapmak.

## Uygulama
- Canlı katalog doluysa mevcut gerçek ülke ve bölge kartlarını aynen göstermeye devam et.
- Canlı katalog boş dönerse, yeni ülke veya fiyat üretmek yerine zaten mevcut ana sayfa destinasyon seçkisini ve gerçek görsellerini yedek görünüm olarak göster.
- Yedek görünümde doğrulanamayan fiyat göstermeme; mevcut yönlendirmeyi koruma.
- Önceki denemede değiştirilen arama-açık görünürlük stilini geri alarak sticky arama davranışını koruma.
- Ana sayfayı mobil ve masaüstünde kontrol ederek destinasyon başlığı, kartlar, arama ve aşağıdaki “eSIM nasıl çalışır?” bölümünün birlikte göründüğünü doğrulama.

## Teknik not
Veritabanında şu anda ürün kaydı olmadığı için yalnızca canlı katalogdan beslenen yeni bölüm boş dönüyor. Bu düzeltme veritabanına, sağlayıcı kataloğuna veya ülke listesine dokunmadan mevcut ana sayfa seçkisini güvenli yedek olarak kullanacak.
