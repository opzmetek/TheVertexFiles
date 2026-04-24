//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import * as THREE from './three.module.js';
import {importVRX,importHeightmap} from './io.js';

//custom raycast
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const UP = new THREE.Vector3(0, 1, 0);
const urlParams = new URLSearchParams(window.location.search);
const gravity = 600,jumpStrength = 280;

function DDARaycast(mesh, ray, near=0, far=Infinity){
  if(!mesh.heightmap)return {hit:false,point:ray.origin,object:mesh,error:true,distance:0};
  const dx = ray.direction.x;
  const dy = ray.direction.y;
  const dz = ray.direction.z;
  let ox = ray.origin.x;
  let oy = ray.origin.y;
  let oz = ray.origin.z;
  const cellSize = 1;
  let cx = Math.floor(ox / cellSize);
  let cz = Math.floor(oz / cellSize);
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? cellSize / Math.abs(dx) : Infinity;
  const tDeltaZ = dz !== 0 ? cellSize / Math.abs(dz) : Infinity;
  let tMaxX = dx > 0 ? ((cx + 1) * cellSize - ox) / dx : dx < 0 ? (cx * cellSize - ox) / dx : Infinity;
  let tMaxZ = dz > 0 ? ((cz + 1) * cellSize - oz) / dz : dz < 0 ? (cz * cellSize - oz) / dz : Infinity;
  let t = 0;
  while (t < far) {
    const h = mesh.heightmap.get(cx,cz);
    if (h !== undefined) {
      const yHit = oy + dy * t;
      if (yHit <= h && t >= near) {
        const point = ray.at(t, new THREE.Vector3());
        return {
          hit: true,
          distance: t,
          point,
          object: mesh
        };
      }
    }
    if (tMaxX < tMaxZ) {
      cx += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else {
      cz += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
    if (cx < 0 || cz < 0 || cx >= mesh.heightmap.xLen || cz >= mesh.heightmap.yLen) break;
  }
  return {hit: false, distance: far, point: ray.at(far, new THREE.Vector3()), object:mesh};
}

class FastAStar {
  constructor(width, height){
    const len = width * height;
    this.w = width;
    this.h = height;
    this.len = len;
    this.g = new Float32Array(len);
    this.f = new Float32Array(len);
    this.parent = new Int32Array(len);
    this.closed = new Uint8Array(len);
    this.heap = new Int32Array(len);
    this.heapSize = 0;
    this.DX = new Int8Array([1,0,-1,0, 1,1,-1,-1]);
    this.DZ = new Int8Array([0,1,0,-1, 1,-1,1,-1]);
  }

  reset(){
    this.heapSize = 0;
    this.closed.fill(0);
    this.g.fill(Infinity);
    this.parent.fill(-1);
  }

  heapPush(idx){
    let i = this.heapSize++;
    const heap = this.heap;
    const f = this.f;
    while (i > 0){
      const p = (i - 1) >> 1;
      const parentIdx = heap[p];
      if (f[parentIdx] <= f[idx]) break;
      heap[i] = parentIdx;
      i = p;
    }
    heap[i] = idx;
  }

  heapPop(){
    const heap = this.heap;
    const f = this.f;
    const root = heap[0];
    const last = heap[--this.heapSize];
    let i = 0;
    while (true){
      let l = i * 2 + 1;
      let r = l + 1;
      if (l >= this.heapSize) break;
      let best = heap[l];
      let bestI = l;
      if (r < this.heapSize && f[heap[r]] < f[best]){
        best = heap[r];
        bestI = r;
      }
      if (f[last] <= f[best]) break;
      heap[i] = best;
      i = bestI;
    }
    heap[i] = last;
    return root;
  }
  find(hm, sx, sz, tx, tz, maxJump){
    sx|=0;sz|=0;tx|=0;tz|=0;
    console.log("Calling find with: ", hm, sx, sz, tx, tz, maxJump);
    const w = this.w, h = this.h;
    const hw = w>>1, hh = h>>1;
    const DX = this.DX, DZ = this.DZ;
    const start = (sx+hw) * w + (sz+hh);
    const target =(tx+hw) * w + (tz+hh);
    this.reset();
    const g = this.g;
    const f = this.f;
    const parent = this.parent;
    const closed = this.closed;
    g[start] = 0;
    f[start] = (tx - sx) * (tx - sx) + (tz - sz) * (tz - sz);
    parent[start] = -1;
    this.heapPush(start);
    while (this.heapSize > 0){
      const current = this.heapPop();
      if (closed[current]) continue;
      closed[current] = 1;
      if (current === target){
        return this.reconstruct(target);
      }
      const cx = (Math.floor(current / w))-hw;
      const cz = (current % w)-hh;
      const ch = hm.get(cz, cx);
      for (let i = 0; i < 8; i++){
        const dx = DX[i];
        const dz = DZ[i];
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < -hw || nz < -hh || nx >= hw || nz >= hh) continue;
        const nIdx = (nx+hw) * w + (nz+hh);
        if (closed[nIdx]) continue;
        const nh = hm.get(nz, nx);
        const diff = nh - ch;
        const hDiff = diff > 0 ? diff : 0;
        if (hDiff > maxJump) continue;
        const cost = (dx && dz ? 1.4142 : 1) + hDiff * 10;
        const newG = g[current] + cost;
        if (newG < g[nIdx]){
          g[nIdx] = newG;
          const ddx = tx - nx;
          const ddz = tz - nz;
          const h = ddx * ddx + ddz * ddz;
          f[nIdx] = newG + h;
          parent[nIdx] = current;
          this.heapPush(nIdx);
        }
      }
    }
    return [];
  }
  reconstruct(end){
    const parent = this.parent;
    const path = [];
    let cur = end;
    while (cur >= 0&&path.length<100){
      path.push(cur);
      cur = parent[cur];
    }
    path.reverse();
    console.log("Returning path with length: ",path.length);
    return path;
  }
}

//classes
class EnemyAI{
  constructor(mesh,enemy,target){
    this.mesh = mesh;
    this.hm = mesh.heightmap;
    this.enemy = enemy;
    this.target = target;
    this.temp = new THREE.Vector3();
    this.rotate = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.stuck = 0;
    this.easing = 2;
  }
  computeSteering(dt){
    return this.temp.subVectors(this.target, this.enemy.p).addScaledVector(this.rotate,this.stuck).normalize().multiplyScalar(this.enemy.speed);
  }
  updateSteering(dt){
    this.rotate.x += (Math.random()-0.5)*0.05;
    this.rotate.z += (Math.random()-0.5)*0.05;
  }
  move(dt){
    if(dt>0.4)dt=0.4;//spike
    const p = this.enemy.p;
    this.updateSteering(dt);
    const dir = this.computeSteering(dt);
    this.vel.lerp(dir,dt*this.easing);
    this.stuck*=Math.pow(0.98,dt);
    const y = p.y;
    let nx = p.x+this.vel.x*dt, nz = p.z+this.vel.z*dt;
    this.rotate.multiplyScalar(0.95);
    if(this.tryMove(nx, y, nz))return;
    else if(this.tryMove(nx, y, p.z))return;//only x
    else if(this.tryMove(p.x, y, nz))return;//only z
    this.onStuck();
  }
  onStuck(){
    this.rotate.set(Math.random()-0.5, 0, Math.random()-0.5);
    this.stuck = 1;
  }
  tryMove(x,y,z){
    const f = this.getMaxFloor(x, z);
    if(f > y+0.2)return false;
    this.enemy.p.set(x, f+0.001, z);
    return true;
  }
  getMaxFloor(px, pz) {
    const hm = this.hm;
    const x0 = Math.floor(px - this.enemy.halfSize), x1 = Math.floor(px + this.enemy.halfSize);
    const z0 = Math.floor(pz - this.enemy.halfSize), z1 = Math.floor(pz + this.enemy.halfSize);
    return Math.max(hm.get(z0, x0),hm.get(z1, x0),hm.get(z0, x1),hm.get(z1, x1));
  }
}

class StaticTargetAI{
  constructor(mesh, enemy, target){
    this.mesh = mesh;
    this.enemy = enemy;
    this.hm = mesh.heightmap;
    StaticTargetAI.checkAStar(this.hm);
    this.recompute(target);
    this.i = 0;
    this.t = 0;
  }

  recompute(target){
    this.path = StaticTargetAI.find(this.hm, this.enemy.p.x, this.enemy.p.z, this.target.x, this.target.z, this.enemy.maxJump);
    if(!this.path||this.path.length<2)return;
  }

  increment(){
    if(this.i+1>=this.path.length)return false;
    const p0 = this.path[this.i], p1 = this.path[this.i+1];
    const l = this.hm.xLen;
    this.x0 = p0%l+this.hm.xCenter;
    this.y0 = p0/l+this.hm.yCenter;
    const x1 = p1%l+this.hm.xCenter;
    const y1 = p1/l+this.hm.yCenter;
  }

  computeVerticalSpeed(hDiff){
    const L = Math.hypot(this.dx, this.dy);
    const t = L/this.enemy.speed;
    return (hDiff/t)+0.5*gravity*t;
  }

  move(dt){
    
  }

  static checkAStar(hm){
    if(!this.sharedAStar)this.sharedAStar = new FastAStar(hm.xLen, hm.yLen);
  }
}

const aiTypes = {base:EnemyAI};

class Enemy{
  constructor(name,tMesh,pos,target){
    this.name = name;
    this.p = pos;
    const meta = manifest.enemies[name];
    if(!meta)console.error("No enemy found:",name);
    this.maxHp = this.hp = meta.maxHP??100;
    this.maxJump = meta.maxJump??30;
    this.speed = meta.speed??20;
    this.size = meta.size??1;
    this.halfSize = this.size/2;
    const aiConst = aiTypes[meta.aiType]||"base";
    if(!aiConst)console.error("No ai found:",meta.aiType);
    this.ai = new aiConst(tMesh,this,target);
    if(meta.ai&&typeof meta.ai==="object"){
      Object.assign(this.ai,meta.ai);
    }
    this.r=null;
    this.m=null;
    this.meta = meta;
  }
  move(dt){
    this.ai.move(dt);
  }
}

//variables

let manifest;
let objects = {};
let sensivity = 0.02;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,100);
const pitch = new THREE.Object3D();
const yaw = new THREE.Object3D();
yaw.add(pitch);
yaw.position.set(-2,0,-2);
pitch.add(camera);
let player = {size:0.5,halfSize:0.25,speed:20,dashLength: 30, dashDelay: 1000};
scene.add(yaw);
pitch.position.y+=2;
let level = 0;
let mx=0,my=0;
let timers = {dash:0};
let speed = player.speed;
const keyCodes = {moveLeft:"a",moveRight:"d",moveFront:"w",moveBack:"s",jump:" ",sprint:"c",dash:"x",anchor:"e",escape:"escape"};
let vertVec = 0,onGround = true;
let audioCtx, analyser, bin, lWidth;
let velocityX = 0, velocityY = 0;
const mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||urlParams.get("mobile")==="true";
let paused = false;

di("cfar").onchange = e=>{
  camera.far = +e.target.value;
  camera.updateProjectionMatrix();
}

di("sensivity").onchange = e=>{
  sensivity = +e.target.value;
}

di("lWidth").onchange = e=>{
  lWidth = +e.target.value;
}

function startGame(tId,lId){
  const bullets = [];
  const enemies = [];
  let tMesh,tBox,lvl,meta,tColor1,tColor2,updater,spawner,eMaterial;
  
  function spawnEnemy(id){
    const template = objects[id];
    const enemy = template.clone();
    const x = rnd(tBox.min.x,tBox.max.x);
    const z = rnd(tBox.min.z,tBox.max.z);
    const y = tMesh.heightmap.get(z,x)+1;
    enemy.position.set(x,y,z);
    const e = new Enemy(id,tMesh,enemy.position,yaw.position);
    e.m = enemy;
    e.p = enemy.position;
    e.r = enemy.rotation;
    if(e.meta.scale){
      const s = e.meta.scale;
      enemy.scale.set(s,s,s);
    }
    enemy.children.forEach(e=>e.material = eMaterial);
    enemies.push(e);
    scene.add(enemy);
  }
  
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent="Loading level...";
    di("homeMenu").style.display = "none";
    lvl = manifest.levels[tId][lId];
    meta = manifest.levels[tId]?.meta??{};
    const mmx = await importHeightmap("./towers/"+meta.obj+".vrx");
    tMesh = mmx.mesh;
    tMesh.heightmap = mmx.map;
    tMesh.geometry.computeBoundingBox();
    tMesh.geometry.computeBoundingSphere();
    tMesh.geometry.computeVertexNormals();
    tBox = new THREE.Box3().setFromObject(tMesh);
    objects = {...objects,...(await loadAll(Object.values(lvl.enemies),loader,"./",".vrx"))};
    loader.textContent = "Loading audio...";
    await initAudio(meta.music||"music_01.mp3");
    di("game").style.display="block";
    di("game").appendChild(renderer.domElement);
    tColor1 = meta.color;
    tColor2 = meta["alt-color"]||0x000000;
    tMesh.material = GridMaterial(tColor2,tColor1);
    eMaterial = GridMaterial(tColor1,tColor2,0.5);
    scene.add(tMesh);
    let x0 = 0;
    while(tMesh.heightmap.get(0,x0)!=0)x0++;
    yaw.position.set(x0,2,0);
    if(urlParams.get("debug")==="true")showDebug();
    gameUI(tColor1,dash,anchor);
    spawner = setInterval(spawn,5000);
  }

  async function initAudio(name){
    audioCtx = new (window.AudioContext||window.WebkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 32;
    const res = await fetch("./music/"+name);
    const buff = await res.arrayBuffer();
    console.log(res, buff);
    const buffer = await audioCtx.decodeAudioData(buff);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    bin = new Uint8Array(analyser.frequencyBinCount);
    source.start();
  }

  function showDebug() {
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position = yaw.position;
    scene.add(axesHelper);
    const skeletonHelper = new THREE.SkeletonHelper(tMesh);
    scene.add(skeletonHelper);
    if(mobile){
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
    if(paused){
      last = millis;
      requestAnimationFrame(loop);
      analyse();
      renderer.render(scene,camera);
      return;
    }
    const d = millis - last;
    last = millis;
    const dTime = d*0.001;
    move(dTime);
    analyse();
    renderer.render(scene,camera);
    enemies.forEach(e=>e.move(dTime,0));
    requestAnimationFrame(loop);
  }

  function analyse() {
    analyser.getByteTimeDomainData(bin);
    let sum = 0;
    for(let i=0;i<bin.length;i++){
        sum+=bin[i];
    }
    const avg = sum/bin.length;
    const energy = avg / 255;
    tMesh.material.uniforms.thickness.value = 1.0+energy * energy * 2.0 * lWidth;
  }
  
  const vFor = new THREE.Vector3();
  let hm;

  function moveStep(dt){
    const stepSize = speed * dt;
    const MAX_STEP = 0.3;
    const steps = Math.ceil(stepSize / MAX_STEP);
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      move(stepDt);
    }
  }

  function move(dt) {
    camera.getWorldDirection(vFor);
    vFor.y = 0;
    vFor.normalize();
    let len = Math.hypot(mx, my);
    let inputX = len > 1 ? mx / len : mx;
    let inputZ = len > 1 ? my / len : my;
    const targetVX = (inputX * vFor.x + inputZ * -vFor.z) * speed;
    const targetVZ = (inputX * vFor.z + inputZ *  vFor.x) * speed;
    const t = Math.min(dt * 4, 1);
    velocityX = Math.min(speed, velocityX + (targetVX - velocityX) * t);
    velocityY = Math.min(speed, velocityY + (targetVZ - velocityY) * t);
    if (len === 0) {
      velocityX *= Math.pow(0.8, dt * 60);
      velocityY *= Math.pow(0.8, dt * 60);
    }
    let x = yaw.position.x;
    let z = yaw.position.z;
    let y = yaw.position.y;
    let nx = x + velocityX * t;
    if (!checkCollisionXZ(nx, z, y)) nx = x;
    let nz = z + velocityY * t;
    if (!checkCollisionXZ(nx, nz, y)) nz = z;
    x = nx;
    z = nz;
    vertVec -= gravity * dt;
    y += vertVec * dt;
    const floorH = getMaxFloor(x, z);
    if (y <= floorH) {
      y = floorH;
      vertVec = 0;
      onGround = true;
    } else {
      onGround = false;
    }
    yaw.position.set(x, y, z);
  }

  function dash(){
    if(performance.now()-timers.dash<player.dashDelay)return;
    timers.dash = performance.now();
    camera.getWorldDirection(vFor);
    const o = yaw.position.clone();
    o.y+=0.5;
    const ray = new THREE.Ray(o,vFor);
    const hit = DDARaycast(tMesh, ray, 0, player.dashLength);
    yaw.position.x = Math.floor(hit.point.x)+0.5;
    yaw.position.z = Math.floor(hit.point.z)+0.5;
    yaw.position.y = hit.point.y;
  }

  function anchor(){
    const floorH = getMaxFloor(yaw.position.x, yaw.position.z);
    yaw.position.y = floorH;
    vertVec = 0;
    onGround = true;
  }
  
  function checkCollisionXZ(px, pz, py) {
    const x0 = Math.floor(px - player.halfSize);
    const x1 = Math.floor(px + player.halfSize);
    const z0 = Math.floor(pz - player.halfSize);
    const z1 = Math.floor(pz + player.halfSize);
    const h00 = hm.get(z0, x0);
    const h01 = hm.get(z1, x0);
    const h10 = hm.get(z0, x1);
    const h11 = hm.get(z1, x1);
    const maxH = Math.max(h00, h01, h10, h11);
    return py > maxH - 0.00001;
  }

  function getMaxFloor(px, pz) {
    const x0 = Math.floor(px - player.halfSize);
    const x1 = Math.floor(px + player.halfSize);
    const z0 = Math.floor(pz - player.halfSize);
    const z1 = Math.floor(pz + player.halfSize);
    return Math.max(hm.get(z0, x0), hm.get(z1, x0), hm.get(z0, x1), hm.get(z1, x1));
  }
  
  start().then(()=>{
    hm = tMesh.heightmap;
    requestAnimationFrame(loop);
  });
}

function getByPath(obj,path,stepsUp=0){
  const p=path.split('.');
  return (stepsUp>0?p.slice(0,-stepsUp):p).reduce((acc, key) => acc?.[key], obj);
}

function rnd(min,max){
  return min+Math.floor(Math.random()*(max-min));
}

function di(n){
  return document.getElementById(n);
}

async function loadAll(arr,loader,prefix = "",suffix = ""){
  const objects = [];
  for(const o of arr){
    const array = (await loadOne(prefix+o+suffix, loader));
    const group = new THREE.Group();
    array.forEach(m=>group.add(m));
    objects[o] = group;
  }
  return objects;
}

async function loadOne(o,loader){
  if(loader)loader.textContent=("From "+o);
  return await importVRX(o);
}

async function loadGame(){
  const loadscreen = document.getElementById("loadscreen");
  const loader = document.createElement("span");
  loadscreen.appendChild(loader);
  loader.className="small";
  loader.id = "loader";
  try{
    loader.textContent = "Loading game...";
    const mRes = await fetch("./game-descriptor.json");
    manifest = await mRes.json();
    loader.textContent = "Starting game...";
    setTimeout(function() {
      loadscreen.style.display="none";
      document.getElementById("homeMenu").style.display="block";
    }, 1000);
  }catch(e){
    loader.textContent="Error: "+e;
    console.error(e);
  }
}

function loadUI(){
  di("start-game").onclick=createStartingPanel;
  window.addEventListener("resize",e=>{
   renderer.setSize(window.innerWidth,window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

function escape(){
  paused = !paused;
  if(paused){
    di("options").style.display="flex";
  }else{
    di("options").style.display="none";
  }
  console.log("escape");
}

function remove(m){
  scene.remove(m);
  if(m.material)m.material.dispatch();
  if(m.geometry)m.geometry.dispatch();
  if(m.childern)m.childern.forEach(c=>remove(c));
}

function gameUI(color,dash,anchor){
  const keys = {};
  document.addEventListener("keydown",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    keys[k]=true;
    if(k===keyCodes.jump&&onGround&&!paused)vertVec = jumpStrength;
    else if(k===keyCodes.dash&&!paused)dash();
    else if(k===keyCodes.anchor&&!paused)anchor();
    else if(k===keyCodes.escape)escape();
    updateKeys();
  });
  document.addEventListener("keyup",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    delete keys[k];
    if(k===keyCodes.jump&&!paused)vertVec = 0;
    updateKeys();
  });
  
  function updateKeys(){
    if(paused)return;
    if(keys[keyCodes.moveBack])mx=-1;
    else if(keys[keyCodes.moveFront])mx=1;
    else mx=0;
    if(keys[keyCodes.moveLeft])my=-1;
    else if(keys[keyCodes.moveRight])my=1;
    else my=0;
    if(keys[keyCodes.sprint])speed = player.speed*2;
    else speed = player.speed;
  }
  if(mobile){
    let ly,lx;
    renderer.domElement.addEventListener("pointermove",e=>{
      const x = e.clientX,y = e.clientY;
      if(ly===undefined||lx===undefined){
        ly=y;
        lx=x;
      }
      const dx = lx-x,dy=ly-y;
      yaw.rotation.y+=dx*sensivity;
      pitch.rotation.x = Math.max(Math.min(pitch.rotation.x+dy*sensivity,Math.PI*0.5),-Math.PI*0.5);
      lx=x;
      ly=y;
    });
    renderer.domElement.addEventListener("pointerdown",e=>{
      if(!document.pointerLockElement)pointerLock();
      lx=e.clientX;ly=e.clientY;
    });
    const joystick = window.nipplejs.create({
      zone:di("joystick"),
      mode:"static",
      position:{left:"50px",bottom:"50px"},
      size:100,
      color:color
    });
    const ctrls = document.createElement("div");
    ctrls.id = "mobile-controls";
    di("game").appendChild(ctrls);
    const jumpBtn = document.createElement("button");
    ctrls.appendChild(jumpBtn);
    jumpBtn.textContent="⬆️";
    jumpBtn.onpointerdown = e=>{
      if(onGround&&!paused)vertVec = jumpStrength;
    }
    const dashBtn = document.createElement("button");
    ctrls.appendChild(dashBtn);
    dashBtn.textContent="💨";
    dashBtn.onpointerdown = dash;
    const anchorBtn = document.createElement("button");
    ctrls.appendChild(anchorBtn);
    anchorBtn.textContent="⏬";
    anchorBtn.onpointerdown = anchor;
    const sprintBtn = document.createElement("button");
    ctrls.appendChild(sprintBtn);
    sprintBtn.textContent="⏩";
    sprintBtn.onpointerdown = e=>{
      if(speed>player.speed)speed = player.speed;
      else if(speed===player.speed)speed = player.speed*2;
    }
    const escBtn=document.createElement("button");
    ctrls.appendChild(escBtn);
    escBtn.textContent="⏸️";
    escBtn.onclick=escape;
    joystick.on("move",(e,data)=>{
      my=data.vector.x * data.force;
      mx=data.vector.y * data.force;
    });
    joystick.on("end",()=>{
      mx = 0;
      my = 0;
    });
  }else{
    renderer.domElement.addEventListener("pointermove",e=>{
      yaw.rotation.y-=e.movementX*sensivity;
      pitch.rotation.x = Math.max(Math.min(pitch.rotation.x-e.movementY*sensivity,Math.PI*0.5),-Math.PI*0.5);
    });
    renderer.domElement.addEventListener("pointerdown",e=>{
      if(!document.pointerLockElement)pointerLock();
    })
  }
}

loadGame();
window.onload=loadUI;

const GridMaterial = (bc = 0x000000,lineColor = 0xffa500,squareSize = 2.5) => new THREE.ShaderMaterial({
  uniforms: {
    lineColor: { value: new THREE.Color(lineColor) },
    squareSize: { value: squareSize },
    thickness: { value: 1.0 },
    baseColor: { value: new THREE.Color(bc) },
  },
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
precision highp float;
uniform float squareSize;
uniform float thickness;
uniform vec3 lineColor;
uniform vec3 baseColor;
varying vec3 vWorldPos;

void main() 
{
    vec3 pos = vWorldPos;
    vec3 color = lineColor;

    // --- derivace pro anti-aliasing ---
    float dXx = abs(dFdx(pos.x));
    float dYx = abs(dFdy(pos.x));
    float dXy = abs(dFdx(pos.y));
    float dYy = abs(dFdy(pos.y));
    float dXz = abs(dFdx(pos.z));
    float dYz = abs(dFdy(pos.z));

    float widthX = max(dXx, dYx) * 2.5 * thickness;
    float widthY = max(dXy, dYy) * 2.5 * thickness;
    float widthZ = max(dXz, dYz) * 2.5 * thickness;

    float alpha = 0.0;

    // --- osa X (linky v rovině YZ) ---
    float rem = mod(pos.x, squareSize);
    alpha += smoothstep(widthX,0.0, rem);
    alpha += smoothstep(widthX,0.0, squareSize - rem);

    // --- osa Y (linky v rovině XZ) ---
    rem = mod(pos.y, squareSize);
    alpha += smoothstep(widthY,0.0, rem);
    alpha += smoothstep(widthY,0.0, squareSize - rem);

    // --- osa Z (linky v rovině XY) ---
    rem = mod(pos.z, squareSize);
    alpha += smoothstep(widthZ,0.0, rem);
    alpha += smoothstep(widthZ,0.0, squareSize - rem);

    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(mix(baseColor,color, alpha),1.0);
}
  `,
});

function pointerLock(){
  const gcanvas = di("game");
  gcanvas.requestFullscreen().then(()=>{
    renderer.domElement.requestPointerLock();
  });
}

function createStartingPanel() {
    let existing = document.getElementById('starting');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'starting';
    container.className = 'c';
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.gap = '20px';
    container.style.padding = '20px';
    container.style.background = 'linear-gradient(145deg, #0e1625, #101c33)';
    container.style.border = '2px solid #3db4ff';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 0 20px rgba(61,180,255,0.6),0 0 40px rgba(61,180,255,0.3)';

    document.body.appendChild(container);

    // --- Krok 1: zobrazíme věže ---
    function showTowers() {
        container.innerHTML = ''; // vyčistíme container
        const title = document.createElement('span');
        title.textContent = 'Select Tower';
        title.className = 'large glow';
        title.onclick = cancel;
        container.appendChild(title);

        const towerContainer = document.createElement('div');
        towerContainer.style.display = 'flex';
        towerContainer.style.gap = '15px';
        towerContainer.style.flexWrap = 'wrap';
        towerContainer.style.justifyContent = 'center';
        container.appendChild(towerContainer);

        for (let towerName in manifest.levels) {
            const color = manifest.levels[towerName].meta.color || '#3db4ff';
            const color2 = manifest.levels[towerName].meta["alt-color"]||"#fff";
            // SVG / rectangle
            const towerDiv = document.createElement('div');
            towerDiv.style.width = '80px';
            towerDiv.style.height = '80px';
            towerDiv.style.backgroundColor = color;
            towerDiv.style.borderRadius = '12px';
            towerDiv.style.display = 'flex';
            towerDiv.style.alignItems = 'center';
            towerDiv.style.justifyContent = 'center';
            towerDiv.style.color = color2;
            towerDiv.style.fontFamily = 'DytSans';
            towerDiv.style.fontSize = '0.5rem';
            towerDiv.style.cursor = 'pointer';
            towerDiv.style.boxShadow = '0 0 10px rgba(61,180,255,0.4),0 0 20px rgba(61,180,255,0.2)';
            towerDiv.textContent = towerName;

            towerDiv.addEventListener('click', () => {
                showLevels(towerName);
            });

            towerContainer.appendChild(towerDiv);
        }
    }
    
    function cancel(){
      container.remove();
    }

    // --- Krok 2: zobrazíme levely pro vybranou věž ---
    function showLevels(towerName) {
        container.innerHTML = '';
        const title = document.createElement('span');
        title.textContent = `Select Level for ${towerName}`;
        title.className = 'large glow';
        title.onclick = cancel;
        container.appendChild(title);

        const levelsContainer = document.createElement('div');
        levelsContainer.style.display = 'flex';
        levelsContainer.style.gap = '10px';
        levelsContainer.style.flexDirection = 'column';
        levelsContainer.style.alignItems = 'center';
        container.appendChild(levelsContainer);

        const levels = manifest.levels[towerName];
        const color = levels.meta.color || '#3db4ff';
        const color2= levels.meta["alt-color"]||"#fff";
        for (let levelName in levels) {
          if(levelName==="meta")continue;
            const levelDiv = document.createElement('div');
            levelDiv.style.width = '200px';
            levelDiv.style.padding = '10px';
            levelDiv.style.backgroundColor = color;
            levelDiv.style.borderRadius = '8px';
            levelDiv.style.color = color2;
            levelDiv.style.fontFamily = 'DytSans';
            levelDiv.style.fontSize = '1rem';
            levelDiv.style.textAlign = 'center';
            levelDiv.style.cursor = 'pointer';
            levelDiv.style.boxShadow = '0 0 10px rgba(61,180,255,0.4),0 0 20px rgba(61,180,255,0.2)';
            levelDiv.textContent = levelName;

            levelDiv.addEventListener('click', () => {
                // spustí hru
                startGame(towerName,levelName);
                pointerLock();
                container.remove(); // zmizí panel
            });

            levelsContainer.appendChild(levelDiv);
        }
    }

    showTowers();
}












