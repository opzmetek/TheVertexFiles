import {World, Game, Player, PlayerConfig, DDARaycast, Animation, raycaster, explode, on} from "barrel";
import {BoxGeometry, MeshBasicMaterial, AdditiveBlending, Mesh, Vector3, Vector2, Ray} from "three";

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

export function initBullet(dist, speed, dir, pos){
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

export function enemyHit(ray, len){
  tempVec.subVectors(World.yaw.position, ray.origin);
  const t = tempVec.dot(ray.direction);
  if(t<0||t>len)return len;
  const w = PlayerConfig.size, h = PlayerConfig.height;
  if(tempVec.lengthSq()-t*t<w*w+w*w+h*h){
    return t;
  }
  return len;
}

export function updateBullets(dt){
  checkPlayerShoot(dt);
  for(let i = World.bullets.length-1;i>=0;i--){
    const b = World.bullets[i];
    b.p.addScaledVector(b.vel,dt);
    b.t += dt;
    if(b.t>=b.maxT){
      explode(b.p, b.vel.normalize().negate(), 3, 0.2);
      World.bullets[i] = World.bullets[World.bullets.length-1];
      World.bullets.pop();
      World.scene.remove(b.m);
    }
  }
}
