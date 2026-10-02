# Yönetilebilir eSIM bilgi karuseli

## Uygulama
- Mevcut uzun `Neden Travely?` deneyimini kaldır ve onaylı görseldeki kompakt bilgi karuseliyle değiştir.
- Karuseli mevcut `Popüler eSIM Ülkeleri` bölümünün hemen ardından, `Bölgesel eSIM Paketleri` bölümünden önce göster; çevredeki hiçbir bölümü veya sıralamayı değiştirme.
- Başlık, alt başlık ve yedi kartı onaylı tasarım diliyle oluştur: sıcak krem yüzey, koyu petrol metinler, fotoğraf ağırlıklı üst alan, açık içerik alanı, numara, kısa başlık/metin ve yalnız gerekli küçük bilgi işaretleri.
- Mobilde bir tam kart ile sonraki kartın yaklaşık %15–20’sini göster; doğal yatay kaydırma ve scroll-snap kullan. Tablet ve masaüstünde birden fazla kart göster; masaüstü okları ve küçük sayfa noktaları ekle. Otomatik ilerleme, gizli içerik ve ağır karusel paketi kullanma.
- Yedi kartı verilen sırayla hazırla: eSIM ürünleri, 14 günlük kullanılmamış eSIM iadesi, roaming karşılaştırması, profilde anında teslimat, QR/link ile kolay kurulum, güvenli ödeme, mevcut WhatsApp desteği.
- Görsellerde çeşitliliği koru; telefon kompozisyonunu yalnız gerekli kartlarda kullan. Mevcut uygun görselleri yeniden kullan, eksik sahneler için aynı sıcak ve gerçekçi Travely fotoğraf dilinde optimize edilmiş görseller üret.

## Admin ve içerik yönetimi
- Mevcut V2 storefront editörüne tekil bir `eSIM Bilgi Kartları` bölümü ekle; yeni ve bağlantısız bir CMS veya yayın sistemi kurma.
- Bölüm ayarlarında görünürlük, TR/DE/EN başlık ve alt başlık, mobil kart genişliği, kart aralığı, sayfa noktaları ve masaüstü oklarını yönetilebilir yap.
- Yedi kartı tek kayıt dizisi olarak yönet: iç anahtar, kart türü, görünürlük, sıra, görsel, görsel odağı, isteğe bağlı güvenli site içi hedef, TR/DE/EN başlık–açıklama–etiketler–CTA–görsel alt metni.
- Mevcut oklarla sıralama, dil eksikliği uyarıları, özel medya kütüphanesi, mobil/tablet/masaüstü önizleme, taslak, yayın, sürüm geçmişi ve geri yükleme akışlarını yeniden kullan.
- Ülke sayısı, iade süresi, azami tasarruf oranı ve ortalama kurulum süresini bölümde ayrı iş iddiaları olarak düzenlenebilir tut; değişiklikler metni kendiliğinden yeniden yazmasın, Admin içerik incelemesi görünür kalsın.
- Mevcut `cms_documents` içindeki V2 JSON yapılandırmasını kullan; yeni tablo veya migration oluşturma.

## Doğruluk ve entegrasyon
- Ödeme yöntemlerini checkout yapılandırmasından türet. Canlı ödeme sağlayıcısı şu anda etkin olmadığı için Visa/Mastercard/Apple Pay/Google Pay/PayPal logosu gösterme; Admin önizlemesi de yöntem olmadığını dürüstçe belirtsin ve desteklenmeyen yöntemi açmaya izin vermesin.
- WhatsApp bağlantısını mevcut merkezi destek numarası/bağlantı yardımcı fonksiyonundan al; ikinci bir ayar oluşturma.
- Teslimat kartında yalnız müşteri profilini garanti et; e-posta teslimatı iddiası ekleme. İade metnini yalnız kullanılmamış eSIM’lerle sınırla; roaming kartında doğrulanmamış euro fiyatları kullanma.
- TR/DE/EN içerik Admin kaydından gelsin; diğer mevcut storefront dilleri İngilizce kaynak ve statik overlay çeviri politikasını izlesin. RTL düzenini koru.
- Mevcut analitik katmanı yalnız no-op sözleşme olduğundan sahte kayıt üretme; gerçek bir sink bağlanana kadar yeni olayları kalıcıymış gibi uygulama.

## Teknik ayrıntılar
- V2 bölüm modeline tekil, eSIM’e özgü bilgi-karuseli türü ve doğrulanan alanlar ekle; kart sayısını ve metin uzunluklarını güvenli biçimde sınırla.
- Müşteri bileşenini küçük parçalara ayır: karusel kabuğu, ortak kart çerçevesi ve yedi görsel varyant. Önemli metin daima görünür kalsın.
- Klavye okları, görünür odak, semantik liste, açıklayıcı alt metin, en az 44 px temel kontroller ve azaltılmış hareket desteği sağla.
- Görselleri mevcut özel medya mimarisi ve süreli erişim bağlantılarıyla yönet; yerleşik varsayılan görseller için mevcut asset akışını kullan.

## Doğrulama
- 360/390/430 px mobil, tablet ve 1280/1440 px masaüstünde kart genişliği, sonraki kart önizlemesi, swipe, scroll-snap, oklar, noktalar, taşma ve doğal dikey kaydırmayı kontrol et.
- Yedi kartın sırası, görünür metni, görsel çeşitliliği, gerçek ödeme durumu ve mevcut WhatsApp bağlantısını doğrula.
- TR/DE/EN dil geçişini, eksik dil uyarılarını, Arapça RTL/fallback davranışını ve azaltılmış hareketi kontrol et.
- Admin’de düzenleme, sıralama, gizleme, görsel seçme/değiştirme/kaldırma, mobil/tablet/masaüstü önizleme, taslak kaydetme ve yayınlamadan geri açma akışlarını doğrula.
- Hero, arama, hızlı güven satırı, Popüler Ülkeler, Bölgesel Paketler, uyumluluk, Lounge, Vignette, header, footer, alt navigasyon, sepet ve checkout için regresyon kontrolü yap.
- TypeScript, ilgili testler, otomatik build ve tarayıcı hatalarını doğrula; yayınlama yapma.
