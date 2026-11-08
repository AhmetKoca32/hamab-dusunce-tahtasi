// Yalnızca bu cihaza ait küçük tercihler (veri değil): son kullanılan isim.
import { safeStorage } from '../store.js';

const AUTHOR_KEY = 'hamabAuthor';
const storage = safeStorage();

export const savedAuthor = () => storage.getItem(AUTHOR_KEY) || '';
export const rememberAuthor = name => { if (name) storage.setItem(AUTHOR_KEY, name); };
