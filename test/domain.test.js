import test from 'node:test';
import assert from 'node:assert/strict';
import {
    COLUMNS, WEEKS_PER_TERM, LIMITS, newWeek, newTerm, seedState, isValidState, isWeek,
    findTerm, findBlock, findNote, noteCounts, latestActiveWeekId, commentCount, cleanText, selectedTerm
} from '../js/domain.js';

const note = (ts, comments = 0) => ({ id: `n${ts}`, text: 't', author: '', ts, comments: Array.from({ length: comments }, (_, i) => ({ id: `c${i}`, text: 'y', author: '', ts })) });

test('newWeek: başlık numaralanır, her sütun boş başlar', () => {
    const week = newWeek(3);
    assert.equal(week.title, '3. Hafta');
    assert.equal(week.type, 'week');
    assert.deepEqual(Object.keys(week.cols), COLUMNS.map(c => c.id));
    assert.ok(Object.values(week.cols).every(list => list.length === 0));
});

test('newTerm: 12 hafta üretir, id\'ler benzersizdir', () => {
    const term = newTerm('2027-2028 Birinci Dönem');
    assert.equal(term.blocks.length, WEEKS_PER_TERM);
    assert.equal(new Set(term.blocks.map(b => b.id)).size, WEEKS_PER_TERM);
});

test('seedState geçerli bir durumdur, isValidState bozuk girdiyi reddeder', () => {
    assert.ok(isValidState(seedState()));
    for (const bad of [null, undefined, {}, { terms: [] }, { terms: 'x' }]) assert.equal(isValidState(bad), false);
});

test('findTerm / findBlock / findNote doğru öğeyi bulur, yoksa undefined döner', () => {
    const state = seedState();
    const term = state.terms[0];
    const week = term.blocks[0];
    const n = note(1);
    week.cols.sorular.push(n);

    assert.equal(findTerm(state, term.id), term);
    assert.equal(findBlock(state, term.id, week.id), week);
    assert.equal(findNote(state, { termId: term.id, blockId: week.id, colId: 'sorular', noteId: n.id }), n);
    assert.equal(findNote(state, { termId: term.id, blockId: week.id, colId: 'sorular', noteId: 'yok' }), undefined);
    assert.equal(findNote(state, { termId: 'yok', blockId: week.id, colId: 'sorular', noteId: n.id }), undefined);
});

test('noteCounts notları ve yorumları tüm sütunlarda toplar', () => {
    const week = newWeek(1);
    week.cols.sorular.push(note(1, 2));
    week.cols.cikarimlar.push(note(2, 1), note(3));
    assert.deepEqual(noteCounts(week), { notes: 3, comments: 3 });
});

test('latestActiveWeekId: en son not eklenen hafta; not yoksa ilk hafta; hafta yoksa null', () => {
    const term = newTerm('T', 3);
    assert.equal(latestActiveWeekId(term), term.blocks[0].id);

    term.blocks[1].cols.sorular.push(note(100));
    term.blocks[2].cols.dusunceler.push(note(200));
    assert.equal(latestActiveWeekId(term), term.blocks[2].id);

    assert.equal(latestActiveWeekId({ id: 'x', title: 'Boş', blocks: [] }), null);
});

test('latestActiveWeekId raporları (blok olarak) atlar', () => {
    const term = newTerm('T', 2);
    term.blocks.splice(1, 0, { id: 'r', type: 'report', title: 'Rapor', text: 'x' });
    assert.equal(isWeek(term.blocks[1]), false);
    assert.equal(latestActiveWeekId(term), term.blocks[0].id);
});

test('commentCount: yeni kayıtlarda commentCount, eski yerel kayıtlarda comments dizisi', () => {
    assert.equal(commentCount({ commentCount: 4, comments: [1] }), 4);   // commentCount önceliklidir
    assert.equal(commentCount({ comments: [1, 2] }), 2);
    assert.equal(commentCount({}), 0);
});

test('noteCounts commentCount alanını kullanır', () => {
    const week = newWeek(1);
    week.cols.sorular.push({ id: 'a', text: 't', author: '', ts: 1, commentCount: 3 });
    assert.deepEqual(noteCounts(week), { notes: 1, comments: 3 });
});

test('cleanText: kırpar, sınıra keser, boşsa boş döner', () => {
    assert.equal(cleanText('  merhaba  ', 80), 'merhaba');
    assert.equal(cleanText('abcdef', 3), 'abc');
    assert.equal(cleanText('   ', 80), '');
    assert.equal(cleanText(null, 80), '');
    assert.equal(cleanText(undefined, 80), '');
});

test('LIMITS güvenlik kurallarıyla aynı değerleri taşır', () => {
    assert.deepEqual({ ...LIMITS }, { title: 80, note: 5000, comment: 1000, author: 40, report: 20000 });
});

test('selectedTerm: seçili dönemi verir, seçim yoksa null', () => {
    const state = { terms: [{ id: 'a', blocks: [] }, { id: 'b', blocks: [] }], selectedTermId: 'b' };
    assert.equal(selectedTerm(state).id, 'b');
    assert.equal(selectedTerm({ ...state, selectedTermId: null }), null);
    assert.equal(selectedTerm({ terms: [], selectedTermId: null }), null);
});
