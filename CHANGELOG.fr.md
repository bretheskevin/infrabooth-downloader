# Nouveautés

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [Unreleased]

## [1.21.0] - 2026-04-16

### Added

- Messagerie privée avec les autres utilisateurs SoundCloud
- Bouton de lecture aléatoire dans les listes de morceaux

### Changed

- Actualisation automatique des notifications lors d'une nouvelle activité

## [1.20.0] - 2026-04-15

### Added

- Basculement entre l'affichage en grille et en liste pour les playlists et les sorties
- Liens cliquables vers les artistes sur les playlists
- Notifications d'activité SoundCloud (abonnements, likes, reposts, commentaires)

### Changed

- Les nouvelles sorties apparaissent désormais avant les reposts dans le carrousel

### Fixed

- On ne voyait pas les morceaux tant que la playlist entière n'était pas chargée

## [1.19.0] - 2026-04-10

### Added

- Action « Afficher dans le dossier » au clic droit sur les pistes téléchargées
- Menu contextuel sur la bannière de profil d'artiste

### Fixed

- On ne pouvait pas utiliser certaines fonctionnalités sans être connecté
- Les grandes playlists ne se chargeaient pas entièrement

## [1.18.0] - 2026-04-10

### Added

- Accès direct aux playlists des artistes depuis leur profil
- Les liens de la description des profils sont maintenant cliquables
- Support des liens SoundCloud raccourcis

### Fixed

- La file d'attente se synchronisait mal pendant la lecture

## [1.17.1] - 2026-04-08

### Fixed

- On ne pouvait pas consulter la page d'un artiste sans être connecté

## [1.17.0] - 2026-04-07

### Added

- Nouveaux albums et playlists des artistes suivis
- Abonnement et désabonnement aux artistes depuis leur profil
- Accès aux dossiers de l'application

### Fixed

- Des morceaux en double apparaissaient dans le flux d'activité

## [1.16.1] - 2026-04-03

### Changed

- Vue artiste épurée avec masquage des onglets de navigation
- Fenêtre « Nouveautés » élargie pour une meilleure lisibilité

### Fixed

- Le bouton « Tout télécharger » était visible lorsque le mode streaming était activé

## [1.16.0] - 2026-03-31

### Added

- Recherche d'artistes dans l'onglet recherche
- Mentions @ et liens cliquables dans les profils d'artistes

### Changed

- Refonte des onglets de navigation de la recherche

### Fixed

- Certains morceaux ne pouvaient pas être écoutés à cause d'un domaine CDN bloqué

## [1.15.0] - 2026-03-30

### Added

- Pages de profil artiste avec liste de pistes
- Station autoplay avec pistes similaires à la fin de la file d'attente
- Action « Ajouter à la file d'attente » dans les menus
- Raccourci espace pour lecture/pause
- Support des URL SoundCloud dans la recherche
- Possibilité de masquer les reposts dans les nouvelles pistes

### Fixed

- Le dialogue « Nouveautés » apparaissait même quand l'application n'était pas à jour

## [1.14.0] - 2026-03-26

### Added

- Consultation des nouveaux sons et reposts des artistes suivis

### Changed

- Amélioration de la fluidité des transitions crossfade

## [1.13.0] - 2026-03-25

### Added

- Menu d'actions sur le morceau dans le lecteur étendu
- Section de sélections recommandées sur la page d'accueil

### Fixed

- L'audio ne se lançait parfois pas au changement de piste

## [1.12.1] - 2026-03-23

### Changed

- Conservation du mix sélectionné lors du changement d'onglet

### Fixed

- Le crossfade ne fonctionnait plus après réorganisation de la file d'attente
- Les URLs de streaming expiraient pendant les longues sessions d'écoute
- Les téléchargements ne pouvaient pas être annulés pendant la récupération du fichier original (téléchargement direct)
- La position des contrôles média était figée pendant le crossfade

## [1.12.0] - 2026-03-23

### Added

- Découverte de mixes personnalisés sur la page de téléchargement
- Prise en charge des URLs de playlists découverte et classements SoundCloud

## [1.11.0] - 2026-03-22

### Added

- Fondu enchaîné entre les pistes avec durée ajustable

### Fixed

- La barre de progression de mise à jour affichait des valeurs incorrectes
- L'application ne pouvait pas redémarrer après l'installation d'une mise à jour

## [1.10.0] - 2026-03-20

### Added

- Menu contextuel au clic droit sur les pistes (copier le lien, ouvrir dans le navigateur, ajouter/supprimer d'une playlist)
- Mode aléatoire dans le lecteur audio
- Visualisation du waveform dans le lecteur
- Téléchargement direct avec conversion en MP3 320kbps pour les pistes compatibles
- Mode streaming pour masquer l'interface de téléchargement
- Bouton d'ouverture du dossier dans la page de téléchargement

### Changed

- Revisite du design des paramètres
- Transitions de lecture plus fluides entre les pistes

### Fixed

- Les pistes téléchargées n'étaient pas automatiquement désélectionnées
- La case « tout sélectionner » s'affichait quand toutes les pistes étaient déjà téléchargées

## [1.9.2] - 2026-03-18

### Changed

- Affichage de la progression du téléchargement en Mo pendant les mises à jour
- Lien de redémarrage après l'installation des mises à jour

### Fixed

- La lecture audio ne fonctionnait pas dans les builds de production

## [1.9.1] - 2026-03-18

### Fixed

- La lecture audio était bloquée en raison de permissions CDN manquantes

## [1.9.0] - 2026-03-18

### Added

- Contrôles multimédia système (lecture, pause, piste suivante/précédente)

### Changed

- Chargement audio plus rapide

### Fixed

- Les contrôles multimédia apparaissaient en double sur macOS
- La position de défilement était perdue dans la bibliothèque lors du changement d'onglet
- La recherche était effacée lors du changement d'onglet

## [1.8.0] - 2026-03-17

### Added

- Lecteur audio intégré avec file d'attente et contrôles de lecture
- Lecture/pause sur les pistes de la bibliothèque et de la recherche

### Changed

- Le bouton de sélection globale affiche un libellé contextuel dans la bibliothèque

### Fixed

- Pistes marquées téléchargées à tort après changement de dossier
- Animation de rafraîchissement déclenchée par des actions non liées

## [1.7.0] - 2026-03-12

### Added

- Onglet de recherche de pistes
- Fenêtre « Nouveautés » après chaque mise à jour
- Indicateur de pistes déjà téléchargées dans les playlists
- Choix du dossier de téléchargement par playlist

### Changed

- L'en-tête de playlist affiche le nombre de pistes et le dossier
- Amélioration des performances sur les grandes playlists
- Indication de connexion déplacée dans une infobulle

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
