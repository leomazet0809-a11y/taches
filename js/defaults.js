// Paramètres initiaux d'un nouvel utilisateur. Tout est modifiable ensuite
// dans les Paramètres. Les identifiants sont fixes pour rester cohérents
// d'un appareil à l'autre.
import { clone } from './dom.js';

/** Teintes disponibles pour les types de tags. */
export const TONES = [
  { id: 'blue', label: 'Bleu' },
  { id: 'amber', label: 'Ambre' },
  { id: 'red', label: 'Rouge' },
  { id: 'green', label: 'Vert' },
  { id: 'violet', label: 'Violet' },
  { id: 'teal', label: 'Turquoise' },
  { id: 'pink', label: 'Rose' },
  { id: 'slate', label: 'Gris' },
];

const DEFAULT_TAG_TYPES = [
  {
    id: 'categorie', name: 'Catégorie', tone: 'blue',
    values: [
      { id: 'projet-1', label: 'Projet 1' },
      { id: 'projet-2', label: 'Projet 2' },
      { id: 'activite-1', label: 'Activité 1 fiche emploi' },
      { id: 'activite-2', label: 'Activité 2 fiche emploi' },
      { id: 'activite-3', label: 'Activité 3 fiche emploi' },
    ],
  },
  {
    id: 'importance', name: 'Importance', tone: 'amber',
    values: [
      { id: 'important', label: 'Important' },
      { id: 'non-important', label: 'Non important' },
    ],
  },
  {
    id: 'urgence', name: 'Urgence', tone: 'red',
    values: [
      { id: 'urgent', label: 'Urgent' },
      { id: 'non-urgent', label: 'Non urgent' },
    ],
  },
];

export function defaultSettings() {
  return {
    schema: 1,
    prefs: { theme: 'system', fontSize: 'm' },
    statuses: { todo: 'À faire', done: 'Soldé' },
    tagTypes: clone(DEFAULT_TAG_TYPES),
  };
}

/** Complète des paramètres enregistrés avec les valeurs par défaut manquantes. */
export function normalizeSettings(raw) {
  const d = defaultSettings();
  const s = { ...d, ...clone(raw || {}) };
  s.prefs = { ...d.prefs, ...(s.prefs || {}) };
  s.statuses = { ...d.statuses, ...(s.statuses || {}) };
  if (!Array.isArray(s.tagTypes)) s.tagTypes = d.tagTypes;
  s.tagTypes = s.tagTypes
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || 'Tag', tone: t.tone || 'slate', values: Array.isArray(t.values) ? t.values.filter((v) => v && v.id) : [] }));
  return s;
}

export function statusLabel(settings, status) {
  return (settings.statuses && settings.statuses[status]) || (status === 'done' ? 'Soldé' : 'À faire');
}

/** Valeur (objet {id, label}) d'un type de tag pour une tâche, ou null. */
export function taskTagValue(task, type) {
  const id = task.tags && task.tags[type.id];
  return (id && type.values.find((v) => v.id === id)) || null;
}

/** Tags d'une tâche débarrassés des valeurs qui n'existent plus. */
export function cleanTags(settings, tags) {
  const out = {};
  for (const type of settings.tagTypes) {
    const id = tags && tags[type.id];
    if (id && type.values.some((v) => v.id === id)) out[type.id] = id;
  }
  return out;
}
