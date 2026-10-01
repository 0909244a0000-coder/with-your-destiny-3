// 3Dデモ：斜め見下ろしで、骨入りキャラ（バーバリアン）と骸骨が自動で殴り合う。
// 歩き・攻撃・被弾・死亡・出現のモーション、ヒットストップ・のけぞり・画面の揺れ・火花・斬撃の光、武器の差し替え。
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { CONFIG as C } from "./config.js";

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- 画面の準備 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$("stage").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.fog.color);
scene.fog = new THREE.Fog(C.fog.color, C.fog.near, C.fog.far);

const camera = new THREE.PerspectiveCamera(C.camera.fov, window.innerWidth / window.innerHeight, 0.1, 100);
const camOffset = new THREE.Vector3(...C.camera.offset);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 明かり：うす暗い全体光＋月明かり（影）＋主人公のたいまつ
scene.add(new THREE.HemisphereLight(0x8090c0, 0x302010, 1.1));
const moon = new THREE.DirectionalLight(0x8aa0ff, 1.1);
moon.position.set(-6, 12, 4);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
scene.add(moon, moon.target);
const torch = new THREE.PointLight(C.torch.color, C.torch.intensity, C.torch.distance, 1.6);
scene.add(torch);

// 地面：石だたみの模様をその場で描く（外部の絵は使わない）
function stoneTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 512;
  const g = cv.getContext("2d");
  g.fillStyle = "#2a2520";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = 30 + Math.floor(Math.random() * 18);
    g.fillStyle = `rgb(${v + 6},${v},${v - 6})`;
    g.fillRect(x * 64 + 2 + (y % 2) * 32, y * 64 + 2, 60, 60);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
// 柱（奥行きと影が分かるように）
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2, r = rand(9, 14);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, rand(2.5, 4.5), 8), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 1 }));
  pillar.position.set(Math.cos(a) * r, pillar.geometry.parameters.height / 2, Math.sin(a) * r);
  pillar.castShadow = pillar.receiveShadow = true;
  scene.add(pillar);
}

// ---------- 演出の設定（画面のチェックで切り替え） ----------
const opt = { hitStop: true, shake: true, knock: true, fx: true, slow: false };
for (const k of ["hitStop", "shake", "knock", "fx"]) $(k).onchange = (e) => (opt[k] = e.target.checked);
$("slow").onchange = (e) => (opt.slow = e.target.checked);

// ---------- キャラ ----------
// 右手の武器を付ける骨（読み込むと名前の「.」が消えて handslotr になる）
const handSlot = (root) => root.getObjectByName("handslotr") || root.getObjectByName("handslot.r");
const loader = new GLTFLoader();

// 1体ぶんの準備：アニメーション、光らせるための材質、影
function makeActor(root, clips, cfg) {
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of clips) actions[clip.name] = mixer.clipAction(clip);
  const mats = [];
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.material = o.material.clone();   // キャラごとに別の材質（光らせても他に移らない）
      o.material.emissive = new THREE.Color(0, 0, 0);
      mats.push(o.material);
    }
  });
  scene.add(root);
  return { root, mixer, actions, mats, cfg, hp: cfg.hp, maxHp: cfg.hp, state: "idle", current: null,
    cooldown: 0, vel: new THREE.Vector3(), flash: 0, hitDone: false, stateTime: 0 };
}

// アニメーションを切り替える（なめらかにつなぐ）
function play(a, name, { once = false, fade = 0.15, speed = 1 } = {}) {
  const act = a.actions[name];
  if (!act) return;
  if (a.current === act && !once) return;
  act.reset();
  act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  act.clampWhenFinished = once;
  act.timeScale = speed;
  act.fadeIn(fade).play();
  if (a.current && a.current !== act) a.current.fadeOut(fade);
  a.current = act;
}
const progress = (a) => (a.current ? a.current.time / a.current.getClip().duration : 1);

let player, enemy, enemyAsset, swordAsset, attachedWeapon = null, weaponKey = "dual";

// 主人公の武器を差し替える
function setWeapon(key) {
  weaponKey = key;
  const w = C.weapons[key];
  player.root.traverse((o) => {
    if (C.allWeaponMeshes.includes(o.name)) o.visible = (w.show || []).includes(o.name);
  });
  if (attachedWeapon) attachedWeapon.removeFromParent();
  attachedWeapon = null;
  if (w.attach) {
    const hand = handSlot(player.root);
    attachedWeapon = swordAsset.clone(true);
    attachedWeapon.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    hand.add(attachedWeapon);
  }
  player.state = "idle";
  play(player, w.idle, { fade: 0.2 });
  for (const b of document.querySelectorAll("[data-weapon]")) b.classList.toggle("on", b.dataset.weapon === key);
}

function spawnEnemy() {
  if (enemy) scene.remove(enemy.root);
  const root = cloneSkinned(enemyAsset.scene);
  const blade = enemyAsset.blade.clone(true);
  handSlot(root).add(blade);
  root.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
  const a = (Math.random() * Math.PI * 2);
  root.position.set(player.root.position.x + Math.cos(a) * 6, 0, player.root.position.z + Math.sin(a) * 6);
  enemy = makeActor(root, enemyAsset.animations, C.enemy);
  for (const m of enemy.mats) m.color.multiply(new THREE.Color(C.enemy.tint));
  face(enemy, player.root.position);
  enemy.state = "spawn";
  play(enemy, C.enemyAnims.spawn, { once: true, fade: 0 });
}

// ---------- 自動の戦い ----------
function face(a, target) {
  const dx = target.x - a.root.position.x, dz = target.z - a.root.position.z;
  a.root.rotation.y = Math.atan2(dx, dz);
}

function anims(a) {
  return a === player ? { ...C.weapons[weaponKey], ...C.playerAnims } : C.enemyAnims;
}

function think(a, foe, dt) {
  const A = anims(a);
  a.stateTime += dt;
  a.cooldown -= dt;
  if (a.state === "dead") return;
  if (a.state === "spawn") {
    if (progress(a) >= 0.98) { a.state = "idle"; play(a, A.idle); }
    return;
  }
  if (a.state === "hit") {
    if (progress(a) >= 0.85) { a.state = "idle"; play(a, A.idle); }
    return;
  }
  if (!foe || foe.state === "dead" || foe.state === "spawn") {
    if (a.state !== "idle") { a.state = "idle"; play(a, A.idle); }
    return;
  }
  const d = a.root.position.distanceTo(foe.root.position);
  if (a.state === "attack") {
    // 決まったところで当たる
    if (!a.hitDone && progress(a) >= C.hitAt) {
      a.hitDone = true;
      if (d <= a.cfg.reach + 0.6) strike(a, foe);
    }
    if (progress(a) >= 0.97) { a.state = "idle"; a.cooldown = a.cfg.cooldown; play(a, A.idle); }
    return;
  }
  face(a, foe.root.position);
  if (d > a.cfg.reach) {
    a.state = "move";
    play(a, A.run);
    const dir = foe.root.position.clone().sub(a.root.position).setY(0).normalize();
    a.root.position.addScaledVector(dir, Math.min(a.cfg.speed * dt, d - a.cfg.reach * 0.9));
  } else if (a.cooldown <= 0) {
    a.state = "attack";
    a.hitDone = false;
    play(a, A.attacks[Math.floor(Math.random() * A.attacks.length)], { once: true, fade: 0.08, speed: A.speed || 1 });
  } else if (a.state !== "idle") {
    a.state = "idle";
    play(a, A.idle);
  }
}

let hitStopTimer = 0, shakeTimer = 0;
function strike(a, foe) {
  const crit = Math.random() < C.critChance;
  const power = a === player ? C.weapons[weaponKey].power : 1;
  const dmg = Math.round(rand(...a.cfg.attack) * power * (crit ? 1.8 : 1));
  foe.hp -= dmg;
  const hitPos = foe.root.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  const dir = foe.root.position.clone().sub(a.root.position).setY(0).normalize();
  if (opt.hitStop) hitStopTimer = C.hitStop * (crit ? 1.8 : 1);
  if (opt.shake) shakeTimer = crit ? 0.25 : 0.15;
  if (opt.knock) foe.vel.copy(dir).multiplyScalar(C.knockback * (crit ? 1.5 : 1));
  foe.flash = C.flash;
  if (opt.fx) { sparks(hitPos, dir, crit); slash(hitPos, dir, crit); hitLight(hitPos); }
  damageNumber(hitPos, dmg, crit, a === player);
  const A = anims(foe);
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.state = "dead";
    play(foe, A.death, { once: true, fade: 0.05 });
    setTimeout(() => {
      if (foe === enemy) spawnEnemy();
      else { player.hp = player.maxHp; player.state = "idle"; play(player, anims(player).idle); }
    }, C.enemy.respawn * 1000);
  } else if (foe.state !== "attack" || crit) {
    foe.state = "hit";
    play(foe, A.hit, { once: true, fade: 0.04, speed: 1.4 });
  }
}

// ---------- エフェクト ----------
const fxGroup = new THREE.Group();
scene.add(fxGroup);
const effects = [];

function sparks(pos, dir, crit) {
  const n = crit ? 40 : 18;
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) {
    p.set([pos.x, pos.y, pos.z], i * 3);
    v.push(new THREE.Vector3(dir.x + rand(-0.8, 0.8), rand(0.2, 1.4), dir.z + rand(-0.8, 0.8)).multiplyScalar(rand(3, 7)));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const mat = new THREE.PointsMaterial({ color: crit ? 0xffd04a : 0xfff0c0, size: crit ? 0.14 : 0.09, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  fxGroup.add(pts);
  effects.push({ obj: pts, life: 0.45, max: 0.45, update: (dt) => {
    for (let i = 0; i < n; i++) {
      v[i].y -= 9.8 * dt;
      p[i * 3] += v[i].x * dt; p[i * 3 + 1] = Math.max(0.02, p[i * 3 + 1] + v[i].y * dt); p[i * 3 + 2] += v[i].z * dt;
    }
    geo.attributes.position.needsUpdate = true;
  } });
}

function slash(pos, dir, crit) {
  // 斬撃の光：三日月の帯をすばやく広げて消す
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.5, crit ? 0.95 : 0.8, 32, 1, 0, Math.PI * 0.85),
    new THREE.MeshBasicMaterial({ color: crit ? 0xffd890 : 0xe8f4ff, transparent: true, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh.position.copy(pos);
  mesh.lookAt(pos.clone().add(new THREE.Vector3(dir.z, 0.6, -dir.x)));
  mesh.rotation.z += rand(-1, 1);
  fxGroup.add(mesh);
  effects.push({ obj: mesh, life: 0.16, max: 0.16, update: (dt, t) => mesh.scale.setScalar(0.7 + 0.6 * (1 - t)) });
}

function hitLight(pos) {
  const l = new THREE.PointLight(0xffc080, 25, 5, 2);
  l.position.copy(pos);
  scene.add(l);
  effects.push({ obj: l, life: 0.1, max: 0.1, light: true });
}

function damageNumber(pos, dmg, crit, byPlayer) {
  const el = document.createElement("div");
  el.className = "dmg" + (crit ? " crit" : "") + (byPlayer ? "" : " hurt");
  el.textContent = crit ? `${dmg}!` : dmg;
  $("overlay").appendChild(el);
  effects.push({ dom: el, pos: pos.clone(), life: 0.9, max: 0.9 });
}

function updateEffects(dt) {
  for (const e of effects) {
    e.life -= dt;
    const t = Math.max(0, e.life / e.max);
    if (e.update) e.update(dt, t);
    if (e.obj && e.obj.material) e.obj.material.opacity = t;
    if (e.light) e.obj.intensity = 25 * t;
    if (e.dom) {
      e.pos.y += dt * 1.2;
      const s = e.pos.clone().project(camera);
      e.dom.style.left = `${(s.x * 0.5 + 0.5) * window.innerWidth}px`;
      e.dom.style.top = `${(-s.y * 0.5 + 0.5) * window.innerHeight}px`;
      e.dom.style.opacity = Math.min(1, t * 2);
      e.dom.style.transform = `translate(-50%,-50%) scale(${1 + Math.max(0, (t - 0.85) * 4)})`;
    }
  }
  for (const e of effects.filter((x) => x.life <= 0)) {
    if (e.obj) { e.obj.removeFromParent(); if (e.obj.geometry) e.obj.geometry.dispose(); }
    if (e.dom) e.dom.remove();
  }
  effects.splice(0, effects.length, ...effects.filter((x) => x.life > 0));
}

// 頭の上のHPバー
function updateBars() {
  for (const [a, el] of [[player, $("hp-player")], [enemy, $("hp-enemy")]]) {
    if (!a) continue;
    const s = a.root.position.clone().add(new THREE.Vector3(0, 2.4, 0)).project(camera);
    el.style.left = `${(s.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-s.y * 0.5 + 0.5) * window.innerHeight}px`;
    el.firstElementChild.style.width = `${(a.hp / a.maxHp) * 100}%`;
    el.style.opacity = a.state === "dead" ? 0 : 1;
  }
}

// ---------- 毎コマ ----------
let lastTime = performance.now();
function frame(now) {
  let dt = Math.min(0.05, ((now || performance.now()) - lastTime) / 1000);
  lastTime = now || performance.now();
  if (opt.slow) dt *= 0.3;
  // ヒットストップ：当たった瞬間、ほんの少しだけ時間を止める
  let simDt = dt;
  if (hitStopTimer > 0) { hitStopTimer -= dt; simDt = dt * 0.03; }

  for (const a of [player, enemy]) {
    if (!a) continue;
    const foe = a === player ? enemy : player;
    think(a, foe, simDt);
    // のけぞり：後ろへすべって止まる
    a.root.position.addScaledVector(a.vel, simDt);
    a.vel.multiplyScalar(Math.max(0, 1 - 9 * simDt));
    a.mixer.update(simDt);
    a.flash = Math.max(0, a.flash - dt);
    const f = a.flash > 0 ? 1.4 : 0;
    for (const m of a.mats) m.emissive.setRGB(f, f, f);
  }
  if (player.state !== "dead") player.hp = Math.min(player.maxHp, player.hp + C.player.regen * simDt);

  // カメラ：主人公を追いかけ、揺れを足す
  const want = player.root.position.clone().add(camOffset);
  camera.position.lerp(want, 1 - Math.exp(-C.camera.follow * dt));
  if (shakeTimer > 0) {
    shakeTimer -= dt;
    camera.position.x += rand(-1, 1) * C.shake * (shakeTimer / 0.25);
    camera.position.y += rand(-1, 1) * C.shake * (shakeTimer / 0.25);
  }
  camera.lookAt(player.root.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
  torch.position.copy(player.root.position).add(new THREE.Vector3(0.8, C.torch.height, 1.2));
  moon.position.copy(player.root.position).add(new THREE.Vector3(-6, 12, 4));
  moon.target.position.copy(player.root.position);

  updateEffects(dt);
  updateBars();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- 読み込み ----------
async function start() {
  const [pg, eg, blade, sword] = await Promise.all([
    loader.loadAsync(C.player.model), loader.loadAsync(C.enemy.model),
    loader.loadAsync(C.enemy.weapon), loader.loadAsync(C.weapons.sword.attach),
  ]);
  swordAsset = sword.scene;
  enemyAsset = { scene: eg.scene, animations: eg.animations, blade: blade.scene };
  player = makeActor(pg.scene, pg.animations, C.player);
  $("weapons").innerHTML = Object.entries(C.weapons)
    .map(([k, w]) => `<button data-weapon="${k}">${w.label}</button>`).join("");
  $("weapons").onclick = (e) => { const b = e.target.closest("[data-weapon]"); if (b) setWeapon(b.dataset.weapon); };
  setWeapon("dual");
  spawnEnemy();
  camera.position.copy(player.root.position).add(camOffset);
  $("loading").remove();
  window.DEMO = { get player() { return player; }, get enemy() { return enemy; }, setWeapon };   // 確かめる用
  requestAnimationFrame(frame);
}
start().catch((e) => { $("loading").textContent = "読み込みに失敗しました：" + e.message; console.error(e); });
