// Fenêtre des paramètres.
import { h, icon, replaceChildren, uid } from './dom.js';
import { openModal, confirmDialog, segmented } from './ui.js';
import { TONES } from './defaults.js';
import { INBOX, folderOf } from './folders.js';

export const APP_VERSION = '1.0';

function section(title, intro, ...content) {
  return h('section', { class: 'settings-section' },
    h('h3', { class: 'settings-h' }, title),
    intro && h('p', { class: 'settings-intro' }, intro),
    content,
  );
}

function renderDisplay(ctx) {
  const prefs = ctx.state.settings.prefs;
  return [
    section('Thème', 'Le mode automatique suit le réglage clair/sombre de votre appareil.',
      segmented({
        name: 'pref-theme', label: 'Thème', value: prefs.theme,
        options: [
          { value: 'system', label: 'Automatique', icon: 'monitor' },
          { value: 'light', label: 'Clair', icon: 'sun' },
          { value: 'dark', label: 'Sombre', icon: 'moon' },
        ],
        onChange: (v) => ctx.updateSettings((s) => { s.prefs.theme = v; }),
      }),
    ),
    section('Taille du texte', "S'applique à toute l'application.",
      segmented({
        name: 'pref-font', label: 'Taille du texte', value: prefs.fontSize,
        options: [
          { value: 's', label: 'Petite' },
          { value: 'm', label: 'Normale' },
          { value: 'l', label: 'Grande' },
          { value: 'xl', label: 'Très grande' },
        ],
        onChange: (v) => ctx.updateSettings((s) => { s.prefs.fontSize = v; }),
      }),
      h('p', { class: 'font-preview' }, 'Aperçu : Préparer la réunion de lundi avec l’équipe projet.'),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Tags et statuts

/** Champ texte enregistré à la validation (Entrée ou sortie du champ). Vide = valeur précédente. */
function nameInput({ value, label, onSave, placeholder, className = '' }) {
  return h('input', {
    class: 'input ' + className, type: 'text', value, maxlength: 80, 'aria-label': label, placeholder,
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } },
    onchange: (e) => {
      const v = e.target.value.trim();
      if (!v) { e.target.value = value; return; }
      if (v !== value) { value = v; onSave(v); }
    },
  });
}

function moveItem(list, index, delta) {
  const j = index + delta;
  if (j < 0 || j >= list.length) return;
  [list[index], list[j]] = [list[j], list[index]];
}

function orderButtons(index, length, onMove, what) {
  return [
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Monter ${what}`, title: 'Monter', disabled: index === 0, onclick: () => onMove(-1) }, icon('arrowUp')),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Descendre ${what}`, title: 'Descendre', disabled: index === length - 1, onclick: () => onMove(1) }, icon('arrowDown')),
  ];
}

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

function renderTags(ctx, rerender, closeSettings, panel) {
  const { state, updateSettings, actions } = ctx;
  const settings = state.settings;

  const findType = (s, typeId) => s.tagTypes.find((t) => t.id === typeId);

  async function deleteValue(type, value) {
    const used = state.tasks.filter((t) => t.tags && t.tags[type.id] === value.id);
    if (used.length) {
      const ok = await confirmDialog({
        title: 'Supprimer cette valeur ?',
        message: `${plural(used.length, 'tâche utilise', 'tâches utilisent')} « ${value.label} ». Cette valeur leur sera retirée.`,
        confirmLabel: 'Supprimer', danger: true,
      });
      if (!ok) return;
    }
    updateSettings((s) => {
      const t = findType(s, type.id);
      t.values = t.values.filter((v) => v.id !== value.id);
    });
    actions.batchTasks(used.map((t) => {
      const tags = { ...t.tags };
      delete tags[type.id];
      return { type: 'update', id: t.id, patch: { tags } };
    }));
    rerender();
  }

  async function deleteType(type) {
    const used = state.tasks.filter((t) => t.tags && t.tags[type.id]);
    const ok = await confirmDialog({
      title: `Supprimer le type « ${type.name} » ?`,
      message: `Ses ${plural(type.values.length, 'valeur', 'valeurs')} seront supprimées`
        + (used.length ? ` et ${plural(used.length, 'tâche perdra', 'tâches perdront')} ce tag.` : '.'),
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    updateSettings((s) => { s.tagTypes = s.tagTypes.filter((t) => t.id !== type.id); });
    actions.batchTasks(used.map((t) => {
      const tags = { ...t.tags };
      delete tags[type.id];
      return { type: 'update', id: t.id, patch: { tags } };
    }));
    rerender();
  }

  function addValue(type, input) {
    const label = input.value.trim();
    if (!label) { input.focus(); return; }
    updateSettings((s) => { findType(s, type.id).values.push({ id: uid('v'), label }); });
    rerender();
    const again = panel.querySelector(`[data-add-value="${type.id}"]`);
    if (again) again.focus();
  }

  function typeCard(type, index) {
    const addInput = h('input', {
      class: 'input', type: 'text', maxlength: 80, placeholder: 'Nouvelle valeur…',
      'aria-label': `Nouvelle valeur pour ${type.name}`, dataset: { addValue: type.id },
    });
    return h('div', { class: 'edit-card' },
      h('div', { class: 'edit-card-head' },
        h('span', { class: 'tone-dot tone-' + type.tone }),
        nameInput({
          value: type.name, label: 'Nom du type de tag', className: 'input-strong',
          onSave: (v) => updateSettings((s) => { findType(s, type.id).name = v; }),
        }),
        h('div', { class: 'edit-actions' },
          orderButtons(index, settings.tagTypes.length, (d) => { updateSettings((s) => moveItem(s.tagTypes, index, d)); rerender(); }, `le type ${type.name}`),
          h('button', { class: 'icon-btn btn-danger-text', type: 'button', 'aria-label': `Supprimer le type ${type.name}`, title: 'Supprimer ce type', onclick: () => deleteType(type) }, icon('trash')),
        ),
      ),
      h('div', { class: 'tone-picker', role: 'radiogroup', 'aria-label': `Couleur de ${type.name}` },
        TONES.map((tone) => h('label', { class: 'tone-opt', title: tone.label },
          h('input', {
            type: 'radio', name: 'tone-' + type.id, value: tone.id, checked: type.tone === tone.id, 'aria-label': tone.label,
            onchange: () => { updateSettings((s) => { findType(s, type.id).tone = tone.id; }); rerender(); },
          }),
          h('span', { class: 'tone-swatch tone-' + tone.id }),
        )),
      ),
      h('ul', { class: 'value-list' },
        type.values.map((v, i) => h('li', { class: 'value-row' },
          h('span', { class: 'badge tone-' + type.tone, 'aria-hidden': 'true' }, String(i + 1)),
          nameInput({
            value: v.label, label: `Valeur ${i + 1} de ${type.name}`,
            onSave: (label) => updateSettings((s) => { findType(s, type.id).values.find((x) => x.id === v.id).label = label; }),
          }),
          h('div', { class: 'edit-actions' },
            orderButtons(i, type.values.length, (d) => { updateSettings((s) => moveItem(findType(s, type.id).values, i, d)); rerender(); }, v.label),
            h('button', { class: 'icon-btn btn-danger-text', type: 'button', 'aria-label': `Supprimer ${v.label}`, title: 'Supprimer cette valeur', onclick: () => deleteValue(type, v) }, icon('trash')),
          ),
        )),
      ),
      h('form', { class: 'add-row', onsubmit: (e) => { e.preventDefault(); addValue(type, addInput); } },
        addInput,
        h('button', { class: 'btn', type: 'submit' }, icon('plus'), 'Ajouter'),
      ),
    );
  }

  return [
    section('Statuts', "Renommez les deux statuts possibles d'une tâche.",
      h('div', { class: 'status-edit' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Statut en cours'),
          nameInput({ value: settings.statuses.todo, label: 'Nom du statut en cours', onSave: (v) => updateSettings((s) => { s.statuses.todo = v; }) })),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Statut terminé'),
          nameInput({ value: settings.statuses.done, label: 'Nom du statut terminé', onSave: (v) => updateSettings((s) => { s.statuses.done = v; }) })),
      ),
    ),
    section('Tags', 'Chaque type de tag est une liste déroulante dans la fiche des tâches. Une tâche reçoit au plus une valeur par type. Les noms sont enregistrés dès que vous validez (Entrée) ou quittez le champ.',
      settings.tagTypes.map(typeCard),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          const used = new Set(settings.tagTypes.map((t) => t.tone));
          const tone = (TONES.find((t) => !used.has(t.id)) || TONES[TONES.length - 1]).id;
          const id = uid('tag');
          updateSettings((s) => { s.tagTypes.push({ id, name: 'Nouveau tag', tone, values: [] }); });
          rerender();
          const input = panel.querySelector(`[data-add-value="${id}"]`);
          if (input) input.closest('.edit-card').querySelector('.input-strong').select();
        },
      }, icon('plus'), 'Ajouter un type de tag'),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Dossiers et groupes

/** Déplace un dossier d'un cran parmi les dossiers du même groupe. */
function moveFolder(folders, folderId, delta) {
  const i = folders.findIndex((f) => f.id === folderId);
  const groupId = folders[i].groupId || null;
  let j = i + delta;
  while (j >= 0 && j < folders.length && (folders[j].groupId || null) !== groupId) j += delta;
  if (j < 0 || j >= folders.length) return;
  [folders[i], folders[j]] = [folders[j], folders[i]];
}

function renderFoldersSettings(ctx, rerender, closeSettings, panel) {
  const { state, updateSettings, actions } = ctx;
  const settings = state.settings;
  const groupOptions = (value) => [
    h('option', { value: '' }, 'Sans groupe'),
    settings.groups.map((g) => h('option', { value: g.id, selected: g.id === value }, g.name)),
  ];

  async function deleteFolder(folder) {
    const used = state.tasks.filter((t) => folderOf(settings, t) === folder.id);
    const inboxName = settings.folders.find((f) => f.id === INBOX).name;
    const ok = await confirmDialog({
      title: `Supprimer le dossier « ${folder.name} » ?`,
      message: used.length ? `${plural(used.length, 'tâche sera déplacée', 'tâches seront déplacées')} dans « ${inboxName} ».` : 'Le dossier est vide.',
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    updateSettings((s) => { s.folders = s.folders.filter((f) => f.id !== folder.id); });
    actions.batchTasks(used.map((t) => ({ type: 'update', id: t.id, patch: { folderId: INBOX } })));
    rerender();
  }

  async function deleteGroup(group) {
    const count = settings.folders.filter((f) => f.groupId === group.id).length;
    const ok = await confirmDialog({
      title: `Supprimer le groupe « ${group.name} » ?`,
      message: count ? `Ses ${plural(count, 'dossier est conservé', 'dossiers sont conservés')} (sans groupe), ainsi que leurs tâches.` : 'Le groupe est vide.',
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    updateSettings((s) => {
      s.groups = s.groups.filter((g) => g.id !== group.id);
      s.folders.forEach((f) => { if (f.groupId === group.id) f.groupId = null; });
    });
    rerender();
  }

  const folderRow = (f) => {
    const same = settings.folders.filter((x) => (x.groupId || null) === (f.groupId || null));
    const pos = same.indexOf(f);
    return h('li', { class: 'value-row folder-row' },
      icon(f.id === INBOX ? 'inbox' : 'folder', 'row-icon'),
      nameInput({
        value: f.name, label: `Nom du dossier ${f.name}`,
        onSave: (v) => updateSettings((s) => { s.folders.find((x) => x.id === f.id).name = v; }),
      }),
      h('select', {
        class: 'input folder-group-select', 'aria-label': `Groupe du dossier ${f.name}`,
        onchange: (e) => { updateSettings((s) => { s.folders.find((x) => x.id === f.id).groupId = e.target.value || null; }); rerender(); },
      }, groupOptions(f.groupId)),
      h('div', { class: 'edit-actions' },
        orderButtons(pos, same.length, (d) => { updateSettings((s) => moveFolder(s.folders, f.id, d)); rerender(); }, f.name),
        f.id === INBOX
          ? h('span', { class: 'icon-btn', title: 'Dossier par défaut des nouvelles tâches : il ne peut pas être supprimé' }, icon('lock'))
          : h('button', { class: 'icon-btn btn-danger-text', type: 'button', 'aria-label': `Supprimer le dossier ${f.name}`, title: 'Supprimer ce dossier', onclick: () => deleteFolder(f) }, icon('trash')),
      ),
    );
  };

  const sectionsList = [{ group: null }, ...settings.groups.map((g) => ({ group: g }))];

  const newFolderName = h('input', { class: 'input', type: 'text', maxlength: 80, placeholder: 'Nom du nouveau dossier…', 'aria-label': 'Nom du nouveau dossier', dataset: { addFolder: '1' } });
  const newFolderGroup = h('select', { class: 'input folder-group-select', 'aria-label': 'Groupe du nouveau dossier' }, groupOptions(null));
  const newGroupName = h('input', { class: 'input', type: 'text', maxlength: 80, placeholder: 'Nom du nouveau groupe…', 'aria-label': 'Nom du nouveau groupe', dataset: { addGroup: '1' } });

  return [
    section('Dossiers', `Les dossiers apparaissent sous forme de tuiles. « ${settings.folders.find((f) => f.id === INBOX).name} » reçoit les nouvelles tâches : il peut être renommé mais pas supprimé.`,
      sectionsList.map(({ group }) => {
        const list = settings.folders.filter((f) => (f.groupId || null) === (group ? group.id : null));
        return h('div', { class: 'edit-card' },
          h('div', { class: 'edit-card-title' }, group ? group.name : 'Sans groupe'),
          list.length
            ? h('ul', { class: 'value-list' }, list.map(folderRow))
            : h('p', { class: 'settings-intro' }, 'Aucun dossier.'),
        );
      }),
      h('form', {
        class: 'add-row add-folder',
        onsubmit: (e) => {
          e.preventDefault();
          const name = newFolderName.value.trim();
          if (!name) { newFolderName.focus(); return; }
          updateSettings((s) => { s.folders.push({ id: uid('f'), name, groupId: newFolderGroup.value || null }); });
          rerender();
          const again = panel.querySelector('[data-add-folder]');
          if (again) again.focus();
        },
      }, newFolderName, newFolderGroup, h('button', { class: 'btn', type: 'submit' }, icon('plus'), 'Ajouter le dossier')),
    ),
    section('Groupes de dossiers', 'Un groupe rassemble plusieurs tuiles sous un même titre.',
      h('div', { class: 'edit-card' },
        settings.groups.length
          ? h('ul', { class: 'value-list' }, settings.groups.map((g, i) => h('li', { class: 'value-row' },
            nameInput({
              value: g.name, label: `Nom du groupe ${g.name}`,
              onSave: (v) => { updateSettings((s) => { s.groups.find((x) => x.id === g.id).name = v; }); rerender(); },
            }),
            h('div', { class: 'edit-actions' },
              orderButtons(i, settings.groups.length, (d) => { updateSettings((s) => moveItem(s.groups, i, d)); rerender(); }, `le groupe ${g.name}`),
              h('button', { class: 'icon-btn btn-danger-text', type: 'button', 'aria-label': `Supprimer le groupe ${g.name}`, title: 'Supprimer ce groupe', onclick: () => deleteGroup(g) }, icon('trash')),
            ),
          )))
          : h('p', { class: 'settings-intro' }, 'Aucun groupe.'),
        h('form', {
          class: 'add-row',
          onsubmit: (e) => {
            e.preventDefault();
            const name = newGroupName.value.trim();
            if (!name) { newGroupName.focus(); return; }
            updateSettings((s) => { s.groups.push({ id: uid('g'), name }); });
            rerender();
            const again = panel.querySelector('[data-add-group]');
            if (again) again.focus();
          },
        }, newGroupName, h('button', { class: 'btn', type: 'submit' }, icon('plus'), 'Ajouter le groupe')),
      ),
    ),
  ];
}

function renderAccount(ctx, rerender, closeSettings) {
  const { user, backend } = ctx.state;
  if (user.demo) {
    return [
      section('Mode démo', "L'application n'est pas encore reliée à Firebase : vos données sont enregistrées uniquement dans ce navigateur, sur cet appareil.",
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn', type: 'button', onclick: () => { closeSettings(); ctx.signOut(); } }, icon('logOut'), 'Quitter le mode démo'),
          h('button', {
            class: 'btn btn-danger-text', type: 'button',
            onclick: async () => {
              const ok = await confirmDialog({
                title: 'Effacer les données de démo ?',
                message: 'Toutes les tâches et tous les paramètres du mode démo seront supprimés de ce navigateur.',
                confirmLabel: 'Tout effacer', danger: true,
              });
              if (!ok) return;
              closeSettings();
              await ctx.signOut();
              backend.resetDemo();
            },
          }, icon('trash'), 'Effacer les données de démo'),
        ),
      ),
      about(),
    ];
  }
  return [
    section('Compte Google', null,
      h('div', { class: 'account-card' },
        user.photoURL
          ? h('img', { class: 'avatar avatar-lg', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
          : h('span', { class: 'avatar avatar-lg avatar-initial' }, (user.displayName || user.email || '?').charAt(0).toUpperCase()),
        h('div', null,
          h('div', { class: 'account-name' }, user.displayName || 'Utilisateur'),
          h('div', { class: 'account-mail' }, user.email || ''),
        ),
      ),
      h('p', { class: 'settings-intro' }, 'Vos tâches et vos paramètres sont enregistrés dans votre espace personnel : personne d’autre ne peut les voir.'),
      h('button', { class: 'btn', type: 'button', onclick: () => { closeSettings(); ctx.signOut(); } }, icon('logOut'), 'Se déconnecter'),
    ),
    about(),
  ];
}

function about() {
  return section('À propos', null, h('p', { class: 'settings-intro' }, `Tâches — version ${APP_VERSION}`));
}

const SECTIONS = [
  { id: 'affichage', label: 'Affichage', icon: 'sun', render: renderDisplay },
  { id: 'tags', label: 'Tags et statuts', icon: 'tag', render: renderTags },
  { id: 'dossiers', label: 'Dossiers', icon: 'folder', render: renderFoldersSettings },
  { id: 'compte', label: 'Compte', icon: 'user', render: renderAccount },
];

export function openSettings(ctx, sectionId = SECTIONS[0].id) {
  let current = SECTIONS.some((s) => s.id === sectionId) ? sectionId : SECTIONS[0].id;
  const nav = h('nav', { class: 'settings-nav', 'aria-label': 'Sections des paramètres' });
  const panel = h('div', { class: 'settings-panel' });

  function show(id) {
    current = id;
    renderNav();
    renderPanel();
    panel.scrollTop = 0;
  }
  function renderNav() {
    replaceChildren(nav, SECTIONS.map((s) => h('button', {
      class: 'settings-tab' + (s.id === current ? ' is-active' : ''), type: 'button',
      'aria-current': s.id === current ? 'page' : null,
      onclick: () => show(s.id),
    }, icon(s.icon), h('span', null, s.label))));
  }
  function renderPanel() {
    const s = SECTIONS.find((x) => x.id === current);
    const scroll = panel.scrollTop;
    replaceChildren(panel, s.render(ctx, renderPanel, () => modal.close(), panel));
    panel.scrollTop = scroll;
  }

  renderNav();
  renderPanel();
  const modal = openModal({ title: 'Paramètres', className: 'modal-wide modal-settings', body: h('div', { class: 'settings' }, nav, panel) });
  return modal;
}
