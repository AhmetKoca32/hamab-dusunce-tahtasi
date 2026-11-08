// Yorum paneli: masaüstünde sağdan, telefonda alttan açılır. Seçili notu ve yorumlarını gösterir.

import { $, h } from '../lib/dom.js';
import { byline, fullTime } from '../lib/time.js';
import { trapTab } from '../lib/focus.js';
import { savedAuthor, rememberAuthor } from '../lib/prefs.js';
import { COLUMNS, findBlock, findNote } from '../domain.js';
import { store, auth, ui } from '../context.js';

export function openNote(ref, opener) {
    ui.open = ref;
    ui.opener = opener || null;
    $('commentAuthor').value = savedAuthor();
    renderDrawer();
    $('scrim').classList.add('on');
    $('drawer').classList.add('on');
    $('drawer').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('commentInput').focus(), 60);
}

export function closeNote() {
    if (!ui.open) return;
    const { noteId } = ui.open;
    ui.open = null;
    $('scrim').classList.remove('on');
    $('drawer').classList.remove('on');
    $('drawer').setAttribute('aria-hidden', 'true');
    $('commentInput').value = '';
    // Tahta yeniden çizildiyse eski düğme DOM'dan gitmiştir: aynı notun yeni düğmesine dön.
    const back = ui.opener && document.contains(ui.opener) ? ui.opener : document.querySelector(`[data-note="${noteId}"]`);
    back?.focus();
    ui.opener = null;
}

/** Veri değişince (yeni yorum, silinen not) açık paneli günceller; not yoksa kapatır. */
export function refreshDrawer() {
    if (ui.open) renderDrawer();
}

function renderDrawer() {
    const state = store.getState();
    const note = findNote(state, ui.open);
    if (!note) { closeNote(); return; }

    const week = findBlock(state, ui.open.termId, ui.open.blockId);
    const column = COLUMNS.find(c => c.id === ui.open.colId);
    const editing = auth.isEditor();

    $('drawerCtx').textContent = `${week.title} · ${column.title}`;
    $('drawerBody').replaceChildren(
        h('div', {},
            h('p', { class: 'drawer-note' }, note.text),
            h('div', { class: 'drawer-meta' },
                h('span', { title: fullTime(note.ts) }, byline(note)),
                editing ? h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: deleteCurrentNote }, 'Notu sil') : null)),
        h('div', { class: 'comments' },
            h('h3', {}, note.comments.length ? `${note.comments.length} yorum` : 'Yorumlar'),
            note.comments.length
                ? note.comments.map(comment => commentEl(comment, editing))
                : h('p', { class: 'empty' }, 'Henüz yorum yok. İlk yorumu sen yaz.')));

    const body = $('drawerBody');
    body.scrollTop = body.scrollHeight;
}

function commentEl(comment, editing) {
    return h('div', { class: 'comment' }, comment.text,
        h('div', { class: 'meta' },
            h('span', { title: fullTime(comment.ts) }, byline(comment)),
            editing ? h('button', { class: 'link-btn', type: 'button', onclick: () => store.deleteComment(ui.open, comment.id) }, 'Sil') : null));
}

function deleteCurrentNote() {
    if (!confirm('Bu not ve yorumları silinsin mi?')) return;
    const ref = ui.open;
    ui.opener = null;
    closeNote();
    store.deleteNote(ref);
}

export function initDrawer() {
    $('commentForm').addEventListener('submit', event => {
        event.preventDefault();
        const text = $('commentInput').value.trim();
        if (!text || !ui.open) return;
        const author = $('commentAuthor').value.trim();
        rememberAuthor(author);
        $('commentInput').value = '';
        store.addComment(ui.open, { text, author });
        $('commentInput').focus();
    });
    $('drawerClose').addEventListener('click', closeNote);
    $('scrim').addEventListener('click', closeNote);
    $('drawer').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeNote();
        trapTab(event, $('drawer'));
    });
}
