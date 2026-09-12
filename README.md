# KG Tahmin — Taktik Tahtası (Demo)

Karşılıklı Gol (KG) tahmin sitesi için bağımsız, statik bir **tasarım denemesi**. Önceki
"tasarim-denemesi-2" ve "tasarim-denemesi-3" projelerinden hem görsel dil hem kod tabanı olarak
tamamen ayrıdır.

**Tasarım metaforu:** futbol taktik tahtası / yeşil sınıf tahtası. Maçlar "oyuncu" gibi bir kadro
analizine giriyor, Kesin/Olası etiketleri "İlk 11 / Yedek Kulübesi" durumuna dönüşüyor, canlı maçlar
mini bir saha görselinde topun konumuyla (dakikaya göre) takip ediliyor, sinyal arşivi bir taktik
defteri (post-it not kartları), Kupon ise "Kadro Listem" adıyla bir kadro/taktik panosu.

- Gerçek bir backend/API/veritabanı yoktur; tüm veri `data.json` içinde üretilmiş örnek veridir.
- Kesin/Olası etiketleri `app.js` içindeki `guvenHesapla()` fonksiyonu ile istemci tarafında,
  ham oranlar ve istatistik tablosu üzerinden gerçek zamanlı hesaplanır.
- **Kadro Listem (Kupon)** tamamen istemci taraflı çalışan gerçek bir hesap makinesidir: maç
  ekle/çıkar (localStorage'da saklanır), oranlar `× 1.037` katsayısıyla "iddaa.com karşılığı"
  değere çevrilir, toplam oran tüm oranların çarpımıdır, olası kazanç = tutar × toplam oran.
  Gerçek bahis değildir.
- Yerleşim: mobilde ekranı tam dolduran, masaüstünde ~860px genişlikte ortalanan tek sütun.

## Yerel çalıştırma

```bash
python3 -m http.server 8000
# http://localhost:8000
```
