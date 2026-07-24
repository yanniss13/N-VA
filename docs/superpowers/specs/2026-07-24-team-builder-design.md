# Team Builder Confrérie 7DS — Spec de design

Date : 2026-07-24
Statut : approuvé, en implémentation (Option C — local d'abord)

## But

Permettre aux membres d'une confrérie **7DS Origin** de composer des équipes pour
le **Boss de Guilde** et de les afficher sur une page dédiée
« Équipes dispo pour le Boss de Guilde ». Inspiré du team-builder de
`7dsorigin.app/fr/team-builder/create`, adapté aux besoins de la confrérie.

## Périmètre (ce qu'on construit maintenant)

- Site **statique, un seul fichier** (`index.html`), ouvrable en `file://`, sans
  serveur ni build. Données d'assets dans `data.js` (généré).
- **Onglet 1 — Créer une équipe** : 4 héros, chacun avec personnage + arme +
  5 armures + note ; métadonnée d'équipe = pseudo du membre.
- **Onglet 2 — Boss de Guilde** : toutes les équipes enregistrées, en cartes,
  avec Modifier / Supprimer + Export / Import JSON.
- Persistance **localStorage**.

## Hors périmètre (plus tard)

- Partage réseau multi-membres (Supabase / backend). Voir AGENTS.md.
- Calcul de statistiques chiffrées (pas de données de stats disponibles).
- Costumes / maîtrise / compétences (pas d'assets).

## Décisions

| Sujet | Décision |
|-------|----------|
| Taille d'équipe | 4 personnages |
| Détail par perso | arme (1) + armures (5 emplacements) + note libre |
| Métadonnée d'équipe | pseudo du membre |
| Partage | local d'abord ; export/import JSON en pivot |
| Stats | aucune (non disponibles) |

## Architecture

- `generate-data.ps1` scanne les 3 dossiers d'assets → `data.js`
  (`window.SEVEN_DS_DATA`). Régénérable, jamais édité à la main.
- `index.html` : HTML + CSS + JS inline. Modules logiques :
  - **Store** : lecture/écriture localStorage (`confrerie7ds.teams`), CRUD équipes.
  - **Picker** : composant modal réutilisable (personnage / arme groupée par type /
    armure par emplacement) avec recherche et option « Aucun ».
  - **Builder** : édition du brouillon d'équipe (4 cartes héros), enregistre/màj.
  - **Roster** : rendu de la page d'affichage (cartes bannières), Modifier/Supprimer.
  - **Nav** : bascule entre onglets.

## Modèle de données

Voir AGENTS.md (« Modèle de données d'une équipe »). Une équipe = `id`, `pseudo`,
`heroes[4]`, horodatages. Un héros = `char`, `weapon`, `armor{5}`, `note`.

## Direction visuelle

Héraldique sombre 7DS.
- **Palette** : obsidienne `#0e0d12` / panneaux `#1b1922`, or vieilli `#d9a441` /
  or clair `#f0c674`, pourpre `#a12c2c`, parchemin `#e8e0d0`, sourdine `#9a9182`.
- **Typo** : display serif capitale traquée (Cinzel via CDN, repli
  Constantia/Palatino/Georgia) ; UI en Segoe UI / system-ui.
- **Signature** : cartes d'équipe présentées comme des **bannières de muster**
  avec le pseudo en sceau ; cadres de portrait ornés pour les héros.
- **Effort visuel** concentré sur la page d'affichage ; builder épuré et efficace.
- Plancher qualité : responsive mobile, focus clavier visible, `prefers-reduced-motion`.

## Critères de réussite

1. On crée une équipe de 4 héros complets et on l'enregistre.
2. Elle apparaît sur la page Boss de Guilde avec toutes les vignettes.
3. On peut la modifier et la supprimer.
4. Rechargement de page : les équipes persistent.
5. Export puis import JSON restaure les mêmes équipes.
6. Ajout d'une image + relance du script → visible dans les pickers sans coder.
