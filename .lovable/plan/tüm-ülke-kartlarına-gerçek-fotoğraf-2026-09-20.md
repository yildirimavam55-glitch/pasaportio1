# Tüm ülke kartlarına gerçek fotoğraf

## Amaç
Gerçek katalogda satılabilen her tek-ülke destinasyonunu, sembol/çizim yerine o ülkeye ait gerçek ve tutarlı bir seyahat fotoğrafıyla göstermek. Paket karşılaştırma kartları sade kalacak; bölgesel kartlar ülkeye özgü fotoğraf kullanmayacak.

## Uygulama
- Canlı katalogdan satılabilir tek-ülke ISO listesini yeniden çıkarıp kesin kapsamı belirleyeceğim.
- Her mevcut ISO için merkezi bir fotoğraf kaydı oluşturacağım: kart/başlık görseli, odak noktası ve TR/DE/EN alternatif metni.
- Fotoğrafları proje varlık akışında saklayıp dış sitelere çalışma zamanı bağımlılığı bırakmayacağım.
- Ana sayfa, “Tüm ülkeler” görünümü ve ülke paket başlığı aynı kayıt ve aynı görsel ailesini kullanacak.
- Ülke kartlarında sabit oran, responsive boyutlar, ilk görünüm için sınırlı eager yükleme ve geri kalanı için lazy loading uygulayacağım.
- Mevcut çizim tabanlı ülke sahnesini yalnızca gelecekte eklenen, henüz eşlenmemiş ülkeler için nötr fallback olarak tutacağım; bugünkü katalogda fallback sayısı sıfır olacak.
- Paket kartlarına fotoğraf, landmark veya ülke sembolü eklemeyeceğim; bölgesel kartların nötr görsel dilini koruyacağım.

## Teknik doğrulama
- Otomatik kontrol: satılabilir ülke sayısı = kart sayısı = fotoğraf eşleme sayısı; eksik, tekrar, bozuk dosya ve çözülemeyen başlangıç fiyatı sayıları sıfır.
- Her desteklenen ISO için isim, bayrak, fotoğraf, fiyat ve paket yönlendirmesini kontrol edeceğim.
- Germany, France, Italy, Austria, Turkey, Japan, USA, Spain, Thailand, UAE ve rastgele 10 ülkeyi görsel olarak inceleyeceğim.
- TR/DE/EN ile 360/375/390/412/430 px kontrollerini yapacağım.
- İlk kontrolden çıkan sorunları düzelttikten sonra kataloğu yeniden sorgulayıp ikinci doğrulama turunu çalıştıracağım.
