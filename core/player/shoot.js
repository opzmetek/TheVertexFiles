import {World, Game, Player, PlayerConfig, DDARaycast} from "barrel";
import {BoxGeometry, MeshBasicMaterial, AdditiveBlending, Mesh, Vector3, Ray} from "three";

let bulletTemplate;
const direction = new Vector3();

function createBullet(){
  if(bulletTemplate) return bulletTemplate.clone();
  const geometry = new BoxGeometry(0.05, 0.05, 1);
  const material = new MeshBasicMaterial({
    color: World.colors[2],
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  bulletTemplate = new Mesh(geometry, material);
  return bulletTemplate;
}

export function playerShoot(){
  Game.camera.getWorldDirection(direction);
  shoot(World.pitch.position, direction, 70);
}

export function shoot(pos, dir, speed){
  const bullet = {p: pos.clone(), dir: dir.clone().multiplyScalar(speed), t: 0};
  const gHit = DDARaycast(World.mesh, new Ray(pos, dir), 0, 1000).hit;
  const len = pos.clone().sub(gHit).length();
  bullet.maxT = len/speed;
  bullet.m = createBullet();
  bullet.m.position = bullet.p;
  World.bullets.push(bullet);
  World.scene.add(bullet.m);
}

export function updateBullets(dt){
  World.bullets.forEach(b=>{
    b.p.addScaledVector(b.dir,dt);
    b.t += dt;
    if(b.t>=b.maxT)b.m.material.visible = false;
  });
}
