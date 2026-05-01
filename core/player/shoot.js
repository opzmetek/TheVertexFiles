import {World, Game, Player, PlayerConfig, DDARaycast} from "barrel";
import {BoxGeometry, MeshBasicMaterial, AdditiveBlending, Mesh, Vector3, Ray} from "three";

let bulletTemplate;
const direction = new Vector3();
const temp = new Vector3();

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
  console.log("SHOOT");
  temp.copy(World.yaw.position);
  temp.y+=PlayerConfig.height-0.5;//gun
  shoot(temp, direction, 70);
}

export function shoot(pos, dir, speed){
  const bullet = {dir: dir.clone().multiplyScalar(speed), t: 0};
  const hit = DDARaycast(World.mesh, new Ray(pos, dir), 0, 1000);
  console.log(hit, World.mesh);
  bullet.maxT = hit.distance/speed;
  bullet.m = createBullet();
  bullet.m.lookAt(dir);
  bullet.p = bullet.m.position.copy(pos);
  World.bullets.push(bullet);
  World.scene.add(bullet.m);
  console.log(bullet);
}

export function updateBullets(dt){
  for(let i = World.bullets.length-1;i>=0;i--){
    const b = World.bullets[i];
    b.p.addScaledVector(b.dir,dt);
    b.t += dt;
    if(b.t>=b.maxT){
      World.bullets[i] = World.bullets.pop();
      World.scene.remove(b.m);
    }
  }
}
