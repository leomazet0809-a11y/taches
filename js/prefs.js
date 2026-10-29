// Préférences d'affichage : thème et taille du texte.
// Elles sont enregistrées avec les paramètres de l'utilisateur (donc partagées
// entre ses appareils) et recopiées dans le navigateur pour un affichage immédiat.

export const FONT_SIZES = { s: 14, m: 16, l: 18, xl: 20 };
const KEY = 'taches.prefs';
const media = window.matchMedia('(prefers-color-scheme: dark)');
let current = readLocal();

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export function applyPrefs(prefs = {}) {
  current = { theme: prefs.theme || 'system', fontSize: prefs.fontSize || 'm' };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* navigation privée */ }
  paint();
}

function paint() {
  const dark = current.theme === 'dark' || (current.theme !== 'light' && media.matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.fontSize = (FONT_SIZES[current.fontSize] || 16) + 'px';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#111318' : '#f5f6f8';
}

media.addEventListener('change', paint);
paint();
