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

## Kota ve maliyet (Spark planı)

Spark planında günlük ücretsiz sınırlar vardır (yazma ve okuma sayıları, 1 GiB depolama). Güncel değerleri
[Firebase fiyatlandırma sayfasından](https://firebase.google.com/pricing) kontrol et. Sınır aşılırsa
ek ücret kesilmez, o gün için işlemler reddedilir. Okumayı düşük tutmak için tasarım şöyle:

- Yalnızca **seçili dönemin** blokları ve notları dinlenir.
- **Yorumlar** yalnızca not paneli açılınca yüklenir; kartlardaki yorum sayısı notun kendi alanından gelir.
- Kalıcı yerel önbellek sayfa yenilemelerinde tekrar okumayı azaltır.

## API anahtarı kısıtlaması

`js/firebase-config.js` içindeki `apiKey` herkese açıktır ve bu normaldir; tek başına veriye erişim sağlamaz.
Yine de anahtarı yalnızca sitenin adreslerine kısıtlamak, başkalarının kendi kotanı kullanmasını zorlaştırır.
GitHub gibi tarayıcılar bu anahtarı "sızdırılmış Google anahtarı" diye işaretleyebilir; anahtar zaten web
istemcisi içindir, uyarı zararsızdır, kısıtlama uyarıyı da anlamsız kılar.

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

- Notlar ve yorumlar giriş gerektirmeden eklenebilir (sitenin amacı bu). Kurallar biçimi ve uzunluğu doğrular,
  ama **hız sınırı yoktur**: kötü niyetli biri çok sayıda geçerli not ekleyebilir. Sorun olursa **App Check**
  (reCAPTCHA) eklenebilir.
- Notları ve yorumları yalnızca düzenleyici silebilir.
- Firestore'un Spark planında otomatik yedekleme yoktur. Önemli bir dönem sonunda dışa aktarmayı düşün
  (`gcloud firestore export` Blaze planı ister; alternatif olarak raporları ayrıca kaydet).
