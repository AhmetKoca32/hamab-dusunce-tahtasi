import { $, h } from '../lib/dom.js';
import { store, auth, ui, currentTerm, expandLatest, refresh } from '../context.js';
import { addTerm, renameTerm, deleteTerm } from '../actions.js';

export function renderTerms() {
    const editing = auth.isEditor();
    const { terms } = store.getState();

    const tabs = terms.map(term => h('button', {
        class: 'term', role: 'tab', type: 'button',
        'aria-selected': String(term.id === currentTerm().id),
        onclick: () => { ui.termId = term.id; ui.composer = null; expandLatest(); refresh(); }
    }, term.title));
    if (editing) tabs.push(h('button', { class: 'term term--add', type: 'button', onclick: addTerm }, '+ Dönem ekle'));
    $('terms').replaceChildren(...tabs);

    const term = currentTerm();
    $('termTools').replaceChildren(...(editing ? [
        h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick: () => renameTerm(term) }, 'Dönemi yeniden adlandır'),
        terms.length > 1 ? h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: () => deleteTerm(term) }, 'Dönemi sil') : null
    ] : []));
}
