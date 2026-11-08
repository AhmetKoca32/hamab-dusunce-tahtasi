// Yerel (geliştirme) düzenleyici girişi.
//
// YALNIZCA GELİŞTİRME İÇİNDİR ve gerçek güvenlik sağlamaz: Firebase yapılandırması yokken devreye girer ve
// sayfada "yerel mod" şeridi gösterilir. Üretimde firebase-auth.js kullanılır; yetki sunucu tarafında
// güvenlik kurallarıyla (firestore.rules) zorunlu kılınır.
//
// Arayüz (firebase-auth.js ile aynı):
//   mode                 -> 'password' (giriş yalnızca şifreyle; iki arka uçta da aynı)
//   isEditor()
//   login(credentials)   -> Promise<{ ok: boolean, error?: string }>
//   logout()
//   subscribe(fn)

const DEV_PASSWORD = 'dev';
const SESSION_KEY = 'hamabEditing';

function sessionStore() {
    try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

export function createLocalAuth(session = sessionStore()) {
    const read = () => { try { return session?.getItem(SESSION_KEY) === '1'; } catch { return false; } };
    let editor = read();
    const subscribers = new Set();
    const set = value => {
        editor = value;
        try { value ? session?.setItem(SESSION_KEY, '1') : session?.removeItem(SESSION_KEY); } catch { /* oturum depolaması yok */ }
        subscribers.forEach(fn => fn(editor));
    };

    return {
        mode: 'password',
        isEditor: () => editor,
        async login({ password }) {
            if (password !== DEV_PASSWORD) return { ok: false, error: 'Şifre yanlış.' };
            set(true);
            return { ok: true };
        },
        async logout() { set(false); },
        subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
    };
}
