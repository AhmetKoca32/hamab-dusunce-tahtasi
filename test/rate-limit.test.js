import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../js/lib/rate-limit.js';

function clock(start = 1_000_000) {
    let t = start;
    return { now: () => t, advance: ms => { t += ms; } };
}

test('sınıra kadar hak verir, sonra reddeder', () => {
    const c = clock();
    const limiter = createRateLimiter({ max: 3, perMs: 60_000, now: c.now });
    assert.deepEqual([limiter.tryTake(), limiter.tryTake(), limiter.tryTake(), limiter.tryTake()], [true, true, true, false]);
});

test('süre dolunca haklar kayan pencereyle geri gelir', () => {
    const c = clock();
    const limiter = createRateLimiter({ max: 2, perMs: 10_000, now: c.now });
    limiter.tryTake();
    c.advance(4_000);
    limiter.tryTake();
    assert.equal(limiter.tryTake(), false);

    c.advance(6_000);                       // ilk hak 10 sn önceydi: süresi doldu
    assert.equal(limiter.tryTake(), true);
    assert.equal(limiter.tryTake(), false); // ikinci hak henüz dolmadı
});

test('reddedilen deneme hak harcamaz', () => {
    const c = clock();
    const limiter = createRateLimiter({ max: 1, perMs: 10_000, now: c.now });
    limiter.tryTake();
    for (let i = 0; i < 50; i += 1) limiter.tryTake();   // art arda reddedilen denemeler
    c.advance(10_000);
    assert.equal(limiter.tryTake(), true);               // yalnızca ilk hakkın süresini bekledik
});

test('waitMs: hak varsa 0, yoksa en eski hakkın dolmasına kalan süre', () => {
    const c = clock();
    const limiter = createRateLimiter({ max: 2, perMs: 10_000, now: c.now });
    assert.equal(limiter.waitMs(), 0);
    limiter.tryTake();
    c.advance(3_000);
    limiter.tryTake();
    assert.equal(limiter.waitMs(), 7_000);
    c.advance(7_000);
    assert.equal(limiter.waitMs(), 0);
});
