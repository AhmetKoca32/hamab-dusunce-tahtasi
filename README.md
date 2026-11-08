# hamab-dusunce-tahtasi

**Hamab Kuramsal Düşünce Tahtası**: bir halk müziği ekibinin haftalık okuma notlarını, sorularını ve
çıkarımlarını paylaştığı, herkesin not ekleyip yorum yazabildiği sade bir web sitesi.

Derleme aracı yok, çerçeve yok: saf HTML, CSS ve tarayıcıda çalışan ES modülleri. Veriler Firebase'de
(Firestore + Authentication, ücretsiz Spark planı), site statik olarak yayınlanır (Vercel vb.).

## Durum

| | |
|---|---|
| Arayüz | Hazır (dönem sekmeleri, akordeon haftalar, yorum paneli, raporlar, gizli düzenleyici girişi) |
| Veri / giriş (Firebase) | Kod hazır ve birim testli. **Firebase projesi bağlanınca** ortak çalışır ([kurulum](docs/firebase-kurulum.md)) |
| Yerel mod | `js/firebase-config.js` içindeki `firebaseConfig` `null` iken devreye girer: veriler yalnızca o tarayıcıda tutulur, **paylaşılmaz**. Sayfada bunu belirten bir şerit görünür |

> Firebase yapılandırması girilmeden yayınlanan site herkese **kendi boş tahtasını** gösterir.
> Yayından önce [docs/firebase-kurulum.md](docs/firebase-kurulum.md) adımlarını tamamla.

## Çalıştırma

ES modülleri `file://` ile çift tıklayıp açınca çalışmaz, yerel bir sunucu gerekir:

```bash
npm start            # http://localhost:8765
```

(`python3` gerektirir. İstediğin başka bir statik sunucu da olur.)

Testler (Node 20+, ek bağımlılık yok):

```bash
npm test
```

## Düzenleyici girişi

Sayfanın üstündeki **logoya (ya da başlığa) 1,5 saniye içinde 3 kez tıkla**, giriş penceresi açılır.
Giriş yapılmamışsa sayfada düzenleme ile ilgili hiçbir şey görünmez.

- **Firebase modunda:** yalnızca şifre. Tek, paylaşılan bir düzenleyici hesabı vardır (e-postası
  `js/firebase-config.js` içinde sabit). Hesap **ve** Firestore'da `admins/{uid}` belgesi gerekir; yetki
  sunucu tarafında güvenlik kurallarıyla zorunlu kılınır. Şifre **en az 8 karakter ve tahmin edilemez**
  olmalıdır (isim, tarih, `12345678` gibi olmasın); koruma ona dayanır ([giriş modeli](docs/firebase-kurulum.md)).
- **Yerel modda (yalnızca geliştirme):** yine yalnızca şifre, şifre `js/backend/local-auth.js` içinde.

Düzenleyici; dönemleri, hafta başlıklarını ve raporları değiştirebilir, notları ve yorumları silebilir.

## Klasör yapısı

```
index.html              İskelet: yalnızca yapı ve bağlantılar
assets/                 Logo (ileride fontlar)
css/                    tokens.css (ölçekler), base.css (iskelet), components.css (bileşenler)
js/
  main.js               Giriş noktası: parçaları bağlar, odak koruyarak yeniden çizer
  context.js            Seçilen arka uç (store, auth) ve geçici arayüz durumu
  domain.js             Saf mantık ve veri şeması (DOM yok, test edilir)
  firebase-config.js    Firebase web yapılandırması (null = yerel mod)
  actions.js            Düzenleyici akışları: pencere aç, onay al, depoya yaz
  gate.js               Gizli giriş (logoya 3 tık)
  backend/
    index.js            Arka ucu seçer (Firebase / yerel / hata yedeği)
    firebase-store.js   Firestore deposu       firebase-auth.js   Firebase girişi
    local-store.js      localStorage deposu    local-auth.js      Yerel (geliştirme) girişi
    assemble.js         Düz belgelerden arayüz durumunu kuran saf fonksiyonlar
    firebase-sdk.js     Firebase SDK'sının tek giriş noktası (sürüm burada)
    failed.js           Sunucuya ulaşılamazsa salt-okunur yedek
  views/                terms.js, board.js, drawer.js, dialog.js: yalnızca çizim
  lib/                  dom, time, focus, prefs, storage: küçük yardımcılar
test/                   Node'un yerleşik test çalıştırıcısıyla birim testler
firestore.rules         Güvenlik kuralları (asıl yetki denetimi burada)
firebase.json  firestore.indexes.json
docs/firebase-kurulum.md
```

### Mimari kural

Arayüz veriye yalnızca `store` üzerinden dokunur ve veri değişince ekran **kendiliğinden** yenilenir
(`store.subscribe`). Görünümler (`views/`) depoya yazmaz, akışlar (`actions.js`) ve olay işleyicileri yazar.
İki arka uç (Firebase, yerel) **aynı arayüzü** sunar (bkz. `js/backend/local-store.js` başı); hangisinin
kullanılacağı yalnızca `js/backend/index.js`'de seçilir.

### Veri modeli (Firestore)

```
terms/{id}                  { title, order, createdAt }
blocks/{id}                 { termId, type: 'week'|'report', title, order, text?, createdAt }
notes/{id}                  { termId, blockId, col, text, author, ts, commentCount }
notes/{id}/comments/{id}    { text, author, ts }
admins/{uid}                düzenleyici hesaplar (yalnızca konsoldan eklenir)
```

Düz koleksiyonlar sayesinde 20 kişi aynı anda yazınca birbirinin verisini ezmez. Okuma kotasını korumak için
yalnızca seçili dönemin blokları ve notları dinlenir; yorumlar not paneli açılınca yüklenir.

## Tasarım ilkeleri

- Tek renk paleti (`css/tokens.css`), tek vurgu rengi, tek düğme yüksekliği (44 px).
- Kullanıcı metni asla `innerHTML` ile eklenmez (`js/lib/dom.js` yalnızca `createTextNode` kullanır).
- Klavye ve ekran okuyucu desteği: görünür odak halkası, `aria-expanded`, panelde odak tuzağı, atlama bağlantısı.
- `prefers-reduced-motion` altında animasyonlar kapanır.

## Yayınlama (Vercel)

Statik site, derleme adımı yok:

- Framework Preset: **Other**
- Build Command: boş bırak
- Output Directory: boş bırak (kök dizin)

Proje adı repo adını izler: `hamab-dusunce-tahtasi` → `hamab-dusunce-tahtasi.vercel.app`. Yayından sonra bu
alanı Firebase'de **Authorized domains** listesine ekle ([kurulum, adım 7](docs/firebase-kurulum.md)).

## Kota ve kötüye kullanım koruması

Ücretsiz Spark planı günlük sınırlıdır; aşılırsa ücret çıkmaz ama o gün işlemler reddedilir. Meşru kullanım için
okuma düşük tutulur (yalnızca seçili dönem dinlenir, yorumlar panel açılınca yüklenir). Sunucu kuralları biçimi
doğrular ve not başına en çok 200 yorum yazılmasına izin verir; tarayıcı dakikada en çok 8 yazıma izin verir (kaza
önlemi). **Kasıtlı kota saldırısına karşı asıl savunma App Check'tir** ve henüz açık değil, kod hazır, adımlar
[docs/firebase-kurulum.md](docs/firebase-kurulum.md#kota-koruması-spark-planı)'nda. Acil durumda:

```bash
npm run lockdown:readonly   # herkes okur, kimse yazamaz
npm run lockdown:closed     # kimse okuyamaz ya da yazamaz
npm run unlock              # normal kurallara dön
```

## Yapılacaklar

- [ ] Firebase projesini bağla ve doğrula ([kontrol listesi](docs/firebase-kurulum.md))
- [ ] Fraunces fontunu siteye gömmek (`assets/fonts/`, Latin + Latin-Extended)
- [ ] Haftalık kaynaklar için Drive bağlantısı alanı (ücretsiz çözüm)
- [ ] App Check'i aç (reCAPTCHA v3 anahtarı gerekir, adımlar kurulum belgesinde)
- [ ] İsteğe bağlı: karanlık mod (renkler zaten CSS değişkeni)
