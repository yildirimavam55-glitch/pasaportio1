# Rekabetçi fiyat zekâsı — Paket fiyatları genişletmesi

Mevcut fiyat önceliği (Ülkeye özel > Genel > Otomatik) aynen kalır. Yeni katman yalnızca **hesaplar, sınıflandırır ve önerir**; Admin "uygula" demeden hiçbir müşteri fiyatı değişmez. Yayın yok.

## Ne eklenecek

1. **Rakip fiyat verisi (Admin girer/içe aktarır)**
   - Projede yasal bir rakip fiyat kaynağı/API yok; scraping yapılmayacak.
   - Kayıt: rakip, ülke, paket türü, veri (GB), gün, fiyat, orijinal para birimi, kaynak/referans, kontrol tarihi.
   - Rakipler: Airalo + 3 adlandırılabilir rakip slotu.
   - CSV yapıştır/yükle → önizleme → geçersiz satırlar gerekçesiyle reddedilir → onayla kaydet. Tek satır ekleme/silme de olacak.
   - Hiçbir rakip verisi katalog veya tedarikçi verisine dokunmaz.

2. **Eşleştirme**: yalnızca aynı ülke + aynı paket türü + aynı veri + aynı gün. Benzer isim veya "daha ucuz" eşleşmesi yok.

3. **Para birimi**: orijinal fiyat ve birim saklanır. EUR dışı fiyat, projedeki mevcut kur tablosunda güncel kur varsa dönüştürülür; yoksa karşılaştırmaya katılmaz ve "Kur yok" olarak işaretlenir. Sabit kur yazılmaz.

4. **Pazar referansı**: geçerli + güncel fiyatların **medyanı**. Tek tek rakip değerleri satır açılınca görünür. Veri yoksa "Veri yok" (asla €0,00).

5. **Önerilen fiyat**
   - Güvenli taban = maliyet ÷ (1 − minimum marj) (mevcut fiyat kuralı / sağlayıcı minimum marjı, yoksa %25).
   - Pazar hedefi = pazar referansı × 0,93 (varsayılan %7 altı, .99 yuvarlama).
   - Öneri = max(taban, hedef), pazar referansını aşmayacak şekilde; mümkün değilse öneri yok.
   - Rakip verisi yoksa öneri gösterilmez.

6. **Durum motoru**
   - 🟢 Rekabetçi: fiyat ≤ pazar referansı (+%2 tolerans) ve marj ≥ minimum.
   - 🟡 Kontrol et: düşük marj, pazardan belirgin pahalı, veri eksik veya eski (varsayılan 30 gün → "Rakip fiyatını tekrar kontrol et").
   - 🔴 Satışa uygun değil: güvenli taban pazar referansının üstünde ya da maliyet ≥ pazarın ~%90'ı. Aynı ülke/paket için daha ucuz eşdeğer varyant varken pahalı varyantlar (ör. €8 yanında €41) da 🔴 işaretlenir — katalogdan silinmez.
   - ⚪ Rakip verisi yok.
   - "Vitrin için önerilen" etiketi: yalnızca bilgi; vitrin seçimi değişmez.

7. **Admin arayüzü (mevcut sade tasarım korunur)**
   - Üstte kompakt genel özet: 190+ ülke, 🟢/🟡/🔴/⚪ sayıları + filtreler (Tümü / Rekabetçi / Kontrol et / Satışa uygun değil / Veri yok). Filtre seçince ilgili ülkeler listelenir.
   - Ülke başlığında: vitrin paketleri + durum sayıları.
   - Mobil kart: Paket · Maliyet · Travely [fiyat girişi] · Pazar · Kâr/Marj · "Pazardan %6 daha uygun" · durum · Önerilen fiyat + [Önerilen fiyatı uygula]. Rakip listesi açılır.
   - Masaüstü tablo: Paket / Maliyet / Travely / Pazar / Fark / Kâr / Marj / Durum; satıra tıklayınca rakip detayları.
   - [Önerilen fiyatları oluştur] → önizleme (mevcut → önerilen, güvenli fiyat yoksa "Güvenli rekabet mümkün değil"), satır seçimi → [Seçilen fiyatları uygula]. Uygulama mevcut kaydetme yolunu (zarar uyarısı dahil) kullanır ve ülkeye özel fiyat olarak yazılır.
   - Owner'ın elle girdiği fiyat her zaman korunur; kâr/marj/fark/durum anında yeniden hesaplanır.
   - Yeni ⋯ işlemi: "Rakip fiyatları" (liste, ekle, CSV içe aktar).

8. **Geleceğe hazır**: motor saf fonksiyon olarak kurulur; ileride "AUTO PRICE" ve bildirim eklenebilir. Şimdi otomatik fiyatlama **kapalı ve yok**.

## Güvenlik ve veri

- Yeni tablo, migration veya RLS değişikliği **yok**: rakip verisi ve ayarlar, manuel fiyatlarla aynı Admin-only ayar kaydında ayrı bir anahtar altında saklanır; tüm okuma/yazma mevcut Admin rol kontrollü sunucu fonksiyonlarından geçer.
- Müşteri tarafı yalnızca çözümlenmiş satış fiyatını görür; maliyet, marj, rakip verisi asla açılmaz.
- Dokunulmayanlar: tedarikçi entegrasyonu, katalog, maliyetler, yayın durumu, vitrin seçimi, ödeme/sipariş/provisioning, ana sayfa, çeviriler. Sync çalıştırılmaz.

## QA (Türkiye)

1 / 3 / 5 / 10 / 20 GB ve Sınırsız 7 gün için maliyet, mevcut fiyat, pazar, öneri, kâr, marj, durum. Gerçek rakip verisi olmadığından bu paketler "Veri yok" görünecek; motor davranışı (medyan, 🟢/🟡/🔴, eski veri, kur yok, pahalı varyant) birim testlerle sentetik girdilerle doğrulanır — veritabanına sahte rakip fiyatı yazılmaz. 360/390/430/1280/1440 ekran kontrolü.

## Teknik detaylar

- `src/domain/pricing/competitive.ts`: eşleştirme anahtarı (mevcut `packageKey`), medyan, FX dönüşümü, taban/hedef/öneri, durum, pahalı varyant tespiti, yaş metni. + vitest testleri.
- `src/lib/competitor-pricing.functions.ts`: `platform_settings` id `competitor_prices` (girdiler + politika: hedef faktör 0.93, eskime 30 gün); list/upsert/delete/import-preview/import-commit; zod doğrulama, 2000 satır limiti; admin guard mevcut `manual-pricing.functions.ts` ile aynı. `exchange_rates` tablosu yalnızca okunur.
- `getCountryPricing`/`getManualPricingOverview` çıktısına rekabet alanları eklenir (fiyat çözümleme değişmez).
- `admin.manual-pricing.tsx`: özet + filtreler, kart/tablo alanları, öneri önizlemesi, rakip fiyatları paneli. Uygulama `saveManualPrices` ile.
- `AGENTS.md`: rekabet katmanı kuralı tek satır.
