# Otomatik Sağlayıcı Bakiye İzleme — Uygulama Planı

## Mevcut durum
- Provider Hub'da elle "bakiye yenile" var: eSIM Go adaptörünün salt okunur bakiye çağrısı, sonucu `providers` tablosundaki tek satıra yazıyor (son değer, para birimi, zaman).
- Tek eşik (`low_balance_threshold`), tek uyarı türü (`LOW_PROVIDER_BALANCE`), `ops_alerts` içinde açık uyarı tekrarını engelleyen basit kontrol.
- Geçmiş kayıt yok, kritik/sıfır/ani düşüş/API erişilemiyor uyarısı yok, bildirim merkezi ve menü rozeti yok, zamanlayıcı yok.

## Yapılacaklar
1. **Bakiye geçmişi**: her başarılı/başarısız kontrol bir anlık kayıt olarak saklanır (sağlayıcı, tutar, para birimi, zaman, durum, hata kodu). Son değer `providers` satırında kalmaya devam eder (geriye uyumlu).
2. **Sağlayıcı başına ayarlar** (kendi para biriminde): düşük (varsayılan 500), kritik (200), ani düşüş % (50, 24 saat), erişilemez süresi (2 saat), kontrol aralığı (15 dk), izleme açık/kapalı. eSIM Go için para birimi gerçek API yanıtından alınır; EUR değilse varsayılanlar EUR değil sağlayıcı birimi olarak gösterilir ve yöneticiye onaylatılır.
3. **Değerlendirme motoru** (saf fonksiyon, testli): NORMAL / LOW / CRITICAL / EMPTY / SUDDEN_DROP / API_UNAVAILABLE.
   - Ani düşüş yalnızca aynı para birimindeki iki başarılı kayıt arasında; döviz çevrimi yok, eksik veride uyarı yok.
   - Aynı süren durum için tek açık uyarı; şiddet artarsa mevcut uyarı yükseltilir; bakiye yüklenip normale dönünce otomatik "çözüldü".
4. **Zamanlanmış kontrol uç noktası**: tüm izlenen sağlayıcıları sırayla, zaman aşımlı, salt okunur kontrol eder. Sunucu tarafı gizli anahtar ile korunur (mevcut cron gizli anahtar düzeni). Zamanlayıcı **kurulmaz**; ekranda "Otomatik izleme aktif değil — zamanlayıcı kurulmadı" yazar, yalnızca gerçek bir zamanlanmış çağrı geldikten sonra "aktif" görünür.
5. **Admin bildirim merkezi** (yeni sayfa Admin → Bildirimler): sağlayıcı, güncel/önceki bakiye, değişim tutarı ve %, şiddet, tespit zamanı, son başarılı kontrol, "Gördüm" ve "Çözüldü" butonları. Admin menüsünde yeni/açık uyarı sayısı rozeti.
6. **Provider Hub kartı**: son bakiye, son başarılı kontrol, Taze / Eski / Erişilemiyor etiketi, küçük geçmiş listesi, eşik ayar formu.
7. **Gelecek kanallar**: E-posta, Telegram, WhatsApp için tasarım + kapalı ayar alanları ("bağlı değil"); hiçbiri bağlanmaz/etkinleştirilmez.
8. **Güvenlik**: yalnızca adminler okur/yazar; eşik değişiklikleri denetim kaydına (önce/sonra); kimlik bilgileri sunucuda; bakiye hiçbir genel sayfada/sorguda yok; para yatırma/çekme/satın alma çağrısı yok.
9. **Taşıma belgesi**: `docs/migration/BALANCE_MONITORING.md` — zamanlayıcı (15 dk örnek cron), ortam değişkenleri, eSIM Go bakiye uç noktası, tablolar, bildirim teslim gereksinimleri.
10. **Testler** (sahte yanıtlarla): normal, düşük, kritik, sıfır, ani düşüş, API hatası/zaman aşımı, tekrar uyarı engeli, yükleme sonrası düzelme, farklı para biriminde yanlış ani-düşüş üretmeme.

## Veritabanı etkisi (yalnızca ekleme, veri silme/değiştirme yok)
- Yeni tablo `provider_balance_snapshots` (admin okur; yazma yalnız sunucu).
- Yeni tablo `provider_balance_monitor_settings` (sağlayıcı başına bir satır; admin okur/yazar).
- Yeni tablo `admin_notification_channels` (kapalı kanal tasarımı; admin).
- `alert_type` enum'una ekleme: `CRITICAL_PROVIDER_BALANCE`, `EMPTY_PROVIDER_BALANCE`, `PROVIDER_BALANCE_DROP`, `PROVIDER_BALANCE_UNAVAILABLE`.
- `ops_alerts`'e boş bırakılabilir sütunlar: `severity`, `dedupe_key` + açık uyarılar için benzersiz kısmi indeks (tekrarı veritabanı düzeyinde engeller).
- Ürünler, fiyatlar, müşteriler, siparişler, eSIM Access kayıtları değişmez. Tüm değişiklikler yeni migration dosyalarında — yeni sunucuda tekrarlanabilir.

## Riskler
- Önizleme ve canlı aynı veritabanını kullanıyor: tablolar eklendiği anda canlıda da var olur (boş ve yalnız admin erişimli; ziyaretçi etkisi yok).
- Mevcut eSIM Go bakiyesi 0.00 görünüyor: ilk kontrolde "Boş bakiye" acil uyarısı açılması beklenir.
- Gerçek bakiye kontrolü yalnızca sizin isteğinizle, elle bir kez yapılır (salt okunur).

## Kapsam dışı
Stripe/ödeme, otomatik yükleme, satın alma, fiyat değişikliği, tasarım değişikliği, yayınlama, harici mesaj servisi bağlama.
