// パラディン・バーバリアン・ドルイドの5つの姿。すべて描画専用。
(() => {
  const C = WYD.data.classes, V = WYD.data.vfx;
  const action = (folder, name, frameTime, fx) => ({ image: `assets/${folder}/${name}.webp`, frames: name === "idle" ? 1 : 8, frameTime, ...(fx ? { fx } : {}) });
  const base = folder => ({ width: 256, height: 256, anchorX: 128, anchorY: 234, scale: 1.3,
    idle: action(folder, "idle", 1), walk: action(folder, "walk", 0.075) });
  const fx = (staff, staffPoints, ground, overrides = {}) => ({ staff, staffPoints, staffSize: 24, staffAlpha: 0.6,
    ground, groundSize: 100, groundFlatten: 0.48, groundAlpha: 0.4, groundFrom: 0.55, groundTo: 1.1, groundStart: 0.25, quietAlpha: 0.35, ...overrides });
  const repeat = point => Array.from({ length: 8 }, () => point);
  const allImages = D => [...new Set(Object.values(D).filter(a => a?.image).map(a => a.image))];
  const palHit = fx("holyWisp", [[50,153],[61,127],[64,35],[196,197],[195,200],[51,120],[50,155],[50,155]], "paladinHammerImpact", { groundSize: 112 });
  const palPray = fx("holyWisp", [[41,160],[117,104],[77,50],[60,58],[30,43],[50,54],[46,163],[47,164]], "holyGround", { groundStart: 0, groundAlpha: 0.3 });
  C.paladin.player.spriteAnimation = { ...base("paladin"),
    cast: action("paladin", "attack", 0.07, palHit), strike: action("paladin", "attack", 0.085, palHit),
    prayer: action("paladin", "prayer", 0.09, palPray),
    skills: { pal_zeal: "strike", pal_hammer: "strike", pal_shield: "prayer", pal_judgment: "prayer", pal_vow: "prayer", pal_chain: "prayer", pal_fire: false, pal_prayer: false, pal_might: false } };
  const barHit = fx("slash", [[177,145],[99,29],[186,129],[180,137],[128,165],[166,133],[178,154],[178,154]], "barbarianBladeWind", { staffSize: 34, groundAlpha: 0.2 });
  const barSpin = fx("barbarianBladeWind", repeat([128, 150]), "barbarianBladeWind", { staffSize: 80, staffAlpha: 0.25, groundSize: 135, groundFlatten: 0.6, groundStart: 0, groundAlpha: 0.5 });
  const barShout = fx("rageWisp", repeat([128, 115]), "rageWisp", { staffSize: 28, groundSize: 108, groundStart: 0 });
  C.barbarian.player.spriteAnimation = { ...base("barbarian"),
    cast: action("barbarian", "attack", 0.065, barHit), strike: action("barbarian", "attack", 0.08, barHit),
    whirl: action("barbarian", "whirl", 0.085, barSpin), shout: action("barbarian", "shout", 0.09, barShout),
    skills: { whirl: "whirl", sudarshana: "strike", agni: "strike", nagapasha: "shout", vajra: "shout", hanuman: "shout", bar_orders: false, bar_cry: false, bar_ancients: "shout" } };
  const druCast = fx("vines", [[192,75],[190,75],[179,25],[190,75],[195,74],[194,75],[194,79],[194,79]], "druidPrimalPulse", { staffSize: 20, groundStart: 0, groundAlpha: 0.3 });
  C.druid.player.spriteAnimation = { ...base("druid"), cast: action("druid", "cast", 0.085, druCast),
    invoke: action("druid", "cast", 0.09, druCast),
    skills: Object.fromEntries(Object.keys(C.druid.skills).map(id => [id, "invoke"])) };
  const claws = { bear: [[119,156],[99,42],[220,157],[59,93],[207,139],[107,136],[118,165],[118,164]],
    wolf: [[196,148],[141,77],[222,146],[219,196],[132,145],[189,158],[190,158],[197,156]] };
  const beast = (name, walkTime, hitTime, roarTime) => ({ ...base(`druid/${name}`), walk: action(`druid/${name}`, "walk", walkTime),
    cast: action(`druid/${name}`, "attack", hitTime, fx("slashBeast", claws[name], "druidPrimalPulse", { staffSize: 30, groundAlpha: 0.18 })),
    swipe: action(`druid/${name}`, "attack", hitTime, fx("slashBeast", claws[name], "druidPrimalPulse", { staffSize: 30, groundAlpha: 0.18 })),
    roar: action(`druid/${name}`, "roar", roarTime, fx("vines", repeat([128, 113]), "druidPrimalPulse", { staffSize: 22, groundStart: 0, groundAlpha: 0.5, groundSize: 125 })),
    skills: { dru_bear: "roar", dru_wolf: "roar", dru_howl: "roar", dru_bark: "roar", dru_wolves: "roar", dru_vines: "roar", dru_tornado: "swipe", dru_boulder: "swipe", dru_fissure: "swipe" } });
  C.druid.player.spriteForms = { dru_bear: beast("bear", 0.085, 0.09, 0.095), dru_wolf: beast("wolf", 0.06, 0.06, 0.085) };
  for (const id of ["paladin", "barbarian", "druid"]) {
    const P = C[id].player;
    P.preloadImages = [...new Set([...(P.preloadImages || []), ...allImages(P.spriteAnimation), ...Object.values(P.spriteForms || {}).flatMap(allImages),
      "assets/vfx/paladinHammerImpactAtlas.webp", "assets/vfx/barbarianBladeWindAtlas.webp", "assets/vfx/druidPrimalPulseAtlas.webp"])];
  }
  for (const key of ["paladinHammerImpact", "barbarianBladeWind", "druidPrimalPulse"]) {
    V.textures[key] = `assets/vfx/${key}Atlas.webp`;
    V.atlases[key] = { columns: 2, rows: 2, frames: 4, alpha: 0.75, anchorY: 0.5, maxSize: 200, edgeFade: 0.18, edgeInset: 0.07 };
    V.anim[key] = { duration: 0.55, size: 85, scaleFrom: 0.75, scaleTo: 1.1, additive: true };
  }
  V.hitBySkill.pal_zeal = "paladinHammerImpact";
  V.castOverrides.dru_bear = { key: "druidPrimalPulse", size: 132, duration: 0.6, alpha: 0.6, flatten: 0.65, rise: 0 };
  V.castOverrides.dru_wolf = { ...V.castOverrides.dru_bear };
})();
