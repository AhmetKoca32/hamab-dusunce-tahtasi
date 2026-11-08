// Uygulamanın ortak bağlamı: tek veri deposu, tek giriş nesnesi ve yalnızca arayüze ait geçici durum.
// Görünümler ve akışlar bunları buradan alır; veri/giriş kaynağı değiştiğinde (Firebase) yalnızca
// store.js ve auth.js değişir.

import { createStore } from './store.js';
import { createAuth } from './auth.js';
import { latestActiveWeekId } from './domain.js';

export const store = createStore();
export const auth = createAuth();

/** Kalıcı olmayan, yalnızca bu sekmeye ait arayüz durumu. */
export const ui = {
    termId: store.getState().terms[0].id,
    expanded: new Set(),                       // açık haftaların id'leri
    composer: null,                            // { blockId, colId }: satır içi not yazma alanı
    draft: { text: '', author: '' },           // yazılmakta olan not (yeniden çizimde kaybolmasın)
    open: null,                                // yorum panelindeki not: { termId, blockId, colId, noteId }
    opener: null                               // paneli açan eleman (kapanınca odak ona döner)
};

let renderer = () => {};
export const setRenderer = fn => { renderer = fn; };
/** Arayüz durumu değişince (veri değişimi dışında) ekranı yeniden çizer. */
export const refresh = () => renderer();

export function currentTerm() {
    const { terms } = store.getState();
    return terms.find(t => t.id === ui.termId) || terms[0];
}

/** En son not eklenen haftayı açık başlatır. */
export function expandLatest() {
    const id = latestActiveWeekId(currentTerm());
    ui.expanded = new Set(id ? [id] : []);
}
