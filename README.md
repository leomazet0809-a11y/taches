# Tâches

Application web de gestion de tâches, en français, utilisable sur ordinateur et sur téléphone.

**Adresse de l'application : https://leomazet0809-a11y.github.io/taches/**

---

## Guide d'utilisation

### Se connecter

1. Ouvrez l'adresse ci-dessus (sur ordinateur ou téléphone).
2. Cliquez sur **Se connecter avec Google** et choisissez votre compte.
3. Vos tâches sont enregistrées dans votre espace personnel : **personne d'autre ne peut les voir**.
   Vous retrouvez les mêmes données sur tous vos appareils.

> Tant que l'application n'est pas reliée à Firebase, l'écran d'accueil propose le **mode démo** :
> tout fonctionne, mais les données restent dans le navigateur de l'appareil utilisé.

### Ajouter une tâche

- **Rapide** : tapez le titre dans « Ajouter une tâche… » puis appuyez sur **Entrée** (ou sur **+**).
- **Avec détails** : cliquez sur **Détails** (icône crayon) pour saisir directement le titre, le statut et la description.

### Consulter et modifier une tâche

- Cliquez (ou touchez) une tâche pour ouvrir sa **fiche** : titre, statut, description détaillée en texte libre.
- **Enregistrer** valide les modifications (raccourci : **Ctrl + Entrée**).
- Si vous fermez la fiche sans enregistrer, l'application vous demande confirmation.
- **Supprimer** retire la tâche (une confirmation est demandée, puis « Annuler » reste possible quelques secondes).

### Statut « À faire » / « Soldé »

- Le rond à gauche d'une tâche bascule son statut entre **À faire** et **Soldé** (un clic).
- Une tâche soldée apparaît barrée, en bas de la liste. « Annuler » est proposé quelques secondes.

### Ordre de la liste

Les tâches à faire d'abord, les plus récentes en haut ; puis les tâches soldées.

### Paramètres (roue dentée en haut à droite)

- **Affichage**
  - **Thème** : Automatique (suit le réglage de l'appareil), Clair ou Sombre.
  - **Taille du texte** : Petite, Normale, Grande, Très grande.
  - Ces réglages sont mémorisés avec votre compte.
- **Compte** : compte Google utilisé et bouton **Se déconnecter**.

---

## Mise en place (une seule fois)

L'application est hébergée gratuitement par **GitHub Pages** (fichiers de ce dépôt, branche `main`).
Les données sont stockées dans **Firebase / Firestore** (Google).

### 1. Créer le projet Firebase

1. Ouvrir https://console.firebase.google.com et cliquer sur **Créer un projet** (nom : `taches`, Google Analytics inutile).
2. Dans le projet, cliquer sur l'icône **`</>`** (« Ajouter une application Web »), nom : `Tâches`.
   Copier le bloc `firebaseConfig` affiché.
3. **Authentication** › **Commencer** › fournisseur **Google** › **Activer** › Enregistrer.
4. **Authentication** › **Paramètres** › **Domaines autorisés** › ajouter `leomazet0809-a11y.github.io`.
5. **Firestore Database** › **Créer une base de données** › région en Europe › **mode production**.
6. Onglet **Règles** de Firestore : remplacer le contenu par celui du fichier [`firestore.rules`](firestore.rules) puis **Publier**.

### 2. Relier l'application à Firebase

Dans le fichier [`js/config.js`](js/config.js), remplacer `null` par le bloc `firebaseConfig` copié à l'étape 1.2.
Ces valeurs ne sont pas secrètes : la sécurité est assurée par les règles Firestore (étape 1.6),
qui n'autorisent chaque utilisateur qu'à lire et écrire ses propres données.

### Organisation des données

```
users/{identifiant de l'utilisateur}/config/settings   → paramètres (affichage…)
users/{identifiant de l'utilisateur}/tasks/{tâche}      → une tâche par document
```

### Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page de l'application |
| `css/style.css` | Apparence (thèmes clair et sombre) |
| `js/app.js` | Démarrage, liste des tâches |
| `js/task-dialog.js` | Fiche d'une tâche |
| `js/settings.js` | Paramètres |
| `js/firebase.js` | Connexion Google et stockage Firestore |
| `js/local-store.js` | Mode démo (stockage dans le navigateur) |
| `js/config.js` | Configuration Firebase |
| `firestore.rules` | Règles de sécurité Firestore |

Aucune installation ni compilation n'est nécessaire : les fichiers sont servis tels quels.
