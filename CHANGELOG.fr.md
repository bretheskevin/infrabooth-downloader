# Nouveautés

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [Unreleased]

## [1.7.0] - 2026-03-12

### Added

- Onglet de recherche de pistes
- Fenêtre « Nouveautés » après chaque mise à jour
- Indicateur de pistes déjà téléchargées dans les playlists
- Choix du dossier par playlist

### Changed

- L'en-tête de playlist affiche le nombre de pistes et le dossier
- Meilleures performances sur les grandes playlists
- Indication de connexion déplacée dans une infobulle

## [1.6.0] - 2026-03-11

### Added

- Parcourir les pistes d'une playlist
- Télécharger des pistes individuelles depuis une playlist
- Recherche et filtrage par titre ou artiste
- Tri par titre ou artiste
- Gestion des conflits de téléchargement en cours

### Changed

- En-tête de playlist plus compact

## [1.5.0] - 2026-03-11

### Added

- Les pistes déjà téléchargées sont ignorées automatiquement
- Installation des mises à jour directement dans l'appli

### Changed

- Les avertissements FFmpeg récupérables n'annulent plus le téléchargement

### Fixed

- La sélection de playlist réinitialise bien l'état de téléchargement
- La barre de recherche ne déclenche plus la correction automatique
- Téléchargement corrigé sur les pistes en HLS Opus uniquement

## [1.4.0] - 2026-03-10

### Added

- Navigateur de bibliothèque pour vos playlists SoundCloud

### Changed

- Numérotation des pistes aussi dans les paramètres
- Panneau de paramètres réorganisé avec indicateurs de défilement

## [1.3.0] - 2026-03-09

### Added

- Téléchargements parallèles (1 à 10 simultanés)
- Support des liens courts SoundCloud

### Changed

- Authentification par cookies du navigateur
- API native SoundCloud au lieu de yt-dlp
- Dialogue interactif en cas de limitation de débit
- Numérotation des pistes optionnelle
- Appli plus légère (retrait de yt-dlp et ffprobe)

### Fixed

- Meilleure gestion des rafraîchissements d'auth simultanés

## [1.2.0] - 2026-03-03

### Added

- Vérification automatique des mises à jour au démarrage
- Bannière de mise à jour avec lien vers la release

### Changed

- Plus d'erreur affichée si pas de réseau lors de la vérification

## [1.1.0] - 2026-02-22

### Changed

- La progression affiche la taille du fichier (ex : « 5,2 Mo / 12,4 Mo »)

### Fixed

- Les fichiers partiels sont nettoyés à l'annulation

## [1.0.1] - 2026-02-20

### Fixed

- Connexion SoundCloud corrigée

### Changed

- Nouvelle icône de l'appli

## [1.0.0] - 2026-02-20

### Added

- Authentification OAuth avec SoundCloud
- Téléchargement en haute qualité (premium avec Go+)
- Métadonnées ID3 (titre, artiste, pochette)
- Support macOS (Intel et Apple Silicon) et Windows
- Traductions anglais et français
