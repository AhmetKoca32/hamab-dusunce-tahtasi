// Küçük pencere: tarayıcının prompt() kutusu yerine.
//   askText  -> { text, author } ya da vazgeçilirse null
//   askLogin -> giriş başarılı olursa true, vazgeçilirse false

import { $, h } from '../lib/dom.js';
import { trapTab } from '../lib/focus.js';
import { savedAuthor, rememberAuthor } from '../lib/prefs.js';

const label = (text, forId) => h('label', { class: 'field-label', for: forId }, text);

/**
 * Pencereyi açar ve gönderimi bekler.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.okText
 * @param {Node[]} options.fields     pencereye konacak etiket ve alanlar
 * @param {HTMLElement} options.focus ilk odaklanacak alan
 * @param {boolean} [options.authorField]
 * @param {() => ({ error: string } | { value: any }) | Promise<...>} options.submit
 */
function showDialog({ title, okText, fields, focus, authorField = false, submit }) {
    return new Promise(resolve => {
        const previouslyFocused = document.activeElement;

        $('dialogTitle').textContent = title;
        $('dialogOk').textContent = okText;
        $('dialogFieldHolder').replaceChildren(...fields);
        $('dialogAuthorHolder').hidden = !authorField;
        $('dialogAuthor').value = savedAuthor();
        $('dialogError').textContent = '';
        $('dialogWrap').classList.add('on');
        setTimeout(() => focus.focus(), 30);

        const finish = value => {
            $('dialogWrap').classList.remove('on');
            $('dialog').onsubmit = $('dialogCancel').onclick = $('dialogWrap').onkeydown = null;
            if (previouslyFocused?.focus && document.contains(previouslyFocused)) previouslyFocused.focus();
            resolve(value);
        };

        $('dialog').onsubmit = async event => {
            event.preventDefault();
            $('dialogOk').disabled = true;
            try {
                const outcome = await submit();
                if (outcome.error) { $('dialogError').textContent = outcome.error; return; }
                finish(outcome.value);
            } finally {
                $('dialogOk').disabled = false;
            }
        };
        $('dialogCancel').onclick = () => finish(null);
        $('dialogWrap').onkeydown = event => {
            if (event.key === 'Escape') { event.stopPropagation(); finish(null); }
            trapTab(event, $('dialog'));
        };
    });
}

export function askText({ title, label: labelText, value = '', multiline = false, author = false, okText = 'Kaydet', allowEmpty = false }) {
    const field = multiline
        ? h('textarea', { id: 'dialogField', class: 'tall', maxlength: 5000 })
        : h('input', { id: 'dialogField', type: 'text', maxlength: 200, autocomplete: 'off' });
    field.value = value;

    return showDialog({
        title, okText, focus: field, authorField: author,
        fields: [label(labelText, 'dialogField'), field],
        submit() {
            const text = field.value.trim();
            if (!text && !allowEmpty) return { error: 'Boş bırakılamaz.' };
            const name = $('dialogAuthor').value.trim();
            if (author) rememberAuthor(name);
            return { value: { text, author: name } };
        }
    });
}

/**
 * Düzenleyici girişi penceresi (yalnızca şifre). `login({ password })` -> { ok, error? }.
 * Giriş başarısızsa pencere açık kalır ve hata mesajı gösterilir.
 */
export function askLogin({ login }) {
    const password = h('input', { id: 'dialogPassword', type: 'password', autocomplete: 'current-password', maxlength: 200 });

    return showDialog({
        title: 'Düzenleyici girişi', okText: 'Giriş', focus: password,
        fields: [label('Şifre', 'dialogPassword'), password],
        async submit() {
            const result = await login({ password: password.value });
            return result.ok ? { value: true } : { error: result.error };
        }
    }).then(Boolean);
}
