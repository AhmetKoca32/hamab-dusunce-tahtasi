# hamab-dusunce-tahtasi

**Hamab Kuramsal Düşünce Tahtası**: bir halk müziği ekibinin haftalık okuma notlarını, sorularını ve
çıkarımlarını paylaştığı, herkesin not ekleyip yorum yazabildiği sade bir web sitesi.

Derleme aracı yok, çerçeve yok: saf HTML, CSS ve tarayıcıda çalışan ES modülleri. Statik olarak
yayınlanır (Vercel, GitHub Pages vb.).

## Durum

| | |
|---|---|
| Arayüz | Hazır (dönem sekmeleri, akordeon haftalar, yorum paneli, raporlar, gizli düzenleyici girişi) |
| Veri | **Geçici.** Şu an her tarayıcının kendi `localStorage` alanında tutuluyor, **cihazlar arasında paylaşılmıyor** |
| Giriş | **Geçici.** Şifre istemci kodunda açıkça yazılı, gerçek güvenlik sağlamaz |
| Sonraki adım | Firebase (Firestore + Authentication): ortak notlar ve gerçek düzenleyici girişi |

> **Gerçek ekip kullanımı için yayınlamadan önce Firebase adımı tamamlanmalıdır.** Aksi halde
> herkes kendi tahtasını görür ve düzenleyici şifresi sayfa kaynağından okunabilir.

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

Sayfanın üstündeki **logoya (ya da başlığa) 1,5 saniye içinde 3 kez tıkla**, şifre penceresi açılır.
Giriş yapılmamışsa sayfada düzenleme ile ilgili hiçbir şey görünmez. Düzenleyici; dönemleri, hafta
başlıklarını ve raporları değiştirebilir, notları ve yorumları silebilir.

Geçici şifre `js/auth.js` içinde. Firebase aşamasında kaldırılacak.

## Klasör yapısı

```
index.html            İskelet: yalnızca yapı ve bağlantılar
assets/               Logo (ileride fontlar)
css/
  tokens.css          Renk, tipografi, aralık ve yarıçap ölçekleri (tek kaynak)
  base.css            Sıfırlama, sayfa iskeleti, üst bölüm, odak halkası
  components.css      Düğme, dönem seçici, hafta, not, rapor, yan panel, pencere
js/
  main.js             Giriş noktası: parçaları birbirine bağlar
  context.js          Ortak bağlam: store, auth ve geçici arayüz durumu
  domain.js           Saf mantık ve veri şeması (DOM yok, test edilir)
  store.js            Veri deposu. Firebase'e geçişte değişecek tek dosya (1/2)
  auth.js             Düzenleyici girişi. Firebase'e geçişte değişecek tek dosya (2/2)
  actions.js          Düzenleyici akışları: pencere aç, onay al, depoya yaz
  gate.js             Gizli giriş (logoya 3 tık)
  views/              terms.js, board.js, drawer.js, dialog.js: yalnızca çizim
  lib/                dom.js, time.js, focus.js, prefs.js: küçük yardımcılar
test/                 Node'un yerleşik test çalıştırıcısıyla birim testler
```

### Mimari kural

Arayüz veriye yalnızca `store` üzerinden dokunur ve veri değişince ekran **kendiliğinden** yenilenir
(`store.subscribe`). Görünümler (`views/`) depoya yazmaz, akışlar (`actions.js`) ve olay işleyicileri yazar.
Bu ayrım sayesinde Firebase'e geçiş `store.js` ve `auth.js` ile sınırlı kalır, arayüz değişmez.

### Veri şeması

```
state  = { terms: [Term] }
Term   = { id, title, blocks: [Week | Report] }
Week   = { id, type: 'week', title, cols: { sorular, dusunceler, cikarimlar: [Note] } }
Report = { id, type: 'report', title, text }
Note   = { id, text, author, ts, comments: [Comment] }
Comment = { id, text, author, ts }
```

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

Proje adı repo adını izler: `hamab-dusunce-tahtasi` → `hamab-dusunce-tahtasi.vercel.app`.

## Yapılacaklar

- [ ] Firebase: Firestore (ortak notlar) ve Authentication (düzenleyici girişi) ile güvenlik kuralları
- [ ] Fraunces fontunu siteye gömmek (`assets/fonts/`, Latin + Latin-Extended)
- [ ] Haftalık kaynaklar için Drive bağlantısı alanı (ücretsiz çözüm)
- [ ] İsteğe bağlı: karanlık mod (renkler zaten CSS değişkeni)
