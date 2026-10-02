# eSIM Kurulum Animasyonu ve Gezinme Düzeltmesi

## Kapsam
- Ayrıntılı kurulum rehberindeki mevcut 4 adımlı Hızlı Kurulum ve 5 adımlı QR içeriğini, telefon çizimlerini, yöntem seçiciyi ve sayfa düzenini koru.
- Ana sayfada yalnız mevcut kısa Hızlı Kurulum/QR gösterimindeki tıklama hareketini ve zamanlayıcı temizliğini güncelle; adım gezinmesi ekleme.
- Veritabanı, sipariş, tedarikçi, güvenlik, provisioning ve yayın durumuna dokunma.

## Ortak dokunma hareketi
- Kırmızı/turuncu daireleri tamamen kaldır.
- Yalnız dokunma gereken ekranlarda görünen, nötr bir parmak/imleç bileşeni kullan.
- Kısa bekleme → yaklaşma → dokunma → düğmenin hafif basılması → bırakma akışı oluştur; reduced-motion durumunda hareketi gösterme.
- Aynı bileşeni ayrıntılı rehberde ve ana sayfada yeniden kullan.

## Ayrıntılı rehber gezinmesi
- Hızlı Kurulum için 1–4, QR için 1–5 numaralı doğrudan seçilebilir ilerlemeyi mobil ve masaüstünde görünür yap.
- Kompakt Önceki/Sonraki kontrollerini her adımda erişilebilir etiketlerle sun; son adımda da geri ve doğrudan seçim çalışsın.
- Klavye kullanımını ve mevcut yerelleştirilmiş görünür etiketleri koru; adım düğmelerine yerelleştirilmiş erişilebilir adlar ve güncel-adım durumu ekle.

## Zamanlama
- Her normal adım için tek bir 3 saniyelik zamanlayıcı; başarı adımı için 4 saniye kullan.
- Önceki, Sonraki, doğrudan adım, platform veya yöntem seçiminin her birinde mevcut zamanlayıcıyı iptal edip seçilen durum için tam süreyi sıfırdan başlat.
- Son adımdan ilk adıma döngü yap; yöntem değiştirmek seçilen yöntemi 1. adımdan başlatır.
- Reduced-motion durumunda otomatik ilerleme ve dokunma hareketini durdur; tüm manuel kontroller çalışmaya devam eder.

## Ana sayfa
- Mevcut yöntem seçiciyi, telefon boyutunu, bölüm düzenini ve CTA'yı koru.
- Döngüyü Hızlı Kurulum dokunma → yükleme → başarı → QR tarama → yükleme → başarı şeklinde sürdür.
- Yöntem seçimi eski zamanlayıcıyı temizleyip seçilen yöntemi baştan ve tam süreyle başlatır; görünür değilken zamanlayıcı çalışmaz.

## Doğrulama
- İstenen Hızlı Kurulum ve QR otomatik/Önceki/Sonraki/doğrudan-adım/yöntem-değişimi senaryolarını süre eşiğiyle test et.
- Ana sayfada kırmızı/turuncu işaret bulunmadığını, ortak dokunma hareketini, iki yöntemin başarı durumlarını ve seçici senkronunu doğrula.
- 360/390/430 ve masaüstünde taşma/çakışma/düzen kayması olmadığını kontrol et.
- Reduced-motion altında otomatik ilerlemenin durduğunu ve manuel gezinmenin çalıştığını doğrula.
- Tür, odaklı test ve otomatik derleme kontrollerini çalıştır; yayınlama yapma.
