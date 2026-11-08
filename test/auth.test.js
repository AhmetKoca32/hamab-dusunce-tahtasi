import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../js/auth.js';

function fakeSession() {
    const data = new Map();
    return {
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => { data.set(key, value); },
        removeItem: key => { data.delete(key); }
    };
}

test('giriş yapılmadan düzenleyici değildir', () => {
    assert.equal(createAuth(fakeSession()).isEditor(), false);
});

test('yanlış şifre girişi reddeder ve durumu değiştirmez', () => {
    const auth = createAuth(fakeSession());
    assert.equal(auth.login('yanlis'), false);
    assert.equal(auth.isEditor(), false);
    assert.equal(auth.verify('yanlis'), false);
});

test('doğru şifre girişi açar, oturum yenilemede korunur, çıkış kapatır', () => {
    const session = fakeSession();
    const auth = createAuth(session);
    assert.equal(auth.login('deneme'), true);
    assert.equal(auth.isEditor(), true);

    assert.equal(createAuth(session).isEditor(), true);   // sayfa yenilendi

    auth.logout();
    assert.equal(auth.isEditor(), false);
    assert.equal(createAuth(session).isEditor(), false);
});

test('abonelere giriş ve çıkışta haber verilir', () => {
    const auth = createAuth(fakeSession());
    const seen = [];
    auth.subscribe(value => seen.push(value));
    auth.login('deneme');
    auth.logout();
    assert.deepEqual(seen, [true, false]);
});

test('oturum depolaması yoksa da çalışır', () => {
    const auth = createAuth(null);
    assert.equal(auth.login('deneme'), true);
    assert.equal(auth.isEditor(), true);
});
