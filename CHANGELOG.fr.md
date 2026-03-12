# Nouveautés

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [Unreleased]

## [1.6.0] - 2026-03-11

### Added

- Parcourir les pistes de n'importe quelle playlist — cliquez sur une playlist pour voir toutes ses pistes avec pochettes et détails
- Sélectionner des pistes individuelles d'une playlist et ne télécharger que celles souhaitées
- Rechercher et filtrer les pistes d'une playlist par titre ou artiste
- Trier les pistes par titre ou artiste (croissant/décroissant)
- Boîte de dialogue de conflit de téléchargement — si un téléchargement est déjà en cours, vous pouvez l'annuler et en démarrer un nouveau

### Changed

- L'en-tête de détail de playlist est désormais plus compact, affichant plus de pistes en un coup d'œil

## [1.5.0] - 2026-03-11

### Added

- Les pistes déjà téléchargées sont automatiquement ignorées — l'application analyse votre dossier avant de commencer et ignore les pistes existantes
- Les mises à jour peuvent maintenant être installées directement depuis l'application — la bannière de mise à jour inclut un bouton « Installer » avec un suivi de la progression

### Changed

- Amélioration de la gestion des erreurs FFmpeg — les avertissements audio récupérables n'annulent plus le téléchargement entier

### Fixed

- La sélection de playlist dans la bibliothèque réinitialise désormais correctement l'état de téléchargement
- La barre de recherche de la bibliothèque ne déclenche plus de suggestions de correction automatique
- Correction des téléchargements échouant sur les pistes ne proposant que des flux HLS Opus (incompatibles avec le FFmpeg inclus)

## [1.4.0] - 2026-03-10

### Added

- Navigateur de bibliothèque pour parcourir et télécharger vos playlists SoundCloud directement depuis l'application

### Changed

- Le bouton de numérotation des pistes est désormais aussi accessible depuis les paramètres
- Panneau de paramètres réorganisé avec des indicateurs de défilement pour une meilleure navigation

## [1.3.0] - 2026-03-09

### Added

- Télécharger plusieurs pistes simultanément avec un nombre configurable de téléchargements parallèles (1-10)
- Prise en charge des liens courts SoundCloud (on.soundcloud.com)

### Changed

- L'authentification utilise désormais les cookies du navigateur — connectez-vous à SoundCloud dans votre navigateur et l'application détecte votre session automatiquement
- Les téléchargements utilisent désormais l'API native de SoundCloud au lieu de yt-dlp, offrant des téléchargements plus rapides et plus fiables
- En cas de limitation de débit par SoundCloud, une boîte de dialogue interactive vous permet de choisir comment procéder au lieu d'une attente automatique
- La numérotation des pistes est désormais optionnelle via un bouton dans l'aperçu de la playlist
- Taille de l'application considérablement réduite grâce à la suppression des binaires yt-dlp et ffprobe

### Fixed

- Amélioration de la gestion des rafraîchissements d'authentification simultanés

## [1.2.0] - 2026-03-03

### Added

- L'application vérifie silencieusement les mises à jour au démarrage — si une nouvelle version est disponible, une bannière discrète apparaît en haut de la fenêtre
- La bannière de mise à jour inclut un lien « En savoir plus » vers la page de publication GitHub et peut être masquée pour la session en cours

### Changed

- Les vérifications de mise à jour n'affichent plus de messages d'erreur en l'absence de réseau — l'application continue normalement

## [1.1.0] - 2026-02-22

### Changed

- La progression du téléchargement affiche désormais la taille du fichier (ex: « 5.2 Mo / 12.4 Mo ») pour une meilleure visibilité

### Fixed

- Les fichiers de téléchargement partiels (.part, .ytdl) sont automatiquement nettoyés lors de l'annulation d'un téléchargement

## [1.0.1] - 2026-02-20

### Fixed

- La connexion avec SoundCloud fonctionne désormais correctement

### Changed

- Nouvelle icône de l'application

## [1.0.0] - 2026-02-20

### Added

- Authentification OAuth avec SoundCloud
- Téléchargement de pistes SoundCloud en haute qualité (qualité premium avec abonnement Go+)
- Intégration des métadonnées ID3 (titre, artiste, pochette)
- Support macOS (Intel et Apple Silicon) et Windows
- Traductions en anglais et français
