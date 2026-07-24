# Potentiel commun par héros — Spec de design

Date : 2026-07-24  
Statut : validé, prêt à implémenter

## But

Le palier de potentiel T0–T10 appartient au héros et ne dépend pas de son arme.
L’arme équipée sert uniquement à déterminer quelles descriptions de bonus afficher,
car ces descriptions diffèrent selon le type d’arme.

## Modèle de données

Le potentiel d’un héros devient :

```js
potentiel: { tier: 0..10 }
```

Le champ historique `weaponType` n’est plus enregistré.

À la lecture d’une équipe existante ou importée, l’application conserve la valeur
`potentiel.tier`, la ramène dans l’intervalle 0–10 si nécessaire, puis construit le
nouveau format sans `weaponType`.

## Interface

- La carte d’édition affiche uniquement `Potentiel Tn` ou un tiret à T0.
- La carte de l’équipe enregistrée affiche uniquement `Potentiel Tn`.
- La fenêtre de potentiel ne contient plus d’onglets de types d’armes.
- Le sélecteur T0–T10 reste disponible dès qu’un héros possédant des données de
  potentiel est choisi.
- Si l’arme équipée correspond à une entrée de potentiel du héros, la fenêtre
  affiche les dix descriptions associées à ce type d’arme.
- Si aucune arme compatible n’est équipée, la fenêtre explique qu’il faut équiper
  une arme compatible pour voir les bonus. Le palier reste modifiable.
- Changer ou retirer l’arme ne modifie jamais le palier enregistré.

## Données générées

`potentiels.js` conserve sa structure actuelle par héros et par type d’arme :

```js
{ "<charId>": { "<typeArme>": [ "<bonus T1>", ... "<bonus T10>" ] } }
```

Cette dimension reste nécessaire pour afficher les bons textes. Elle ne représente
plus l’état enregistré par l’utilisateur.

`generate-potentiels.py` continue donc de générer les descriptions par arme, mais
ses commentaires et messages distinguent clairement les bonus dépendant de l’arme
du palier commun au héros.

## Migration

Une fonction de normalisation unique est utilisée pour les nouvelles équipes, les
équipes lues depuis `localStorage`, les équipes modifiées et les imports JSON.

Exemple :

```js
{ potentiel: { weaponType: "Hache", tier: 6 } }
```

devient :

```js
{ potentiel: { tier: 6 } }
```

Les autres données du héros et de l’équipe restent inchangées.

## Vérification

Les vérifications doivent couvrir :

1. Une ancienne équipe conserve son palier et perd `weaponType`.
2. Le palier ne change pas lorsqu’on équipe, remplace ou retire une arme.
3. Les descriptions correspondent au type de l’arme actuellement équipée.
4. Sans arme compatible, le palier reste sélectionnable et un message explicite
   remplace la liste des bonus.
5. L’enregistrement, l’export et l’import produisent le nouveau format.
6. L’application reste utilisable directement en `file://`, sans dépendance.
