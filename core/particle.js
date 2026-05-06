import {BufferGeometry, Float32BufferAttribute, PointsMaterial, Points, Vector3, AdditiveBlending} from "three";
import {Game, World} from "barrel";

conat particles = [];
let tmp;

export function initParticles(){
  const count = 40;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const verts = new Float32Array(count);
  for(let i = 0; i<count; i++){
    const d = i * 3;
    const t = i/(count-1);
    const y = t;
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    const x = Math.cos(theta)*radius;
    const z = Math.sin(theta)*radius;
    positions[d] = x + (Math.random()-0.5)*0.05;
    positions[d+1] = y + (Math.random()-0.5)*0.05;
    positions[d+2] = z + (Math.random()-0.5)*0.05;
  }
  geo = new BufferGeometry(new Float32BufferAttribute(positions, 3));
  mat = new PointsMaterial({
    color: World.colors[0],
    transparent: true,
    blending: AdditiveBlending
    size: 0.1
  }); 
}

export function explode(pos, dir, count){
  const emmiter = 
}
