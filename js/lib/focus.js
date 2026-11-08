const FOCUSABLE = 'button, input, textarea, [href], [tabindex]:not([tabindex="-1"])';

/** Tab ile odağın `root` içinde kalmasını sağlar (pencere ve yan panel için). */
export function trapTab(event, root) {
    if (event.key !== 'Tab') return;
    const items = [...root.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
