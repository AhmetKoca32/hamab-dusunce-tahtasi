import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStore, STORE_KEY } from '../js/backend/local-store.js';
import { LIMITS } from '../js/domain.js';

/** localStorage yerine bellekte çalışan sahte depolama. */
function fakeStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, value); },
        raw: key => data.get(key)
    };
}

const firstWeekRef = store => {
    const state = store.getState();
    return { termId: state.terms[0].id, blockId: state.terms[0].blocks[0].id, colId: 'sorular' };
};

test('boş depolamada tohum veriyle açılır', () => {
    const store = createLocalStore(fakeStorage());
    assert.equal(store.getState().terms.length, 2);
});

test('bozuk ya da geçersiz kayıt tohum veriye döner', () => {
    for (const raw of ['{bozuk json', '{"terms":[]}', 'null']) {
        const store = createLocalStore(fakeStorage({ [STORE_KEY]: raw }));
        assert.equal(store.getState().terms.length, 2, raw);
    }
});

test('değişiklikler kaydedilir ve yeni bir depo aynı veriyi okur', () => {
    const storage = fakeStorage();
    const store = createLocalStore(storage);
    store.addNote(firstWeekRef(store), { text: 'Merhaba', author: 'Elif' });

    const reopened = createLocalStore(storage);
    assert.equal(reopened.getState().terms[0].blocks[0].cols.sorular[0].text, 'Merhaba');
});

test('addNote: metni ve ismi temizler, boş notu reddeder, geçersiz sütunu reddeder', () => {
    const store = createLocalStore(fakeStorage());
    const ref = firstWeekRef(store);

    const id = store.addNote(ref, { text: '  selam  ', author: '  Can  ' });
    const saved = store.getState().terms[0].blocks[0].cols.sorular[0];
    assert.equal(saved.id, id);
    assert.equal(saved.text, 'selam');
    assert.equal(saved.author, 'Can');
    assert.deepEqual(saved.comments, []);

    assert.equal(store.addNote(ref, { text: '   ', author: '' }), null);
    assert.equal(store.addNote({ ...ref, colId: 'yok' }, { text: 'x', author: '' }), null);
    assert.equal(store.getState().terms[0].blocks[0].cols.sorular.length, 1);
});

test('addNote isimi 40 karakterle sınırlar', () => {
    const store = createLocalStore(fakeStorage());
    store.addNote(firstWeekRef(store), { text: 'x', author: 'a'.repeat(100) });
    assert.equal(store.getState().terms[0].blocks[0].cols.sorular[0].author.length, 40);
});

test('yorum ekleme ve silme', () => {
    const store = createLocalStore(fakeStorage());
    const ref = { ...firstWeekRef(store) };
    ref.noteId = store.addNote(ref, { text: 'not', author: '' });

    const commentId = store.addComment(ref, { text: 'yorum', author: 'Mert' });
    assert.equal(store.getState().terms[0].blocks[0].cols.sorular[0].comments.length, 1);
    assert.equal(store.addComment(ref, { text: '  ', author: '' }), null);

    store.deleteComment(ref, commentId);
    assert.equal(store.getState().terms[0].blocks[0].cols.sorular[0].comments.length, 0);
});

test('deleteNote yalnızca o notu siler', () => {
    const store = createLocalStore(fakeStorage());
    const ref = firstWeekRef(store);
    const keep = store.addNote(ref, { text: 'kalsın', author: '' });
    const drop = store.addNote(ref, { text: 'gitsin', author: '' });

    store.deleteNote({ ...ref, noteId: drop });
    const remaining = store.getState().terms[0].blocks[0].cols.sorular;
    assert.deepEqual(remaining.map(n => n.id), [keep]);
});

test('addReport istenen konuma eklenir, konumu sınırlar, boş metni reddeder', () => {
    const store = createLocalStore(fakeStorage());
    const termId = store.getState().terms[0].id;

    const id = store.addReport(termId, 1, 'Dönem raporu');
    const blocks = store.getState().terms[0].blocks;
    assert.equal(blocks[1].id, id);
    assert.equal(blocks[1].type, 'report');

    store.addReport(termId, 999, 'Sona');
    const after = store.getState().terms[0].blocks;
    assert.equal(after[after.length - 1].text, 'Sona');

    assert.equal(store.addReport(termId, 0, '   '), null);
});

test('setReportText yalnızca raporlarda çalışır', () => {
    const store = createLocalStore(fakeStorage());
    const termId = store.getState().terms[0].id;
    const weekId = store.getState().terms[0].blocks[0].id;
    const reportId = store.addReport(termId, 1, 'eski');

    store.setReportText(termId, reportId, 'yeni');
    store.setReportText(termId, weekId, 'hafta metni olmaz');

    const [week, report] = store.getState().terms[0].blocks;
    assert.equal(report.text, 'yeni');
    assert.equal('text' in week, false);
});

test('addWeek bir sonraki numarayı kullanır', () => {
    const store = createLocalStore(fakeStorage());
    const termId = store.getState().terms[0].id;
    store.addReport(termId, 0, 'rapor sayılmaz');
    const id = store.addWeek(termId);
    const blocks = store.getState().terms[0].blocks;
    assert.equal(blocks[blocks.length - 1].id, id);
    assert.equal(blocks[blocks.length - 1].title, '13. Hafta');
});

test('deleteTerm son dönemi silmez', () => {
    const store = createLocalStore(fakeStorage());
    const [a, b] = store.getState().terms.map(t => t.id);
    assert.equal(store.deleteTerm(a), true);
    assert.equal(store.deleteTerm(b), false);
    assert.equal(store.getState().terms.length, 1);
});

test('addTerm ve renameTerm boş adı reddeder', () => {
    const store = createLocalStore(fakeStorage());
    assert.equal(store.addTerm('   '), null);
    const id = store.addTerm('2027-2028 Birinci Dönem');
    assert.equal(store.getState().terms.at(-1).id, id);

    store.renameTerm(id, '   ');
    assert.equal(store.getState().terms.at(-1).title, '2027-2028 Birinci Dönem');
});

test('subscribe: her değişiklikte haber verilir, abonelikten çıkınca durur', () => {
    const store = createLocalStore(fakeStorage());
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls += 1; });

    store.addTerm('Bir');
    store.addTerm('İki');
    assert.equal(calls, 2);

    unsubscribe();
    store.addTerm('Üç');
    assert.equal(calls, 2);
});

test('durum değişmezdir: eski durum nesnesi değişiklikten etkilenmez', () => {
    const store = createLocalStore(fakeStorage());
    const before = store.getState();
    store.addTerm('Yeni');
    assert.equal(before.terms.length, 2);
    assert.equal(store.getState().terms.length, 3);
});

/* ---------- Firebase geçişiyle eklenen arayüz: durum, seçili dönem, yorum sayısı, yorum izleme ---------- */

test('durum arayüzün beklediği alanları taşır', () => {
    const state = createLocalStore(fakeStorage()).getState();
    assert.equal(state.status, 'ready');
    assert.equal(state.error, null);
    assert.equal(state.selectedTermId, state.terms[0].id);
});

test('selectTerm seçimi değiştirir ve abonelere haber verir; bilinmeyen dönemi yok sayar', () => {
    const store = createLocalStore(fakeStorage());
    const second = store.getState().terms[1].id;
    let calls = 0;
    store.subscribe(() => { calls += 1; });

    store.selectTerm(second);
    assert.equal(store.getState().selectedTermId, second);
    assert.equal(calls, 1);

    store.selectTerm('yok');
    store.selectTerm(second);   // zaten seçili
    assert.equal(calls, 1);
});

test('seçili dönem silinince seçim ilk döneme geçer', () => {
    const store = createLocalStore(fakeStorage());
    const [first, second] = store.getState().terms.map(t => t.id);
    store.selectTerm(second);
    store.deleteTerm(second);
    assert.equal(store.getState().selectedTermId, first);
});

test('seçim kalıcı değildir: yeni depo ilk dönemle açılır', () => {
    const storage = fakeStorage();
    const store = createLocalStore(storage);
    store.addTerm('Kaydı başlat');                      // veriyi kaydet (seçim kaydedilmez)
    store.selectTerm(store.getState().terms[1].id);

    const reopened = createLocalStore(storage).getState();
    assert.equal(reopened.selectedTermId, reopened.terms[0].id);
});

test('yorum sayısı yorum eklenip silindikçe güncellenir', () => {
    const store = createLocalStore(fakeStorage());
    const ref = { ...firstWeekRef(store) };
    ref.noteId = store.addNote(ref, { text: 'not', author: '' });
    const count = () => store.getState().terms[0].blocks[0].cols.sorular[0].commentCount;

    assert.equal(count(), 0);
    const a = store.addComment(ref, { text: 'bir', author: '' });
    store.addComment(ref, { text: 'iki', author: '' });
    assert.equal(count(), 2);
    store.deleteComment(ref, a);
    assert.equal(count(), 1);
});

test('watchComments: hemen, sonra her değişiklikte yorumları verir; abonelik durdurulabilir', () => {
    const store = createLocalStore(fakeStorage());
    const ref = { ...firstWeekRef(store) };
    ref.noteId = store.addNote(ref, { text: 'not', author: '' });

    const seen = [];
    const stop = store.watchComments(ref, list => seen.push(list.map(c => c.text)));
    assert.deepEqual(seen, [[]]);

    store.addComment(ref, { text: 'merhaba', author: '' });
    assert.deepEqual(seen.at(-1), ['merhaba']);

    stop();
    store.addComment(ref, { text: 'duyulmaz', author: '' });
    assert.equal(seen.length, 2);
});

test('watchComments olmayan not için boş liste verir', () => {
    const store = createLocalStore(fakeStorage());
    let received = null;
    store.watchComments({ ...firstWeekRef(store), noteId: 'yok' }, list => { received = list; });
    assert.deepEqual(received, []);
});

test('uzunluk sınırları: not 5000, yorum 1000 karaktere kesilir', () => {
    const store = createLocalStore(fakeStorage());
    const ref = { ...firstWeekRef(store) };
    ref.noteId = store.addNote(ref, { text: 'x'.repeat(6000), author: '' });
    store.addComment(ref, { text: 'y'.repeat(2000), author: '' });

    const note = store.getState().terms[0].blocks[0].cols.sorular[0];
    assert.equal(note.text.length, 5000);
    assert.equal(note.comments[0].text.length, 1000);
});

test('bir nota en çok LIMITS.commentsPerNote yorum yazılabilir', () => {
    const store = createLocalStore(fakeStorage());
    const ref = { ...firstWeekRef(store) };
    ref.noteId = store.addNote(ref, { text: 'not', author: '' });

    for (let i = 0; i < LIMITS.commentsPerNote; i += 1) {
        assert.notEqual(store.addComment(ref, { text: `yorum ${i}`, author: '' }), null, `yorum ${i}`);
    }
    assert.equal(store.addComment(ref, { text: 'fazla', author: '' }), null);
    assert.equal(store.getState().terms[0].blocks[0].cols.sorular[0].commentCount, LIMITS.commentsPerNote);
});
