import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleState, nextOrder, orderBetween } from '../js/backend/assemble.js';

const terms = [
    { id: 't2', title: 'İkinci', order: 2 },
    { id: 't1', title: 'Birinci', order: 1 }
];
const blocks = [
    { id: 'w2', termId: 't1', type: 'week', title: '2. Hafta', order: 2 },
    { id: 'r1', termId: 't1', type: 'report', title: 'Rapor', order: 1.5, text: 'özet' },
    { id: 'w1', termId: 't1', type: 'week', title: '1. Hafta', order: 1 },
    { id: 'x', termId: 'baska', type: 'week', title: 'Başka dönem', order: 1 }
];
const notes = [
    { id: 'n2', blockId: 'w1', col: 'sorular', text: 'ikinci', author: 'B', ts: 200, commentCount: 2 },
    { id: 'n1', blockId: 'w1', col: 'sorular', text: 'birinci', author: 'A', ts: 100, commentCount: 0 },
    { id: 'n3', blockId: 'w1', col: 'cikarimlar', text: 'çıkarım', author: '', ts: 50 },
    { id: 'n4', blockId: 'w2', col: 'dusunceler', text: 'düşünce', author: 'C', ts: 300, commentCount: 1 },
    { id: 'n5', blockId: 'w1', col: 'bilinmeyen', text: 'kaybolur', author: '', ts: 10 }
];

test('dönemler sıraya göre dizilir, yalnızca seçili dönemin blokları dolu gelir', () => {
    const state = assembleState({ terms, blocks, notes, selectedTermId: 't1' });
    assert.deepEqual(state.terms.map(t => t.id), ['t1', 't2']);
    assert.equal(state.selectedTermId, 't1');
    assert.equal(state.terms[0].blocks.length, 3);   // başka dönemin bloğu girmez
    assert.deepEqual(state.terms[1].blocks, []);
});

test('bloklar sıraya göre dizilir; rapor iki haftanın arasında kalır', () => {
    const [first] = assembleState({ terms, blocks, notes, selectedTermId: 't1' }).terms;
    assert.deepEqual(first.blocks.map(b => b.id), ['w1', 'r1', 'w2']);
    assert.equal(first.blocks[1].type, 'report');
    assert.equal(first.blocks[1].text, 'özet');
    assert.equal('cols' in first.blocks[1], false);
});

test('notlar sütunlara ve zamana göre yerleşir, bilinmeyen sütun düşer', () => {
    const [first] = assembleState({ terms, blocks, notes, selectedTermId: 't1' }).terms;
    const week1 = first.blocks[0];
    assert.deepEqual(week1.cols.sorular.map(n => n.id), ['n1', 'n2']);     // eski önce
    assert.deepEqual(week1.cols.cikarimlar.map(n => n.id), ['n3']);
    assert.deepEqual(week1.cols.dusunceler, []);
    assert.equal(Object.values(week1.cols).flat().some(n => n.id === 'n5'), false);
});

test('not alanları: eksik yorum sayısı 0, eksik isim boş metin olur', () => {
    const [first] = assembleState({ terms, blocks, notes, selectedTermId: 't1' }).terms;
    const n3 = first.blocks[0].cols.cikarimlar[0];
    assert.equal(n3.commentCount, 0);
    assert.equal(n3.author, '');
    assert.equal(first.blocks[0].cols.sorular[1].commentCount, 2);
});

test('seçili dönem listede yoksa seçim null olur ve hiçbir dönemin bloğu dolmaz', () => {
    const state = assembleState({ terms, blocks, notes, selectedTermId: 'yok' });
    assert.equal(state.selectedTermId, null);
    assert.ok(state.terms.every(t => t.blocks.length === 0));
});

test('durum ve hata olduğu gibi aktarılır; boş girdi geçerli bir durum üretir', () => {
    const error = { code: 'x', message: 'm', fatal: false };
    const state = assembleState({ status: 'loading', error });
    assert.deepEqual(state, { terms: [], selectedTermId: null, status: 'loading', error });
});

test('nextOrder: listenin sonuna, boşsa 1', () => {
    assert.equal(nextOrder([]), 1);
    assert.equal(nextOrder([{ order: 1 }, { order: 7 }, { order: 3 }]), 8);
});

test('orderBetween: baş, son ve ara', () => {
    assert.equal(orderBetween(undefined, undefined), 1);
    assert.equal(orderBetween(undefined, 5), 4);       // en başa
    assert.equal(orderBetween(5, undefined), 6);       // en sona
    assert.equal(orderBetween(1, 2), 1.5);             // iki komşunun arasına
    const mid = orderBetween(1, 2);
    assert.ok(mid > 1 && mid < 2);
});
