// Gizli düzenleyici girişi: logoyu (ya da başlığı) 1 saniye basılı tutunca giriş penceresi açılır.
// Telefonda ve bilgisayarda (fare ile) aynı şekilde çalışır. Giriş yapılmamışsa sayfada düzenleme ile ilgili
// hiçbir şey görünmez.

import { $ } from './lib/dom.js';
import { auth, ui } from './context.js';
import { askLogin } from './views/dialog.js';
import { closeNote } from './views/drawer.js';

const HOLD_MS = 1000;
const MOVE_TOLERANCE_PX = 12;   // parmak bu kadar kayarsa kaydırma sayılır, basılı tutma iptal olur

export function initGate() {
    const brand = $('brand');
    let timer = null;
    let origin = null;

    const cancel = () => { clearTimeout(timer); timer = null; origin = null; };

    brand.addEventListener('pointerdown', event => {
        if (auth.isEditor() || (event.pointerType === 'mouse' && event.button !== 0)) return;
        cancel();
        origin = { x: event.clientX, y: event.clientY };
        timer = setTimeout(async () => {
            cancel();
            await askLogin({ login: credentials => auth.login(credentials) });
            // Başarılı girişte auth aboneliği ekranı kendiliğinden yeniler.
        }, HOLD_MS);
    });

    brand.addEventListener('pointermove', event => {
        if (!origin) return;
        if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > MOVE_TOLERANCE_PX) cancel();
    });

    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) brand.addEventListener(type, cancel);

    // Telefonlarda uzun basış tarayıcının "görseli kaydet / kopyala" menüsünü açmasın.
    brand.addEventListener('contextmenu', event => event.preventDefault());

    $('logoutBtn').addEventListener('click', () => {
        ui.composer = null;
        closeNote();
        auth.logout();   // abonelik ekranı yeniler
    });
}
