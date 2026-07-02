type LangKey = 'en' | 'fr';

const dict: Record<string, Record<LangKey, string>> = {
  nowPlaying: { en: 'Now Playing', fr: 'En lecture' },
  queue: { en: 'Queue', fr: "File d'attente" },
  search: { en: 'Search', fr: 'Rechercher' },
  searchPlaceholder: { en: 'Search SoundCloud...', fr: 'Rechercher sur SoundCloud...' },
  play: { en: 'Play', fr: 'Lire' },
  pause: { en: 'Pause', fr: 'Pause' },
  addToQueue: { en: 'Add to Queue', fr: 'Ajouter' },
  addedToQueue: { en: 'Added to queue', fr: "Ajoutée à la file d'attente" },
  download: { en: 'Download', fr: 'Télécharger' },
  downloading: { en: 'Download started', fr: 'Téléchargement lancé' },
  noResults: { en: 'No results', fr: 'Aucun résultat' },
  disconnected: { en: 'Disconnected', fr: 'Déconnecté' },
  reconnecting: { en: 'Reconnecting...', fr: 'Reconnexion...' },
  emptyQueue: { en: 'Queue is empty', fr: "File d'attente vide" },
  tracks: { en: 'tracks', fr: 'titres' },
  nothingPlaying: { en: 'Nothing playing', fr: 'Rien en lecture' },
  invalidLink: { en: 'Invalid link — missing token.', fr: 'Lien invalide — jeton manquant.' },
};

export function t(key: string, language: string): string {
  const lang: LangKey = language === 'fr' ? 'fr' : 'en';
  return dict[key]?.[lang] ?? key;
}
