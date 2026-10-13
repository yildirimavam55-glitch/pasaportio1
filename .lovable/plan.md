# Müşteri Paneli: Tüm Satın Alınan Ürünler + Yeni eSIM Detay Tasarımı

Yalnızca arayüz. Veritabanı, Auth, RLS, migration, ödeme, provisioning, sync, iade, domain ve yayınlama değişmez; tedarikçiye istek gitmez.

## 1. Hesap menüsü
Mevcut menü korunur, yapı şu hâle gelir:
- Genel Bakış (/account)
- Satın Aldıklarım (/account/purchases) — yeni
  - eSIM Paketlerim (/account/esims) — mevcut
  - Lounge Erişimlerim (/account/lounge) — yeni
  - Vignette / Yol Geçişlerim (/account/vignette) — yeni
- Sipariş Geçmişim (/account/orders) — mevcut
- Destek ve İade Taleplerim (/account/support) — mevcut
- Profil Ayarlarım (/account/profile) — mevcut (güvenlik bağlantısı profil içinde korunur)

Mobilde aynı liste mevcut alt menü kartlarıyla gösterilir.

## 2. Satın Aldıklarım
- Tek liste + filtreler: Tümü / eSIM / Lounge / Vignette (sayılarla).
- eSIM: gerçek hesap verisi (mevcut sorgu), mevcut eSIM kartı.
- Lounge ve Vignette: şu an satın alma verisi yok → açık boş durum ("Henüz Lounge erişimin yok"), sahte kart yok.
- Her kart kendi detay sayfasına gider.

## 3. eSIM detay sayfası (referans görsele göre)
Mevcut sayfa yeniden düzenlenir, mevcut bileşenler kullanılır:
- Üst: ülke fotoğrafı (merkezi görsel seti), paket başlığı, GB + geçerlilik, operatörler (yalnız katalogda varsa), sipariş no/tarih.
- Kalan internet kartı + çubuk; kalan süre kartı + çubuk — veri yoksa "bilgi yok".
- Son güncelleme: yalnız gerçek sağlayıcı zamanı varsa.
- Ayrı aktivasyon durumu alanı: doğrulanmamışsa "Durum doğrulanamıyor".
- Kurulum seçenekleri: iPhone otomatik kurulum (Yakında, pasif buton), QR ile kurulum, Manuel (SM-DP+ / aktivasyon kodu, kopyala) — yalnız gerçek sipariş verisi varsa.
- QR kod kartı (mevcut).
- Cihaza göre rehber: Marka → Model + iOS/Android animasyonlu adımlar (mevcut rehber ve animasyon).
- Alt: "Aynı paketi tekrar satın al" (mevcut yönlendirme) ve "İade talebi" (mevcut iade paneli).
- Masaüstü iki sütun, mobil tek sütun.

## 4. eSIM durum kategorileri
Aktif / Kurulum Bekleyen / Kullanılmış-Süresi Dolmuş / İade Sürecinde / İade Edilen. Her eSIM yalnız bir grupta; mevcut durum ve iade kayıtlarından hesaplanır; küçük test eklenir.

## 5. Lounge ve Vignette detay şablonları
/account/lounge/$id ve /account/vignette/$id: havalimanı/terminal, lounge adı, yolcu, tarih, voucher/QR, durum, destek; Vignette: ülke, plaka (yalnız hesap sahibine), başlangıç/bitiş, ürün, belge, durum, destek. Gerçek veri olmadığı için şimdilik "bulunamadı" durumu gösterir.

## 6. Demo
Yalnız önizlemede ve mevcut `?demo=1` kuralıyla: DEMO etiketli örnek eSIM, Lounge ve Vignette görünümleri; veritabanına yazmaz, gerçek QR/kod kullanmaz, sipariş sayılarına girmez.

## 7. Dil ve tasarım
Mevcut logo, renk ve üst menü korunur; krem/koyu yeşil premium dil mevcut temadan. Yeni metinler TR/DE/EN; diğer 11 dil İngilizce'ye düşer, ham anahtar görünmez. Yeni bağımlılık yok.

## Kontrol
390px ve 1440px ekran görüntüleri (demo görünüm), tüm menü bağlantıları, testler ve build.

## Bağımsız sunucuda tamamlanacaklar
Lounge/Vignette sipariş verisi, sağlayıcı kullanım/aktivasyon sorguları, iPhone otomatik kurulum bağlantısı, ödeme sonrası teslim.
