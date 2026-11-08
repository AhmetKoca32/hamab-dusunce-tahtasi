// Saf etki alanı mantığı: DOM'a, depolamaya ya da ağa dokunmaz, bu yüzden Node'da test edilir.
//
// Arayüzün gördüğü durum (her iki veri arka ucu da bu biçimi üretir):
//   state = { terms: [Term], selectedTermId, status: 'loading' | 'ready' | 'error', error }
//   Term  = { id, title, blocks: [Week | Report] }      // blocks yalnızca seçili dönem için dolu olabilir
//   Week  = { id, type: 'week', title, cols: { sorular: [Note], dusunceler: [Note], cikarimlar: [Note] } }
//   Report = { id, type: 'report', title, text }
//   Note  = { id, text, author, ts, commentCount }       // yorumlar ayrıca yüklenir (watchComments)
//   Comment = { id, text, author, ts }

export const COLUMNS = Object.freeze([
    { id: 'sorular', title: 'Haftanın Soruları' },
    { id: 'dusunceler', title: 'Paylaşılmak İstenen Düşünceler' },
    { id: 'cikarimlar', title: 'Çıkarımlar' }
]);

export const WEEKS_PER_TERM = 12;

/**
 * Alan uzunluk ve adet sınırları. Firestore güvenlik kurallarındaki sınırlarla aynı olmalıdır (firestore.rules).
 * `commentsPerNote`: bir nota yazılabilecek en çok yorum (kotayı ve yığılmayı korur).
 */
export const LIMITS = Object.freeze({ title: 80, note: 5000, comment: 1000, author: 40, report: 20000, commentsPerNote: 200 });

/** Boşlukları kırpar ve sınıra keser; boşsa '' döner. */
export const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const newWeek = n => ({
    id: uid(),
    type: 'week',
    title: `${n}. Hafta`,
    cols: Object.fromEntries(COLUMNS.map(c => [c.id, []]))
});

export const newTerm = (title, weeks = WEEKS_PER_TERM) => ({
    id: uid(),
    title,
    blocks: Array.from({ length: weeks }, (_, i) => newWeek(i + 1))
});

export const seedState = () => ({
    terms: [newTerm('2026-2027 Birinci Dönem'), newTerm('2026-2027 İkinci Dönem')]
});

export const isValidState = s => Boolean(s) && Array.isArray(s.terms) && s.terms.length > 0;

export const isWeek = block => block.type === 'week';

/* ---------- Arama ---------- */
export const findTerm = (state, termId) => state.terms.find(t => t.id === termId);
export const findBlock = (state, termId, blockId) => findTerm(state, termId)?.blocks.find(b => b.id === blockId);
// ref = { termId, blockId, colId, noteId }
export const findNote = (state, ref) => findBlock(state, ref.termId, ref.blockId)?.cols?.[ref.colId]?.find(n => n.id === ref.noteId);

/** Seçili dönem (yoksa null: henüz yüklenmedi ya da hiç dönem yok). */
export const selectedTerm = state => state.terms.find(t => t.id === state.selectedTermId) ?? null;

/* ---------- Türetilmiş bilgi ---------- */
/** Bir notun yorum sayısı. Eski yerel kayıtlar `comments` dizisi tutar, yenileri `commentCount`. */
export const commentCount = note => note.commentCount ?? note.comments?.length ?? 0;

export const allNotes = week => Object.values(week.cols).flat();

export function noteCounts(week) {
    const notes = allNotes(week);
    return { notes: notes.length, comments: notes.reduce((sum, n) => sum + commentCount(n), 0) };
}

/** En son not eklenen haftanın id'si; hiç not yoksa ilk hafta; hafta yoksa null. */
export function latestActiveWeekId(term) {
    const weeks = term.blocks.filter(isWeek);
    let best = null;
    let bestTs = -1;
    for (const week of weeks) {
        for (const note of allNotes(week)) {
            if (note.ts > bestTs) { bestTs = note.ts; best = week; }
        }
    }
    return (best ?? weeks[0])?.id ?? null;
}
