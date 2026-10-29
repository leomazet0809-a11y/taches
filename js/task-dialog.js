// Fiche d'une tâche : consultation et modification (titre, statut, tags, description).
import { h, icon, formatDate } from './dom.js';
import { openModal, confirmDialog, segmented } from './ui.js';
import { statusLabel, cleanTags } from './defaults.js';
import { folderOf, folderSelect, INBOX } from './folders.js';

function field(label, control, forId) {
  return h('div', { class: 'field' },
    h('label', { class: 'field-label', for: forId || null }, label),
    control,
  );
}

function sameTags(a, b) {
  const ka = Object.keys(a).filter((k) => a[k]);
  const kb = Object.keys(b).filter((k) => b[k]);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight + 2, window.innerHeight * 0.6) + 'px';
}

/**
 * Ouvre la fiche. task = null pour une nouvelle tâche.
 */
export function openTaskDialog(ctx, task, prefill = {}) {
  const { state, actions } = ctx;
  const settings = state.settings;
  const isNew = !task;
  const initial = {
    title: isNew ? (prefill.title || '') : (task.title || ''),
    description: isNew ? '' : (task.description || ''),
    status: isNew ? 'todo' : (task.status || 'todo'),
    tags: cleanTags(settings, isNew ? prefill.tags : task.tags),
    folderId: isNew ? INBOX : folderOf(settings, task),
  };
  const draft = { ...initial, tags: { ...initial.tags } };

  const titleInput = h('input', {
    class: 'input input-lg', id: 'task-title', type: 'text', maxlength: 300, autocomplete: 'off',
    placeholder: 'Titre de la tâche', value: draft.title,
    oninput: (e) => { draft.title = e.target.value; titleInput.classList.remove('is-invalid'); },
  });

  const statusCtl = segmented({
    name: 'task-status', label: 'Statut', value: draft.status,
    options: [
      { value: 'todo', label: statusLabel(settings, 'todo'), icon: 'circle' },
      { value: 'done', label: statusLabel(settings, 'done'), icon: 'checkCircle' },
    ],
    onChange: (v) => { draft.status = v; },
  });

  // Une liste déroulante par type de tag (une seule valeur par type).
  const tagFields = settings.tagTypes.map((type) => {
    const id = 'task-tag-' + type.id;
    return h('div', { class: 'field' },
      h('label', { class: 'field-label', for: id }, h('span', { class: 'tone-dot tone-' + type.tone }), type.name),
      h('select', {
        class: 'input', id, value: draft.tags[type.id] || '',
        onchange: (e) => {
          if (e.target.value) draft.tags[type.id] = e.target.value;
          else delete draft.tags[type.id];
        },
      },
      h('option', { value: '' }, '— Non renseigné —'),
      type.values.map((v) => h('option', { value: v.id }, v.label))),
    );
  });

  const folderCtl = folderSelect(settings, {
    id: 'task-folder', value: draft.folderId,
    onChange: (v) => { draft.folderId = v; },
  });

  const desc = h('textarea', {
    class: 'input textarea', id: 'task-desc', rows: 6,
    placeholder: 'Description détaillée, notes, liens… (texte libre)',
    oninput: (e) => { draft.description = e.target.value; autoGrow(e.target); },
  });
  desc.value = draft.description;

  const form = h('form', {
    class: 'task-form', novalidate: true,
    onsubmit: (e) => { e.preventDefault(); save(); },
    onkeydown: (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    },
  },
  field('Titre', titleInput, 'task-title'),
  h('div', { class: 'form-row' },
    field('Statut', statusCtl),
    field('Dossier', folderCtl, 'task-folder'),
  ),
  tagFields.length > 0 && h('div', { class: 'tag-fields' }, tagFields),
  field('Description', desc, 'task-desc'),
  !isNew && h('p', { class: 'meta' },
    `Créée le ${formatDate(task.createdAt)}`,
    task.updatedAt && task.updatedAt !== task.createdAt ? ` · modifiée le ${formatDate(task.updatedAt)}` : ''),
  // Bouton invisible : permet de valider avec Entrée dans le titre.
  h('button', { type: 'submit', hidden: true, tabindex: '-1' }),
  );

  const differs = (k) => (k === 'tags' ? !sameTags(initial.tags, draft.tags) : initial[k] !== draft[k]);
  const dirty = () => Object.keys(initial).some(differs);

  function changes() {
    const patch = {};
    for (const k of Object.keys(initial)) if (differs(k)) patch[k] = draft[k];
    if (patch.title != null) patch.title = patch.title.trim();
    return patch;
  }

  function save() {
    if (!draft.title.trim()) {
      titleInput.classList.add('is-invalid');
      titleInput.focus();
      return;
    }
    if (isNew) actions.createTask({ ...draft, title: draft.title.trim() });
    else actions.saveTask(task, changes());
    modal.close();
  }

  async function remove() {
    const ok = await confirmDialog({
      title: 'Supprimer la tâche ?',
      message: `« ${task.title} » sera supprimée définitivement.`,
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    modal.close();
    actions.deleteTask(task);
  }

  const modal = openModal({
    title: isNew ? 'Nouvelle tâche' : 'Tâche',
    className: 'modal-task',
    body: form,
    footer: [
      !isNew && h('button', { class: 'btn btn-ghost btn-danger-text', type: 'button', onclick: remove }, icon('trash'), 'Supprimer'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', type: 'button', onclick: () => requestClose(modal.close) }, 'Annuler'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: save }, icon('check'), 'Enregistrer'),
    ],
    onRequestClose: (close) => requestClose(close),
  });

  async function requestClose(close) {
    if (!dirty()) { close(); return; }
    const ok = await confirmDialog({
      title: 'Modifications non enregistrées',
      message: 'Fermer la fiche sans enregistrer les modifications ?',
      confirmLabel: 'Fermer sans enregistrer', danger: true,
    });
    if (ok) close();
  }

  requestAnimationFrame(() => autoGrow(desc));
  if (isNew) titleInput.focus();
  return modal;
}
