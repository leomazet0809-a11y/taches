// « Mode démo » : mêmes fonctions que Firestore, mais les données restent
// dans ce navigateur (localStorage). Utilisé tant que Firebase n'est pas configuré.
import { clone, uid } from './dom.js';

const ACTIVE_KEY = 'taches.demo.active';
const DATA_KEY = 'taches.demo.data';

const DEMO_USER = { uid: 'demo', displayName: 'Mode démo', email: null, photoURL: null, demo: true };

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* navigation privée ou stockage plein */ }
}

export function createLocalBackend() {
  let authCb = () => {};
  return {
    kind: 'demo',
    onAuth(cb) {
      authCb = cb;
      queueMicrotask(() => cb(safeGet(ACTIVE_KEY) ? DEMO_USER : null));
    },
    async signIn() {
      safeSet(ACTIVE_KEY, '1');
      authCb(DEMO_USER);
    },
    async signOut() {
      safeSet(ACTIVE_KEY, null);
      authCb(null);
    },
    openUserStore() {
      return createLocalStore();
    },
    resetDemo() {
      safeSet(DATA_KEY, null);
    },
  };
}

function createLocalStore() {
  let data = load();
  const settingsListeners = new Set();
  const taskListeners = new Set();

  function load() {
    try {
      const d = JSON.parse(safeGet(DATA_KEY) || 'null');
      if (d && typeof d === 'object') return { settings: d.settings || null, tasks: d.tasks || {} };
    } catch { /* données illisibles : on repart de zéro */ }
    return { settings: null, tasks: {} };
  }
  function persist() {
    safeSet(DATA_KEY, JSON.stringify(data));
  }
  const taskList = () => Object.entries(data.tasks).map(([id, t]) => ({ ...clone(t), id }));
  function emitSettings() {
    const s = clone(data.settings);
    settingsListeners.forEach((cb) => cb(clone(s), { fromCache: false }));
  }
  function emitTasks() {
    const list = taskList();
    taskListeners.forEach((cb) => cb(clone(list), { fromCache: false }));
  }
  const later = (fn) => queueMicrotask(fn);

  // Synchronisation entre onglets du même navigateur.
  const onStorage = (e) => {
    if (e.key !== DATA_KEY) return;
    data = load();
    emitSettings();
    emitTasks();
  };
  window.addEventListener('storage', onStorage);

  return {
    subscribeSettings(cb) {
      settingsListeners.add(cb);
      later(() => cb(clone(data.settings), { fromCache: false }));
      return () => settingsListeners.delete(cb);
    },
    subscribeTasks(cb) {
      taskListeners.add(cb);
      later(() => cb(taskList(), { fromCache: false }));
      return () => taskListeners.delete(cb);
    },
    async saveSettings(settings) {
      data.settings = clone(settings);
      persist();
      later(emitSettings);
    },
    newTaskId() {
      return uid('t');
    },
    async createTask(id, task) {
      data.tasks[id] = clone(task);
      persist();
      later(emitTasks);
    },
    async updateTask(id, patch) {
      if (!data.tasks[id]) return;
      Object.assign(data.tasks[id], clone(patch));
      persist();
      later(emitTasks);
    },
    async deleteTask(id) {
      delete data.tasks[id];
      persist();
      later(emitTasks);
    },
    /** ops : [{ type: 'update', id, patch } | { type: 'delete', id }] */
    async batch(ops) {
      for (const op of ops) {
        if (op.type === 'delete') delete data.tasks[op.id];
        else if (data.tasks[op.id]) Object.assign(data.tasks[op.id], clone(op.patch));
      }
      persist();
      later(emitTasks);
    },
    close() {
      window.removeEventListener('storage', onStorage);
      settingsListeners.clear();
      taskListeners.clear();
    },
  };
}
