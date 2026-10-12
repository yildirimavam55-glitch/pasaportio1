# Faz 3A — Test siparişlerini veritabanına yazmadan hazırlık

Bu fazda canlı veritabanına hiçbir test siparişi veya test eSIM kaydı yazılmaz. Yeni tablo veya alan da eklenmez. Ödeme sağlayıcısı bağlanmaz, gerçek eSIM satın alınmaz, hiçbir şey yayınlanmaz. Ürünler, fiyatlar ve hesaplar aynı kalır. Her şey yalnızca otomatik testlerde ve bilgisayar belleğinde çalışır.

## 1. Sağlayıcıdan bağımsız sipariş akışı
- Sepetten başlayıp eSIM teslimine kadar tüm adımları tek bir akışta topluyoruz: siparişi doğrula → sipariş oluştur → ödeme sonucunu işle → eSIM teslimini başlat → durumu güncelle.
- Bu akış veritabanına, ödeme sağlayıcısına ve tedarikçiye takılabilir "bağlantı noktaları" üzerinden bağlanır.
- Fiyat her zaman sunucudaki ürün kaydından alınır; tarayıcıdan gelen fiyata asla güvenilmez.
- Aynı sipariş tekrar gönderilirse ikinci bir sipariş oluşmaz (tekrar anahtarıyla).

## 2. Sahte ödeme modülü
- Ödeme için ortak bir yapı (arayüz) tanımlıyoruz. Taşınmadan sonra geliştiriciniz Stripe'ı bu yapıya ekleyebilecek.
- Sahte ödeme şu sonuçları üretebilir: başarılı, başarısız, aynı ödeme bildiriminin iki kez gelmesi, gecikmeli gelen bildirim.
- Aynı ödeme bildirimi ikinci kez gelirse yok sayılır. Ödenmemiş sipariş için eSIM teslimi başlamaz.

## 3. Sahte eSIM teslimat sağlayıcısı
- Hiçbir yere bağlanmayan bir sahte tedarikçi ekliyoruz.
- Ürettiği eSIM bilgileri açıkça sahtedir ve "DEMO" olarak işaretlidir. Gerçek bir eSIM etkinleştirmeye yaramaz.
- Teslimatın durumu, kullanım ve geçerlilik süresi taklit edilir.
- Bilerek hata üretebilir: zaman aşımı, sunucu hatası, okunamayan yanıt, çok fazla istek.
- Sistem yalnızca testlerde kullanılabilir ve canlı sistemde seçilemez. Sahte tedarikçi gerçek siparişlere, gerçek tedarikçi de test siparişlerine asla bağlanamaz.

## 4. Otomatik testler (yalnızca bellek içinde)
Mevcut teslimat motoru ve kurallar bellekte tutulan test verileriyle çalıştırılır. Test edilenler:
- Başarılı ödeme sonrası sipariş tamamlanır ve eSIM oluşur.
- Başarısız ödemede eSIM teslimi hiç başlamaz.
- Aynı ödeme bildirimi iki kez gelirse tek sipariş ve tek eSIM oluşur.
- Aynı sipariş iki kez gönderilirse ikinci bir sipariş oluşmaz.
- Teslimat hatası: güvenli yeniden deneme yapılır. Sonucu belirsiz kalan teslimat yeniden satın alınmaz, önce kontrol edilir.
- Sipariş durumları yalnızca izin verilen sırayla değişir.
- Canlı tedarikçi alımı kapalıyken tedarikçiye hiçbir çağrı gitmez.
- Müşteri yalnızca kendi siparişini ve eSIM'ini görebilir; başka bir müşterinin kaydına erişim reddedilir.
- Test siparişleri ciro ve raporlara girmez.
- eSIM etkinleştirme bilgileri işlem kayıtlarına ve analizlere hiçbir zaman yazılmaz.

## 5. Müşteri paneli kontrolü
Müşteri panelinin siparişleri ve eSIM'leri gösteren bölümleri test verileriyle denetlenir: sipariş listesi, eSIM listesi, eSIM detayı (sahte QR kodu, kurulum adımları, paket bilgisi ve geçerlilik). Ekran tasarımı değişmez. Gerekirse eksik "DEMO / TEST" etiketi eklenir.

## 6. Yeni sunucu için uçtan uca test senaryoları
Yeni sunucuda ayrı test veritabanıyla çalıştırılacak, adım adım bir test listesi hazırlanır. Her senaryoda ön koşullar, adımlar ve beklenen sonuç olur:
- başarılı ödeme
- başarısız ödeme
- aynı ödemenin iki kez bildirilmesi
- teslimat hatası ve yeniden deneme
- yetkisiz erişim denemeleri
- mobil ve masaüstünde müşteri paneli
- admin tarafında test siparişlerini ayrı görme

Listede test ortamını hazırlama adımları da bulunur: test siparişlerini işaretleyecek yeni alanlar, test hesapları ve sahte ödemenin açılması. Bu veritabanı değişiklikleri şimdi yapılmaz; yalnızca belge olarak hazırlanır.

## Teknik ayrıntılar
- Yeni dosyalar:
  - `src/domain/commerce/checkout.ts`: sipariş akışı ve bağlantı noktaları
  - `src/domain/payments/gateway.ts` ve `mock-gateway.ts`: ödeme arayüzü ve sahte ödeme
  - `src/domain/commerce/mock-supplier.ts`: mevcut tedarikçi bağlantı noktasını kullanan sahte tedarikçi
  - `src/domain/commerce/__tests__/memory-store.ts`: bellek içi veri deposu (yalnızca testlerde)
  - `__tests__` altında senaryo testleri
  - `docs/testing/E2E_TEST_PLAN.md`: yeni sunucu için test senaryoları
- Mevcut `engine.ts` ve `provisioning.ts` korunur; yalnızca gerekirse genişletilir. Mevcut testler bozulmaz, güvenlik testleri zayıflatılmaz.
- Veritabanı değişikliği yapılmaz, yeni paket eklenmez, `/odeme` sayfası değişmez.
- AGENTS.md'ye tek satırlık kurallar eklenir: ödeme arayüzünün yapısı ve sahte tedarikçinin yalnızca testlerde kullanılabilmesi.
- Doğrulama: tüm otomatik testler çalıştırılır. Ardından veritabanındaki sipariş, ödeme ve eSIM sayıları kontrol edilir; şu anki 0 sipariş, 0 ödeme ve 3 eSIM kaydı değişmemiş olmalıdır.
