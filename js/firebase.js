// Connexion Google (Firebase Authentication) et stockage Firestore.
// Les données de chaque utilisateur sont rangées sous users/{son identifiant}/ :
//   users/{uid}/config/settings  → paramètres (tags, dossiers, règles, affichage)
//   users/{uid}/tasks/{id}       → une tâche par document
// Les règles de sécurité (firestore.rules) n'autorisent l'accès qu'à son propriétaire.

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';

export async function createFirebaseBackend(config) {
  const [appMod, authMod, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const { emulator, ...appConfig } = config;
  const app = appMod.initializeApp(appConfig);
  const auth = authMod.getAuth(app);
  auth.languageCode = 'fr';
  const db = fs.getFirestore(app);
  if (emulator) {
    // Uniquement pour les tests locaux (émulateurs Firebase).
    authMod.connectAuthEmulator(auth, emulator.auth, { disableWarnings: true });
    fs.connectFirestoreEmulator(db, emulator.firestoreHost, emulator.firestorePort);
  }

  // Erreur éventuelle d'une connexion par redirection (repli si la fenêtre surgissante est bloquée).
  const redirectError = authMod.getRedirectResult(auth).then(() => null, (e) => e);

  return {
    kind: 'firebase',
    onAuth(cb) {
      return authMod.onAuthStateChanged(auth, (u) => cb(u && {
        uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, demo: false,
      }));
    },
    redirectError,
    async signIn() {
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await authMod.signInWithPopup(auth, provider);
      } catch (e) {
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
          await authMod.signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
    },
    signOut() {
      return authMod.signOut(auth);
    },
    openUserStore(userId) {
      return createFirestoreStore(fs, db, userId);
    },
  };
}

function createFirestoreStore(fs, db, userId) {
  const tasksCol = fs.collection(db, 'users', userId, 'tasks');
  const settingsRef = fs.doc(db, 'users', userId, 'config', 'settings');
  const unsubs = new Set();
  const track = (unsub) => { unsubs.add(unsub); return () => { unsub(); unsubs.delete(unsub); }; };

  return {
    subscribeSettings(cb, onError) {
      return track(fs.onSnapshot(settingsRef, { includeMetadataChanges: false },
        (snap) => cb(snap.exists() ? snap.data() : null, { fromCache: snap.metadata.fromCache }),
        onError));
    },
    subscribeTasks(cb, onError) {
      return track(fs.onSnapshot(tasksCol,
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })), { fromCache: snap.metadata.fromCache }),
        onError));
    },
    saveSettings(settings) {
      return fs.setDoc(settingsRef, settings);
    },
    newTaskId() {
      return fs.doc(tasksCol).id;
    },
    createTask(id, task) {
      return fs.setDoc(fs.doc(tasksCol, id), task);
    },
    updateTask(id, patch) {
      return fs.updateDoc(fs.doc(tasksCol, id), patch);
    },
    deleteTask(id) {
      return fs.deleteDoc(fs.doc(tasksCol, id));
    },
    /** ops : [{ type: 'update', id, patch } | { type: 'delete', id }] — par paquets de 400 (limite Firestore : 500). */
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = fs.writeBatch(db);
        for (const op of ops.slice(i, i + 400)) {
          const ref = fs.doc(tasksCol, op.id);
          if (op.type === 'delete') b.delete(ref);
          else b.update(ref, op.patch);
        }
        await b.commit();
      }
    },
    close() {
      unsubs.forEach((u) => u());
      unsubs.clear();
    },
  };
}
