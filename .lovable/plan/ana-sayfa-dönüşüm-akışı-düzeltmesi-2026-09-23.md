# Ana sayfa dönüşüm akışı düzeltmesi

## Hedef
Mevcut Travely tasarımını ve çalışan satış mantığını koruyarak ana sayfayı destinasyon → gerçek fiyat → kısa paket yardımcısı → paketler → eğitim sırasına getirmek.

## Değişiklikler
- Hero içindeki mevcut destinasyon aramasını tek birincil başlangıç olarak koru; kaydırma sonrası görünen aynı arama bileşenini daha kompakt, ikincil erişim olarak bırak.
- Mobil hero yüksekliğini yalnızca gerektiği kadar azalt; mevcut fotoğrafı, başlık, kısa açıklama, destinasyon alanı ve CTA’yı koru.
- eSIM ana sayfasında bölüm sırasını kontrollü biçimde sabitle: hero, servis seçici, güven şeridi, canlı katalogdan popüler destinasyonlar, mevcut Smart Package Finder ve varsa gerçek öneri/ürün sonucu, ardından “3 adımda internete bağlan”, cihaz uyumluluğu ve diğer mevcut bölümler.
- Mevcut Finder hesaplamalarını ve paket kürasyonunu değiştirmeden ana sayfada kompakt biçimde görünür yap.
- Hero seçimi mevcut davranışta doğrudan paket sayfasına gidiyorsa bunu koru; yeni veya paralel bir destinasyon state sistemi kurma.
- Popüler destinasyon kartlarını mevcut `DestinationDiscovery` ve canlı yayınlanmış storefront minimum fiyat kaynağıyla kullan; geçersiz/fiyatsız ürün üretme.
- “Nasıl Çalışır” alanındaki uyumluluk CTA’sını koru, fakat ana alışveriş yolundan sonra göster; dikey alanını mobilde sıkılaştır.

## Kapsam koruması
- Yalnızca ana sayfa sunumu ve bölüm sıralaması değişecek.
- Tedarikçi, katalog, yayınlama, fiyatlama, öneri hesabı, ödeme, sipariş, provisioning, kimlik doğrulama, hesap, Admin, Lounge mantığı, Guides ve veritabanı değişmeyecek.

## Doğrulama
- 360, 375, 390, 412, 430 px ile masaüstünde bölüm sırası, taşma ve ilk fiyat görünürlüğünü kontrol et.
- Hero ülke seçimi, popüler ülke kartı bağlantıları ve Smart Package Finder akışını TR/DE/EN’de gerçek tarayıcı etkileşimiyle doğrula.
- Popüler fiyatların canlı, yayınlanmış uygun ürünlerden geldiğini ve öneri hesaplama kodunun değişmediğini kaynak ve sonuç üzerinden doğrula.
- Konsol, çalışma zamanı ve derleme tanılarını kontrol et; kapsam dışı ticaret dosyalarının değişmediğini raporla.
