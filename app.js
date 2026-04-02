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
const urlParams = new URLSearchParams(window.location.search);

const DDARaycast = function(raycaster, intersects){
  if(!this.heightmap)return;
  const ray = raycaster.ray;
  const dx = ray.direction.x;
  const dy = ray.direction.y;
  const dz = ray.direction.z;
  const len = ray.direction.length();
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
  while (t < raycaster.far) {
    const h = this.heightmap.get(cx,cz);
    if (h !== undefined) {
      const yHit = oy + dy * t;
      if (yHit <= h && t >= raycaster.near) {
        const point = ray.at(t, new THREE.Vector3());
        intersects.push({
          distance: t,
          point,
          object: this
        });
        break;
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
    if (cx < 0 || cz < 0 || cx >= this.heightmap.xLen || cz >= this.heightmap.yLen) break;
  }
}

//classes

class BaseSteeringAI {
  constructor(mesh,pos) {
    this.mesh = mesh;

    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();

    this.maxSpeed = 10;
    this.maxForce = 1;

    this.lookAhead = 2.0;
    this.radius = 0.5;

    this.target = null;
    this.position=pos.clone();
  }

  update(dt) {
    let steer = new THREE.Vector3();

    if (this.target) {
      steer.add(this.computeSteering(dt));
    }

    steer.add(this.obstacleAvoidance());

    steer.clampLength(0, this.maxForce);

    this.applyForces(steer);
    this.integrate(dt);
  }

  computeSteering(dt) {
    return this.seek(this.target.position);
  }

  seek(target) {
    console.log(target);
    const desired = target.clone().sub(this.position);
    const d = desired.length();

    if (d === 0) return new THREE.Vector3();

    desired.normalize().multiplyScalar(this.maxSpeed);
    return desired.sub(this.velocity);
  }
  
  flee(target) {
    const desired = new THREE.Vector3().subVectors(this.position, target);

    if (desired.lengthSq() === 0) return new THREE.Vector3();

    desired.normalize().multiplyScalar(this.maxSpeed);

    const steer = desired.sub(this.velocity);
    steer.clampLength(0, this.maxForce);

    return steer;
  }


  applyForces(f) {
    this.acceleration.add(f);
  }

  integrate(dt) {
    this.velocity.addScaledVector(this.acceleration, dt);
    this.velocity.clampLength(0, this.maxSpeed);

    this.acceleration.set(0, 0, 0);
  }

  obstacleAvoidance() {
    if (this.velocity.lengthSq() < 0.001) return new THREE.Vector3();

    const dir = this.velocity.clone().normalize();

    const origin = this.position.clone().addScaledVector(dir, this.radius).add(new THREE.Vector3(0,1,0));

    const ray = new THREE.Ray(origin, dir);

    raycaster.ray = ray;
    const hit = raycaster.intersectObject(this.mesh,true)[0];
    if (!hit || hit.distance > this.lookAhead) return new THREE.Vector3();

    const avoid = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    avoid.normalize().multiplyScalar(this.maxForce * 2);

    return avoid;
  }

  setTarget(v) {
    this.target = { position: v };
  }
}

class SniperAI extends BaseSteeringAI {
  constructor(mesh) {
    super(mesh);
    this.preferredDist = 10;
    this.orbitStrength = 0.5;
  }

  computeSteering(dt) {
    const targetPos = this.target.position;

    const dist = this.position.distanceTo(targetPos);

    if (dist < this.preferredDist - 1)
      return this.flee(targetPos);

    if (dist > this.preferredDist + 1)
      return this.seek(targetPos).add(this.orbit());

    return this.orbit();
  }
  orbit(){
    const tangent = new THREE.Vector3(0, 1, 0)
      .cross(this.position.clone().sub(this.target.position))
      .normalize();

    return tangent.multiplyScalar(this.orbitStrength);
  }
}

class ClimberAI extends BaseSteeringAI {

  computeSteering(dt) {
    const steer = super.computeSteering(dt);

    if (this.isWallAhead()) {
      steer.add(new THREE.Vector3(0, this.maxForce * 2, 0));
    }

    return steer;
  }

  isWallAhead() {
    const dir = this.velocity.clone().normalize();
    const origin = this.position.clone().add(dir.multiplyScalar(this.radius)).add(new THREE.Vector3(0,1,0));
    const ray = new THREE.Ray(origin, dir);

    raycaster.ray = ray;
    const hit = raycaster.intersectObject(this.mesh,true)[0];
    return hit && hit.distance < 0.7;
  }
}



const aiTypes = {base:BaseSteeringAI,sniper:SniperAI,climber:ClimberAI};

class Enemy{
  constructor(name,tMesh,pos){
    this.name = name;
    const meta = manifest.enemies[name];
    if(!meta)console.error("No enemy found:",name);
    this.maxHp = this.hp = meta.maxHP??100;
    const aiConst = aiTypes[meta.aiType];
    if(!aiConst)console.error("No ai found:",meta.aiType);
    this.ai = new aiConst(tMesh,pos);
    this.ai.maxSpeed = meta.maxSpeed??1.5;
    this.ai.maxForce = meta.maxForce??0.05;
    if(meta.ai&&typeof meta.ai==="object"){
      Object.assign(this.ai,meta.ai);
    }
    this.p=null;
    this.r=null;
    this.m=null;
    this.meta = meta;
    this.ai.setTarget(yaw.position);
  }
  update(dt=100){
    this.ai.update(dt*0.001);
  }
  move(dt){
    this.ai.position.addScaledVector(this.ai.velocity,dt);
    this.p.copy(this.ai.position);
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
let player = {size:0.5,halfSize:0.25,speed:40};
scene.add(yaw);
pitch.position.y+=2;
let level = 0;
let mx=0,my=0;
const speed = player.speed;
const keyCodes = {moveLeft:"a",moveRight:"d",moveFront:"w",moveBack:"s",jump:" ",sprint:"c"};
let vertVec = 0,onGround = true;
const gravity = 600,jumpStrength = 280;

function startGame(tId,lId){
  const bullets = [];
  const enemies = [];
  let tMesh,tBox,lvl,meta,tColor1,tColor2,updater,spawner,eMaterial;
  
  function spawnEnemy(id){
    const template = objects[id];
    const enemy = template.clone();
    const x = rnd(tBox.min.x,tBox.max.x);
    const z = rnd(tBox.min.z,tBox.max.z);
    let y;
    const maxY = tBox.max.y+10;
    raycaster.set(new THREE.Vector3(x,maxY,z),new THREE.Vector3(0,-1,0));
    const intersects = raycaster.intersectObject(tMesh, true);
    if (intersects.length > 0) {
      y = intersects[0].point.y;
    } else {
      y = maxY;
    }
    enemy.position.set(x,y,z);
    const e = new Enemy(id,tMesh,enemy.position);
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
    const mmx = await importHeightmap("./"+meta.obj+".vrx");
    tMesh = mmx.mesh;
    tMesh.heightmap = mmx.map;
    tMesh.raycast = DDARaycast;
    tMesh.geometry.computeBoundingBox();
    tMesh.geometry.computeBoundingSphere();
    tMesh.geometry.computeVertexNormals();
    tBox = new THREE.Box3().setFromObject(tMesh);
    objects = {...objects,...(await loadAll(Object.values(lvl.enemies),loader,"./",".vrx"))};
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
    console.log(yaw.position);
    if(urlParams.get("debug")==="true")showDebug();
    gameUI(tColor1);
    //spawner = setInterval(spawn,5000);
  }

  function showDebug() {
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.copy(tMesh.position);
    scene.add(axesHelper);

    const vertexNormalsHelper = new THREE.VertexNormalsHelper(tMesh, 0.2, 0x00ff00, 1);
    scene.add(vertexNormalsHelper);

    const faceNormalsHelper = new THREE.FaceNormalsHelper(tMesh, 0.5, 0xff0000, 1);
    scene.add(faceNormalsHelper);

    const skeletonHelper = new THREE.SkeletonHelper(tMesh);
    scene.add(skeletonHelper);

    return { axesHelper, vertexNormalsHelper, faceNormalsHelper, skeletonHelper };
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
    console.log(yaw.position);
  }
  
  let last = 0;
  
  function loop(millis){
    const d = millis - last;
    last = millis;
    const dTime = d*0.001;
    move(dTime);
    renderer.render(scene,camera);
    enemies.forEach(e=>e.move(dTime));
    requestAnimationFrame(loop);
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
  let len = Math.hypot(mx, my);
  let inputX = len > 0 ? mx / len : 0;
  let inputZ = len > 0 ? my / len : 0;
  const speedStep = speed * dt;
  const mvx = (inputX * vFor.x + inputZ * -vFor.z) * speedStep;
  const mvz = (inputX * vFor.z + inputZ *  vFor.x) * speedStep;
  let x = yaw.position.x;
  let z = yaw.position.z;
  let y = yaw.position.y;
  let nx = x + mvx;
  if (!checkCollisionXZ(nx, z, y)) nx = x;
  let nz = z + mvz;
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
  return Math.max(
    hm.get(z0, x0),
    hm.get(z1, x0),
    hm.get(z0, x1),
    hm.get(z1, x1)
  );
}
  
  function updateEnemies(){
    enemies.forEach(e=>{
      e.update(100);
    });
  }
  
  start().then(()=>{
    hm = tMesh.heightmap;
    requestAnimationFrame(loop);
    updater = setInterval(updateEnemies,100);
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

function gameUI(color){
  const keys = {};
  document.addEventListener("keydown",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    keys[k]=true;
    if(k===keyCodes.jump&&onGround)vertVec = jumpStrength;
    updateKeys();
  });
  document.addEventListener("keyup",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    delete keys[k];
    if(k===keyCodes.jump)vertVec = 0;
    updateKeys();
  });
  
  function updateKeys(){
    if(keys[keyCodes.moveBack])mx=-1;
    else if(keys[keyCodes.moveFront])mx=1;
    else mx=0;
    if(keys[keyCodes.moveLeft])my=-1;
    else if(keys[keyCodes.moveRight])my=1;
    else my=0;
    if(keys[keyCodes.sprint])speed = player.speed*2;
    else speed = player.speed;
  }
  if("ontouchstart" in window||navigator.maxTouchPoints>0||window.location.search.includes("mobile=true")){
    let ly,lx;
    renderer.domElement.addEventListener("pointermove",e=>{
      const x = e.clientX,y = e.clientY;
      if(ly===undefined||lx===undefined){
        ly=y;
        lx=x;
      }
      const dx = lx-x,dy=ly-y;
      yaw.rotation.y+=dx*sensivity;
      pitch.rotation.x+=dy*sensivity;
      lx=x;
      ly=y;
    });
    renderer.domElement.addEventListener("pointerdown",e=>{
      if(!document.pointerLockElement)pointerLock();
    });
    di("game").appendChild(di("joystick"));
    const joystick = window.nipplejs.create({
      zone:di("joystick"),
      mode:"static",
      position:{left:"50%",right:"50%"},
      size:100,
      color:color
    });
    joystick.on("move",(e,data)=>{
      mx=data.vector.x;
      my=data.vector.y;
    });
  }else{
    renderer.domElement.addEventListener("pointermove",e=>{
      yaw.rotation.y-=e.movementX*sensivity;
      pitch.rotation.x-=e.movementY*sensivity;
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
    baseColor: { value: new THREE.Color(bc) },
  },
  side: THREE.FrontSide,
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
uniform vec3 lineColor;
uniform vec3 baseColor;
varying vec3 vWorldPos;
varying vec3 vBary;

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

    float widthX = max(dXx, dYx) * 2.5;
    float widthY = max(dXy, dYy) * 2.5;
    float widthZ = max(dXz, dYz) * 2.5;

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












