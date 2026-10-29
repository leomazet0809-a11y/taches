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

### Installer l'application sur le téléphone ou l'ordinateur

L'application peut être ajoutée à l'écran d'accueil : elle s'ouvre alors en plein écran, comme une application.
Ce n'est pas un programme à installer (.exe) : c'est la même page web.

- **iPhone / iPad (Safari)** : bouton **Partager** › **Sur l'écran d'accueil**.
- **Android (Chrome)** : menu **⋮** › **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
- **Ordinateur (Chrome, Edge)** : icône d'installation dans la barre d'adresse,
  ou **Paramètres › Compte et appareil › Installer l'application**.

### Hors connexion

- L'application s'ouvre et fonctionne même sans réseau (après une première visite connectée).
- Un badge rouge **Hors connexion** apparaît en haut ; les modifications sont conservées
  et envoyées automatiquement au retour du réseau.

### Ajouter une tâche

- **Rapide** : tapez le titre dans « Ajouter une tâche… » puis appuyez sur **Entrée** (ou sur **+**).
  Sur ordinateur, la touche **N** place directement le curseur dans ce champ.
- **Avec détails** : cliquez sur **Détails** (icône crayon) pour saisir directement le titre, le statut, les tags, le dossier et la description.
- Une nouvelle tâche arrive dans le dossier **À classer** (sauf si vous choisissez un autre dossier dans la fiche).

### Consulter et modifier une tâche

- Cliquez (ou touchez) une tâche pour ouvrir sa **fiche** : titre, statut, dossier, tags, description détaillée en texte libre.
- **Enregistrer** valide les modifications (raccourci : **Ctrl + Entrée**).
- Si vous fermez la fiche sans enregistrer, l'application vous demande confirmation.
- **Supprimer** retire la tâche (une confirmation est demandée, puis « Annuler » reste possible quelques secondes).

### Dossiers

Les dossiers sont affichés sous forme de **tuiles** avec leur nombre de tâches :
à gauche sur ordinateur, en bandeau défilant en haut sur téléphone.

Dossiers fournis au départ (tout est modifiable dans les Paramètres) :

| Groupe | Dossiers |
|---|---|
| — | À classer (reçoit les nouvelles tâches) |
| Priorités | Faire maintenant, Planifier, Déléguer, Abandonner |
| Suivi | Attente réponse, Archives |

- Cliquez sur une tuile pour n'afficher que ses tâches ; **Toutes les tâches** affiche tout
  (le dossier de chaque tâche est alors indiqué sous son titre).
- La roue dentée à côté de « Dossiers » ouvre directement leur réglage.

### Déplacer une tâche (glisser-déposer)

- **Ordinateur** : cliquez sur une tâche **sans relâcher**, déplacez-la sur une tuile, relâchez.
- **Téléphone** : **appui long** (environ une demi-seconde) sur une tâche : un panneau
  « Déposer dans… » s'ouvre en bas de l'écran ; glissez le doigt sur un dossier et relâchez.
- Relâcher ailleurs (ou appuyer sur Échap) annule le déplacement.
- Autre possibilité : choisir le **Dossier** dans la fiche de la tâche.
- Un déplacement manuel ne change **que** le dossier : les tags et le statut restent inchangés.
  « Annuler » est proposé quelques secondes.

### Tri automatique (règles)

Les règles rangent automatiquement les tâches d'un ou plusieurs dossiers vers un autre dossier,
selon leurs tags et/ou leur statut.

- Elles s'appliquent **à chaque enregistrement** d'une tâche : création, enregistrement de la fiche,
  changement de statut (rond à gauche).
- Elles ne s'appliquent **pas** aux déplacements manuels (glisser-déposer, ou dossier choisi dans la fiche).
- La **première** règle de la liste qui correspond déplace la tâche ; les règles sont ensuite
  réévaluées depuis le nouveau dossier (une tâche ne peut pas tourner en boucle).

Règles fournies au départ (modifiables, désactivables) :

| Règle | Depuis | Si | Vers |
|---|---|---|---|
| Tâches soldées | tous les dossiers | Statut = Soldé | Archives |
| Tâches remises à faire | Archives | Statut = À faire | À classer |
| Important et urgent | À classer | Catégorie renseignée et Important et Urgent | Faire maintenant |
| Important, non urgent | À classer | Catégorie renseignée et Important et Non urgent | Planifier |
| Non important, urgent | À classer | Catégorie renseignée et Non important et Urgent | Déléguer |
| Non important, non urgent | À classer | Catégorie renseignée et Non important et Non urgent | Abandonner |

Ainsi, une tâche reste dans **À classer** tant que ses trois tags ne sont pas renseignés,
puis rejoint automatiquement la bonne case de la matrice.
Une tâche soldée par erreur et remise « à faire » repart dans À classer puis est reclassée.

### Tags

Chaque tâche peut recevoir **une valeur par type de tag**, choisie dans une liste déroulante de sa fiche.
Types de tags fournis au départ (tout est modifiable dans les Paramètres) :

| Type | Valeurs |
|---|---|
| Catégorie | Projet 1, Projet 2, Activité 1 fiche emploi, Activité 2 fiche emploi, Activité 3 fiche emploi |
| Importance | Important, Non important |
| Urgence | Urgent, Non urgent |

Les tags d'une tâche s'affichent sous son titre, en couleur.

### Filtrer

Le panneau **Filtres** (cliquer sur son titre pour l'ouvrir ou le fermer) affiche un bouton par valeur de tag et par statut.

- Cliquez sur un bouton pour l'activer (il se colore), recliquez pour le désactiver.
- Plusieurs valeurs d'un **même** tag : la tâche doit avoir **l'une ou l'autre** (OU).
- Des tags **différents** (et le statut) : la tâche doit remplir **toutes** les conditions (ET).
- Exemple : [Projet 1] [Projet 2] + [Urgent] → les tâches urgentes du Projet 1 ou du Projet 2.
- Le compteur à côté du titre indique « tâches affichées / total ». **Effacer** retire tous les filtres.
- Les filtres choisis sont mémorisés sur chaque appareil.

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
- **Tags et statuts**
  - Renommer les deux statuts (par exemple « Soldé » → « Terminé »).
  - Renommer un type de tag, changer sa couleur, le monter/descendre, le supprimer.
  - Ajouter, renommer, réordonner ou supprimer les valeurs de chaque liste.
  - **Ajouter un type de tag** pour créer une nouvelle liste déroulante.
  - Les noms sont enregistrés dès que vous appuyez sur Entrée ou quittez le champ.
  - Supprimer une valeur (ou un type) la retire des tâches concernées, après confirmation.
- **Dossiers**
  - Renommer, changer de groupe, monter/descendre ou supprimer un dossier ; en ajouter.
  - « À classer » peut être renommé mais pas supprimé (cadenas).
  - Supprimer un dossier renvoie ses tâches dans « À classer ».
  - **Groupes de dossiers** : créer, renommer, réordonner, supprimer (les dossiers du groupe sont conservés, sans groupe).
- **Règles de tri**
  - **Nouvelle règle** : nom, dossier(s) de départ (ou « Tous les dossiers »), conditions, dossier d'arrivée.
  - Conditions sur un tag (est / n'est pas / est renseigné / est vide) ou sur le statut (est / n'est pas).
  - Combinaison : **toutes** les conditions (ET) ou **au moins une** (OU).
  - Interrupteur pour activer/désactiver une règle ; flèches pour changer l'ordre (la première qui correspond s'applique).
  - Une règle incomplète (par exemple après la suppression d'un tag ou d'un dossier qu'elle utilisait) est signalée en rouge et ne s'applique pas.
  - **Appliquer à toutes les tâches** : applique les règles actives à toutes les tâches existantes,
    y compris celles déplacées à la main.
- **Compte et appareil** : compte Google utilisé, bouton **Se déconnecter**, installation de l'application.

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
users/{identifiant de l'utilisateur}/config/settings   → paramètres (affichage, statuts, tags, dossiers, règles)
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
| `js/filters.js` | Filtres par boutons |
| `js/folders.js` | Dossiers, groupes et tuiles |
| `js/dnd.js` | Glisser-déposer (souris et tactile) |
| `js/rules.js` | Règles de tri automatique |
| `js/defaults.js` | Valeurs initiales (tags, statuts…) |
| `js/firebase.js` | Connexion Google et stockage Firestore |
| `js/local-store.js` | Mode démo (stockage dans le navigateur) |
| `js/config.js` | Configuration Firebase |
| `firestore.rules` | Règles de sécurité Firestore |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation sur l'écran d'accueil et fonctionnement hors connexion |

Aucune installation ni compilation n'est nécessaire : les fichiers sont servis tels quels.
