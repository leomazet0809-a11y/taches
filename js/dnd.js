// Glisser-déposer des tâches vers les tuiles de dossiers.
// - Souris : maintenir le clic sur une tâche puis déplacer (ou rester appuyé un instant).
// - Tactile : appui long (~0,4 s) sur une tâche, puis glisser sans lever le doigt.
// Les zones de dépôt portent l'attribut data-drop-folder.

const LONG_PRESS_MS = 400;
const TOLERANCE = 8;

export function enableTaskDrag(container, { onDrop, onStart, onEnd }) {
  let pending = null; // appui en cours, glisser pas encore commencé
  let drag = null; // glisser en cours

  const dist = (x, y) => Math.hypot(x - pending.x, y - pending.y);

  function rowFrom(target) {
    const handle = target.closest('.task-open');
    const row = handle && handle.closest('.task');
    return row && container.contains(row) ? row : null;
  }

  function cancelPending() {
    if (pending) clearTimeout(pending.timer);
    pending = null;
  }

  function start(x, y) {
    const { row } = pending;
    const id = row.dataset.id;
    cancelPending();
    const rect = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.removeAttribute('data-id');
    // Vignette compacte, accrochée près du pointeur pour bien voir la tuile visée.
    const width = Math.min(rect.width, 288, window.innerWidth * 0.75);
    ghost.style.width = width + 'px';
    document.body.append(ghost);
    const dx = Math.min(x - rect.left, 32);
    drag = { id, row, ghost, over: null, dx, dy: Math.min(y - rect.top, ghost.offsetHeight / 2) };
    row.classList.add('is-drag-source');
    document.body.classList.add('is-dragging');
    if (navigator.vibrate) navigator.vibrate(12);
    if (onStart) onStart(id);
    move(x, y);
  }

  function move(x, y) {
    drag.ghost.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px) rotate(-1.2deg)`;
    const el = document.elementFromPoint(x, y);
    const over = el && el.closest('[data-drop-folder]');
    if (over !== drag.over) {
      if (drag.over) drag.over.classList.remove('is-drop-target');
      if (over) over.classList.add('is-drop-target');
      drag.over = over;
    }
  }

  function finish(cancelled) {
    const d = drag;
    drag = null;
    d.ghost.remove();
    d.row.classList.remove('is-drag-source');
    document.body.classList.remove('is-dragging');
    if (d.over) d.over.classList.remove('is-drop-target');
    const folderId = !cancelled && d.over ? d.over.dataset.dropFolder : null;
    // Empêche le « clic » qui suit le relâchement d'ouvrir la fiche.
    const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 80);
    if (onEnd) onEnd();
    if (folderId) onDrop(d.id, folderId);
  }

  // ---- Souris (et stylet)
  container.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0 || drag) return;
    const row = rowFrom(e.target);
    if (!row) return;
    pending = { row, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY };
    pending.timer = setTimeout(() => pending && start(pending.lx, pending.ly), LONG_PRESS_MS);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });

  function onPointerMove(e) {
    if (drag) { move(e.clientX, e.clientY); return; }
    if (!pending) return;
    pending.lx = e.clientX;
    pending.ly = e.clientY;
    if (dist(e.clientX, e.clientY) > TOLERANCE) start(e.clientX, e.clientY);
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (drag) finish(false);
    else cancelPending();
  }

  // ---- Tactile
  container.addEventListener('touchstart', (e) => {
    if (drag) return;
    if (e.touches.length !== 1) { cancelPending(); return; }
    const row = rowFrom(e.target);
    if (!row) return;
    const t = e.touches[0];
    pending = { row, x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, touch: true };
    pending.timer = setTimeout(() => pending && start(pending.lx, pending.ly), LONG_PRESS_MS);
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (drag) {
      e.preventDefault(); // pas de défilement pendant le glisser
      move(t.clientX, t.clientY);
      return;
    }
    if (pending) {
      pending.lx = t.clientX;
      pending.ly = t.clientY;
      if (dist(t.clientX, t.clientY) > TOLERANCE) cancelPending(); // c'est un défilement
    }
  }, { passive: false });

  container.addEventListener('touchend', (e) => {
    if (drag) {
      e.preventDefault();
      finish(false);
    } else {
      cancelPending();
    }
  });

  container.addEventListener('touchcancel', () => {
    if (drag) finish(true);
    cancelPending();
  });

  // Pas de menu contextuel sur appui long.
  container.addEventListener('contextmenu', (e) => {
    if (rowFrom(e.target)) e.preventDefault();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag) finish(true);
  });

  window.addEventListener('blur', () => {
    if (drag) finish(true);
    cancelPending();
  });
}
