import { $ } from './lib/dom.js';
import { store, auth, mode, setRenderer, refresh, ensureExpanded } from './context.js';
import { renderTerms } from './views/terms.js';
import { renderBoard } from './views/board.js';
import { initDrawer, refreshDrawer } from './views/drawer.js';
import { initGate } from './gate.js';

/** Şeritler: yerel mod uyarısı ve (varsa) hata mesajı. */
function renderBanners() {
    $('modeBanner').hidden = mode !== 'local';
    const { error } = store.getState();
    $('statusBar').hidden = !error;
    $('statusMessage').textContent = error?.message ?? '';
    $('statusDismiss').hidden = Boolean(error?.fatal);
}

/**
 * Veri değişince tahta yeniden çizilir. Çizim klavye odağını ve yazılmakta olan metnin imlecini
 * kaybettirmesin diye, `data-focus-key` taşıyan eleman çizimden sonra geri odaklanır.
 */
function render() {
    const active = document.activeElement;
    const key = active?.dataset?.focusKey;
    const selection = key && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;

    ensureExpanded();
    $('editBar').hidden = !auth.isEditor();
    renderBanners();
    renderTerms();
    renderBoard();
    refreshDrawer();

    if (key) {
        const el = document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
        if (el) {
            el.focus({ preventScroll: true });
            if (selection) el.setSelectionRange(...selection);
        }
    }
}

setRenderer(render);
store.subscribe(refresh);   // veri değişince ekranı yenile
auth.subscribe(refresh);    // giriş/çıkış olunca düzenleme araçlarını göster/gizle
$('statusDismiss').addEventListener('click', () => store.clearError());

initDrawer();
initGate();
render();
