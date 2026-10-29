// Paramètres initiaux d'un nouvel utilisateur. Tout est modifiable ensuite
// dans les Paramètres. Les identifiants sont fixes pour rester cohérents
// d'un appareil à l'autre.
import { clone } from './dom.js';
import { sanitizeRules } from './rules.js';

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

const DEFAULT_GROUPS = [
  { id: 'priorites', name: 'Priorités' },
  { id: 'suivi', name: 'Suivi' },
];

// « inbox » (À classer) est le dossier par défaut des nouvelles tâches.
const DEFAULT_FOLDERS = [
  { id: 'inbox', name: 'À classer', groupId: null },
  { id: 'maintenant', name: 'Faire maintenant', groupId: 'priorites' },
  { id: 'planifier', name: 'Planifier', groupId: 'priorites' },
  { id: 'deleguer', name: 'Déléguer', groupId: 'priorites' },
  { id: 'abandonner', name: 'Abandonner', groupId: 'priorites' },
  { id: 'attente', name: 'Attente réponse', groupId: 'suivi' },
  { id: 'archives', name: 'Archives', groupId: 'suivi' },
];

// Règles de tri initiales (matrice d'Eisenhower). Une tâche quitte « À classer »
// quand ses trois tags sont renseignés. '*' = depuis tous les dossiers.
const tag = (type, op, value = null) => ({ field: 'tag:' + type, op, value });
const eisenhower = (id, name, importance, urgence, to) => ({
  id, name, enabled: true, from: ['inbox'], match: 'all', to,
  conditions: [tag('categorie', 'set'), tag('importance', 'is', importance), tag('urgence', 'is', urgence)],
});
const DEFAULT_RULES = [
  {
    id: 'r-soldees', name: 'Tâches soldées → Archives', enabled: true, from: ['*'], match: 'all',
    conditions: [{ field: 'status', op: 'is', value: 'done' }], to: 'archives',
  },
  {
    id: 'r-reactivees', name: 'Tâches remises à faire → À classer', enabled: true, from: ['archives'], match: 'all',
    conditions: [{ field: 'status', op: 'is', value: 'todo' }], to: 'inbox',
  },
  eisenhower('r-maintenant', 'Important et urgent → Faire maintenant', 'important', 'urgent', 'maintenant'),
  eisenhower('r-planifier', 'Important, non urgent → Planifier', 'important', 'non-urgent', 'planifier'),
  eisenhower('r-deleguer', 'Non important, urgent → Déléguer', 'non-important', 'urgent', 'deleguer'),
  eisenhower('r-abandonner', 'Non important, non urgent → Abandonner', 'non-important', 'non-urgent', 'abandonner'),
];

export function defaultSettings() {
  return {
    schema: 1,
    prefs: { theme: 'system', fontSize: 'm' },
    statuses: { todo: 'À faire', done: 'Soldé' },
    tagTypes: clone(DEFAULT_TAG_TYPES),
    groups: clone(DEFAULT_GROUPS),
    folders: clone(DEFAULT_FOLDERS),
    rules: clone(DEFAULT_RULES),
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
  if (!Array.isArray(s.groups)) s.groups = d.groups;
  s.groups = s.groups.filter((g) => g && g.id).map((g) => ({ id: g.id, name: g.name || 'Groupe' }));
  if (!Array.isArray(s.folders)) s.folders = d.folders;
  const groupIds = new Set(s.groups.map((g) => g.id));
  s.folders = s.folders.filter((f) => f && f.id)
    .map((f) => ({ id: f.id, name: f.name || 'Dossier', groupId: groupIds.has(f.groupId) ? f.groupId : null }));
  if (!s.folders.some((f) => f.id === 'inbox')) s.folders.unshift({ ...DEFAULT_FOLDERS[0] });
  if (!Array.isArray(s.rules)) s.rules = d.rules;
  return sanitizeRules(s);
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
