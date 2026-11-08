import test from 'node:test';
import assert from 'node:assert/strict';
import { retry } from '../js/lib/retry.js';

const noSleep = () => Promise.resolve();

test('ilk denemede başarılıysa sonucu döner, bekleme olmaz', async () => {
    const waits = [];
    const result = await retry(async () => 'tamam', { sleep: ms => { waits.push(ms); return Promise.resolve(); } });
    assert.equal(result, 'tamam');
    assert.deepEqual(waits, []);
});

test('geçici hatadan sonra yeniden dener ve başarılı olunca durur', async () => {
    let calls = 0;
    const result = await retry(async () => {
        calls += 1;
        if (calls < 3) throw Object.assign(new Error('geçici'), { code: 'unavailable' });
        return 'sonunda oldu';
    }, { attempts: 3, sleep: noSleep });
    assert.equal(result, 'sonunda oldu');
    assert.equal(calls, 3);
});

test('deneme sayısı bitince SON hatayı fırlatır', async () => {
    let calls = 0;
    await assert.rejects(
        retry(async () => { calls += 1; throw new Error(`hata ${calls}`); }, { attempts: 3, sleep: noSleep }),
        { message: 'hata 3' }
    );
    assert.equal(calls, 3);
});

test('shouldRetry false ise hemen bırakır (kalıcı hata tekrar denenmez)', async () => {
    let calls = 0;
    await assert.rejects(
        retry(async () => { calls += 1; throw Object.assign(new Error('kalıcı'), { code: 'not-found' }); },
            { attempts: 5, shouldRetry: e => e.code === 'unavailable', sleep: noSleep }),
        { message: 'kalıcı' }
    );
    assert.equal(calls, 1);
});

test('her denemeye kaçıncı olduğunu (0 tabanlı) geçirir', async () => {
    const seen = [];
    await assert.rejects(retry(async attempt => { seen.push(attempt); throw new Error('x'); }, { attempts: 3, sleep: noSleep }));
    assert.deepEqual(seen, [0, 1, 2]);
});

test('bekleme süreleri sırayla uygulanır, liste biterse sonuncusu tekrarlanır', async () => {
    const waits = [];
    await assert.rejects(retry(async () => { throw new Error('x'); }, {
        attempts: 4, delays: [100, 300], sleep: ms => { waits.push(ms); return Promise.resolve(); }
    }));
    assert.deepEqual(waits, [100, 300, 300]);   // 4 deneme = 3 bekleme
});
