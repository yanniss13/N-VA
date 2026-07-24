# Potentiel commun par héros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le potentiel lié à un type d’arme par un palier T0–T10 commun au héros, l’arme équipée ne servant qu’à choisir les descriptions affichées.

**Architecture:** `index.html` reste autonome et contient le modèle, la normalisation et l’interface. Des fonctions pures normalisent les anciennes équipes et résolvent les descriptions depuis le héros et son arme équipée ; un test Node sans dépendance charge le vrai script inline dans un faux DOM et teste directement ces fonctions. `potentiels.js` conserve ses textes groupés par arme.

**Tech Stack:** HTML/CSS/JavaScript natif, localStorage, Node.js uniquement pour les tests, Python standard uniquement pour le générateur existant.

## Global Constraints

- L’application doit rester ouvrable directement en `file://`, sans serveur, installation, build ni dépendance.
- L’interface reste entièrement en français.
- `index.html` ne doit jamais contenir de liste d’assets codée en dur.
- Le format enregistré du potentiel est exactement `{ tier: 0..10 }`.
- Le type de l’arme équipée détermine uniquement les descriptions affichées.
- Le palier ne change jamais lors du remplacement ou du retrait d’une arme.
- Le workspace ne contient pas de dépôt Git : remplacer les étapes de commit par des points de vérification.

---

## File Map

- Create: `tests/potentiel-commun.test.js` — faux DOM minimal, chargement du vrai script inline et tests de régression sans dépendance.
- Modify: `index.html` — normalisation du modèle, migration localStorage/import, résolution des bonus et simplification de la fenêtre.
- Modify: `generate-potentiels.py` — documentation correcte de la distinction entre palier commun et descriptions par arme.
- Modify: `potentiels.js` — en-tête généré cohérent sans modifier les données.
- Modify: `AGENTS.md` — modèle, décisions et procédure de reprise actualisés.

### Task 1: Normaliser et migrer le potentiel enregistré

**Files:**
- Create: `tests/potentiel-commun.test.js`
- Modify: `index.html` autour du Store et des constructeurs de brouillon

**Interfaces:**
- Produces: `normalizePotentiel(raw)` retourne toujours `{ tier: integer }`, borné entre 0 et `POT_MAX`.
- Produces: `normalizeHero(raw)` retourne la structure complète d’un héros sans conserver `potentiel.weaponType`.
- Produces: `normalizeTeam(raw)` retourne une équipe avec exactement quatre héros normalisés.
- Consumes: `POT_MAX`, `TEAM_SIZE`, `emptyArmor()` et `emptyJewel()` dans `index.html`.

- [ ] **Step 1: Écrire le test en échec**

Créer un chargeur Node qui lit le dernier script inline de `index.html`, remplace la
fermeture finale de l’IIFE pour exposer `normalizePotentiel`, `normalizeHero` et
`normalizeTeam` dans un objet `__hooks`, puis l’exécute avec `node:vm` et un faux DOM.
Ajouter ces assertions :

```js
assert.deepStrictEqual(
  plain(hooks.normalizePotentiel({ weaponType: "Hache", tier: 6 })),
  { tier: 6 }
);
assert.deepStrictEqual(plain(hooks.normalizePotentiel({ tier: 99 })), { tier: 10 });
assert.deepStrictEqual(plain(hooks.normalizePotentiel({ tier: -4 })), { tier: 0 });

const migrated = plain(hooks.normalizeTeam({
  id: "ancienne",
  pseudo: "Membre",
  heroes: [{ char: "meliodas", potentiel: { weaponType: "Hache", tier: 7 } }]
}));
assert.strictEqual(migrated.heroes.length, 4);
assert.deepStrictEqual(migrated.heroes[0].potentiel, { tier: 7 });
assert.ok(!("weaponType" in migrated.heroes[0].potentiel));
```

- [ ] **Step 2: Vérifier que le test échoue pour la bonne raison**

Run: `node tests/potentiel-commun.test.js`  
Expected: FAIL avec `normalizePotentiel is not defined`.

- [ ] **Step 3: Implémenter la normalisation minimale**

Dans `index.html`, remplacer `emptyPot()` et la migration locale dispersée par :

```js
const emptyPot = () => ({ tier:0 });
const normalizePotentiel = raw => {
  const tier = Number.isFinite(Number(raw && raw.tier)) ? Math.trunc(Number(raw.tier)) : 0;
  return { tier:Math.max(0, Math.min(POT_MAX, tier)) };
};
function normalizeHero(raw){
  const h = raw && typeof raw === "object" ? raw : {};
  return {
    char:h.char||null,
    weapon:h.weapon||null,
    armor:Object.assign(emptyArmor(), h.armor||{}),
    jewel:Object.assign(emptyJewel(), h.jewel||{}),
    potentiel:normalizePotentiel(h.potentiel),
    note:h.note||""
  };
}
function normalizeTeam(raw){
  const t = raw && typeof raw === "object" ? raw : {};
  const heroes = Array.isArray(t.heroes) ? t.heroes.slice(0, TEAM_SIZE) : [];
  while(heroes.length < TEAM_SIZE) heroes.push({});
  return Object.assign({}, t, { heroes:heroes.map(normalizeHero) });
}
```

Faire passer toutes les frontières persistantes par `normalizeTeam` :

```js
all(){
  try{
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return Array.isArray(list) ? list.map(normalizeTeam) : [];
  }catch(e){ return []; }
},
save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map(normalizeTeam))); },
upsert(team){ /* insérer normalizeTeam(team) */ }
```

Utiliser également `normalizeTeam(t)` dans `editTeam()` et `normalizeTeam(t)` pour
chaque objet accepté pendant l’import JSON.

- [ ] **Step 4: Vérifier la migration**

Run: `node tests/potentiel-commun.test.js`  
Expected: PASS pour les valeurs héritées, les bornes et les quatre héros.

- [ ] **Step 5: Point de vérification**

Run: `rg -n "Object\\.assign\\(emptyPot|weaponType:viewType|potentiel = \\{ weaponType" index.html`  
Expected: aucune occurrence.

### Task 2: Utiliser l’arme équipée uniquement pour les descriptions

**Files:**
- Modify: `tests/potentiel-commun.test.js`
- Modify: `index.html` dans `potentielControl`, `Potentiel` et `miniHero`

**Interfaces:**
- Produces: `potentielDetailsOf(hero)` retourne `{ weaponType, list }`.
- Consumes: `hero.char`, `hero.weapon`, `POT` et `weaponFolderOf(file)`.
- Invariant: `potentielDetailsOf` ne lit ni ne modifie `hero.potentiel`.

- [ ] **Step 1: Ajouter les tests en échec**

Ajouter un jeu de potentiel minimal au contexte du test :

```js
meliodas: {
  Hache: ["Bonus hache T1"],
  "Epee 1 main": ["Bonus épée T1"]
}
```

Puis vérifier :

```js
const hero = {
  char: "meliodas",
  weapon: "7ds-armes/Hache/hache.webp",
  potentiel: { tier: 5 }
};
assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
  weaponType: "Hache",
  list: ["Bonus hache T1"]
});
hero.weapon = "7ds-armes/Epee 1 main/epee.webp";
assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
  weaponType: "Epee 1 main",
  list: ["Bonus épée T1"]
});
assert.deepStrictEqual(hero.potentiel, { tier: 5 });
hero.weapon = null;
assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
  weaponType: null,
  list: []
});
assert.deepStrictEqual(hero.potentiel, { tier: 5 });
```

- [ ] **Step 2: Vérifier l’échec attendu**

Run: `node tests/potentiel-commun.test.js`  
Expected: FAIL avec `potentielDetailsOf is not defined`.

- [ ] **Step 3: Implémenter le résolveur et simplifier les cartes**

Ajouter :

```js
function potentielDetailsOf(hero){
  const weaponType = weaponFolderOf(hero && hero.weapon);
  const byWeapon = (hero && hero.char && POT[hero.char]) || {};
  return { weaponType, list:(weaponType && byWeapon[weaponType]) || [] };
}
```

Dans `potentielControl`, n’afficher que `Tn`, sans `WEAPON_TYPE_LABELS`. Dans
`miniHero`, supprimer le type d’arme du titre et conserver `✦ Potentiel Tn`.

- [ ] **Step 4: Simplifier la fenêtre de potentiel**

Supprimer `viewType`, les onglets `.pot-types/.pot-type` et la sélection liée au
type d’arme. La fenêtre doit toujours lire le palier commun :

```js
const selTier = normalizePotentiel(hero.potentiel).tier;
const setTier = tier => {
  hero.potentiel = normalizePotentiel({ tier });
  render();
  renderBuilder();
};
const details = potentielDetailsOf(hero);
```

Si `details.list` est vide, ajouter à la place de la liste :

```js
el("div", { class:"pot-empty", text:
  "Équipe une arme compatible pour afficher les bonus de potentiel."
})
```

Le sélecteur T0–T10 doit rester visible et actif dans ce cas.

- [ ] **Step 5: Nettoyer le CSS devenu inutile**

Supprimer `.pot-types` et toutes les règles `.pot-type`. Ajouter une règle
`.pot-empty` utilisant le panneau sombre, une bordure pointillée et la couleur
`var(--muted)` pour rester cohérent avec le thème existant.

- [ ] **Step 6: Vérifier le comportement pur et les références**

Run: `node tests/potentiel-commun.test.js`  
Expected: PASS.

Run: `rg -n "WEAPON_TYPE_LABELS|viewType|pot-types|pot-type|p\\.weaponType|hero\\.potentiel\\.weaponType" index.html`  
Expected: aucune occurrence.

### Task 3: Vérifier les frontières de stockage et l’interface réelle

**Files:**
- Modify: `tests/potentiel-commun.test.js`
- Modify: `index.html` si une frontière révélée par le test n’est pas normalisée

**Interfaces:**
- Consumes: `Store.all()`, `Store.save(list)`, `Store.upsert(team)` depuis le vrai script inline.
- Produces: localStorage et exports JSON ne contenant aucun `weaponType` dans les héros.

- [ ] **Step 1: Ajouter un test de stockage hérité**

Précharger le faux localStorage avec une équipe contenant
`{ potentiel:{ weaponType:"Hache", tier:8 } }`, exécuter l’application, puis :

```js
const loaded = plain(hooks.Store.all());
assert.deepStrictEqual(loaded[0].heroes[0].potentiel, { tier: 8 });
hooks.Store.save(loaded);
assert.ok(!localStorage.getItem("confrerie7ds.teams").includes("weaponType"));
```

- [ ] **Step 2: Exposer `Store` uniquement depuis le chargeur de test et lancer le test**

Le chargeur injecte `Store` dans `__hooks` avant la fin de l’IIFE ; aucun crochet de
test n’est ajouté au code de production.

Run: `node tests/potentiel-commun.test.js`  
Expected: PASS.

- [ ] **Step 3: Tester manuellement l’application locale**

Ouvrir `index.html`, puis vérifier :

1. choisir Meliodas sans arme et sélectionner T5 ;
2. constater le message sans bonus et `Potentiel T5` sur sa carte ;
3. équiper une hache et rouvrir le potentiel ;
4. constater les descriptions de hache avec T5 toujours sélectionné ;
5. remplacer la hache par une épée à une main ;
6. constater les descriptions d’épée et T5 inchangé ;
7. enregistrer, modifier puis exporter l’équipe ;
8. vérifier que le JSON contient `"potentiel": { "tier": 5 }` sans `weaponType`.

- [ ] **Step 4: Point de vérification**

Run: `node tests/potentiel-commun.test.js`  
Expected: PASS sans avertissement.

### Task 4: Aligner la documentation et les données générées

**Files:**
- Modify: `generate-potentiels.py`
- Modify: `potentiels.js`
- Modify: `AGENTS.md`

**Interfaces:**
- `window.SEVEN_DS_POTENTIELS` reste `{ charId: { weaponType: descriptions[10] } }`.
- Le modèle localStorage documenté devient `potentiel: { tier: 0..10 }`.

- [ ] **Step 1: Corriger les commentaires du générateur**

Préciser que le script récupère les descriptions T1–T10 par type d’arme, tandis que
le palier sélectionné est commun au héros. Remplacer les messages ambigus
« potentiels par type d’arme » par « descriptions de bonus par type d’arme ».

- [ ] **Step 2: Corriger l’en-tête du fichier généré actuel**

Conserver toutes les valeurs de `potentiels.js` et remplacer seulement son en-tête
par :

```js
// Genere par generate-potentiels.py depuis 7dsorigin.app (team-builder).
// Descriptions uniquement : cle personnage, puis type d'arme, puis bonus T1..T10.
// Le palier choisi est commun au heros et reste stocke dans les equipes.
// Le balisage [#RRGGBB]texte[-] est un span de couleur (rendu par l'appli).
```

- [ ] **Step 3: Mettre AGENTS.md à jour**

Documenter :

```js
potentiel: { tier: 0..10 }
```

Expliquer que l’arme équipée choisit seulement l’entrée de
`window.SEVEN_DS_POTENTIELS` affichée et que `editTeam`/le Store migrent l’ancien
format `{ weaponType, tier }`.

- [ ] **Step 4: Vérification finale automatisée**

Run: `node tests/potentiel-commun.test.js`  
Expected: PASS.

Run: `rg -n "potentiel: \\{ weaponType|palier dépend|palier.*lié.*arme" AGENTS.md index.html`  
Expected: aucune occurrence.

Run: `rg -n "weaponType" index.html AGENTS.md generate-potentiels.py potentiels.js`  
Expected: occurrences uniquement dans la documentation de migration, le format des
descriptions générées et l’analyse de la donnée source ; aucune occurrence dans
l’état courant du héros.
