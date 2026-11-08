// Veri arka ucunu seçer: Firebase yapılandırması doluysa Firestore + Authentication, değilse yerel mod.
// Firebase SDK'sı yalnızca gerektiğinde (dinamik import) indirilir.

import { firebaseConfig, editorEmail, appCheckSiteKey } from '../firebase-config.js';
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
    if (appCheckSiteKey) enableAppCheck(sdk, app, appCheckSiteKey);   // Firestore ve Auth'tan ÖNCE
    const db = openFirestore(sdk, app);
    return { mode: 'firebase', store: createFirebaseStore({ db }), auth: createFirebaseAuth({ app, db, editorEmail }) };
}

/**
 * App Check: her Firestore isteğine, isteğin gerçekten bu siteden geldiğini kanıtlayan bir belirteç ekler.
 * Yerelde (localhost) reCAPTCHA çalışmaz; bunun yerine konsola bir hata ayıklama belirteci yazılır, onu Firebase
 * konsolunda App Check → Uygulamalar → Hata ayıklama belirteçlerini yönet bölümüne ekle.
 */
function enableAppCheck(sdk, app, siteKey) {
    if (['localhost', '127.0.0.1'].includes(globalThis.location?.hostname)) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    sdk.initializeAppCheck(app, { provider: new sdk.ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
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
