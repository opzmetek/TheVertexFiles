import {World, Game, Player, PlayerConfig, DDARaycast, raycaster, explode} from "barrel";
import {BoxGeometry, MeshBasicMaterial, AdditiveBlending, Mesh, Vector3, Ray} from "three";

const Z_AXIS = new Vector3(0, 0, 1);
let bulletTemplate;
const direction = new Vector3();
const temp = new Vector3();
const hits = [];

function createBullet(){
  if(bulletTemplate) return bulletTemplate.clone();
  const geometry = new BoxGeometry(0.05, 0.05, 1);
  const material = new MeshBasicMaterial({
    color: World.colors[0],
  });
  bulletTemplate = new Mesh(geometry, material);
  return bulletTemplate.clone();
}

export function playerShoot(){
  Game.camera.getWorldDirection(direction);
  temp.copy(World.yaw.position).addY(PlayerConfig.height-0.5);//gun
  const ray = new Ray(temp, direction);
  const hit = DDARaycast(World.mesh, ray, 0, 1000);
  const out = [];
  testEnemies(ray, hit.distance, out);
  const dist = penetrateEnemies(out, 100) ?? hit.distance;
  console.log(hit, dist);
  initBullet(dist, 70, direction, temp);
}

export function shoot(pos, speed){
  const dir = temp.subVectors(World.yaw.position, pos).normalize();
  const ray = new Ray(pos, dir);
  const hit = DDARaycast(World.mesh, ray, 0, 1000);
  const dist = enemyHit(ray, hit.distance);
  initBullet(dist, speed, dir, pos);
}

function initBullet(dist, speed, dir, pos){
  const bullet = {vel: dir.clone().multiplyScalar(speed), t: 0};
  bullet.maxT = dist/speed;
  console.log(dist, bullet);
  bullet.m = createBullet();
  bullet.m.quaternion.setFromUnitVectors(Z_AXIS, dir);
  bullet.p = bullet.m.position.copy(pos);
  World.bullets.push(bullet);
  World.scene.add(bullet.m);
}

const tempVec = new Vector3();

function enemyHit(ray, len){
  tempVec.subVectors(World.yaw.position, ray.origin);
  const t = tempVec.dot(ray.direction);
  if(t<0||t>len)return len;
  const w = PlayerConfig.size, h = PlayerConfig.height;
  if(tempVec.lengthSq()-t*t<w*w+w*w+h*h){
    return t;
  }
  return len;
}

function testEnemies(ray, len, out){
  const sql = len*len;
  for(const enemy of World.enemies){
    tempVec.subVectors(enemy.p, ray.origin);
    const t = tempVec.dot(ray.direction);
    if(t<0||t>len||tempVec.lengthSq()-t*t>sql) continue;
    hits.length = 0;
    raycaster.intersectObject(enemy.m, true, hits);
    if(hits[0]){
      enemy.shoot_testEnemies_dist = hits[0].distance;
      out.push(enemy);
    }
  }
}

function penetrateEnemies(enemies, penetration){
  enemies.sort((a,b)=>a.shoot_testEnemies_dist-b.shoot_testEnemies_dist);
  for(const e of enemies){
    penetration -= e.maxHp;
    if(penetration<=0)return e.shoot_testEnemies_dist;
  }
  return enemies[enemies.length - 1]?.shoot_testEnemies_dist;
}

export function updateBullets(dt){
  for(let i = World.bullets.length-1;i>=0;i--){
    const b = World.bullets[i];
    b.p.addScaledVector(b.vel,dt);
    b.t += dt;
    if(b.t>=b.maxT){
      explode(b.p, b.vel.normalize().negate(), 2, 0.5);
      World.bullets[i] = World.bullets[World.bullets.length-1];
      World.bullets.pop();
      World.scene.remove(b.m);
    }
  }
}
