import {objects, rnd} from "/TheVertexFiles/core/utils.js";
import {Enemy} from "/TheVertexFiles/core/enemy/enemy.js";
import {World} from "/TheVertexFiles/core/state.js";

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
  World.enemies.push(e);
  World.scene.add(enemy);
}

function spawn(){
  let result = -1;
  let acc = 0;
  const keys = Object.keys(Game.lvl.enemies);
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
  const template = Game.lvl.enemies[chosenEnemyKey];
  spawnEnemy(template);
}
