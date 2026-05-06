import {BufferGeometry, Float32BufferAttribute, PointsMaterial, Points, Vector3, AdditiveBlending} from "three";
import {Game, World} from "barrel";

const particles = [];
const UP = new Vector3(0, 1, 0);
let tmp;

export function initParticles(){
  const count = 40;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions = new Float32Array(count);
  for(let i = 0; i<count; i++){
    const d = i * 3;
    const t = i/(count-1);
    const y = t;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    positions[d] = x + (Math.random()-0.5)*0.05;
    positions[d+1] = y + (Math.random()-0.5)*0.05;
    positions[d+2] = z + (Math.random()-0.5)*0.05;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const mat = new PointsMaterial({
    color: World.colors[0],
    transparent: true,
    blending: AdditiveBlending,
    size: 0.1
  });
  tmp = new Points(geo, mat);
}

export function explode(pos, dir, size, speed, life){
  const emitter = tmp.clone();
  emitter.life = life;
  emitter.position.copy(pos);
  emitter.quaternion.setFromUnitVectors(UP, dir);
  emitter.scale.setScalar(0);
  emitter.speed = speed;
  emitter.maxLife = life;
  emitter.size = size;
  particles.push(emitter);
  Game.scene.add(emitter);
}

export function updateParticles(dt){
  for(let i = particles.length-1; i >= 0; i--){
    const p = particles[i];
    p.life -= dt;
    if(p.life<=0) particles[i] = particles.pop();//swap remove
    p.scale.setScalar((1-(p.life/p.maxLife)) * p.size);
  }
}
