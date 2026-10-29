// Dossiers et groupes de dossiers, affichés sous forme de tuiles.
import { h, icon } from './dom.js';

export const INBOX = 'inbox';
export const ALL = 'all';

/** Dossier d'une tâche (« À classer » si absent ou supprimé). */
export function folderOf(settings, task) {
  const id = task && task.folderId;
  return id && settings.folders.some((f) => f.id === id) ? id : INBOX;
}

export function folderName(settings, id) {
  if (id === ALL) return 'Toutes les tâches';
  const f = settings.folders.find((x) => x.id === id);
  return f ? f.name : 'À classer';
}

/** Dossiers regroupés pour l'affichage : d'abord ceux sans groupe, puis chaque groupe. */
export function folderSections(settings, { keepEmpty = false } = {}) {
  const groupIds = new Set(settings.groups.map((g) => g.id));
  const sections = [{ group: null, folders: settings.folders.filter((f) => !f.groupId || !groupIds.has(f.groupId)) }];
  for (const g of settings.groups) {
    sections.push({ group: g, folders: settings.folders.filter((f) => f.groupId === g.id) });
  }
  return sections.filter((s) => keepEmpty || s.folders.length);
}

export function countByFolder(settings, tasks) {
  const counts = {};
  for (const t of tasks) {
    const id = folderOf(settings, t);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function tile({ id, name, count, selected, onSelect, dropTarget, iconName }) {
  return h('button', {
    class: 'tile' + (selected ? ' is-selected' : '') + (id === ALL ? ' tile-all' : ''),
    type: 'button',
    'aria-pressed': onSelect ? String(!!selected) : null,
    dataset: dropTarget ? { dropFolder: id } : null,
    onclick: onSelect ? () => onSelect(id) : null,
  },
  h('span', { class: 'tile-name' }, iconName && icon(iconName), h('span', null, name)),
  h('span', { class: 'tile-count', 'aria-label': `${count} tâche${count > 1 ? 's' : ''}` }, String(count)),
  );
}

/**
 * Tuiles des dossiers. Avec onSelect : navigation (et tuile « Toutes les tâches »).
 * Sans onSelect : tuiles de dépôt uniquement (panneau affiché pendant un glisser).
 */
export function renderTiles({ settings, tasks, view, onSelect, withAll = true }) {
  const counts = countByFolder(settings, tasks);
  return folderSections(settings).map((sec, i) => h('div', { class: 'tile-section' },
    h('h3', { class: 'tile-group' + (sec.group ? '' : ' is-blank') }, sec.group ? sec.group.name : 'Dossiers'),
    h('div', { class: 'tiles' },
      i === 0 && withAll && tile({ id: ALL, name: 'Toutes les tâches', count: tasks.length, selected: view === ALL, onSelect, iconName: 'list' }),
      sec.folders.map((f) => tile({
        id: f.id, name: f.name, count: counts[f.id] || 0, selected: view === f.id, onSelect,
        dropTarget: true, iconName: f.id === INBOX ? 'inbox' : null,
      })),
    ),
  ));
}

/** Liste déroulante des dossiers, regroupés par groupe. */
export function folderSelect(settings, { value, id, onChange }) {
  return h('select', { class: 'input', id, value, onchange: (e) => onChange(e.target.value) },
    folderSections(settings).map((sec) => (sec.group
      ? h('optgroup', { label: sec.group.name }, sec.folders.map((f) => h('option', { value: f.id }, f.name)))
      : sec.folders.map((f) => h('option', { value: f.id }, f.name)))),
  );
}
