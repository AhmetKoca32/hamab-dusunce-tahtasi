// Sunucuya bağlanılamadığında (ör. Firebase SDK'sı yüklenemedi) kullanılan salt-okunur yedek arka uç.
// Sayfanın boş kalmasını önler: hata mesajını gösterir, hiçbir yazımı kabul etmez.

export function createFailedBackend() {
    const state = {
        terms: [],
        selectedTermId: null,
        status: 'error',
        error: { code: 'init', message: 'Sunucuya bağlanılamadı. Sayfayı yenileyip tekrar dene.', fatal: true }
    };
    const nothing = () => null;

    const store = {
        getState: () => state,
        subscribe: () => () => {},
        clearError() {},
        selectTerm() {},
        addTerm: nothing, renameTerm: nothing, deleteTerm: () => false,
        addWeek: nothing, addReport: nothing, renameBlock: nothing, setReportText: nothing, deleteBlock: nothing,
        addNote: nothing, deleteNote: nothing, addComment: nothing, deleteComment: nothing,
        watchComments: (ref, callback) => { callback([]); return () => {}; }
    };

    const auth = {
        mode: 'password',
        isEditor: () => false,
        async login() { return { ok: false, error: 'Sunucuya bağlanılamadı.' }; },
        async logout() {},
        subscribe: () => () => {}
    };

    return { mode: 'error', store, auth };
}
