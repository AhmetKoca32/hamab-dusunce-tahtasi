// Firebase Authentication ile düzenleyici girişi: tek, paylaşılan düzenleyici hesabı, yalnızca şifre.
// local-auth.js ile aynı arayüzü sunar.
//
// Kullanıcıya e-posta sorulmaz; hesabın e-postası `editorEmail` olarak sabittir (js/firebase-config.js).
// "Düzenleyici" demek: giriş yapmış VE `admins/{uid}` belgesi bulunan hesap. Asıl yetki denetimi sunucuda
// güvenlik kurallarıyla (firestore.rules) yapılır; buradaki kontrol yalnızca arayüzde düzenleme araçlarını
// göstermek içindir. E-posta sabit olduğundan koruma şifreye dayanır: tahmin edilemez bir şifre kullan.

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, doc, getDoc } from './firebase-sdk.js';

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

export function createFirebaseAuth({ app, db, editorEmail }) {
    const auth = getAuth(app);
    const subscribers = new Set();
    let editor = false;

    const set = value => {
        if (value === editor) return;
        editor = value;
        subscribers.forEach(fn => fn(editor));
    };

    async function isAdmin(user) {
        if (!user) return false;
        try { return (await getDoc(doc(db, 'admins', user.uid))).exists(); } catch { return false; }
    }

    onAuthStateChanged(auth, async user => set(await isAdmin(user)));

    return {
        mode: 'password',
        isEditor: () => editor,

        async login({ password }) {
            try {
                const { user } = await signInWithEmailAndPassword(auth, editorEmail, String(password));
                if (!(await isAdmin(user))) {
                    await signOut(auth);
                    return { ok: false, error: 'Hesap var ama düzenleme yetkisi yok. Kurulum belgesindeki 5. adımı kontrol et.' };
                }
                set(true);
                return { ok: true };
            } catch (error) {
                return { ok: false, error: LOGIN_ERRORS[error?.code] ?? 'Giriş yapılamadı. Tekrar dene.' };
            }
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
