// Veri arka ucunu seçer: Firebase yapılandırması doluysa Firestore + Authentication, değilse yerel mod.
// Firebase SDK'sı yalnızca gerektiğinde (dinamik import) indirilir.

import { firebaseConfig, editorEmail } from '../firebase-config.js';
import { createFailedBackend } from './failed.js';

async function localBackend() {
    const [{ createLocalStore }, { createLocalAuth }] = await Promise.all([import('./local-store.js'), import('./local-auth.js')]);
    return { mode: 'local', store: createLocalStore(), auth: createLocalAuth() };
}

async function firebaseBackend(config) {
    const [sdk, { createFirebaseStore }, { createFirebaseAuth }] = await Promise.all([
        import('./firebase-sdk.js'), import('./firebase-store.js'), import('./firebase-auth.js')
    ]);
    const app = sdk.initializeApp(config);
    const db = openFirestore(sdk, app);
    return { mode: 'firebase', store: createFirebaseStore({ db }), auth: createFirebaseAuth({ app, db, editorEmail }) };
}

/** Çevrimdışı çalışabilmek için kalıcı yerel önbellek; tarayıcı desteklemiyorsa bellek önbelleğine düşer. */
function openFirestore(sdk, app) {
    try {
        return sdk.initializeFirestore(app, { localCache: sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }) });
    } catch {
        return sdk.getFirestore(app);
    }
}

export async function createBackend() {
    if (!firebaseConfig) return localBackend();
    try {
        return await firebaseBackend(firebaseConfig);
    } catch (error) {
        console.error('Firebase başlatılamadı:', error);
        return createFailedBackend();
    }
}
