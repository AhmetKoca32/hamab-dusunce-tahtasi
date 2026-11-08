// Firebase SDK'sının tek giriş noktası. Sürüm yalnızca burada değişir (derleme aracı yok, modüller CDN'den gelir).
// SDK yalnızca Firebase yapılandırması doluyken yüklenir (bkz. index.js), yerel modda hiç indirilmez.

export { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';

export { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app-check.js';

export {
    getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    collection, doc, query, where, orderBy, onSnapshot, getDoc, getDocs,
    setDoc, updateDoc, writeBatch, serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

export {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
