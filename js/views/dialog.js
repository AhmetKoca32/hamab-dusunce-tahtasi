// Küçük pencere: tarayıcının prompt() kutusu yerine. Söz verir: { text, author } ya da vazgeçilirse null.

import { $, h } from '../lib/dom.js';
import { trapTab } from '../lib/focus.js';
import { savedAuthor, rememberAuthor } from '../lib/prefs.js';

export function askText({ title, label, value = '', multiline = false, password = false, author = false, okText = 'Kaydet', allowEmpty = false, validate }) {
    return new Promise(resolve => {
        const previouslyFocused = document.activeElement;

        $('dialogTitle').textContent = title;
        $('dialogLabel').textContent = label || '';
        const field = multiline
            ? h('textarea', { id: 'dialogField', class: 'tall', maxlength: 5000 })
            : h('input', { id: 'dialogField', type: password ? 'password' : 'text', maxlength: 200, autocomplete: password ? 'current-password' : 'off' });
        field.value = value;
        $('dialogFieldHolder').replaceChildren(field);
        $('dialogAuthorHolder').hidden = !author;
        $('dialogAuthor').value = savedAuthor();
        $('dialogError').textContent = '';
        $('dialogOk').textContent = okText;
        $('dialogWrap').classList.add('on');
        setTimeout(() => field.focus(), 30);

        const finish = result => {
            $('dialogWrap').classList.remove('on');
            $('dialog').onsubmit = $('dialogCancel').onclick = $('dialogWrap').onkeydown = null;
            if (previouslyFocused?.focus && document.contains(previouslyFocused)) previouslyFocused.focus();
            resolve(result);
        };

        $('dialog').onsubmit = event => {
            event.preventDefault();
            const text = field.value.trim();
            if (!text && !allowEmpty) { $('dialogError').textContent = 'Boş bırakılamaz.'; return; }
            const problem = validate?.(text);
            if (problem) { $('dialogError').textContent = problem; return; }
            const name = $('dialogAuthor').value.trim();
            if (author) rememberAuthor(name);
            finish({ text, author: name });
        };
        $('dialogCancel').onclick = () => finish(null);
        $('dialogWrap').onkeydown = event => {
            if (event.key === 'Escape') { event.stopPropagation(); finish(null); }
            trapTab(event, $('dialog'));
        };
    });
}
