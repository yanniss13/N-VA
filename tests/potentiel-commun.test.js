"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const STORAGE_KEY = "confrerie7ds.teams";

class FakeElement {
  constructor(){
    this.children = [];
    this.dataset = {};
    this.events = {};
    this.files = [];
    this.style = {};
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, force) => {
        if(force === true) classes.add(name);
        else if(force === false) classes.delete(name);
        else if(classes.has(name)) classes.delete(name);
        else classes.add(name);
      },
      contains: name => classes.has(name)
    };
  }
  addEventListener(type, handler){ this.events[type] = handler; }
  appendChild(child){ this.children.push(child); return child; }
  click(){ if(this.events.click) this.events.click({ target:this }); }
  focus(){}
  remove(){}
  setAttribute(name, value){ this[name] = value; }
}

function makeDocument(){
  const nodes = new Map();
  const getNode = key => {
    if(!nodes.has(key)) nodes.set(key, new FakeElement());
    return nodes.get(key);
  };
  return {
    body:new FakeElement(),
    createElement:() => new FakeElement(),
    createTextNode:text => ({ textContent:String(text) }),
    addEventListener(){},
    getElementById:id => getNode("#"+id),
    querySelector:selector => getNode(selector),
    querySelectorAll:() => []
  };
}

function makeLocalStorage(initialTeams){
  const values = new Map();
  if(initialTeams !== undefined){
    values.set(STORAGE_KEY, JSON.stringify(initialTeams));
  }
  return {
    getItem:key => values.has(key) ? values.get(key) : null,
    removeItem:key => values.delete(key),
    setItem:(key, value) => values.set(key, String(value))
  };
}

function loadApp(initialTeams){
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]);
  const source = scripts.find(script => script.includes("(function(){"));
  assert.ok(source, "Le script principal inline doit exister");

  const exposed = source.replace(
    /\}\)\(\);\s*$/,
    "Object.assign(globalThis.__hooks,{normalizePotentiel,normalizeHero,normalizeTeam,potentielDetailsOf,Store});})();"
  );
  assert.notStrictEqual(exposed, source, "Le chargeur doit exposer les fonctions réelles");

  const document = makeDocument();
  const localStorage = makeLocalStorage(initialTeams);
  const sandbox = {
    __hooks:{},
    Blob:class {},
    FileReader:class {},
    URL:{ createObjectURL:() => "blob:test", revokeObjectURL(){} },
    clearTimeout(){},
    confirm:() => true,
    console,
    crypto:{ randomUUID:() => "test-uuid" },
    document,
    localStorage,
    setTimeout:() => 1,
    SEVEN_DS_DATA:{
      generatedAt:"",
      personnages:[{ id:"meliodas", name:"Meliodas", file:"7ds-personnages/meliodas.webp" }],
      armes:{ Hache:[] },
      armures:{ Haut:[], Bas:[], Bottes:[], Ceinture:[], "Armure liee":[] },
      bijoux:{ Anneau:[], Collier:[], "Boucle d'oreille":[] }
    },
    SEVEN_DS_POTENTIELS:{
      meliodas:{
        Hache:["Bonus hache T1"],
        "Epee 1 main":["Bonus épée T1"]
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(exposed, sandbox, { filename:"index.html" });
  return { hooks:sandbox.__hooks, localStorage };
}

function plain(value){
  return JSON.parse(JSON.stringify(value));
}

// Régression ciblée : retirer weaponType ne doit jamais perdre le palier existant.
{
  const { hooks } = loadApp();
  assert.deepStrictEqual(
    plain(hooks.normalizePotentiel({ weaponType:"Hache", tier:6 })),
    { tier:6 }
  );
  assert.deepStrictEqual(plain(hooks.normalizePotentiel({ tier:99 })), { tier:10 });
  assert.deepStrictEqual(plain(hooks.normalizePotentiel({ tier:-4 })), { tier:0 });

  const migrated = plain(hooks.normalizeTeam({
    id:"ancienne",
    pseudo:"Membre",
    heroes:[{
      char:"meliodas",
      potentiel:{ weaponType:"Hache", tier:7 }
    }]
  }));
  assert.strictEqual(migrated.heroes.length, 4);
  assert.deepStrictEqual(migrated.heroes[0].potentiel, { tier:7 });
  assert.ok(!("weaponType" in migrated.heroes[0].potentiel));
}

// Régression ciblée : l'arme choisit les textes, jamais le palier du héros.
{
  const { hooks } = loadApp();
  const hero = {
    char:"meliodas",
    weapon:"7ds-armes/Hache/hache.webp",
    potentiel:{ tier:5 }
  };
  assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
    weaponType:"Hache",
    list:["Bonus hache T1"]
  });

  hero.weapon = "7ds-armes/Epee 1 main/epee.webp";
  assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
    weaponType:"Epee 1 main",
    list:["Bonus épée T1"]
  });
  assert.deepStrictEqual(hero.potentiel, { tier:5 });

  hero.weapon = null;
  assert.deepStrictEqual(plain(hooks.potentielDetailsOf(hero)), {
    weaponType:null,
    list:[]
  });
  assert.deepStrictEqual(hero.potentiel, { tier:5 });
}

// Régression ciblée : les frontières de stockage migrent aussi l'ancien format.
{
  const legacyTeams = [{
    id:"stockee",
    pseudo:"Membre",
    heroes:[{
      char:"meliodas",
      potentiel:{ weaponType:"Hache", tier:8 }
    }]
  }];
  const { hooks, localStorage } = loadApp(legacyTeams);
  const loaded = plain(hooks.Store.all());
  assert.deepStrictEqual(loaded[0].heroes[0].potentiel, { tier:8 });
  hooks.Store.save(loaded);
  assert.ok(!localStorage.getItem(STORAGE_KEY).includes("weaponType"));
}

console.log("PASS potentiel commun");
