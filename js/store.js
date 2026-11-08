// Veri deposu. Arayüz yalnızca bu dosyanın dışa açtığı yöntemleri bilir.
//
// Şu an tarayıcının localStorage'ına yazıyor (yalnızca tasarım aşaması için: veriler cihazlar arasında
// paylaşılmaz). Firebase aşamasında bu dosya Firestore karşılığıyla değişecek; yöntem adları, aldığı ve
// döndürdüğü değerler aynı kalacağı için arayüze dokunmak gerekmeyecek.

import { seedState, newTerm, newWeek, uid, isValidState, findTerm, findBlock, findNote } from './domain.js';

export const STORE_KEY = 'hamabData_v2';

const clone = value => JSON.parse(JSON.stringify(value));

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

export function createStore(storage = safeStorage()) {
    let state = load();
    const subscribers = new Set();

    function load() {
        try {
            const parsed = JSON.parse(storage.getItem(STORE_KEY));
            if (isValidState(parsed)) return parsed;
        } catch { /* bozuk veri: tohum veriye dön */ }
        return seedState();
    }

    /** Durumu kopyalar, değişikliği kopya üzerinde yapar, kaydeder ve abonelere haber verir. */
    function update(mutate) {
        const next = clone(state);
        mutate(next);
        state = next;
        storage.setItem(STORE_KEY, JSON.stringify(state));
        subscribers.forEach(fn => fn(state));
    }

    const cleanText = value => String(value ?? '').trim();
    const cleanAuthor = value => String(value ?? '').trim().slice(0, 40);

    return {
        getState: () => state,

        subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        },

        /* ----- Dönemler ----- */
        addTerm(title) {
            const name = cleanText(title);
            if (!name) return null;
            const term = newTerm(name);
            update(s => { s.terms.push(term); });
            return term.id;
        },
        renameTerm(termId, title) {
            const name = cleanText(title);
            if (!name) return;
            update(s => { const t = findTerm(s, termId); if (t) t.title = name; });
        },
        /** Son dönem silinemez; silindiyse true döner. */
        deleteTerm(termId) {
            if (state.terms.length <= 1 || !findTerm(state, termId)) return false;
            update(s => { s.terms = s.terms.filter(t => t.id !== termId); });
            return true;
        },

        /* ----- Bloklar (hafta ve rapor) ----- */
        addWeek(termId) {
            const term = findTerm(state, termId);
            if (!term) return null;
            const number = term.blocks.filter(b => b.type === 'week').length + 1;
            const week = newWeek(number);
            update(s => { findTerm(s, termId).blocks.push(week); });
            return week.id;
        },
        addReport(termId, index, text) {
            const body = cleanText(text);
            if (!body || !findTerm(state, termId)) return null;
            const report = { id: uid(), type: 'report', title: 'Rapor', text: body };
            update(s => {
                const blocks = findTerm(s, termId).blocks;
                blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, report);
            });
            return report.id;
        },
        renameBlock(termId, blockId, title) {
            const name = cleanText(title);
            if (!name) return;
            update(s => { const b = findBlock(s, termId, blockId); if (b) b.title = name; });
        },
        setReportText(termId, blockId, text) {
            update(s => { const b = findBlock(s, termId, blockId); if (b && b.type === 'report') b.text = cleanText(text); });
        },
        deleteBlock(termId, blockId) {
            update(s => { const t = findTerm(s, termId); if (t) t.blocks = t.blocks.filter(b => b.id !== blockId); });
        },

        /* ----- Notlar ve yorumlar. ref = { termId, blockId, colId, noteId } ----- */
        addNote(ref, { text, author }) {
            const body = cleanText(text);
            if (!body || !findBlock(state, ref.termId, ref.blockId)?.cols?.[ref.colId]) return null;
            const note = { id: uid(), text: body, author: cleanAuthor(author), ts: Date.now(), comments: [] };
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
            const body = cleanText(text);
            if (!body || !findNote(state, ref)) return null;
            const comment = { id: uid(), text: body, author: cleanAuthor(author), ts: Date.now() };
            update(s => { findNote(s, ref).comments.push(comment); });
            return comment.id;
        },
        deleteComment(ref, commentId) {
            update(s => { const n = findNote(s, ref); if (n) n.comments = n.comments.filter(c => c.id !== commentId); });
        }
    };
}
