// Hafta listesi: akordeon haftalar, sütunlar, notlar, satır içi not yazma alanı ve raporlar.

import { $, h } from '../lib/dom.js';
import { byline, fullTime } from '../lib/time.js';
import { savedAuthor, rememberAuthor } from '../lib/prefs.js';
import { COLUMNS, commentCount, isWeek, noteCounts } from '../domain.js';
import { store, auth, ui, currentTerm, refresh } from '../context.js';
import { openNote } from './drawer.js';
import { addWeek, addReport, editReport, renameBlock, deleteBlock } from '../actions.js';

const message = text => h('div', { class: 'empty-state', role: 'status' }, text);

export function renderBoard() {
    const { status } = store.getState();
    const term = currentTerm();
    const editing = auth.isEditor();

    if (!term) {
        $('board').replaceChildren(message(
            status === 'loading' ? 'Yükleniyor…'
                : status === 'error' ? 'Veriler yüklenemedi.'
                    : editing ? 'Henüz dönem yok. Yukarıdan "+ Dönem ekle" ile başla.' : 'Henüz içerik eklenmemiş.'));
        return;
    }

    const rows = [];
    if (status === 'loading') rows.push(message('Yükleniyor…'));
    else if (!term.blocks.length) rows.push(message('Bu dönemde henüz içerik yok.'));

    term.blocks.forEach((block, index) => {
        rows.push(isWeek(block) ? weekEl(term, block, editing) : reportEl(block, editing));
        if (editing) rows.push(insertRow('+ Buraya rapor ekle', () => addReport(index + 1)));
    });
    if (editing) rows.push(insertRow('+ Hafta ekle', addWeek));

    $('board').replaceChildren(...rows);
}

const insertRow = (label, onclick) =>
    h('div', { class: 'insert' }, h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick }, label));

function blockTools(block, editing) {
    if (!editing) return null;
    return h('div', { class: 'block-tools' },
        h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick: () => renameBlock(block) }, 'Başlığı değiştir'),
        block.type === 'report' ? h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick: () => editReport(block) }, 'Metni düzenle') : null,
        h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: () => deleteBlock(block) }, 'Sil'));
}

/* ---------- Hafta ---------- */
function weekEl(term, week, editing) {
    const open = ui.expanded.has(week.id);
    const { notes, comments } = noteCounts(week);
    const summary = notes ? `${notes} not${comments ? ` · ${comments} yorum` : ''}` : 'Boş';

    return h('section', { class: 'week' + (open ? ' open' : ''), id: `week-${week.id}`, 'aria-label': week.title },
        h('h2', { class: 'week-head' },
            h('button', {
                class: 'week-toggle', type: 'button', 'aria-expanded': String(open), 'aria-controls': `panel-${week.id}`,
                'data-focus-key': `toggle-${week.id}`, onclick: () => toggleWeek(week.id)
            },
                h('span', { class: 'week-name' }, week.title),
                h('span', { class: 'week-meta' }, h('span', {}, summary), h('span', { class: 'chev', 'aria-hidden': 'true' })))),
        h('div', { class: 'panel', id: `panel-${week.id}` },
            h('div', { class: 'inner' }, h('div', { class: 'inner-pad' },
                blockTools(week, editing),
                h('div', { class: 'columns' }, COLUMNS.map(col => columnEl(term, week, col)))))));
}

/** Tahtayı yeniden çizmeden yalnızca o haftanın sınıfını değiştirir, böylece açılma animasyonu bozulmaz. */
function toggleWeek(weekId) {
    // Durum her tıklamada güncel kümeden okunur (çizim anında saklanan bir kopyadan değil).
    if (ui.expanded.has(weekId)) ui.expanded.delete(weekId); else ui.expanded.add(weekId);
    const open = ui.expanded.has(weekId);
    const el = document.getElementById(`week-${weekId}`);
    if (!el) { refresh(); return; }
    el.classList.toggle('open', open);
    el.querySelector('.week-toggle').setAttribute('aria-expanded', String(open));
}

/* ---------- Sütun ve not ---------- */
function columnEl(term, week, col) {
    const notes = week.cols[col.id] || [];
    const composing = ui.composer?.blockId === week.id && ui.composer?.colId === col.id;
    const ref = noteId => ({ termId: term.id, blockId: week.id, colId: col.id, noteId });

    return h('div', { class: 'column' },
        h('div', { class: 'col-head' }, h('h3', {}, col.title), h('span', {}, notes.length || '')),
        composing
            ? composerEl(term, week, col)
            : h('button', { class: 'btn btn--tonal btn--block', type: 'button', onclick: () => startComposer(week.id, col.id) }, '+ Not ekle'),
        h('div', { class: 'notes' },
            notes.length || composing
                ? notes.map(note => noteEl(note, event => openNote(ref(note.id), event.currentTarget)))
                : h('p', { class: 'empty' }, 'Henüz not yok.')));
}

function noteEl(note, onclick) {
    const comments = commentCount(note);
    return h('button', { class: 'note', type: 'button', 'data-note': note.id, 'data-focus-key': `note-${note.id}`, onclick },
        h('span', { class: 'note-text' }, note.text),
        h('span', { class: 'note-meta' },
            h('span', { title: fullTime(note.ts) }, byline(note)),
            comments ? h('span', { class: 'note-comments' }, `${comments} yorum`) : null));
}

/* ---------- Satır içi not yazma ---------- */
function startComposer(blockId, colId) {
    ui.composer = { blockId, colId };
    ui.draft = { text: '', author: savedAuthor() };
    refresh();
    setTimeout(() => $('composerText')?.focus(), 0);
}

function closeComposer() {
    ui.composer = null;
    refresh();
}

function composerEl(term, week, col) {
    const text = h('textarea', {
        id: 'composerText', 'data-focus-key': 'composerText', maxlength: 5000, placeholder: 'Notunu yaz…', 'aria-label': `${col.title} için yeni not`,
        oninput: event => { ui.draft.text = event.target.value; }
    });
    text.value = ui.draft.text;

    const author = h('input', {
        type: 'text', 'data-focus-key': 'composerAuthor', maxlength: 40, placeholder: 'İsim (isteğe bağlı)', 'aria-label': 'İsim (isteğe bağlı)', autocomplete: 'name',
        oninput: event => { ui.draft.author = event.target.value; }
    });
    author.value = ui.draft.author;

    return h('form', {
        class: 'composer', novalidate: true,
        onsubmit: event => {
            event.preventDefault();
            const body = ui.draft.text.trim();
            if (!body) { text.focus(); return; }
            const id = store.addNote({ termId: term.id, blockId: week.id, colId: col.id }, { text: body, author: ui.draft.author });
            if (id === null) { refresh(); return; }   // reddedildi (ör. çok hızlı yazıldı): yazılan metin kaybolmasın
            rememberAuthor(ui.draft.author.trim());
            ui.composer = null;
            refresh();
        },
        onkeydown: event => { if (event.key === 'Escape') closeComposer(); }
    },
        text,
        author,
        h('div', { class: 'row' },
            h('button', { class: 'btn btn--tonal', type: 'button', onclick: closeComposer }, 'Vazgeç'),
            h('button', { class: 'btn btn--primary', type: 'submit' }, 'Ekle')));
}

/* ---------- Rapor ---------- */
function reportEl(report, editing) {
    return h('section', { class: 'report', 'aria-label': report.title },
        h('span', { class: 'report-label' }, 'Rapor'),
        h('h2', {}, report.title),
        report.text
            ? h('p', { class: 'report-body' }, report.text)
            : h('p', { class: 'report-body is-empty' }, 'Rapor henüz yazılmadı.'),
        blockTools(report, editing));
}
