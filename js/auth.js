// Düzenleyici girişi.
//
// UYARI: Bu GEÇİCİ bir tasarım aşaması yer tutucusudur ve gerçek güvenlik sağlamaz: şifre istemci kodunda
// açıkça yazılıdır, sayfa kaynağına bakan herkes görür. Firebase aşamasında bu dosya Firebase
// Authentication ile değişecek ve yetki, sunucu tarafında güvenlik kurallarıyla zorunlu kılınacak.
// Bu hâliyle site yayınlanmamalıdır.

const DEMO_PASSWORD = 'deneme';
const SESSION_KEY = 'hamabEditing';

function sessionStore() {
    try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

export function createAuth(session = sessionStore()) {
    const read = () => { try { return session?.getItem(SESSION_KEY) === '1'; } catch { return false; } };
    let editor = read();
    const subscribers = new Set();
    const set = value => {
        editor = value;
        try { value ? session?.setItem(SESSION_KEY, '1') : session?.removeItem(SESSION_KEY); } catch { /* oturum depolaması yok */ }
        subscribers.forEach(fn => fn(editor));
    };

    return {
        isEditor: () => editor,
        /** Şifre doğru mu? Durumu değiştirmez (pencere doğrulaması için). */
        verify: password => password === DEMO_PASSWORD,
        login(password) {
            if (password !== DEMO_PASSWORD) return false;
            set(true);
            return true;
        },
        logout: () => set(false),
        subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
    };
}
