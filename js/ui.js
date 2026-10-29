// Composants d'interface partagés : notifications, confirmations, fenêtres.
import { h, icon } from './dom.js';

/** Affiche un message temporaire en bas de l'écran, avec une action optionnelle (ex. « Annuler »). */
export function toast(message, { action, timeout = 4500, error = false } = {}) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = h('div', { class: 'toast' + (error ? ' toast-error' : ''), role: error ? 'alert' : 'status' },
    h('span', { class: 'toast-msg' }, message),
    action && h('button', {
      class: 'toast-action', type: 'button',
      onclick: () => { close(); action.onClick(); },
    }, action.label),
  );
  let timer;
  function close() {
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }
  box.append(el);
  // Pas plus de 3 messages empilés.
  while (box.children.length > 3) box.firstChild.remove();
  timer = setTimeout(close, error ? Math.max(timeout, 7000) : timeout);
}

/**
 * Crée une fenêtre modale (<dialog>) : plein écran sur téléphone, centrée sur ordinateur.
 * onRequestClose est appelé sur Échap, clic sur le fond ou bouton fermer ; il doit
 * appeler close() s'il accepte la fermeture.
 */
export function openModal({ title, body, footer, className = '', onRequestClose, labelledBy }) {
  const titleId = labelledBy || 'modal-title-' + Math.random().toString(36).slice(2, 8);
  const dialog = h('dialog', { class: 'modal ' + className, 'aria-labelledby': titleId });
  const close = () => {
    if (!dialog.open) return;
    dialog.close();
    dialog.remove();
  };
  const requestClose = () => (onRequestClose ? onRequestClose(close) : close());

  const head = h('header', { class: 'modal-head' },
    h('h2', { id: titleId, class: 'modal-title' }, title),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer', onclick: requestClose }, icon('x')),
  );
  const inner = h('div', { class: 'modal-inner' }, head, h('div', { class: 'modal-body' }, body), footer && h('footer', { class: 'modal-foot' }, footer));
  dialog.append(inner);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
  dialog.addEventListener('close', () => dialog.remove());
  // Clic sur le fond (hors du contenu) : la cible est le <dialog> lui-même.
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dialog; });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && downOnBackdrop) requestClose();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close, setTitle: (t) => { head.querySelector('.modal-title').textContent = t; } };
}

/** Demande une confirmation. Renvoie une promesse résolue à true/false. */
export function confirmDialog({ title = 'Confirmer', message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    let modal;
    const done = (v) => { modal.close(); resolve(v); };
    const ok = h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), type: 'button', onclick: () => done(true) }, confirmLabel);
    modal = openModal({
      title,
      className: 'modal-small',
      body: h('p', { class: 'confirm-msg' }, message),
      footer: [
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn', type: 'button', onclick: () => done(false) }, cancelLabel),
        ok,
      ],
      onRequestClose: () => done(false),
    });
    ok.focus();
  });
}

/** Contrôle segmenté (boutons radio stylés). */
export function segmented({ name, options, value, onChange, label }) {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    options.map((o) => h('label', { class: 'segmented-opt' },
      h('input', {
        type: 'radio', name, value: o.value, checked: o.value === value,
        onchange: (e) => e.target.checked && onChange(o.value),
      }),
      h('span', null, o.icon ? icon(o.icon) : null, o.label),
    )),
  );
}
