// Düz Firestore belgelerinden arayüzün beklediği durum nesnesini kurar. Saf fonksiyonlar: SDK'ya bağlı
// değildir, bu yüzden Node'da test edilir.

import { COLUMNS } from '../domain.js';

const byOrder = (a, b) => (a.order - b.order) || String(a.id).localeCompare(String(b.id));
const byTime = (a, b) => (a.ts - b.ts) || String(a.id).localeCompare(String(b.id));

const toNote = n => ({ id: n.id, text: n.text, author: n.author ?? '', ts: n.ts, commentCount: n.commentCount ?? 0 });

/**
 * @param {object} input
 * @param {Array} input.terms   [{ id, title, order }]
 * @param {Array} input.blocks  seçili dönemin blokları [{ id, termId, type, title, order, text }]
 * @param {Array} input.notes   seçili dönemin notları [{ id, termId, blockId, col, text, author, ts, commentCount }]
 */
export function assembleState({ terms = [], blocks = [], notes = [], selectedTermId = null, status = 'ready', error = null }) {
    const sortedTerms = [...terms].sort(byOrder);
    const selected = sortedTerms.some(t => t.id === selectedTermId) ? selectedTermId : null;

    const notesByBlock = new Map();
    for (const note of [...notes].sort(byTime)) {
        if (!notesByBlock.has(note.blockId)) notesByBlock.set(note.blockId, []);
        notesByBlock.get(note.blockId).push(note);
    }

    const toBlock = block => block.type === 'report'
        ? { id: block.id, type: 'report', title: block.title, text: block.text ?? '' }
        : {
            id: block.id,
            type: 'week',
            title: block.title,
            cols: Object.fromEntries(COLUMNS.map(col => [
                col.id,
                (notesByBlock.get(block.id) ?? []).filter(n => n.col === col.id).map(toNote)
            ]))
        };

    return {
        terms: sortedTerms.map(term => ({
            id: term.id,
            title: term.title,
            blocks: term.id === selected
                ? blocks.filter(b => b.termId === term.id).sort(byOrder).map(toBlock)
                : []
        })),
        selectedTermId: selected,
        status,
        error
    };
}

/** Bir listenin sonuna eklenecek öğenin sıra değeri. */
export const nextOrder = items => items.reduce((max, item) => Math.max(max, item.order), 0) + 1;

/** İki komşu arasına eklenecek öğenin sıra değeri (öğe `prev` ile `next` arasına girer). */
export function orderBetween(prev, next) {
    if (prev == null && next == null) return 1;
    if (prev == null) return next - 1;
    if (next == null) return prev + 1;
    return (prev + next) / 2;
}
