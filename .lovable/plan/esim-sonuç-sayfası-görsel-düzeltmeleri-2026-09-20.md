# eSIM sonuç sayfası görsel düzeltmeleri

## Kapsam
- Mevcut premium görünümü, yatay swipe yapısını, katalog sınıflandırmasını, ürün seçimini ve sepet davranışını aynen koru.
- Yalnızca sonuç sayfasındaki başlık, kart ölçüsü, içerik çakışması ve alt boşluk sorunlarını düzelt.

## Değişiklikler
- Bölüm başlıklarına güvenli üst boşluk ve scroll payı ver; önceki içerik veya sabit başlık altında kesilmelerini önle.
- Standart orb kartların çapını hafif küçült, ray aralığını ve kenar boşluklarını dengeli ayarla; yan kart ipucunu ve scroll-snap merkez odağını koru.
- Sınırsız kartı rozet, başlık, süre, kapsam, fiyat ve seçim durumu şeklinde ayrı satırlara ayır; rozet içerik akışında yer alarak başlığı aşağı itsin.
- Bilgi ikonuna tutarlı ve güvenli üst/sağ boşluk ayır; rozet ve başlıkla çakışmasını önle.
- Seçili kartın petrol çerçeve, mint yüzey ve onay durumunu daha net fakat hafif tut.
- Mobil içerik alanına sticky sepet çubuğu, alt menü ve safe-area toplamını karşılayan alt boşluk ekle; son kartların tamamen görünmesini sağla.

## Doğrulama
- 360, 375, 390, 412 ve 430 px genişliklerde Standart ve Sınırsız bölümlerini kontrol et.
- Başlık kesilmesi, rozet/başlık ve bilgi ikonu çakışması, yatay taşma ve sticky bar arkasında kalan içerik olmadığını doğrula.
- Swipe hareketinin çalıştığını, drag hareketinin seçim yapmadığını ve seçilen kartın sticky bar ile eşleştiğini kontrol et.
