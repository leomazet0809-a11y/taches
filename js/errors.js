// Messages d'erreur en français.

/** Traduit les erreurs Firebase en messages compréhensibles. */
export function describeError(e) {
  const code = (e && e.code) || '';
  const map = {
    'auth/unauthorized-domain': "Ce site n'est pas autorisé dans Firebase : ajoutez son domaine dans Authentication › Paramètres › Domaines autorisés.",
    'auth/operation-not-allowed': "La connexion Google n'est pas activée dans Firebase (Authentication › Méthode de connexion).",
    'auth/network-request-failed': 'Connexion internet indisponible.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/user-disabled': 'Ce compte a été désactivé.',
    'permission-denied': 'Accès refusé par Firestore : vérifiez les règles de sécurité (voir le README).',
    'unavailable': 'Serveur injoignable : les modifications seront envoyées au retour du réseau.',
  };
  return map[code] || `Une erreur est survenue${code ? ` (${code})` : ''}.`;
}
