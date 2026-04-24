import {Game, Player, World} from "/TheVertexFiles/core/state.js";
import {Vector3} from "/TheVertexFiles/three.module.js";

const MAX_STEP = 0.3;
const vFor = new Vector3();

function moveStep(dt){
  const stepSize = Player.speed * dt;
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

