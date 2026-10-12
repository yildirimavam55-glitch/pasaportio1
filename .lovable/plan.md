# Faz 4 — Admin, katalog ve sağlayıcı hazırlığı

Bu plan için yalnızca bilgileri okudum; hiçbir şey değiştirilmedi.

## 1. Mevcut durum (doğrulanmış)
- **Sağlayıcılar:**
  - eSIM Go: aktif. Otomatik senkron açık (24 saatte bir), öncelik 1. Bakiye **0,00** görünüyor; en son 5 Ekim'de kontrol edilmiş.
  - eSIM Access: hâlâ aktif, otomatik senkron kapalı. Bakiye 33,00. 1.728 taslak ürünü var, hiçbiri müşteriye görünmüyor.
- **Katalog:** 5.405 ürün yayında ve hepsinin satış fiyatı var. 1.757 ürün taslak ve gizli.
- **Otomatik yayın: AÇIK.** Senkron sırasında yeni bir paket fiyatı, kapsaması ve minimum kâr marjı uygunsa onaysız yayına alınabiliyor. Sizin "onaysız yayın olmasın" kuralınızla çelişiyor. Bu, faz için en önemli sorun.
- **Senkron zamanlaması:** Veritabanında zamanlanmış bir görev yok. Şimdiye kadar yalnızca 3 elle başlatılmış senkron var (son: 11 Ekim). Yani "24 saatte bir" ayarı şu an fiilen çalışmıyor. Dışarıdan tetiklenen senkron adresi ise gizli bir anahtar istiyor (güvenli).
- **Döviz kurları:** 24 para birimi için 120 kayıt var, en yenisi bugün 05:29. Eski kur durumu ("STALE") kodda tanımlı, ama ekranda nasıl görüldüğünü ve kurun kaç saatte "eski" sayıldığını henüz doğrulamadım.
- **Admin:** 44 admin sayfası var. Sağlayıcı maliyetleri Faz 1'den beri müşterilere ve ziyaretçilere kapalı.
- **Lovable'a bağlı parçalar:**
  - giriş sistemi ve Google ile giriş
  - önizlemeye özel oturum saklama
  - zamanlanmış görev doğrulaması
  - 4 yapay zekâ çeviri işlevi (yasal metin, kampanya, yorum ve güven metni çevirileri)
  - derleme ayarları paketi
  - otomatik gönderilen giriş e-postaları

## 2. Bulunan sorunlar
| # | Sorun | Öncelik |
|---|---|---|
| 1 | Otomatik yayın açık: yeni ürün onaysız yayına çıkabilir | P0 |
| 2 | Otomatik senkron açık görünüyor ama zamanlanmış görev yok; ekranda yanıltıcı | P1 |
| 3 | eSIM Go bakiyesi 0,00 ve 7 gündür kontrol edilmemiş | P1 |
| 4 | eSIM Access aktif görünüyor (iptal edildi) | P2 — silme yok, yalnızca duraklatma önerisi |
| 5 | Kurun kaç saatte "eski" sayılacağı ve eski kurla fiyat gösterimi doğrulanmadı | P1 |
| 6 | Admin sayfaları mobil ve masaüstünde tarayıcıda hiç test edilmedi | P1 |
| 7 | Taşıma için sağlayıcı ve senkron belgesi yok | P1 |

## 3. Önerilen değişiklikler
1. **Otomatik yayını kapatmak** (sizin onayınızla tek bir ayar değişikliği). Yayındaki 5.405 ürün etkilenmez. Yeni ürünler taslak olarak gelir ve önerilen fiyatla onay bekler.
2. Admin'de **"Yayın onayı kuyruğu"**:
   - Senkronla yeni gelen veya değişen paketler, mevcut onay ekranında tek listede görünür.
   - Tek tek ya da toplu "Onayla ve yayınla" seçeneği olur, her biri işlem kaydına yazılır.
   - Fiyatlar otomatik değişmez.
3. **Sağlayıcı ekranında doğruluk:**
   - "Otomatik senkron" yanında "zamanlanmış görev yok — elle çalıştırılıyor" uyarısı gösterilir.
   - Bakiyenin son kontrol tarihi görünür; 48 saati geçerse uyarı verilir.
   - Bakiye kontrolü yalnızca okuma yapar, para harcamaz.
   - eSIM Access için "Duraklat" seçeneği önerilir: kayıtlar ve giriş bilgileri silinmez. Bunu ayrıca onaylamanız gerekir.
4. **Kur güvenliği:**
   - Kurun en fazla kaç saatlik olabileceği net belirlenir (öneri: 48 saat).
   - Daha eski kurda o para birimi gizlenir ve fiyat EUR olarak gösterilir.
   - Kuru olmayan para birimi gösterilmez.
   - Dönüşüm doğruluğu için otomatik testler eklenir.
   - Admin'de kur güncelliği göstergesi olur.
5. **Yetki ve maliyet gizliliği testleri:** Normal müşteri ve ziyaretçinin hiçbir admin işlevine ve maliyet bilgisine erişemediği otomatik testlerle doğrulanır.
6. **Tarayıcı testi:** 44 admin sayfası 390 ve 1440 piksel genişlikte açılır; hata, boş ekran ve taşma kontrol edilir. Bulunan küçük görünüm hataları düzeltilir, tasarım değiştirilmez.
7. **Belgeler:**
   - Sağlayıcı ayarları
   - Gerekli gizli anahtarların yalnızca adları
   - Senkron akışı ve zamanlama seçenekleri
   - Kur güncelleme
   - Lovable'a bağlı parçaların listesi ve yeni sunucudaki karşılıkları

## 4. Veritabanı etkisi
- 1 ayar değişikliği: otomatik yayın kapanır. Onayınız gerekir.
- İsteğe bağlı 1 ayar değişikliği: eSIM Access duraklatılır. Ayrı onay gerekir.
- Kurun en fazla kaç saatlik olabileceği yeni bir ayar olarak eklenebilir; eklenecekse yalnızca yeni bir alan eklenir.
- Ürün, fiyat, müşteri, sipariş ve eSIM kayıtları değişmez. Hiçbir şey silinmez.

## 5. Taşıma etkisi
- Belgeler yeni sunucu kurulumunu kolaylaştırır.
- Zamanlanmış senkron yeni sunucuda gerçek bir zamanlayıcıyla kurulacak.
- Yeni sunucuda değiştirilmesi gerekenler:
  - yapay zekâ çevirileri için başka bir hizmet
  - Google ile giriş
  - giriş e-postaları

## 6. Riskler
- Otomatik yayın kapanınca yeni paketler mağazada kendiliğinden görünmez; onaylamanız gerekir (istenen durum).
- Kur sınırı fazla sıkı olursa bazı para birimleri geçici olarak gizlenebilir; fiyat EUR'da yine görünür.
- Tarayıcı testleri yalnızca okuma yapar. Hiçbir senkron, yayınlama veya satın alma düğmesine basılmaz.

## 7. Adım adım uygulama
1. Otomatik yayını kapat (onaylı ayar) ve bunun için bir güvenlik testi ekle.
2. Yayın onayı kuyruğunu mevcut onay ekranının üzerine kur.
3. Sağlayıcı ekranındaki senkron ve bakiye uyarılarını ekle. eSIM Access'i yalnızca ayrıca onay verirseniz duraklat.
4. Kur güncelliği kuralını, göstergesini ve testlerini ekle.
5. Yetki ve maliyet gizliliği testlerini ekle.
6. Admin sayfalarını tarayıcıda test et ve küçük hataları düzelt.
7. Taşıma belgelerini yaz.
8. Tüm testleri çalıştır, sonucu raporla. Yayınlama yok.

## Teknik ayrıntılar
- Otomatik yayın ayarı: `feature_flags` tablosundaki `esim_auto_publish` satırı `enabled=false` yapılır; senkron kodunda bu kontrol zaten var. Ayar kapalı kalsın diye `src/security` altına bir test eklenir.
- Onay kuyruğu: mevcut onay ve yeniden fiyatlama ekranı (`admin.repricing`) ile `provider_catalogue_changes` tablosu yeniden kullanılır.
- Kur: `src/lib/currency.server.ts`; `captured_at` sınırı bir sabit ya da ayar olarak tutulur.
- Belgeler: `docs/migration/PROVIDERS_AND_SYNC.md`, `docs/migration/LOVABLE_DEPENDENCIES.md`.
- Lovable'a bağlı parçalar: `@lovable.dev/cloud-auth-js`, `@lovable.dev/vite-tanstack-config`, `src/integrations/lovable`, `previewAuthStorage.ts`, `cron-auth.ts`, `LOVABLE_API_KEY` (4 çeviri işlevi).
