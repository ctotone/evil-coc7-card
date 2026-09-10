## 1.3.3

- Corrige une fuite d’informations sur les jets privés et aveugles : le module respecte désormais la visibilité effective du contenu définie par Foundry et ne reconstruit plus les données cachées depuis les flags CoC7.
- Conserve le style Evilbram côté joueur pour les jets masqués, en se basant uniquement sur le DOM déjà sécurisé par Foundry.
- Nouveau rendu harmonisé des jets privés/aveugles : titre natif conservé, grand point d’interrogation à gauche et médaillon d’état générique à droite.
- Réserve davantage de hauteur au placeholder masqué afin de limiter le changement de taille de la carte lors de la révélation du jet.
- Aucun changement de logique de jeu CoC7.

## 1.3.2 — Corrections visuelles

- Remplacement du pictogramme générique de dégâts par l’asset dédié `assets/damage.webp`.
- Correction de l’affichage des dés bonus/malus non retenus dans le détail d’un jet : leur valeur reste visible en surimpression sur la face du dé tout en étant atténuée.
- Refonte visuelle des icônes de réaction de mêlée (Esquive, Pas de réponse, Riposte, Manœuvre) avec quatre médaillons illustrés dédiés, utilisés dans les boutons et les cartes.
- Ajustement typographique du libellé français « Pas de réponse » afin de le conserver sur une seule ligne dans les boutons de réaction.

## 1.3.1 — Partage de Documents Foundry dans le chat

- Ajout d’un style générique pour les liens de Documents Foundry glissés dans le chat.
- Affichage compact lorsque le lien est intégré à un message.
- Affichage en mini-carte pleine largeur lorsqu’un ou plusieurs Documents sont partagés seuls.
- Support basé sur `CONST.DOCUMENT_LINK_TYPES` afin de suivre les types de liens officiellement exposés par Foundry.
- Conservation du comportement natif Foundry : UUID, permissions, ouverture du Document et interactions ne sont pas réimplémentés.

## 1.3.0 — Localisation multilingue et corrections d’affichage

- Ajout de la localisation du module en allemand, anglais, français, espagnol, italien et portugais brésilien.
- Remplacement des chaînes visibles bilingues en dur par des clés `EVILCOC7CARD.*`.
- Réutilisation des textes natifs CoC7 lorsque ceux-ci sont déjà fournis par le système.
- Correction de l’ouverture des détails des jets à distance et des dégâts à distance.
- Amélioration visuelle de la demande de test de Constitution.
- Harmonisation de l’affichage de la confirmation des dégâts à distance appliqués.
- Masquage du long bloc éditorial sur la résolution de mêlée.
- Suppression de la répétition du nom d’arme sous le verdict de dégâts de mêlée.
- Ajustement de l’espacement du verdict combiné lorsque le footer natif est absent.
- Ajout d’une passe de robustesse CSS pour les textes localisés plus longs.

### 1.2.1-pre-1.3.0 — Candidate finale de smoke

- Ajout d'une passe CSS de robustesse multilingue :
  - retour à la ligne autorisé pour les titres, sous-titres, verdicts et rôles ;
  - boutons localisés autorisés à grandir en hauteur ;
  - aucun changement de logique ou de traduction.
- Candidate destinée au smoke final en français avant préparation de la release `1.3.0`.

### 1.2.1-i18n-trad — Candidate de test multilingue

- Intégration du retour linguistique GPT Trad pour `de`, `en`, `fr`, `es`, `it` et `pt-BR`.
- Jeu de 52 clés `EVILCOC7CARD.*` inchangé.
- Placeholders et structure JSON conservés.
- Version de travail maintenue en `1.2.1` jusqu'à validation complète avant release `1.3.0`.

# Changelog

Toutes les évolutions notables du module **Evilbram Amélioration cartes CoC7** sont recensées ici.

### 1.2.1-b — Candidate de test

- Retouche ciblée du bandeau de confirmation des dégâts à distance appliqués :
  - détection par l'icône native CoC7 `.fa-check` dans `.dice-formula` ;
  - aucun texte CoC7 réécrit.
- Renforcement visuel de la demande de test de Constitution non lancée :
  - carte dédiée `CoC7ConCheck` ;
  - différenciation du cas `stayAlive` exposé par CoC7.

## 1.2.1 — candidate de travail

- Correction de l'ouverture des détails des tirs à distance.
- Correction de l'ouverture du détail des dégâts à distance.
- Masquage du long bloc éditorial sur la résolution de mêlée.
- Mise en valeur visuelle de la demande de test de Constitution.
- Harmonisation visuelle de la confirmation des dégâts à distance appliqués.
- Ajout d'un espace inférieur au verdict combiné lorsque le footer natif est absent.
- Suppression de la répétition du nom d'arme sous le verdict de dégâts de mêlée.
- Candidate interne de test : aucune release 1.2.1 n'est publiée.

## 1.2.0 — 26 août 2026

- Mise en place d'un manifeste stable pour permettre les mises à jour directement depuis Foundry VTT.
- Le champ `manifest` pointe désormais vers la dernière release publiée.
- Le champ `download` reste lié à l'archive exacte de la version 1.2.0.
- Ajout du présent `CHANGELOG.md`.
- Ajout du lien vers le changelog dans `module.json`.
- README enrichi avec les informations de compatibilité :
  - Foundry VTT v13 minimum ;
  - Foundry VTT v14 vérifié ;
  - système CoC7 8.15 minimum.
- Nettoyage de l'archive de distribution afin de ne conserver que les fichiers utiles au module.

## 1.1.0 — 26 août 2026

- Compatibilité minimale Foundry VTT abaissée à v13.
- Foundry VTT v14 conservé comme version vérifiée.
- CoC7 8.15 conservé comme version minimale requise.

## 1.0.0 — 26 août 2026

- Première version publique du module.
- Refonte visuelle des cartes de chat CoC7 sans modification de la logique de jeu.
- Compatibilité initiale déclarée avec Foundry VTT v14.
- CoC7 8.15 minimum.
