// Filtres par boutons : plusieurs valeurs d'un même tag se combinent en OU,
// des tags différents (et le statut) se combinent en ET.
import { h, icon } from './dom.js';
import { statusLabel } from './defaults.js';

export function emptyFilters() {
  return { status: [], tags: {} };
}

/** Retire des filtres les valeurs qui n'existent plus dans les paramètres. */
export function cleanFilters(settings, filters) {
  const out = emptyFilters();
  out.status = (filters.status || []).filter((s) => s === 'todo' || s === 'done');
  for (const type of settings.tagTypes) {
    const sel = ((filters.tags || {})[type.id] || []).filter((id) => type.values.some((v) => v.id === id));
    if (sel.length) out.tags[type.id] = sel;
  }
  return out;
}

export function activeCount(filters) {
  return filters.status.length + Object.values(filters.tags).reduce((n, sel) => n + sel.length, 0);
}

export function matchesFilters(task, filters) {
  if (filters.status.length && !filters.status.includes(task.status === 'done' ? 'done' : 'todo')) return false;
  for (const [typeId, sel] of Object.entries(filters.tags)) {
    if (!sel.includes(task.tags && task.tags[typeId])) return false;
  }
  return true;
}

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/**
 * Barre de filtres. onChange(nouveauxFiltres), onToggleOpen(ouvert).
 */
export function renderFilterBar({ settings, filters, open, onChange, onToggleOpen }) {
  const count = activeCount(filters);
  const chip = (label, pressed, onClick, tone) => h('button', {
    class: 'chip' + (tone ? ' tone-' + tone : ' tone-accent'), type: 'button',
    'aria-pressed': String(pressed), onclick: onClick,
  }, pressed && icon('check', 'chip-check'), h('span', null, label));

  const groups = [
    h('div', { class: 'filter-group' },
      h('span', { class: 'filter-label' }, 'Statut'),
      h('div', { class: 'chips' }, ['todo', 'done'].map((s) => chip(
        statusLabel(settings, s), filters.status.includes(s),
        () => onChange({ ...filters, status: toggle(filters.status, s) }),
      ))),
    ),
    settings.tagTypes.filter((t) => t.values.length).map((type) => {
      const sel = filters.tags[type.id] || [];
      return h('div', { class: 'filter-group' },
        h('span', { class: 'filter-label' }, type.name),
        h('div', { class: 'chips' }, type.values.map((v) => chip(
          v.label, sel.includes(v.id),
          () => onChange({ ...filters, tags: { ...filters.tags, [type.id]: toggle(sel, v.id) } }),
          type.tone,
        ))),
      );
    }),
  ];

  return h('section', { class: 'filters' + (open ? ' is-open' : ''), 'aria-label': 'Filtres' },
    h('div', { class: 'filters-head' },
      h('button', {
        class: 'filters-toggle', type: 'button', 'aria-expanded': String(open),
        onclick: () => onToggleOpen(!open),
      },
      icon('filter'), h('span', null, 'Filtres'),
      count > 0 && h('span', { class: 'filters-count' }, String(count)),
      icon('chevronDown', 'filters-chevron')),
      count > 0 && h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => onChange(emptyFilters()) }, icon('x'), 'Effacer'),
    ),
    open && h('div', { class: 'filters-body' }, groups),
  );
}
