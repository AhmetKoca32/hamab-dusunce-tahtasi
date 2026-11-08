// Firestore veri deposu. local-store.js ile aynı arayüzü sunar (bkz. o dosyanın başı).
//
// Veri modeli (düz koleksiyonlar; eşzamanlı yazımlar birbirini ezmez):
//   terms/{id}                     { title, order, createdAt }
//   blocks/{id}                    { termId, type: 'week'|'report', title, order, text?, createdAt }
//   notes/{id}                     { termId, blockId, col, text, author, ts, commentCount }
//   notes/{id}/comments/{id}       { text, author, ts }
//   admins/{uid}                   düzenleyici hesaplar (yalnızca konsoldan elle eklenir)
//
// Okuma kotasını korumak için yalnızca seçili dönemin blokları ve notları dinlenir; yorumlar notun
// paneli açılınca ayrıca yüklenir (notta yorum sayısı `commentCount` olarak tutulur).
// Yazımlar yerel önbelleğe anında yansır (gecikme telafisi) ve sunucuya arka planda gider.

import {
    collection, doc, query, where, orderBy, onSnapshot, getDocs, writeBatch,
    setDoc, updateDoc, serverTimestamp, increment
} from './firebase-sdk.js';
import { assembleState, nextOrder, orderBetween } from './assemble.js';
import { COLUMNS, WEEKS_PER_TERM, LIMITS, cleanText } from '../domain.js';

const BATCH_LIMIT = 400;
const COLUMN_IDS = new Set(COLUMNS.map(c => c.id));

const ERROR_MESSAGES = {
    'permission-denied': 'Bu işlem için yetkin yok.',
    unavailable: 'Sunucuya ulaşılamıyor. Bağlantı gelince değişiklikler gönderilir.',
    'failed-precondition': 'Bu işlem şu an yapılamıyor. Sayfayı yenileyip tekrar dene.',
    'resource-exhausted': 'Günlük kullanım sınırına ulaşıldı. Biraz sonra tekrar dene.',
    unauthenticated: 'Oturum süresi dolmuş. Yeniden giriş yap.'
};
const errorMessage = error => ERROR_MESSAGES[error?.code] ?? 'Beklenmeyen bir hata oluştu.';

const toMillis = value => value?.toMillis?.() ?? Date.now();

/** @param {{ db: object }} firebase  Firestore örneği (index.js açar). */
export function createFirebaseStore({ db }) {
    const subscribers = new Set();

    let terms = [];
    let blocks = [];
    let notes = [];
    let selectedTermId = null;
    let termsLoaded = false;
    let blocksLoaded = false;
    let notesLoaded = false;
    let error = null;
    let stopBlocks = null;
    let stopNotes = null;
    let view = build();

    /* ---------- Durum ---------- */
    function build() {
        const ready = termsLoaded && (selectedTermId === null || (blocksLoaded && notesLoaded));
        const status = error?.fatal ? 'error' : ready ? 'ready' : 'loading';
        return assembleState({ terms, blocks, notes, selectedTermId, status, error });
    }

    function publish() {
        view = build();
        subscribers.forEach(fn => fn(view));
    }

    function fail(err, { fatal = false } = {}) {
        error = { code: err?.code ?? 'unknown', message: errorMessage(err), fatal };
        publish();
    }

    /** Arka plandaki yazımın hatasını arayüze bildirir (yazım yerelde zaten uygulanmıştır). */
    function run(promise) {
        promise.catch(err => fail(err));
    }

    /* ---------- Dinleyiciler ---------- */
    const readTerm = d => ({ id: d.id, title: d.data().title, order: d.data().order });
    const readBlock = d => ({ id: d.id, ...pick(d.data(), ['termId', 'type', 'title', 'order', 'text']) });
    const readNote = d => {
        const v = d.data({ serverTimestamps: 'estimate' });
        return { id: d.id, termId: v.termId, blockId: v.blockId, col: v.col, text: v.text, author: v.author, ts: toMillis(v.ts), commentCount: v.commentCount ?? 0 };
    };

    function pick(object, keys) {
        return Object.fromEntries(keys.filter(k => k in object).map(k => [k, object[k]]));
    }

    const stopTerms = onSnapshot(
        query(collection(db, 'terms'), orderBy('order')),
        snapshot => {
            terms = snapshot.docs.map(readTerm);
            termsLoaded = true;
            error = null;
            if (!terms.some(t => t.id === selectedTermId)) select(terms[0]?.id ?? null);
            else publish();
        },
        err => fail(err, { fatal: true })
    );

    function select(termId) {
        stopBlocks?.();
        stopNotes?.();
        stopBlocks = stopNotes = null;
        selectedTermId = termId;
        blocks = [];
        notes = [];
        blocksLoaded = notesLoaded = false;

        if (termId !== null) {
            stopBlocks = onSnapshot(
                query(collection(db, 'blocks'), where('termId', '==', termId)),
                snapshot => { blocks = snapshot.docs.map(readBlock); blocksLoaded = true; error = null; publish(); },
                err => fail(err, { fatal: true })
            );
            stopNotes = onSnapshot(
                query(collection(db, 'notes'), where('termId', '==', termId)),
                snapshot => { notes = snapshot.docs.map(readNote); notesLoaded = true; error = null; publish(); },
                err => fail(err, { fatal: true })
            );
        }
        publish();
    }

    /* ---------- Silme yardımcıları (yorumlar alt koleksiyon olduğu için basamaklı silinir) ---------- */
    async function deleteRefs(refs) {
        for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
            const batch = writeBatch(db);
            refs.slice(i, i + BATCH_LIMIT).forEach(ref => batch.delete(ref));
            await batch.commit();
        }
    }

    async function commentRefsOf(noteDocs) {
        const lists = await Promise.all(noteDocs.map(n => getDocs(collection(n.ref, 'comments'))));
        return lists.flatMap(list => list.docs.map(d => d.ref));
    }

    async function deleteNotesWhere(field, value) {
        const found = await getDocs(query(collection(db, 'notes'), where(field, '==', value)));
        return [...await commentRefsOf(found.docs), ...found.docs.map(d => d.ref)];
    }

    const orderedBlocks = () => [...blocks].sort((a, b) => a.order - b.order);

    return {
        getState: () => view,
        subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        },
        clearError() {
            if (!error || error.fatal) return;
            error = null;
            publish();
        },
        /** Ağ dinleyicilerini durdurur (test ve sayfa kapanışı için). */
        dispose() { stopTerms(); stopBlocks?.(); stopNotes?.(); },

        selectTerm(termId) {
            if (termId !== selectedTermId) select(termId);
        },

        /* ----- Dönemler ----- */
        addTerm(title) {
            const name = cleanText(title, LIMITS.title);
            if (!name) return null;
            const termRef = doc(collection(db, 'terms'));
            const batch = writeBatch(db);
            batch.set(termRef, { title: name, order: nextOrder(terms), createdAt: serverTimestamp() });
            for (let n = 1; n <= WEEKS_PER_TERM; n += 1) {
                batch.set(doc(collection(db, 'blocks')), { termId: termRef.id, type: 'week', title: `${n}. Hafta`, order: n, createdAt: serverTimestamp() });
            }
            run(batch.commit());
            return termRef.id;
        },
        renameTerm(termId, title) {
            const name = cleanText(title, LIMITS.title);
            if (name) run(updateDoc(doc(db, 'terms', termId), { title: name }));
        },
        /** Son dönem silinemez; silme başlatıldıysa true döner. */
        deleteTerm(termId) {
            if (terms.length <= 1 || !terms.some(t => t.id === termId)) return false;
            run((async () => {
                const blockDocs = await getDocs(query(collection(db, 'blocks'), where('termId', '==', termId)));
                const noteRefs = await deleteNotesWhere('termId', termId);
                await deleteRefs([...noteRefs, ...blockDocs.docs.map(d => d.ref), doc(db, 'terms', termId)]);
            })());
            return true;
        },

        /* ----- Bloklar (hafta ve rapor): yalnızca seçili dönemde ----- */
        addWeek(termId) {
            if (termId !== selectedTermId) return null;
            const weekCount = blocks.filter(b => b.type === 'week').length;
            const ref = doc(collection(db, 'blocks'));
            run(setDoc(ref, { termId, type: 'week', title: `${weekCount + 1}. Hafta`, order: nextOrder(blocks), createdAt: serverTimestamp() }));
            return ref.id;
        },
        addReport(termId, index, text) {
            const body = cleanText(text, LIMITS.report);
            if (!body || termId !== selectedTermId) return null;
            const ordered = orderedBlocks();
            const at = Math.max(0, Math.min(index, ordered.length));
            const ref = doc(collection(db, 'blocks'));
            run(setDoc(ref, {
                termId, type: 'report', title: 'Rapor', text: body,
                order: orderBetween(ordered[at - 1]?.order, ordered[at]?.order), createdAt: serverTimestamp()
            }));
            return ref.id;
        },
        renameBlock(termId, blockId, title) {
            const name = cleanText(title, LIMITS.title);
            if (name) run(updateDoc(doc(db, 'blocks', blockId), { title: name }));
        },
        setReportText(termId, blockId, text) {
            run(updateDoc(doc(db, 'blocks', blockId), { text: cleanText(text, LIMITS.report) }));
        },
        deleteBlock(termId, blockId) {
            run((async () => {
                const noteRefs = await deleteNotesWhere('blockId', blockId);
                await deleteRefs([...noteRefs, doc(db, 'blocks', blockId)]);
            })());
        },

        /* ----- Notlar ve yorumlar. ref = { termId, blockId, colId, noteId } ----- */
        addNote(ref, { text, author }) {
            const body = cleanText(text, LIMITS.note);
            const block = blocks.find(b => b.id === ref.blockId);
            if (!body || !COLUMN_IDS.has(ref.colId) || block?.type !== 'week') return null;
            const noteRef = doc(collection(db, 'notes'));
            run(setDoc(noteRef, {
                termId: ref.termId, blockId: ref.blockId, col: ref.colId,
                text: body, author: cleanText(author, LIMITS.author), ts: serverTimestamp(), commentCount: 0
            }));
            return noteRef.id;
        },
        deleteNote(ref) {
            run((async () => {
                const noteRef = doc(db, 'notes', ref.noteId);
                const comments = await getDocs(collection(noteRef, 'comments'));
                await deleteRefs([...comments.docs.map(d => d.ref), noteRef]);
            })());
        },
        addComment(ref, { text, author }) {
            const body = cleanText(text, LIMITS.comment);
            if (!body || !notes.some(n => n.id === ref.noteId)) return null;
            const noteRef = doc(db, 'notes', ref.noteId);
            const commentRef = doc(collection(noteRef, 'comments'));
            const batch = writeBatch(db);
            batch.set(commentRef, { text: body, author: cleanText(author, LIMITS.author), ts: serverTimestamp() });
            batch.update(noteRef, { commentCount: increment(1) });
            run(batch.commit());
            return commentRef.id;
        },
        deleteComment(ref, commentId) {
            const noteRef = doc(db, 'notes', ref.noteId);
            const batch = writeBatch(db);
            batch.delete(doc(collection(noteRef, 'comments'), commentId));
            batch.update(noteRef, { commentCount: increment(-1) });
            run(batch.commit());
        },

        /** Notun yorumlarını canlı dinler; panel kapanınca dönen fonksiyonla durdurulur. */
        watchComments(ref, callback) {
            return onSnapshot(
                query(collection(doc(db, 'notes', ref.noteId), 'comments'), orderBy('ts')),
                snapshot => callback(snapshot.docs.map(d => {
                    const v = d.data({ serverTimestamps: 'estimate' });
                    return { id: d.id, text: v.text, author: v.author ?? '', ts: toMillis(v.ts) };
                })),
                err => { fail(err); callback([]); }
            );
        }
    };
}
