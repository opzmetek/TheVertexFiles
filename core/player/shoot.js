import {World, Game, Player, PlayerConfig, DDARaycast, Animation, raycaster, explode, on, initBullet} from "barrel";
import {Vector3, Vector2, Ray} from "three";

const MIN_FOV = 4;
let bulletTemplate;
const direction = new Vector3();
const temp = new Vector3();
const hits = [];
let playerShooting = false;
const mouse = new Vector2();
let lastShootTime = 0;

on("shootstart",screen=>{
  const max = 1/Player.gunType.fireRate;
  if(screen){
    updateDirection(screen);
  }else{
    Game.camera.getWorldDirection(direction);
  }
  if(Player.gunType.machine)playerShooting = true;
  else if(Player.gunType.pistol&&lastShootTime >= max){
    playerShoot();
    lastShootTime = 0;
    Game.shake += 0.07;
  }
  else if(Player.gunType.sniper){
    Animation.delete("player_sniper_zoom");
    Animation.delete("player_sniper_reset");
    const startFov = Game.camera.fov;
    Animation.register("player_sniper_zoom", {
      duration: 2000,
      easing: Animation.Quad,
      easeType: Animation.Out,
      setter: t=>{
        Game.camera.fov = MIN_FOV + (startFov - MIN_FOV) * (1 - t);
        Game.otherState.sensivityMultiplier = Game.camera.fov * (MIN_FOV / Game.setup.fov);
        Game.camera.updateProjectionMatrix();
      }
    });
  }
});

on("shootmove", screen=>{
  if(screen){
    updateDirection(screen);
  }else{
    Game.camera.getWorldDirection(direction);
  }
});

on("shootend", ()=>{
  if(Player.gunType.machine)playerShooting = false;
  else if(Player.gunType.sniper){
    Animation.delete("player_sniper_zoom");
    Animation.delete("player_sniper_reset");
    const startFov = Game.camera.fov;
    Animation.register("player_sniper_reset", {
      duration: 300,
      easing: Animation.Quad,
      easeType: Animation.Out,
      setter: t=>{
        Game.camera.fov = startFov + (Game.setup.fov - startFov) * t;
        Game.otherState.sensivityMultiplier = Game.camera.fov * (MIN_FOV / Game.setup.fov);
        Game.camera.updateProjectionMatrix();
      }
    });
    Game.shake += 0.1;
    playerShoot();
  }
});

function updateDirection(screen){
  mouse.x = (screen.x / window.innerWidth) * 2 - 1;
  mouse.y = -(screen.y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  direction.copy(raycaster.ray.direction);
}

export function checkPlayerShoot(dt){
  const max = 1/Player.gunType.fireRate;
  lastShootTime += dt;
  if(lastShootTime >= max&&playerShooting){
    lastShootTime = 0;
    playerShoot();
    Game.shake += 0.3 * max;
  }
}

export function playerShoot(){
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

const tempVec = new Vector3();

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
