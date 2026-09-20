# Mobil arama listesini kaydırılabilir yap

## Yapılacaklar
- Ortak hızlı arama alanında eSIM için tam ülke kataloğunu, Lounge için mevcut havalimanı kataloğunu arama sırasına göre göstermek.
- Arama satırını görünür tutup yalnızca sonuç bölümünü bağımsız kaydırılabilir hale getirmek.
- Açık mobil klavyede kullanılabilir yüksekliği `visualViewport` üzerinden hesaplayarak listenin ekran dışında kalmasını önlemek.
- Dokunmatik kaydırma, overscroll sınırı ve gövde kaydırması çakışmasını Android Chrome dahil güvenli biçimde düzenlemek.
- Bayrak, ad, rahat dokunma alanı, seçimle kapanma ve mevcut yönlendirme davranışlarını korumak.

## Teknik ayrıntılar
- Değişiklikler ortak `QuickSearch` sunumu ve ilgili stil kurallarıyla sınırlı kalacak; katalog, rota ve servis mantığı değişmeyecek.
- Sonuç kapsayıcısı ölçülen kullanılabilir alana göre CSS değişkeni alacak; liste `overflow-y: auto`, momentum/touch scrolling ve `overscroll-behavior: contain` kullanacak.
- Input satırı ayrı ve sabit kalacak; sonuçlar uzun katalogda DOM açısından hâlâ hafif olan basit satırlar olarak işlenecek.

## Doğrulama
- 360, 390 ve 430 px genişliklerde eSIM ve Lounge aramasını açma, listeyi sonuna kaydırma ve sonuç seçme.
- Daraltılmış görsel viewport ile açık klavye durumunu taklit etme; input görünürlüğü, bağımsız liste scroll'u ve seçim sonrası kapanmayı kontrol etme.
- TR/DE/EN, taşma, donmuş liste, sayfa kayması ve tarayıcı hatalarını kontrol etme.
