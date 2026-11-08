import { $ } from './lib/dom.js';
import { store, auth, setRenderer, refresh, expandLatest } from './context.js';
import { renderTerms } from './views/terms.js';
import { renderBoard } from './views/board.js';
import { initDrawer, refreshDrawer } from './views/drawer.js';
import { initGate } from './gate.js';

function render() {
    $('editBar').hidden = !auth.isEditor();
    renderTerms();
    renderBoard();
    refreshDrawer();
}

setRenderer(render);
store.subscribe(refresh);   // veri değişince ekranı yenile
auth.subscribe(refresh);    // giriş/çıkış olunca düzenleme araçlarını göster/gizle

initDrawer();
initGate();
expandLatest();
render();
