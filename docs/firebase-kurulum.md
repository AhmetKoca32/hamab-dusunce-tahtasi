# Firebase kurulumu

Site, **Firestore** (ortak notlar) ve **Authentication** (düzenleyici girişi) kullanır. Ücretsiz **Spark**
planı yeterlidir, kredi kartı gerekmez.

Kod hazır; aşağıdaki adımlar Firebase tarafını hazırlar. `js/firebase-config.js` içindeki `firebaseConfig`
`null` olduğu sürece site **yerel modda** çalışır (veriler paylaşılmaz).

## Durum

Proje: **`hamab-dusunce-tahtasi`**. 1., 2., 3. ve 6. adımlar Firebase CLI ile yapıldı (proje, web uygulaması,
Firestore `europe-west1`, güvenlik kuralları). 4. adımda E-posta/Şifre etkin ve kayıt olma kapalı.
**Elle yapılması gerekenler:** 4. adımda düzenleyici kullanıcıyı eklemek, 5. adımdaki `admins` belgesi ve 7. adım
(Authorized domains, Vercel adresi belli olunca).

## Giriş modeli

Düzenleyici girişi **yalnızca şifre** ister: tek, paylaşılan bir düzenleyici hesabı vardır ve e-postası
`js/firebase-config.js` içinde sabittir (`editorEmail`). Kullanıcıya e-posta sorulmaz. E-posta kaynak kodda
göründüğü için koruma şifreye dayanır. Bu sitede risk düşüktür: yanlış ellere geçerse en kötü sonuç notların silinmesi
ya da bozulmasıdır, kişisel veri yoktur. Bu yüzden orta düzey bir şifre yeterlidir:

- Şifre **en az 8 karakter** olsun ve **tahmin edilemesin**: sitenin ya da ekibin adı, isim, tarih, `12345678` ya da
  `alkim123` gibi kalıplar olmasın. Harf ve rakam karışık, anlamsız 8-10 karakter yeterlidir. Firebase art arda yanlış
  denemeleri geçici olarak engellediği için bu uzunlukta bir şifre çevrimiçi deneme-yanılmayla kırılamaz. Asıl risk
  tahmin edilebilir şifredir, kısalık değil.
- Şifreyi güvenli bir yoldan ilet (parola yöneticisi, yüz yüze). Açık mesajlaşmaya yazma.
- Biri ekipten ayrılırsa konsoldan şifreyi değiştir (Authentication → Users → kullanıcı → Şifreyi sıfırla/ayarla).
- Kim, ne zaman girdi bilinmez (tek hesap). İhtiyaç olursa sonradan kişiye özel hesaplara geçilir: her kişi için
  kullanıcı ekle, UID'si ile `admins` belgesi aç ve `firebase-auth.js` içinde e-posta alanını geri getir.

## 1. Proje

[Firebase konsolu](https://console.firebase.google.com) → **Proje ekle**. Proje kimliği (ör.
`hamab-dusunce-tahtasi`) genel olarak benzersiz olmalıdır, doluysa sonuna ek gelir. Google Analytics gerekmez.

## 2. Web uygulaması

Proje ayarları (dişli simgesi) → **Uygulamalarınız** → **Web (`</>`)** → takma ad: `hamab-web`. Firebase
Hosting'i işaretleme (yayın Vercel'de).

Gösterilen `firebaseConfig` nesnesini `js/firebase-config.js` içine yapıştır. Bu değerler **gizli değildir**
(web istemcisi için tasarlanmıştır, sayfa kaynağında zaten görünür). Güvenliği sunucudaki kurallar sağlar.

## 3. Firestore

**Build → Firestore Database → Veritabanı oluştur**: **üretim modu**, konum olarak Avrupa'da bir bölge
(ör. `europe-west1`). Konum sonradan değiştirilemez.

## 4. Authentication

1. **Build → Authentication → Başla → Sign-in method → E-posta/Şifre**: etkinleştir (bağlantıyla girişi kapalı bırak). *(Yapıldı.)*
2. **Users → Kullanıcı ekle**: **e-posta olarak `js/firebase-config.js` içindeki `editorEmail` değerini birebir gir**
   (`duzenleyici@hamab-dusunce-tahtasi.invalid`) ve güçlü bir şifre belirle (bkz. "Giriş modeli").
   Konsol `.invalid` uzantısını kabul etmezse `duzenleyici@hamab-dusunce-tahtasi.firebaseapp.com` kullan ve
   `editorEmail` değerini aynı şekilde değiştir (o adreste kimse e-posta alamaz).
3. Eklenen kullanıcının **Kullanıcı UID**'ini kopyala (listedeki sütun).
4. **Settings → User actions → "Enable create (sign-up)"** seçeneğini **kapat**: dışarıdan hesap açılmasını
   engeller. *(Yapıldı; `ADMIN_ONLY_OPERATION` ile doğrulandı.)*

## 5. Düzenleyici yetkisi: `admins` koleksiyonu

Firestore → **Koleksiyon başlat** → koleksiyon kimliği `admins` → **Belge kimliği**: otomatik kimliği silip
kullanıcının **UID'sini yapıştır** (birebir aynı olmalı, kurallar bu eşleşmeye bakar) → bir alan ekle (ör. `rol` =
`düzenleyici`; Firestore alansız belge oluşturmaz, değeri önemli değil). UID'ler depoya yazılmaz, yetki yalnızca
bu belgeyle verilir. Yetkiyi kaldırmak için belgeyi sil.

## 6. Güvenlik kurallarını yayınla

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <proje-kimliği>
```

(Firebase CLI kuruluysa `firebase deploy --only firestore:rules --project <proje-kimliği>`.) Kurallar
`firestore.rules` dosyasındadır. Konsolda **Firestore → Kurallar** sekmesine yapıştırmak da olur.

## 7. Yetkili alanlar

**Authentication → Settings → Authorized domains**: Vercel adresini ekle
(`hamab-dusunce-tahtasi.vercel.app`, varsa özel alan adı). `localhost` varsayılan olarak ekli.

## 8. İlk dönem

Siteyi aç, logoya 3 kez tıkla, şifreyle giriş yap. **+ Dönem ekle** ile ilk dönemi oluştur
(her dönem 12 haftayla gelir). Veritabanı boşken siteyi ziyaret edenler "Henüz içerik eklenmemiş" görür.

## 9. Doğrulama kontrol listesi

- [ ] Giriş yapmadan siteyi açınca dönemler ve notlar görünüyor.
- [ ] Giriş yapmadan not ve yorum eklenebiliyor, **iki farklı cihazda** birbirinin notu anında görünüyor.
- [ ] Giriş yapmadan düzenleme araçları hiç görünmüyor.
- [ ] Düzenleyici girişi çalışıyor (yalnızca şifre alanı var); yanlış şifre "Şifre yanlış." diyor.
- [ ] `admins` belgesi olmadan giriş "düzenleme yetkisi yok" diyor (belgeyi geçici olarak silerek dene).
- [ ] Not silme ve dönem/hafta/rapor değiştirme yalnızca düzenleyiciyle çalışıyor.
- [ ] Yorum sayısı not kartında güncelleniyor.

## Kota koruması (Spark planı)

### Sınırlar ve ne olur

Spark planında günlük ücretsiz sınırlar vardır (kabaca günde 50 bin okuma, 20 bin yazma, 20 bin silme; 1 GiB
depolama). **Güncel değerleri** [Firebase fiyatlandırma sayfasından](https://firebase.google.com/pricing) kontrol et.
Sınır aşılırsa **ek ücret kesilmez**: o gün için işlemler reddedilir ve ertesi gün sıfırlanır. Yani asıl risk para
değil, sitenin bir gün boyunca kullanılamaması. Kullanımı
[Firestore → Kullanım](https://console.firebase.google.com/project/hamab-dusunce-tahtasi/firestore/databases/-default-/usage)
sekmesinden izle.

### Gerçekçi tüketim

- **Sayfa açılışı** (30 dakikadan uzun aradan sonra): yaklaşık `1 + hafta sayısı (12-13) + seçili dönemdeki not sayısı`
  okuma. Dönem sonunda ~500 not varsa ≈ 500 okuma. Günde 50 bin okuma ≈ **~100 soğuk açılış**. 20 kişilik bir ekip için
  normalde yeter; toplantı günü hepsi birden açsa 20 × 500 = 10 bin.
- **Yorum paneli:** açılışta o notun yorum sayısı kadar okuma.
- **Not veya yorum ekleme:** 1 yazma + kural içindeki 1-2 okuma (kurallardaki `get()` de kotadan düşer).
- Not sayısı çok büyürse (bir dönemde ~1500+ not) açılış maliyeti kotayı zorlar; o zaman notlar yalnızca açık haftalar
  için yüklenecek şekilde değiştirilebilir (okumayı ~10 kat azaltır).

### Hangi önlemler var

| Önlem | Neyi korur | Durum |
|---|---|---|
| Yalnızca **seçili dönem** dinlenir, yorumlar panel açılınca yüklenir | Meşru okuma tüketimi | Var |
| Kalıcı yerel önbellek | Meşru okuma tüketimi | Var |
| Sunucu kuralları: alan, boyut, sunucu zaman damgası, sayaç doğrulaması | Bozuk veri, sahte alanlar, sayaç kurcalama | Var, canlıda sınandı |
| Not başına **en çok 200 yorum** (kural + istemci) | Tek notta sınırsız yığılma | Var, canlıda sınandı |
| Tarayıcıdan **dakikada en çok 8 not/yorum** | Hatalı döngü, çift tıklama, basılı kalan tuş | Var (kaza önlemi, güvenlik değil) |
| **Acil durum kilidi** (`npm run lockdown:readonly` / `lockdown:closed` / `unlock`) | Saldırı sırasında zararı durdurmak | Hazır, elle çalıştırılır |
| **App Check** (reCAPTCHA v3) | Botlar, kendi betiğini yazan biri | Kod hazır, **anahtar girilene kadar kapalı** |

### Dürüst sınırlar

- Not ve yorum yazmak giriş gerektirmez ve okuma herkese açık, bu yüzden **API anahtarını bilen biri, kendi
  bilgisayarından bir betikle istekleri döngüye alıp günlük kotayı tüketebilir.** O gün yazma ya da okuma kapanır,
  veri silinmez ve ücret çıkmaz. Dakikada 8 sınırı ve yorum sınırı bu saldırıyı **durdurmaz**: tarayıcıda çalıştığı
  için betik onları hiç kullanmaz.
- Buna karşı **tek gerçek önlem App Check**'tir (aşağıda). Ondan da emin olmak için ekibe özel bir parola
  (aşağıda "Takım parolası") eklenebilir.
- **API anahtarını sitenin adreslerine kısıtlamak (HTTP referrer) bir güvenlik önlemi değildir:** `Referer` başlığını
  komut satırından istediği gibi yazabilen biri bunu atlar. Yalnızca sıradan tarayıcıdan başka siteden kullanımı
  zorlaştırır. Yine de ekleyebilirsin, ama kotayı korumasına güvenme.

### App Check kurulumu (sıra önemli)

App Check, Firestore'a gelen her isteğe, isteğin gerçekten bu siteden geldiğini kanıtlayan bir belirteç ekler.
Belirteci olmayan istekleri sunucu reddeder. reCAPTCHA v3 kullanır (ücretsiz, görünmez, kullanıcıdan bir şey istemez).

1. [reCAPTCHA yönetim sayfasında](https://www.google.com/recaptcha/admin) **v3** türünde bir site oluştur. Alan adları:
   `hamab-dusunce-tahtasi.vercel.app` (yayın adresin neyse o) ve `localhost`. **Site anahtarını** ve **gizli anahtarı** al.
2. [Firebase konsolu → App Check](https://console.firebase.google.com/project/hamab-dusunce-tahtasi/appcheck) →
   Uygulamalar → `hamab-web` → **reCAPTCHA (v3)** → gizli anahtarı yapıştır → Kaydet.
3. `js/firebase-config.js` içinde `appCheckSiteKey` değerine **site anahtarını** yaz, commit'le ve yayınla. (Gizli
   anahtar koda **girmez**, yalnızca Firebase konsoluna girilir.)
4. Yerelde denemek için siteyi `localhost`'ta aç: tarayıcı konsolu bir **hata ayıklama belirteci** yazar. App Check →
   Uygulamalar → ⋮ → **Hata ayıklama belirteçlerini yönet**'e ekle, yoksa yerelde istekler reddedilir.
5. App Check → **API'ler → Cloud Firestore**: önce "ölçümler"i izle (doğrulanmış istek oranı ~%100 olmalı).
   **Ancak ondan sonra "Zorunlu kıl" de.** Zorunlu kıldığın anda belirteçsiz her istek reddedilir (eski açık sekmeler
   dahil); anahtarı yayınlamadan zorunlu kılarsan site çalışmaz.

Bir sorun çıkarsa konsoldan "Zorunlu kılmayı kaldır" demek siteyi hemen eski haline döndürür.

### Saldırı ya da kota tükenmesi olursa

1. [Firestore → Kullanım](https://console.firebase.google.com/project/hamab-dusunce-tahtasi/firestore/databases/-default-/usage):
   hangi kota tükendi, okuma mı yazma mı?
2. Yazma tükeniyorsa: `npm run lockdown:readonly` (herkes okur, kimse yazamaz). Okuma tükeniyorsa:
   `npm run lockdown:closed` (kimse okuyamaz, site hata şeridi gösterir). Komutlar yalnızca **kural dosyasını**
   değiştirir, veriye dokunmaz. Firebase CLI'de oturum açık olmalı (`firebase login`).
3. Nedeni araştır, App Check'i zorunlu kıl.
4. `npm run unlock` ile normal kuralları geri yükle (kilitler `ops/` altındadır).

### Takım parolası (isteğe bağlı, uygulanmadı)

Site yalnızca ekip içinse, okuma ve yazmayı tek bir paylaşılan "ekip" hesabıyla kısıtlamak kota saldırılarını neredeyse
tamamen keser: kurallarda `request.auth != null` şartı olur ve ziyaretçi siteyi ilk açışta parolayı bir kez girer
(cihazda hatırlanır). Bedeli: parolayı bilmeyen kimse siteyi göremez ve ekipten ayrılanda parola değişir. Bu bir
ürün kararıdır, istersen eklenir.

## API anahtarı hakkında

`js/firebase-config.js` içindeki `apiKey` herkese açıktır ve bu normaldir; tek başına veriye erişim sağlamaz, koruma
sunucu kurallarındadır. GitHub gibi tarayıcılar bu anahtarı "sızdırılmış Google anahtarı" diye işaretleyebilir; anahtar
zaten web istemcisi içindir, uyarı zararsızdır. İsteğe bağlı kısıtlama:

[Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
→ "Browser key" (Firebase'in otomatik oluşturduğu) → **Website restrictions** (HTTP referrers):

```
https://hamab-dusunce-tahtasi.vercel.app/*
https://hamab-dusunce-tahtasi.firebaseapp.com/*
http://localhost:8765/*
```

Kısıtlamayı **site çalıştığı doğrulandıktan sonra** ekle ve ardından giriş ile not eklemeyi yeniden dene.
Adres eksik yazılırsa giriş sessizce bozulur. Özel alan adı eklenirse onu da listeye ekle.

## Güvenlik notları

- Notlar ve yorumlar giriş gerektirmeden eklenebilir (sitenin amacı bu). Kurallar biçimi, uzunluğu ve not başına
  yorum sayısını doğrular, ama **sunucuda hız sınırı yoktur**: kötü niyetli biri çok sayıda geçerli not ekleyebilir.
  Bunun çaresi App Check'tir ([Kota koruması](#kota-koruması-spark-planı)).
- Notları ve yorumları yalnızca düzenleyici silebilir.
- Firestore'un Spark planında otomatik yedekleme yoktur. Önemli bir dönem sonunda dışa aktarmayı düşün
  (`gcloud firestore export` Blaze planı ister; alternatif olarak raporları ayrıca kaydet).
