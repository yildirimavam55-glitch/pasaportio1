# eSIM Kurulum Deneyimi Yükseltmesi

## Amaç
Mevcut ana sayfa sırasını ve Travely görünümünü değiştirmeden, kurulum anlatımını Hızlı Kurulum + QR yöntemlerini kapsayacak şekilde geliştirmek; mevcut `/esim/kurulum` sayfasını iki yöntemli, erişilebilir ve 14 dil destekli bir rehbere dönüştürmek.

## Ana Sayfa
- Mevcut `eSIM kurulumu çok kolay` bölümünün konumunu, kart yapısını, telefon ölçüsünü ve tek rehber CTA’sını koru.
- Var olan telefon/QR çizimini ortak animasyon bileşenine taşı; dekoratif ve taranamaz QR ile tarama çizgisini aynen yeniden kullan.
- Yaklaşık 8–10 saniyelik tek döngü oluştur: Hızlı Kurulum bağlantısı → dokunma → yükleme → hazır → QR → tarama → yükleme → hazır → tekrar.
- Animasyonla senkron, kısa Hızlı Kurulum / QR başlık ve açıklamasını mevcut metin alanında göster.
- Bölüm görünür değilken animasyonu durdur; reduced-motion durumunda açık, statik bir hazır görünüm göster.
- Kamuya açık alanda gerçek kurulum URL’si, gerçek QR veya korumalı eSIM verisi kullanma.

## Ayrıntılı Kurulum Rehberi
- Başlık ve girişten sonra klavye erişimli iki seçenek ekle: `Hızlı Kurulum` ve `QR Kod`; varsayılan Hızlı Kurulum olsun.
- Hızlı Kurulum için mevcut telefon çizim ailesinde dört adım hazırla: bağlantıyı aç, yükle, onayla, tamamlandı.
- Otomatik ilerleme, aktif adım, önceki/sonraki ve doğrudan adım seçimini destekle; manuel kullanım zamanlayıcıyı yeniden başlatsın.
- Var olan QR rehberinin beş adımını, iOS/Android ayrımını, telefon çizimlerini ve taranamaz örnek QR uyarısını yöntem içine taşıyarak koru.
- Her iki yöntemin ardından ortak `eSIM’iniz kuruldu. Şimdi ne yapmalısınız?` alanını ekle; hat açma, mobil veri hattı seçme, gerektiğinde talimata göre dolaşım ve bağlantı kontrolünü nötr biçimde anlat.
- Kurulum ile paket aktivasyonunu birbirine bağlayan veya tedarikçi davranışı varsayan ifade kullanma.

## Ortak Bileşenler ve Diller
- Yöntem seçici, telefon animasyonu, başarı görünümü, Hızlı Kurulum rehberi, QR rehberi ve seyahatte kullanım anlatımını paylaşılabilir sunum bileşenlerine ayır.
- Mevcut `localize()` düzenini kullan: TR/DE/EN kaynak metinleri ve 11 statik dil kaynağı; ikinci bir dil sistemi kurma.
- FR/ES/IT/PT/NL/PL/AR/RU/JA/KO/ZH kaynak dosyalarına yalnızca yeni İngilizce anahtarların doğal çevirilerini ekle.
- Arapça RTL’de metin hizası, yöntem sırası ve yön oklarını doğrula.

## Doğrulama
- Ana sayfada bölüm sırası ve yakın görsel yüksekliğin korunduğunu; Hızlı Kurulum → QR → tekrar döngüsünü ve CTA’yı doğrula.
- Rehberde varsayılan yöntem, iki yöntem geçişi, dört ve beş adımlı akışlar, otomatik/manuel gezinme ve demo veri güvenliğini doğrula.
- 360, 390, 430, tablet ve masaüstünde taşma, kırpılma, WhatsApp ve alt gezinme çakışmalarını kontrol et.
- 14 dilin çözümlendiğini ve Arapça RTL görünümünü kontrol et.
- İlgili testleri ve otomatik derlemeyi doğrula; ana sayfanın diğer bölümlerine, ticaret akışlarına, hesaba, veritabanına ve güvenliğe dokunma.

## Teknik Ayrıntılar
- React/TypeScript, mevcut Tailwind tokenları, mevcut Button/Tabs bileşenleri ve CSS geçişleri kullanılacak; yeni animasyon paketi eklenmeyecek.
- Görünürlük için IntersectionObserver, reduced-motion için media query kullanılacak.
- Yapısal paylaşım kararları `AGENTS.md` içinde tek bir kalıcı kuralla kaydedilecek; görev `roadmap.md` içinde izlenecek.
- Veritabanı, migration, RLS, tedarikçi verisi ve yayınlama değişikliği yapılmayacak.
