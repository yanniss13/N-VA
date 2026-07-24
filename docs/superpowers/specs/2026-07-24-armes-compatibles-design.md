# Armes compatibles par héros — Spec de design

Date : 2026-07-24  
Statut : validé, prêt à implémenter

## But

Chaque héros ne peut équiper que les trois types d’armes indiqués sur
`https://7dsorigin.app/fr/personnages`. Le sélecteur d’armes local doit appliquer
la même restriction.

## Source de vérité

La page de référence affiche 24 héros avec exactement trois armes chacun. Un
recoupement automatisé a confirmé que ces 72 compatibilités correspondent sans
différence aux trois clés déjà présentes pour chaque héros dans
`window.SEVEN_DS_POTENTIELS`.

L’application utilise donc :

```js
Object.keys(window.SEVEN_DS_POTENTIELS[charId] || {})
```

Ces clés sont les noms de dossiers locaux (`Hache`, `Epee 1 main`, etc.). Aucune
seconde liste de compatibilités n’est ajoutée à `index.html` ou `data.js`.

## Sélecteur d’armes

- Sans héros sélectionné, le sélecteur ne s’ouvre pas et un message demande de
  choisir d’abord un héros.
- Avec un héros sélectionné, le sélecteur conserve la puce `Tous`, mais ne propose
  que ses trois groupes d’armes compatibles.
- Les libellés des groupes continuent de venir de `DATA.armes`.
- La compatibilité est déterminée depuis le dossier du chemin de chaque image
  d’arme, pas depuis le libellé du groupe. Cela évite les différences comme
  `Epee a une main` dans `DATA.armes` et `Epee 1 main` dans les chemins.

## Suppression automatique

Une fonction pure vérifie qu’une arme appartient aux types autorisés du héros.

L’arme est remplacée par `null` lorsqu’elle est incompatible :

1. lors du choix ou du changement de héros ;
2. lors de la normalisation d’une équipe lue depuis `localStorage` ;
3. lors de la modification d’une équipe ;
4. lors d’un import JSON ;
5. avant toute sauvegarde.

Retirer un héros retire également son arme. Les armures, bijoux, notes et le palier
de potentiel ne sont pas modifiés.

## Données et régénération

`potentiels.js` reste généré par `generate-potentiels.py`. Comme ses trois clés par
héros pilotent désormais aussi le sélecteur d’armes, une régénération met à jour
simultanément les descriptions de bonus et les compatibilités.

Si un héros n’a aucune donnée dans `potentiels.js`, aucune arme ne lui est proposée
et son arme enregistrée est supprimée. Ce comportement fermé évite d’accepter une
combinaison non vérifiée.

## Vérification

Les tests doivent confirmer :

1. chacun des 24 héros possède exactement trois types autorisés ;
2. Meliodas ne propose que Hache, Épée 1 main et Épées doubles ;
3. le groupe `Tous` ne contient aucune autre arme ;
4. une hache équipée par Meliodas disparaît lorsqu’il est remplacé par Merlin ;
5. une ancienne équipe ou un import perd automatiquement une arme incompatible ;
6. une arme compatible reste intacte ;
7. l’application continue de fonctionner directement en `file://`.
