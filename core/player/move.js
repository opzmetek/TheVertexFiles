import {Game, Player, World} from "/TheVertexFiles/core/state.js";
import {Vector3} from "/TheVertexFiles/three.module.js";

const MAX_STEP = 0.3;
const vFor = new Vector3();

export function moveStep(dt){
  const stepSize = Player.speed * dt;
  const steps = Math.ceil(stepSize / MAX_STEP);
  const stepDt = dt / steps;
  for (let i = 0; i < steps; i++) {
    move(stepDt);
  }
}

export function move(dt) {
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

export function dash(){
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

export function anchor(){
  const floorH = getMaxFloor(World.yaw.position.x, World.yaw.position.z);
  World.yaw.position.y = floorH;
  Player.vertVec = 0;
  Player.onGround = true;
}
  
export function checkCollisionXZ(px, pz, py) {
  const hm = World.mesh.heightmap;
  const maxH = getMaxFloor(px, pz);
  return py > maxH - 0.00001;
}

export function getMaxFloor(px, pz) {
  const hm = World.mesh.heightmap;
  const x0 = Math.floor(px - PlayerConfig.halfSize);
  const x1 = Math.floor(px + PlayerConfig.halfSize);
  const z0 = Math.floor(pz - PlayerConfig.halfSize);
  const z1 = Math.floor(pz + PlayerConfig.halfSize);
  return Math.max(hm.get(z0, x0), hm.get(z1, x0), hm.get(z0, x1), hm.get(z1, x1));
}
  

