import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalAuth } from '../js/backend/local-auth.js';

function fakeSession() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, value); },
        removeItem: key => { data.delete(key); }
    };
}

test('giriş yapılmadan düzenleyici değildir, kip "password"dür', () => {
    const auth = createLocalAuth(fakeSession());
    assert.equal(auth.isEditor(), false);
    assert.equal(auth.mode, 'password');
});

test('yanlış şifre girişi reddeder ve durumu değiştirmez', async () => {
    const auth = createLocalAuth(fakeSession());
    const result = await auth.login({ password: 'yanlis' });
    assert.deepEqual(result, { ok: false, error: 'Şifre yanlış.' });
    assert.equal(auth.isEditor(), false);
});

test('doğru şifre girişi açar, oturum yenilemede korunur, çıkış kapatır', async () => {
    const session = fakeSession();
    const auth = createLocalAuth(session);
    assert.deepEqual(await auth.login({ password: 'dev' }), { ok: true });
    assert.equal(auth.isEditor(), true);

    assert.equal(createLocalAuth(session).isEditor(), true);   // sayfa yenilendi

    await auth.logout();
    assert.equal(auth.isEditor(), false);
    assert.equal(createLocalAuth(session).isEditor(), false);
});

test('abonelere giriş ve çıkışta haber verilir', async () => {
    const auth = createLocalAuth(fakeSession());
    const seen = [];
    auth.subscribe(value => seen.push(value));
    await auth.login({ password: 'dev' });
    await auth.logout();
    assert.deepEqual(seen, [true, false]);
});

test('oturum depolaması yoksa da çalışır', async () => {
    const auth = createLocalAuth(null);
    assert.equal((await auth.login({ password: 'dev' })).ok, true);
    assert.equal(auth.isEditor(), true);
});
