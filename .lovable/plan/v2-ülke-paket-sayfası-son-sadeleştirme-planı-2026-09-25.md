# V2 ülke/paket sayfası son sadeleştirme planı

## Kapsam
- Yalnız `/design-v2/esim?country=…` ülke/paket görünümünü sadeleştireceğim; ülke seçilmemiş V2 ana sayfası, Lounge, Vignette ve production sayfaları değişmeyecek.
- Mevcut ülke kimliği, Standard/Unlimited sekmeleri, gerçek paket kartları, bilgi penceresi, seçili kart görünümü ve sabit satın alma özeti korunacak.

## Uygulama
- Paketlerden sonra yalnız üç kısa alan bırakacağım: açılır paket yardımcısı, mevcut cihaz uyumluluk kontrolü ve mevcut kurulum rehberine giden kompakt bağlantı.
- Büyük veri kullanımı, “Nasıl çalışır?”, kurulum animasyonu, “Neden travely?”, Lounge/Vignette tanıtımları, rehberler ve FAQ yalnız ülke görünümünden kaldırılacak; bileşenleri veya ana sayfadaki kullanımları silinmeyecek.
- Bölgesel seçenekler ülke paketlerinden ayrı, tek kompakt keşif bağlantısı olarak gösterilecek; bölgesel ürünler ana Standard/Unlimited kartlarına karıştırılmayacak.
- TR/DE/EN metinleri mevcut çeviri yapısında tutulacak; kurulum bağlantısı mevcut V2 destek/kurulum rehberini açacak.

## Teknik sınırlar
- Katalog sorguları, ülke filtreleri, sıralama, Standard/Unlimited deduplication, fiyatlar, ürün kimlikleri, sepet ve checkout mantığı değişmeyecek.
- Supplier, senkronizasyon, veritabanı, ödeme, provisioning, Admin, production ve yayınlama kapsam dışı kalacak.

## Doğrulama
- Türkiye, Almanya ve Arjantin için Standard/Unlimited kartları; seçim, bilgi, miktar, sepete ekleme ve doğru ürün kimliği kontrol edilecek.
- TR/DE/EN dillerinde 360/390/430 px; yatay taşma, sabit satın alma özeti, WhatsApp, alt navigasyon ve içerik güvenli boşlukları kontrol edilecek.
- Uyumluluk kontrolünün açılması, kurulum rehberi bağlantısı ve kaldırılan tekrar bölümlerinin ülke sayfasında görünmemesi doğrulanacak.
