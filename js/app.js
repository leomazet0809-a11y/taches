// Point d'entrée de l'application « Tâches ».
import { firebaseConfig } from './config.js';
import { h, icon, googleLogo, replaceChildren, clone } from './dom.js';
import { applyPrefs } from './prefs.js';
import { createLocalBackend } from './local-store.js';
import { defaultSettings, normalizeSettings, statusLabel, taskTagValue, cleanTags } from './defaults.js';
import { emptyFilters, cleanFilters, matchesFilters, renderFilterBar } from './filters.js';
import { describeError } from './errors.js';
import { toast } from './ui.js';
import { openTaskDialog } from './task-dialog.js';
import { openSettings } from './settings.js';

const root = document.getElementById('app');

const state = {
  backend: null,
  user: null,
  store: null,
  settings: defaultSettings(),
  settingsReady: false,
  tasks: [],
  tasksReady: false,
  unsubs: [],
};

const regions = {};

// Préférences d'affichage propres à cet appareil (filtres, panneau ouvert…).
const UI_KEY = 'taches.ui';
const ui = loadUi();

function loadUi() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch { /* ignoré */ }
  return {
    filters: { ...emptyFilters(), ...(saved.filters || {}) },
    filtersOpen: typeof saved.filtersOpen === 'boolean' ? saved.filtersOpen : window.innerWidth >= 720,
  };
}
function saveUi() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* navigation privée */ }
}

function onWriteError(e) {
  console.error(e);
  toast(describeError(e), { error: true });
}

// ---------------------------------------------------------------------------
// Actions sur les données (chaque modification est enregistrée immédiatement)

const actions = {
  createTask(data) {
    const now = Date.now();
    const task = {
      title: (data.title || '').trim(),
      description: data.description || '',
      status: data.status === 'done' ? 'done' : 'todo',
      tags: cleanTags(state.settings, data.tags),
      createdAt: now,
      updatedAt: now,
    };
    const id = state.store.newTaskId();
    state.store.createTask(id, task).catch(onWriteError);
    toast('Tâche ajoutée');
    return id;
  },

  saveTask(task, patch) {
    if (!Object.keys(patch).length) return;
    state.store.updateTask(task.id, { ...patch, updatedAt: Date.now() }).catch(onWriteError);
    toast('Tâche enregistrée');
  },

  toggleStatus(task) {
    const next = task.status === 'done' ? 'todo' : 'done';
    state.store.updateTask(task.id, { status: next, updatedAt: Date.now() }).catch(onWriteError);
    toast(`« ${task.title} » : ${statusLabel(state.settings, next)}`, {
      action: { label: 'Annuler', onClick: () => state.store.updateTask(task.id, { status: task.status, updatedAt: task.updatedAt || Date.now() }).catch(onWriteError) },
    });
  },

  /** Modifications groupées : [{ type: 'update', id, patch } | { type: 'delete', id }] */
  batchTasks(ops) {
    if (!ops.length) return Promise.resolve();
    return state.store.batch(ops).catch(onWriteError);
  },

  deleteTask(task) {
    const { id, ...data } = task;
    state.store.deleteTask(id).catch(onWriteError);
    toast('Tâche supprimée', {
      action: { label: 'Annuler', onClick: () => state.store.createTask(id, data).catch(onWriteError) },
    });
  },
};

/** Modifie les paramètres puis les enregistre. */
function updateSettings(mutator) {
  const next = clone(state.settings);
  mutator(next);
  state.settings = next;
  applyPrefs(next.prefs);
  state.store.saveSettings(next).catch(onWriteError);
  renderMain();
}

const ctx = {
  state,
  actions,
  updateSettings,
  signOut: () => state.backend.signOut(),
};

// ---------------------------------------------------------------------------
// Démarrage et session

async function boot() {
  let backend;
  if (firebaseConfig) {
    try {
      const { createFirebaseBackend } = await import('./firebase.js');
      backend = await createFirebaseBackend(firebaseConfig);
    } catch (e) {
      console.error(e);
      renderFatal('Impossible de charger Firebase. Vérifiez votre connexion internet puis rechargez la page.');
      return;
    }
  } else {
    backend = createLocalBackend();
  }
  state.backend = backend;
  ctx.backend = backend;
  if (backend.redirectError) backend.redirectError.then((e) => e && toast(describeError(e), { error: true }));
  backend.onAuth((user) => {
    if (user) {
      if (!state.user || state.user.uid !== user.uid) startSession(user);
    } else {
      stopSession();
      renderLogin();
    }
  });
}

function startSession(user) {
  stopSession();
  state.user = user;
  state.store = state.backend.openUserStore(user.uid);
  state.settings = defaultSettings();
  state.settingsReady = false;
  state.tasks = [];
  state.tasksReady = false;
  renderShell();

  state.unsubs.push(state.store.subscribeSettings((data, meta) => {
    if (data) {
      state.settings = normalizeSettings(data);
    } else {
      // Première connexion : on enregistre les paramètres initiaux.
      // (Pas depuis le cache local : les données du serveur peuvent exister.)
      state.settings = defaultSettings();
      if (!meta.fromCache) state.store.saveSettings(state.settings).catch(onWriteError);
    }
    state.settingsReady = true;
    applyPrefs(state.settings.prefs);
    renderMain();
  }, onWriteError));

  state.unsubs.push(state.store.subscribeTasks((tasks) => {
    state.tasks = tasks;
    state.tasksReady = true;
    renderMain();
  }, onWriteError));
}

function stopSession() {
  state.unsubs.forEach((u) => u());
  state.unsubs = [];
  if (state.store) state.store.close();
  state.store = null;
  state.user = null;
  document.querySelectorAll('dialog.modal').forEach((d) => d.remove());
}

// ---------------------------------------------------------------------------
// Écrans

function renderFatal(message) {
  replaceChildren(root, h('div', { class: 'login' },
    h('div', { class: 'login-card' },
      h('div', { class: 'login-logo' }, icon('logo')),
      h('h1', null, 'Tâches'),
      h('p', { class: 'login-error', role: 'alert' }, message),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Recharger'),
    )));
}

function renderLogin() {
  const demo = state.backend.kind === 'demo';
  const err = h('p', { class: 'login-error', role: 'alert', hidden: true });
  const btn = h('button', {
    class: 'btn btn-google btn-lg', type: 'button',
    onclick: async () => {
      btn.disabled = true;
      err.hidden = true;
      try {
        await state.backend.signIn();
      } catch (e) {
        if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e && e.code)) {
          err.textContent = describeError(e);
          err.hidden = false;
        }
      } finally {
        btn.disabled = false;
      }
    },
  }, googleLogo(), 'Se connecter avec Google');

  replaceChildren(root, h('div', { class: 'login' },
    h('div', { class: 'login-card' },
      h('div', { class: 'login-logo' }, icon('logo')),
      h('h1', null, 'Tâches'),
      h('p', { class: 'login-sub' }, 'Vos tâches classées et à portée de main, sur ordinateur comme sur téléphone.'),
      demo
        ? [
          h('div', { class: 'notice' },
            h('strong', null, 'Connexion Google pas encore activée. '),
            "L'application n'est pas encore reliée à Firebase. Vous pouvez l'essayer en mode démo : les données restent dans ce navigateur."),
          h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => state.backend.signIn() }, 'Essayer en mode démo'),
        ]
        : [btn, h('p', { class: 'login-note' }, 'Vos tâches sont privées : chaque utilisateur ne voit que les siennes.')],
      err,
    )));
}

function accountButton(user) {
  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
  const avatar = user.photoURL
    ? h('img', { class: 'avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
    : h('span', { class: 'avatar avatar-initial' }, user.demo ? icon('user') : initial);
  return h('button', {
    class: 'icon-btn account-btn', type: 'button',
    'aria-label': 'Compte', title: user.email || user.displayName || 'Compte',
    onclick: () => openSettings(ctx, 'compte'),
  }, avatar);
}

function renderShell() {
  const user = state.user;
  regions.filters = h('div', { class: 'filters-wrap' });
  regions.listHeader = h('div', { class: 'list-header' });
  regions.list = h('div', { class: 'task-list-wrap' });

  const header = h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, icon('logo', 'brand-icon'), h('span', null, 'Tâches')),
    h('div', { class: 'topbar-actions' },
      user.demo && h('span', { class: 'demo-badge', title: 'Données enregistrées dans ce navigateur uniquement' }, 'Mode démo'),
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': 'Paramètres', title: 'Paramètres',
        onclick: () => openSettings(ctx),
      }, icon('settings')),
      accountButton(user),
    ),
  );

  const content = h('main', { class: 'content', id: 'contenu' },
    quickAddForm(),
    regions.filters,
    regions.listHeader,
    regions.list,
  );

  replaceChildren(root, h('div', { class: 'app-shell' }, header, h('div', { class: 'layout' }, content)));
  renderMain();
}

function quickAddForm() {
  const input = h('input', {
    class: 'input quick-input', type: 'text', maxlength: 300, autocomplete: 'off',
    placeholder: 'Ajouter une tâche…', 'aria-label': 'Titre de la nouvelle tâche', enterkeyhint: 'done',
  });
  return h('form', {
    class: 'quick-add',
    onsubmit: (e) => {
      e.preventDefault();
      const title = input.value.trim();
      if (!title) { input.focus(); return; }
      actions.createTask({ title });
      input.value = '';
    },
  },
  input,
  h('button', { class: 'btn btn-primary', type: 'submit', title: 'Ajouter la tâche' }, icon('plus'), h('span', { class: 'hide-sm' }, 'Ajouter')),
  h('button', {
    class: 'btn', type: 'button', title: 'Nouvelle tâche avec tous les détails',
    onclick: () => {
      openTaskDialog(ctx, null, { title: input.value.trim() });
      input.value = '';
    },
  }, icon('edit'), h('span', { class: 'hide-sm' }, 'Détails')),
  );
}

// ---------------------------------------------------------------------------
// Liste des tâches

function sortTasks(list) {
  return list.slice().sort((a, b) => {
    const da = a.status === 'done';
    const db = b.status === 'done';
    if (da !== db) return da ? 1 : -1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function renderMain() {
  if (!state.user || !regions.list) return;
  renderFilters();
  renderList();
}

function currentFilters() {
  return cleanFilters(state.settings, ui.filters);
}

function renderFilters() {
  replaceChildren(regions.filters, renderFilterBar({
    settings: state.settings,
    filters: currentFilters(),
    open: ui.filtersOpen,
    onChange: (f) => { ui.filters = f; saveUi(); renderMain(); },
    onToggleOpen: (open) => { ui.filtersOpen = open; saveUi(); renderFilters(); },
  }));
}

function renderList() {
  const filters = currentFilters();
  const all = state.tasks;
  const tasks = sortTasks(all.filter((t) => matchesFilters(t, filters)));
  const filtered = tasks.length !== all.length;
  replaceChildren(regions.listHeader,
    h('h1', { class: 'list-title' }, 'Toutes les tâches'),
    state.tasksReady && h('span', { class: 'count-pill', title: filtered ? `${tasks.length} sur ${all.length}` : null },
      filtered ? `${tasks.length} / ${all.length}` : String(tasks.length)),
  );
  if (!state.tasksReady) {
    replaceChildren(regions.list, h('div', { class: 'list-loading' }, h('div', { class: 'spinner' })));
    return;
  }
  if (!tasks.length && filtered) {
    replaceChildren(regions.list, h('div', { class: 'empty' },
      h('p', { class: 'empty-title' }, 'Aucune tâche ne correspond aux filtres'),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { ui.filters = emptyFilters(); saveUi(); renderMain(); } }, 'Effacer les filtres'),
    ));
    return;
  }
  if (!tasks.length) {
    replaceChildren(regions.list, h('div', { class: 'empty' },
      h('p', { class: 'empty-title' }, 'Aucune tâche pour le moment'),
      h('p', null, 'Saisissez un titre ci-dessus puis appuyez sur Entrée.'),
    ));
    return;
  }
  replaceChildren(regions.list, h('ul', { class: 'task-list' }, tasks.map(taskRow)));
}

function taskRow(t) {
  const done = t.status === 'done';
  const desc = (t.description || '').trim().split('\n')[0];
  const title = t.title || 'Sans titre';
  const badges = state.settings.tagTypes
    .map((type) => [type, taskTagValue(t, type)])
    .filter(([, v]) => v)
    .map(([type, v]) => h('span', { class: 'badge tone-' + type.tone, title: type.name }, v.label));
  return h('li', { class: 'task' + (done ? ' is-done' : ''), dataset: { id: t.id } },
    h('button', {
      class: 'task-check', type: 'button', 'aria-pressed': String(done),
      'aria-label': done ? `Remettre « ${title} » à l'état ${statusLabel(state.settings, 'todo')}` : `Marquer « ${title} » comme ${statusLabel(state.settings, 'done')}`,
      title: done ? statusLabel(state.settings, 'done') : statusLabel(state.settings, 'todo'),
      onclick: () => actions.toggleStatus(t),
    }, icon(done ? 'checkCircle' : 'circle')),
    h('button', { class: 'task-open', type: 'button', onclick: () => openTaskDialog(ctx, t) },
      h('span', { class: 'task-title' }, title),
      desc && h('span', { class: 'task-desc' }, desc),
      badges.length > 0 && h('span', { class: 'badges' }, badges),
    ),
  );
}

boot();
