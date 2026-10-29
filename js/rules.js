// Règles de tri automatique.
//
// Une règle : { id, name, enabled, from, match, conditions, to }
//   from       : ['*'] (tous les dossiers) ou liste d'identifiants de dossiers de départ
//   match      : 'all' (toutes les conditions, ET) ou 'any' (au moins une, OU)
//   conditions : [{ field: 'status' | 'tag:<type>', op: 'is' | 'isNot' | 'set' | 'unset', value }]
//   to         : dossier d'arrivée
//
// Les règles s'appliquent quand une tâche est enregistrée (création, modification,
// changement de statut), jamais lors d'un déplacement manuel. La première règle
// (dans l'ordre de la liste) qui correspond déplace la tâche ; les règles sont
// ensuite réévaluées depuis le nouveau dossier (enchaînement, sans boucle).
import { folderOf } from './folders.js';
import { statusLabel } from './defaults.js';

export const ANY_FOLDER = '*';
const MAX_STEPS = 10;

export const OPS = {
  is: 'est',
  isNot: "n'est pas",
  set: 'est renseigné',
  unset: 'est vide',
};

function tagType(settings, field) {
  return field && field.startsWith('tag:') ? settings.tagTypes.find((t) => t.id === field.slice(4)) : null;
}

export function fieldOps(field) {
  return field === 'status' ? ['is', 'isNot'] : ['is', 'isNot', 'set', 'unset'];
}

export function needsValue(op) {
  return op === 'is' || op === 'isNot';
}

function conditionValid(settings, c) {
  if (!c || !c.field) return false;
  if (c.field === 'status') return needsValue(c.op) && (c.value === 'todo' || c.value === 'done');
  const type = tagType(settings, c.field);
  if (!type || !fieldOps(c.field).includes(c.op)) return false;
  return !needsValue(c.op) || type.values.some((v) => v.id === c.value);
}

/** Ce qui empêche une règle de fonctionner (liste vide = règle complète). */
export function ruleProblems(settings, rule) {
  const problems = [];
  const folderIds = new Set(settings.folders.map((f) => f.id));
  if (!rule.from || !rule.from.some((id) => id === ANY_FOLDER || folderIds.has(id))) problems.push('aucun dossier de départ');
  if (!rule.conditions || !rule.conditions.length) problems.push('aucune condition');
  else if (!rule.conditions.every((c) => conditionValid(settings, c))) problems.push('condition incomplète');
  if (!rule.to || !folderIds.has(rule.to)) problems.push("pas de dossier d'arrivée");
  return problems;
}

function testCondition(task, c) {
  if (c.field === 'status') {
    const status = task.status === 'done' ? 'done' : 'todo';
    return c.op === 'is' ? status === c.value : status !== c.value;
  }
  const v = task.tags && task.tags[c.field.slice(4)];
  switch (c.op) {
    case 'is': return v === c.value;
    case 'isNot': return v !== c.value;
    case 'set': return !!v;
    case 'unset': return !v;
    default: return false;
  }
}

function ruleApplies(settings, rule, task, folderId) {
  if (!rule.enabled || ruleProblems(settings, rule).length) return false;
  if (rule.to === folderId) return false;
  if (!rule.from.includes(ANY_FOLDER) && !rule.from.includes(folderId)) return false;
  return rule.match === 'any'
    ? rule.conditions.some((c) => testCondition(task, c))
    : rule.conditions.every((c) => testCondition(task, c));
}

/** Dossier d'arrivée d'une tâche après application des règles, et règles utilisées. */
export function applyRules(settings, task) {
  let folderId = folderOf(settings, task);
  const applied = [];
  const seen = new Set([folderId]);
  for (let step = 0; step < MAX_STEPS; step++) {
    const rule = (settings.rules || []).find((r) => ruleApplies(settings, r, task, folderId));
    if (!rule) break;
    folderId = rule.to;
    applied.push(rule);
    if (seen.has(folderId)) break; // évite qu'une règle renvoie la tâche en boucle
    seen.add(folderId);
  }
  return { folderId, applied };
}

/** Phrase lisible décrivant une règle. */
export function describeRule(settings, rule) {
  const folder = (id) => (settings.folders.find((f) => f.id === id) || {}).name || '?';
  const from = !rule.from || !rule.from.length ? '?'
    : rule.from.includes(ANY_FOLDER) ? 'tous les dossiers' : rule.from.map(folder).join(', ');
  const cond = (c) => {
    if (c.field === 'status') return `Statut ${c.op === 'isNot' ? '≠' : '='} ${statusLabel(settings, c.value)}`;
    const type = tagType(settings, c.field);
    if (!type) return '?';
    if (c.op === 'set') return `${type.name} renseigné`;
    if (c.op === 'unset') return `${type.name} vide`;
    const value = type.values.find((v) => v.id === c.value);
    return `${type.name} ${c.op === 'isNot' ? '≠' : '='} ${value ? value.label : '?'}`;
  };
  const conds = (rule.conditions || []).map(cond).join(rule.match === 'any' ? ' ou ' : ' et ') || '?';
  return `Depuis ${from} · si ${conds} → ${rule.to ? folder(rule.to) : '?'}`;
}

/** Retire des règles les références à des tags, valeurs ou dossiers supprimés. */
export function sanitizeRules(settings) {
  const folderIds = new Set(settings.folders.map((f) => f.id));
  settings.rules = (Array.isArray(settings.rules) ? settings.rules : [])
    .filter((r) => r && r.id)
    .map((r) => ({
      id: r.id,
      name: r.name || 'Règle',
      enabled: r.enabled !== false,
      match: r.match === 'any' ? 'any' : 'all',
      from: (Array.isArray(r.from) ? r.from : []).filter((id) => id === ANY_FOLDER || folderIds.has(id)),
      conditions: (Array.isArray(r.conditions) ? r.conditions : [])
        .filter((c) => c && (c.field === 'status' || tagType(settings, c.field)))
        .map((c) => {
          const type = tagType(settings, c.field);
          const valueGone = type && needsValue(c.op) && c.value && !type.values.some((v) => v.id === c.value);
          return { field: c.field, op: c.op || 'is', value: valueGone ? null : (c.value ?? null) };
        }),
      to: folderIds.has(r.to) ? r.to : null,
    }));
  return settings;
}
