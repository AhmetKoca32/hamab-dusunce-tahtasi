// Yerel veri deposu: tarayıcının localStorage'ına yazar.
//
// YALNIZCA GELİŞTİRME VE TEST İÇİNDİR: veriler cihazlar arasında paylaşılmaz. Firebase yapılandırması
// (js/firebase-config.js) doluysa bunun yerine firebase-store.js kullanılır. İki depo aynı arayüzü sunar:
//
//   getState()            -> durum (js/domain.js'te açıklanan biçim)
//   subscribe(fn)         -> abonelikten çıkış fonksiyonu
//   selectTerm(termId)
//   addTerm / renameTerm / deleteTerm
//   addWeek / addReport / renameBlock / setReportText / deleteBlock
//   addNote / deleteNote / addComment / deleteComment
//   watchComments(ref, cb) -> abonelikten çıkış fonksiyonu (cb yorum listesiyle çağrılır)
//   clearError()

import { seedState, newTerm, newWeek, uid, isValidState, findTerm, findBlock, findNote, cleanText, LIMITS } from '../domain.js';
import { safeStorage } from '../lib/storage.js';

export const STORE_KEY = 'hamabData_v2';

const clone = value => JSON.parse(JSON.stringify(value));

export function createLocalStore(storage = safeStorage()) {
    let data = load();
    let selectedTermId = data.terms[0].id;
    let view = makeView();
    const subscribers = new Set();

    function load() {
        try {
            const parsed = JSON.parse(storage.getItem(STORE_KEY));
            if (isValidState(parsed)) return parsed;
        } catch { /* bozuk veri: tohum veriye dön */ }
        return seedState();
    }

    function makeView() {
        return { terms: data.terms, selectedTermId, status: 'ready', error: null };
    }

    function publish() {
        view = makeView();
        subscribers.forEach(fn => fn(view));
    }

    /** Veriyi kopyalar, değişikliği kopya üzerinde yapar, kaydeder ve abonelere haber verir. */
    function update(mutate) {
        const next = clone(data);
        mutate(next);
        data = next;
        if (!data.terms.some(t => t.id === selectedTermId)) selectedTermId = data.terms[0]?.id ?? null;
        storage.setItem(STORE_KEY, JSON.stringify(data));
        publish();
    }

    const subscribe = fn => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };

    return {
        getState: () => view,
        subscribe,
        clearError() {},

        selectTerm(termId) {
            if (!findTerm(data, termId) || termId === selectedTermId) return;
            selectedTermId = termId;
            publish();
        },

        /* ----- Dönemler ----- */
        addTerm(title) {
            const name = cleanText(title, LIMITS.title);
            if (!name) return null;
            const term = newTerm(name);
            update(s => { s.terms.push(term); });
            return term.id;
        },
        renameTerm(termId, title) {
            const name = cleanText(title, LIMITS.title);
            if (!name) return;
            update(s => { const t = findTerm(s, termId); if (t) t.title = name; });
        },
        /** Son dönem silinemez; silindiyse true döner. */
        deleteTerm(termId) {
            if (data.terms.length <= 1 || !findTerm(data, termId)) return false;
            update(s => { s.terms = s.terms.filter(t => t.id !== termId); });
            return true;
        },

        /* ----- Bloklar (hafta ve rapor) ----- */
        addWeek(termId) {
            const term = findTerm(data, termId);
            if (!term) return null;
            const week = newWeek(term.blocks.filter(b => b.type === 'week').length + 1);
            update(s => { findTerm(s, termId).blocks.push(week); });
            return week.id;
        },
        addReport(termId, index, text) {
            const body = cleanText(text, LIMITS.report);
            if (!body || !findTerm(data, termId)) return null;
            const report = { id: uid(), type: 'report', title: 'Rapor', text: body };
            update(s => {
                const blocks = findTerm(s, termId).blocks;
                blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, report);
            });
            return report.id;
        },
        renameBlock(termId, blockId, title) {
            const name = cleanText(title, LIMITS.title);
            if (!name) return;
            update(s => { const b = findBlock(s, termId, blockId); if (b) b.title = name; });
        },
        setReportText(termId, blockId, text) {
            update(s => { const b = findBlock(s, termId, blockId); if (b && b.type === 'report') b.text = cleanText(text, LIMITS.report); });
        },
        deleteBlock(termId, blockId) {
            update(s => { const t = findTerm(s, termId); if (t) t.blocks = t.blocks.filter(b => b.id !== blockId); });
        },

        /* ----- Notlar ve yorumlar. ref = { termId, blockId, colId, noteId } ----- */
        addNote(ref, { text, author }) {
            const body = cleanText(text, LIMITS.note);
            if (!body || !findBlock(data, ref.termId, ref.blockId)?.cols?.[ref.colId]) return null;
            const note = { id: uid(), text: body, author: cleanText(author, LIMITS.author), ts: Date.now(), commentCount: 0, comments: [] };
            update(s => { findBlock(s, ref.termId, ref.blockId).cols[ref.colId].push(note); });
            return note.id;
        },
        deleteNote(ref) {
            update(s => {
                const block = findBlock(s, ref.termId, ref.blockId);
                if (block?.cols?.[ref.colId]) block.cols[ref.colId] = block.cols[ref.colId].filter(n => n.id !== ref.noteId);
            });
        },
        addComment(ref, { text, author }) {
            const body = cleanText(text, LIMITS.comment);
            const target = findNote(data, ref);
            if (!body || !target || (target.comments?.length ?? 0) >= LIMITS.commentsPerNote) return null;
            const comment = { id: uid(), text: body, author: cleanText(author, LIMITS.author), ts: Date.now() };
            update(s => {
                const note = findNote(s, ref);
                note.comments = [...(note.comments ?? []), comment];
                note.commentCount = note.comments.length;
            });
            return comment.id;
        },
        deleteComment(ref, commentId) {
            update(s => {
                const note = findNote(s, ref);
                if (!note) return;
                note.comments = (note.comments ?? []).filter(c => c.id !== commentId);
                note.commentCount = note.comments.length;
            });
        },

        /** Notun yorumlarını verir ve her değişiklikte yeniden verir. */
        watchComments(ref, callback) {
            const send = () => callback([...(findNote(data, ref)?.comments ?? [])]);
            send();
            return subscribe(send);
        }
    };
}
