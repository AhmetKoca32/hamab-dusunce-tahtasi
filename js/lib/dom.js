export const $ = id => document.getElementById(id);

/**
 * Küçük DOM kurucu. Metin her zaman createTextNode ile eklenir (innerHTML yok), bu yüzden kullanıcı
 * girdisi HTML olarak yorumlanamaz.
 *   h('button', { class: 'btn', onclick: fn, disabled: true }, 'Metin', altEleman)
 */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'class') el.className = value;
        else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
        else if (value !== false && value != null) el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return el;
}
