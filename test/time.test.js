import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime, byline } from '../js/lib/time.js';

const NOW = Date.UTC(2026, 10, 8, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test('relativeTime: eşikler', () => {
    assert.equal(relativeTime(NOW - 20_000, NOW), 'şimdi');
    assert.match(relativeTime(NOW - 5 * MIN, NOW), /5 dakika önce/);
    assert.match(relativeTime(NOW - 5 * HOUR, NOW), /5 saat önce/);
    assert.equal(relativeTime(NOW - 1 * DAY, NOW), 'dün');
    assert.match(relativeTime(NOW - 3 * DAY, NOW), /3 gün önce/);
});

test('relativeTime: bir haftadan eskiyse tarih gösterir', () => {
    assert.match(relativeTime(NOW - 10 * DAY, NOW), /Ekim/);
});

test('relativeTime: zaman damgası yoksa boş döner', () => {
    assert.equal(relativeTime(0, NOW), '');
    assert.equal(relativeTime(undefined, NOW), '');
});

test('byline: isim yoksa Anonim yazar', () => {
    assert.match(byline({ author: 'Elif', ts: NOW - 5 * HOUR }, NOW), /^Elif · /);
    assert.match(byline({ author: '', ts: NOW - 5 * HOUR }, NOW), /^Anonim · /);
});
