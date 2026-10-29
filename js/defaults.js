// Paramètres initiaux d'un nouvel utilisateur. Tout est modifiable ensuite
// dans les Paramètres. Les identifiants sont fixes pour rester cohérents
// d'un appareil à l'autre.
import { clone } from './dom.js';

export function defaultSettings() {
  return {
    schema: 1,
    prefs: { theme: 'system', fontSize: 'm' },
    statuses: { todo: 'À faire', done: 'Soldé' },
  };
}

/** Complète des paramètres enregistrés avec les valeurs par défaut manquantes. */
export function normalizeSettings(raw) {
  const d = defaultSettings();
  const s = { ...d, ...clone(raw || {}) };
  s.prefs = { ...d.prefs, ...(s.prefs || {}) };
  s.statuses = { ...d.statuses, ...(s.statuses || {}) };
  return s;
}

export function statusLabel(settings, status) {
  return (settings.statuses && settings.statuses[status]) || (status === 'done' ? 'Soldé' : 'À faire');
}
