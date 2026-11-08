// Gizli düzenleyici girişi: logoya (ya da başlığa) 1,5 saniye içinde 3 kez tıklayınca giriş penceresi açılır.
// Giriş yapılmamışsa sayfada düzenleme ile ilgili hiçbir şey görünmez.

import { $ } from './lib/dom.js';
import { auth, ui } from './context.js';
import { askLogin } from './views/dialog.js';
import { closeNote } from './views/drawer.js';

const TAPS_REQUIRED = 3;
const TAP_WINDOW_MS = 1500;

export function initGate() {
    let taps = 0;
    let timer = null;

    $('brand').addEventListener('click', async () => {
        if (auth.isEditor()) return;
        taps += 1;
        clearTimeout(timer);
        timer = setTimeout(() => { taps = 0; }, TAP_WINDOW_MS);
        if (taps < TAPS_REQUIRED) return;
        taps = 0;

        await askLogin({ login: credentials => auth.login(credentials) });
        // Başarılı girişte auth aboneliği ekranı kendiliğinden yeniler.
    });

    $('logoutBtn').addEventListener('click', () => {
        ui.composer = null;
        closeNote();
        auth.logout();   // abonelik ekranı yeniler
    });
}
