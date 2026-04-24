//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import * as THREE from '/TheVertexFiles/three.module.js';
import {importVRX,importHeightmap} from '/TheVertexFiles/io.js';
import {Game, World, Audio, Player, PlayerConfig} from "/TheVertexFiles/core/state.js";
import {gameUI, loadUI, escape, loadGame} from "/TheVertexFiles/ui/ui.js";
import {createStartingPanel} from "/TheVertexFiles/ui/start.js";
import {GridMaterial} from "/TheVertexFiles/core/shader.js";
import {DDARaycast} from "/TheVertexFiles/core/raycast.js";
import {FastAStar} from "/TheVertexFiles/ai/astar.js";
import {EnemyAI, StaticTargetAI, aiTypes} from "/TheVertexFiles/ai/enemy_ai.js";
import {Enemy} from "/TheVertexFiles/core/enemy.js";
import {di, remove, loadOne, loadAll, rnd, getByPath} from "/TheVertexFiles/core/utils.js";

const UP = new THREE.Vector3(0, 1, 0);
Game.urlParams = new URLSearchParams(window.location.search);

let objects = {};
Game.sensivity = 0.02;
World.scene = new THREE.Scene();
Game.renderer = new THREE.WebGLRenderer();
Game.renderer.setSize(window.innerWidth, window.innerHeight);
Game.camera = new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,100);
World.pitch = new THREE.Object3D();
World.yaw = new THREE.Object3D();
World.yaw.add(World.pitch);
World.yaw.position.set(-2,0,-2);
World.pitch.add(Game.camera);
World.scene.add(World.yaw);
World.pitch.position.y+=2;
let level = 0;
Game.mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||Game.urlParams.get("Game.mobile")==="true";

export function startGame(tId,lId){
  const bullets = [];
  const enemies = [];
  let lvl,meta,tColor1,tColor2,spawner,eMaterial;
  
  function spawnEnemy(id){
    const template = objects[id];
    const enemy = template.clone();
    const x = rnd(World.box.min.x,World.box.max.x);
    const z = rnd(World.box.min.z,World.box.max.z);
    const y = World.mesh.heightmap.get(z,x)+1;
    enemy.position.set(x,y,z);
    const e = new Enemy(id,World.mesh,enemy.position,World.yaw.position);
    e.m = enemy;
    e.p = enemy.position;
    e.r = enemy.rotation;
    if(e.meta.scale){
      const s = e.meta.scale;
      enemy.scale.set(s,s,s);
    }
    enemy.children.forEach(e=>e.material = World.eMaterial);
    enemies.push(e);
    World.scene.add(enemy);
  }
  
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent="Loading level...";
    di("homeMenu").style.display = "none";
    lvl = Game.manifest.levels[tId][lId];
    meta = Game.manifest.levels[tId]?.meta??{};
    const mmx = await importHeightmap("./towers/"+meta.obj+".vrx");
    World.mesh = mmx.mesh;
    World.mesh.heightmap = mmx.map;
    World.mesh.geometry.computeBoundingBox();
    World.mesh.geometry.computeBoundingSphere();
    World.mesh.geometry.computeVertexNormals();
    World.box = new THREE.Box3().setFromObject(World.mesh);
    objects = {...objects,...(await loadAll(Object.values(lvl.enemies),loader,"./",".vrx"))};
    loader.textContent = "Loading audio...";
    await initAudio(meta.music||"music_01.mp3");
    di("game").style.display="block";
    di("game").appendChild(renderer.domElement);
    tColor1 = meta.color;
    tColor2 = meta["alt-color"]||0x000000;
    World.mesh.material = GridMaterial(tColor2,tColor1);
    Game.eMaterial = GridMaterial(tColor1,tColor2,0.5);
    World.scene.add(World.mesh);
    if(Game.urlParams.get("debug")==="true")showDebug();
    gameUI(tColor1,dash,anchor);
    spawner = setInterval(spawn,5000);
    di("loadscreen").style.display = "none";
  }

  async function initAudio(name){
    Audio.audioCtx = new (window.AudioContext||window.WebkitAudioContext)();
    Audio.analyser = Audio.audioCtx.createAnalyser();
    Audio.analyser.fftSize = 32;
    const res = await fetch("./music/"+name);
    const buff = await res.arrayBuffer();
    console.log(res, buff);
    const buffer = await audioCtx.decodeAudioData(buff);
    Audio.source = audioCtx.createBufferSource();
    Audio.source.buffer = buffer;
    Audio.source.connect(analyser);
    Audio.analyser.connect(audioCtx.destination);
    Audio.bin = new Uint8Array(analyser.frequencyBinCount);
    Audio.source.start();
  }

  function showDebug() {
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position = World.yaw.position;
    World.scene.add(axesHelper);
    const skeletonHelper = new THREE.SkeletonHelper(World.mesh);
    World.scene.add(skeletonHelper);
    if(Game.mobile){
      const origWarn = console.warn;
      const origError = console.error;

      console.warn = function (...args) {
        alert("WARN:\n" + args.join(" "));
        origWarn.apply(console, args);
      };

      console.error = function (...args) {
        alert("ERROR:\n" + args.join(" "));
        origError.apply(console, args);
      };
      window.onerror = function (message, source, lineno, colno, error) {
        alert("EXCEPTION:\n" + message + "\n" + source + ":" + lineno + ":" + colno);
      };
      window.onunhandledrejection = function (event) {
        alert("UNHANDLED PROMISE:\n" + event.reason);
      };
    }
    return { axesHelper, skeletonHelper };
  }
  
  function spawn(){
    let result = -1;
    let acc = 0;
    const keys = Object.keys(lvl.enemies);
    const weights = keys.map(Number);
    let sum = weights.reduce((acc,val)=>acc+val,0);
    let idx = rnd(0,sum);

    for(let i=0; i<weights.length; i++){
      if(acc <= idx && idx < acc + weights[i]){
        result = i;
        break;
      }
      acc += weights[i];
    }
    const chosenEnemyKey = keys[result];
    const template = lvl.enemies[chosenEnemyKey];
    spawnEnemy(template);
  }
  
  let last = 0;
  
  function loop(millis){
    if(!Game.running){
      reset();
      return;
    }
    if(Game.paused){
      last = millis;
      requestAnimationFrame(loop);
      analyse();
      Game.renderer.render(World.scene,Game.camera);
      return;
    }
    const d = millis - last;
    last = millis;
    const dTime = d*0.001;
    move(dTime);
    analyse();
    Game.renderer.render(World.scene,Game.camera);
    enemies.forEach(e=>e.move(dTime,0));
    requestAnimationFrame(loop);
  }

  function reset(){
    enemies.forEach(e=>remove(e.m));
    enemies.length = 0;
    bullets.length = 0;
    remove(World.mesh);
    clearInterval(spawner);
    console.log("CLEAR");
  }

  function analyse() {
    Audio.analyser.getByteTimeDomainData(Audio.bin);
    let sum = 0;
    for(let i=0;i<Audio.bin.length;i++){
        sum+=bin[i];
    }
    const avg = sum/Audio.bin.length;
    const energy = avg / 255;
    World.mesh.material.uniforms.thickness.value = (1.0+energy * energy * 2.0) * Game.lWidth;
  }
  
  const vFor = new THREE.Vector3();
  let hm = World.mesh.heightmap;

  function moveStep(dt){
    const stepSize = Player.speed * dt;
    const MAX_STEP = 0.3;
    const steps = Math.ceil(stepSize / MAX_STEP);
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      move(stepDt);
    }
  }

  function move(dt) {
    Game.camera.getWorldDirection(vFor);
    vFor.y = 0;
    vFor.normalize();
    let len = Math.hypot(Game.input.mx, Game.input.my);
    let inputX = len > 1 ? Game.input.mx / len : Game.input.mx;
    let inputZ = len > 1 ? Game.input.my / len : Game.input.my;
    const targetVX = (inputX * vFor.x + inputZ * -vFor.z) * Player.speed;
    const targetVZ = (inputX * vFor.z + inputZ *  vFor.x) * Player.speed;
    const t = Math.min(dt * 4, 1);
    Player.velocityX = Math.min(Player.speed, Player.velocityX + (targetVX - Player.velocityX) * t);
    Player.velocityY = Math.min(Player.speed, Player.velocityY + (targetVZ - Player.velocityY) * t);
    if (len === 0) {
      Player.velocityX *= Math.pow(0.8, dt * 60);
      Player.velocityY *= Math.pow(0.8, dt * 60);
    }
    let x = World.yaw.position.x;
    let z = World.yaw.position.z;
    let y = World.yaw.position.y;
    let nx = x + Player.velocityX * t;
    if (!checkCollisionXZ(nx, z, y)) nx = x;
    let nz = z + Player.velocityY * t;
    if (!checkCollisionXZ(nx, nz, y)) nz = z;
    x = nx;
    z = nz;
    Player.vertVec -= Game.gravity * dt;
    y += Player.vertVec * dt;
    const floorH = getMaxFloor(x, z);
    if (y <= floorH) {
      y = floorH;
      Player.vertVec = 0;
      Player.onGround = true;
    } else {
      Player.onGround = false;
    }
    World.yaw.position.set(x, y, z);
  }

  function dash(){
    if(performance.now()-Game.timers.dash<PlayerConfig.dashDelay)return;
    Game.timers.dash = performance.now();
    Game.camera.getWorldDirection(vFor);
    const o = World.yaw.position.clone();
    o.y+=0.5;
    const ray = new THREE.Ray(o,vFor);
    const hit = DDARaycast(World.mesh, ray, 0, PlayerConfig.dashLength);
    World.yaw.position.x = Math.floor(hit.point.x)+0.5;
    World.yaw.position.z = Math.floor(hit.point.z)+0.5;
    World.yaw.position.y = hit.point.y;
  }

  function anchor(){
    const floorH = getMaxFloor(World.yaw.position.x, World.yaw.position.z);
    World.yaw.position.y = floorH;
    Player.vertVec = 0;
    Player.onGround = true;
  }
  
  function checkCollisionXZ(px, pz, py) {
    const x0 = Math.floor(px - PlayerConfig.halfSize);
    const x1 = Math.floor(px + PlayerConfig.halfSize);
    const z0 = Math.floor(pz - PlayerConfig.halfSize);
    const z1 = Math.floor(pz + PlayerConfig.halfSize);
    const h00 = hm.get(z0, x0);
    const h01 = hm.get(z1, x0);
    const h10 = hm.get(z0, x1);
    const h11 = hm.get(z1, x1);
    const maxH = Math.max(h00, h01, h10, h11);
    return py > maxH - 0.00001;
  }

  function getMaxFloor(px, pz) {
    const x0 = Math.floor(px - PlayerConfig.halfSize);
    const x1 = Math.floor(px + PlayerConfig.halfSize);
    const z0 = Math.floor(pz - PlayerConfig.halfSize);
    const z1 = Math.floor(pz + PlayerConfig.halfSize);
    return Math.max(hm.get(z0, x0), hm.get(z1, x0), hm.get(z0, x1), hm.get(z1, x1));
  }
  
  start().then(()=>{
    hm = World.mesh.heightmap;
    requestAnimationFrame(loop);
  });
}

loadGame();
window.onload=loadUI;













