// Düzenleyiciye özel kullanıcı akışları: pencereyi aç, onay al, depoya yaz.
// Görünümler bunları çağırır; veri değişince store aboneliği ekranı kendiliğinden yeniler.

import { store, ui, currentTerm, refresh } from './context.js';
import { askText } from './views/dialog.js';
import { latestActiveWeekId } from './domain.js';

export async function addTerm() {
    const result = await askText({ title: 'Yeni dönem', label: 'Dönem adı (ör. 2027-2028 Birinci Dönem)', okText: 'Ekle' });
    if (!result) return;
    const id = store.addTerm(result.text);
    if (id) {
        ui.termId = id;
        ui.expanded = new Set([latestActiveWeekId(currentTerm())].filter(Boolean));
        refresh();
    }
}

export async function renameTerm(term) {
    const result = await askText({ title: 'Dönemi yeniden adlandır', label: 'Dönem adı', value: term.title });
    if (result) store.renameTerm(term.id, result.text);
}

export function deleteTerm(term) {
    if (!confirm(`"${term.title}" dönemi ve içindeki tüm notlar silinsin mi?`)) return;
    if (store.deleteTerm(term.id)) {
        ui.termId = store.getState().terms[0].id;
        ui.expanded = new Set([latestActiveWeekId(currentTerm())].filter(Boolean));
        refresh();
    }
}

export async function renameBlock(block) {
    const result = await askText({ title: 'Başlığı değiştir', label: 'Başlık', value: block.title });
    if (result) store.renameBlock(currentTerm().id, block.id, result.text);
}

export function deleteBlock(block) {
    const message = block.type === 'report' ? 'Bu rapor silinsin mi?' : `"${block.title}" ve içindeki tüm notlar silinsin mi?`;
    if (confirm(message)) store.deleteBlock(currentTerm().id, block.id);
}

export function addWeek() {
    const id = store.addWeek(currentTerm().id);
    if (id) { ui.expanded.add(id); refresh(); }
}

export async function addReport(index) {
    const result = await askText({ title: 'Rapor ekle', label: 'Rapor metni', multiline: true, okText: 'Ekle' });
    if (result) store.addReport(currentTerm().id, index, result.text);
}

export async function editReport(block) {
    const result = await askText({ title: 'Raporu düzenle', label: 'Rapor metni', value: block.text || '', multiline: true, allowEmpty: true });
    if (result) store.setReportText(currentTerm().id, block.id, result.text);
}
