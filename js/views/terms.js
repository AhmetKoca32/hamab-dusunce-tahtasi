import { $, h } from '../lib/dom.js';
import { store, auth, currentTerm, selectTerm } from '../context.js';
import { addTerm, renameTerm, deleteTerm } from '../actions.js';

export function renderTerms() {
    const editing = auth.isEditor();
    const { terms } = store.getState();
    const current = currentTerm();

    const tabs = terms.map(term => h('button', {
        class: 'term', role: 'tab', type: 'button',
        'aria-selected': String(term.id === current?.id),
        onclick: () => selectTerm(term.id)
    }, term.title));
    if (editing) tabs.push(h('button', { class: 'term term--add', type: 'button', onclick: addTerm }, '+ Dönem ekle'));
    $('terms').replaceChildren(...tabs);
    $('terms').hidden = tabs.length === 0;

    // Not: replaceChildren(null) "null" metni yazar; bu yüzden olmayan düğme diziye hiç eklenmez.
    const tools = [];
    if (editing && current) {
        tools.push(h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick: () => renameTerm(current) }, 'Dönemi yeniden adlandır'));
        if (terms.length > 1) tools.push(h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: () => deleteTerm(current) }, 'Dönemi sil'));
    }
    $('termTools').replaceChildren(...tools);
}
