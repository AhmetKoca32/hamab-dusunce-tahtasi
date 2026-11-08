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

    $('termTools').replaceChildren(...(editing && current ? [
        h('button', { class: 'btn btn--tonal btn--sm', type: 'button', onclick: () => renameTerm(current) }, 'Dönemi yeniden adlandır'),
        terms.length > 1 ? h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: () => deleteTerm(current) }, 'Dönemi sil') : null
    ] : []));
}
