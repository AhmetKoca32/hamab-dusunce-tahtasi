/** localStorage'ın hata fırlatabildiği ortamlarda (gizli sekme, kapalı çerez) sessizce çalışır. */
export function safeStorage(base = globalThis.localStorage) {
    return {
        getItem(key) {
            try { return base.getItem(key); } catch { return null; }
        },
        setItem(key, value) {
            try { base.setItem(key, value); } catch { /* depolama yoksa bellekte devam edilir */ }
        }
    };
}
