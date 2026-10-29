// Fenêtre des paramètres.
import { h, icon, replaceChildren } from './dom.js';
import { openModal, confirmDialog, segmented } from './ui.js';

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
    replaceChildren(panel, s.render(ctx, renderPanel, () => modal.close()));
  }

  renderNav();
  renderPanel();
  const modal = openModal({ title: 'Paramètres', className: 'modal-wide modal-settings', body: h('div', { class: 'settings' }, nav, panel) });
  return modal;
}
