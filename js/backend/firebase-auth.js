// Firebase Authentication ile düzenleyici girişi: tek, paylaşılan düzenleyici hesabı, yalnızca şifre.
// local-auth.js ile aynı arayüzü sunar.
//
// Kullanıcıya e-posta sorulmaz; hesabın e-postası `editorEmail` olarak sabittir (js/firebase-config.js).
// "Düzenleyici" demek: giriş yapmış VE `admins/{uid}` belgesi bulunan hesap. Asıl yetki denetimi sunucuda
// güvenlik kurallarıyla (firestore.rules) yapılır; buradaki kontrol yalnızca arayüzde düzenleme araçlarını
// göstermek içindir. E-posta sabit olduğundan koruma şifreye dayanır: tahmin edilemez bir şifre kullan.

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, doc, getDocFromServer } from './firebase-sdk.js';
import { retry } from '../lib/retry.js';

const WRONG_PASSWORD = 'Şifre yanlış.';
const LOGIN_ERRORS = {
    'auth/invalid-credential': WRONG_PASSWORD,
    'auth/wrong-password': WRONG_PASSWORD,
    'auth/user-not-found': 'Düzenleyici hesabı bulunamadı. Kurulum belgesindeki 4. adımı kontrol et.',
    'auth/missing-password': 'Şifreyi gir.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
    'auth/network-request-failed': 'Ağ hatası. Bağlantını kontrol et.',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.'
};

// Bu Firestore hataları geçici olabilir: oturum açar açmaz ilk okuma henüz yeni kimlik bilgisi olmadan gidebilir
// (permission-denied) ya da mobil bağlantı o an kopmuş olabilir (unavailable). Kalıcı hatalar tekrar denenmez.
const TRANSIENT = new Set(['permission-denied', 'unauthenticated', 'unavailable', 'deadline-exceeded', 'aborted']);

export function createFirebaseAuth({ app, db, editorEmail }) {
    const auth = getAuth(app);
    const subscribers = new Set();
    let editor = false;

    const set = value => {
        if (value === editor) return;
        editor = value;
        subscribers.forEach(fn => fn(editor));
    };

    /**
     * Hesabın `admins/{uid}` belgesi var mı? true/false döner; okuma başarısız olursa FIRLATIR (belge yok demek değildir).
     * Önbelleğe değil sunucuya sorulur; ilk deneme başarısızsa belirteç tazelenip birkaç kez yeniden denenir.
     */
    function isAdmin(user) {
        return retry(async attempt => {
            if (attempt > 0) await user.getIdToken(true);
            return (await getDocFromServer(doc(db, 'admins', user.uid))).exists();
        }, { attempts: 3, delays: [500, 1500], shouldRetry: error => TRANSIENT.has(error?.code) });
    }

    onAuthStateChanged(auth, async user => {
        if (!user) { set(false); return; }
        try {
            set(await isAdmin(user));
        } catch (error) {
            console.warn('Düzenleyici yetkisi doğrulanamadı:', error?.code ?? error);
            set(false);   // oturum açık kalır; sayfa yenilenince yeniden denenir
        }
    });

    return {
        mode: 'password',
        isEditor: () => editor,

        async login({ password }) {
            let user;
            try {
                ({ user } = await signInWithEmailAndPassword(auth, editorEmail, String(password)));
            } catch (error) {
                return { ok: false, error: LOGIN_ERRORS[error?.code] ?? 'Giriş yapılamadı. Tekrar dene.' };
            }

            let admin;
            try {
                admin = await isAdmin(user);
            } catch (error) {
                await signOut(auth).catch(() => {});
                return { ok: false, error: `Şifre doğru ama yetki kontrol edilemedi (${error?.code ?? 'bilinmeyen hata'}). Bağlantını kontrol edip tekrar dene.` };
            }
            if (!admin) {
                await signOut(auth).catch(() => {});
                return { ok: false, error: 'Şifre doğru ama bu hesapta düzenleyici yetkisi tanımlı değil (admins belgesi bulunamadı). Kurulum belgesindeki 5. adımı kontrol et.' };
            }
            set(true);
            return { ok: true };
        },

        async logout() {
            try { await signOut(auth); } finally { set(false); }
        },

        subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        }
    };
}
