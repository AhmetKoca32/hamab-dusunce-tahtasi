// Uygulamanın ortak bağlamı: seçilen veri arka ucu (store + auth) ve yalnızca arayüze ait geçici durum.
// Görünümler ve akışlar bunları buradan alır. Firebase yapılandırması dolu mu boş mu, hangi arka ucun
// kullanıldığı js/backend/index.js'de belirlenir; arayüz fark etmez.

import { createBackend } from './backend/index.js';
import { latestActiveWeekId, selectedTerm } from './domain.js';

export const { store, auth, mode } = await createBackend();

/** Kalıcı olmayan, yalnızca bu sekmeye ait arayüz durumu. */
export const ui = {
    expanded: new Set(),       // açık haftaların id'leri
    expandedFor: null,         // `expanded` hangi dönem için hazırlandı
    composer: null,            // { blockId, colId }: satır içi not yazma alanı
    draft: { text: '', author: '' },   // yazılmakta olan not (yeniden çizimde kaybolmasın)
    open: null,                // yorum panelindeki not: { termId, blockId, colId, noteId }
    opener: null,              // paneli açan eleman (kapanınca odak ona döner)
    comments: [],              // paneldeki notun yorumları
    stopComments: null         // yorum dinleyicisini durduran fonksiyon
};

let renderer = () => {};
export const setRenderer = fn => { renderer = fn; };
/** Arayüz durumu değişince (veri değişimi dışında) ekranı yeniden çizer. */
export const refresh = () => renderer();

export const currentTerm = () => selectedTerm(store.getState());

export function selectTerm(termId) {
    ui.composer = null;
    store.selectTerm(termId);   // veri değişince abonelik ekranı yeniler
}

/**
 * Seçili dönemin verisi yüklenince, en son not eklenen haftayı açık başlatır (dönem başına bir kez).
 * Veri henüz gelmediyse bekler.
 */
export function ensureExpanded() {
    const term = currentTerm();
    if (!term || store.getState().status !== 'ready' || ui.expandedFor === term.id) return;
    ui.expandedFor = term.id;
    const id = latestActiveWeekId(term);
    ui.expanded = new Set(id ? [id] : []);
}
