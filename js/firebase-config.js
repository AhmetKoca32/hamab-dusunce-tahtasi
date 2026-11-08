// Firebase web uygulaması yapılandırması.
//
// Bu değerler GİZLİ DEĞİLDİR: Firebase web istemcisi için tasarlanmıştır ve sayfa kaynağında zaten
// herkese açıktır. Verinin güvenliğini bu anahtar değil, sunucudaki güvenlik kuralları (firestore.rules)
// sağlar. Yine de anahtarı yalnızca bu sitenin adreslerine kısıtlamak iyi bir ek katmandır
// (docs/firebase-kurulum.md, "API anahtarı kısıtlaması").
//
// `null` yapılırsa site YEREL MOD'da çalışır: veriler yalnızca o tarayıcıda tutulur, paylaşılmaz.

export const firebaseConfig = {
    apiKey: 'AIzaSyA6-hluusF1DZzHyL080hQ3oloYUoUqXrk',
    authDomain: 'hamab-dusunce-tahtasi.firebaseapp.com',
    projectId: 'hamab-dusunce-tahtasi',
    storageBucket: 'hamab-dusunce-tahtasi.firebasestorage.app',
    messagingSenderId: '701330283497',
    appId: '1:701330283497:web:b3eebfe62192a99af98978'
};

// Düzenleyici girişi YALNIZCA ŞİFRE ile yapılır: tek, paylaşılan bir düzenleyici hesabı vardır ve e-postası burada
// sabittir (kullanıcıya sorulmaz). Bu adres gizli değildir; koruma tahmin edilemez bir şifredir.
// `.invalid` uzantısı kayıt edilemeyen ayrılmış bir uzantıdır: kimse bu adrese sahip olamaz, bu yüzden
// "şifremi unuttum" e-postasıyla hesabı ele geçirmek mümkün değildir. Firebase konsolunda kullanıcıyı AYNI
// adresle ekle (docs/firebase-kurulum.md, adım 4).
export const editorEmail = 'duzenleyici@hamab-dusunce-tahtasi.invalid';

// App Check (bot ve komut dosyası koruması): reCAPTCHA v3 SİTE anahtarı (gizli anahtar DEĞİL, burada durması normal).
// `null` iken App Check kapalıdır. Nasıl açılacağı: docs/firebase-kurulum.md, "Kota koruması".
// ÖNEMLİ: anahtarı girip siteyi yayınlamadan Firebase konsolunda "zorunlu kıl"ma, yoksa site çalışmaz.
export const appCheckSiteKey = null;
