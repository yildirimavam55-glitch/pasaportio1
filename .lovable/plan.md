# Paket Fiyatları Admin UX Sadeleştirmesi

## Amaç
Mevcut fiyat önceliğini, kayıtlı fiyatları ve sunucu işlemlerini aynen koruyup Admin fiyatlandırma ekranını ülke odaklı ve mobilde hızlı düzenlenebilir hale getirmek.

## Uygulama
1. Ana ekranı ülke aramasıyla başlat; ISO kodu yerine ülke adı, bayrak ve paket sayılarını göster.
2. Seçilen ülkede Standard / Unlimited segmentleriyle gerçek paketleri ayır ve istenen veri/gün sırasını uygula.
3. Mobilde yatay tabloyu kaldırıp kompakt fiyat kartları kullan; satış fiyatını ana düzenleme alanı, alış/kâr/marj/kaynağı ikincil bilgi yap.
4. Masaüstünde sade altı sütunlu görünümü koru; ülke/genel/otomatik fiyat ayrıntılarını tekrar eden sütunlara dönüştürme.
5. Değişiklik olduğunda tek yapışkan “Kaydet” çubuğu göster; override kaldırmayı mevcut boş değer davranışıyla koru.
6. Genel fiyatları ikincil panele, fiyat kopyalamayı “Diğer işlemler” alanına taşı.

## Teknik sınırlar
- Yalnızca `Admin → Paket fiyatları` sunumu değişecek.
- Mevcut `getManualPricingOverview`, `getCountryPricing`, `saveManualPrices` ve `previewCopyCountryPrices` işlemleri aynen kullanılacak.
- Veritabanı, fiyat çözümleme, katalog, güvenlik, yayın ve bağımlılıklar değişmeyecek.

## Doğrulama
- Kod kontrolü ve mevcut manuel fiyat testleri.
- 360, 390, 430, 1280 ve 1440 genişliklerinde yatay taşma ve okunabilirlik.
- Türkiye arama/seçim, Standard ve Unlimited geçişi, dört fiyat düzenleme ve kayıt akışı.
- Genel fiyatlar ve fiyat kopyalama erişimi; mevcut fiyatların kendiliğinden değişmediğinin doğrulanması.
