import {PlaneGeometry, InstancedMesh, Vector3} from "three";
import {Game, World, BillboardMaterial} from "barrel";

const MAX = 1000;
const UP = new Vector3(0, 1, 0);
const arr = new Float32Array(MAX * 7);//pos(xyz), vel(xyz), life
let particles;
let start = 0, end = 0;

export function initParticles(){
  const geo = new PlaneGeometry(0.05,0.05);
  const mat = new BillboardMaterial(World.colors[0]);
  particles = new InstancedMesh(geo, mat, MAX);
  World.scene.add(particles);
}

export function explode(pos, dir, count){
  const forward = dir.clone();
  const right = new Vector3().crossVectors(forward, UP);
  const up = new Vector3().crossVectors(forward, right);
  const dummy = new Vector3();
  for(let i = 0; i < count; i++){
    const idx = (end + i) % MAX;
    const rx = Math.random() * 2 - 1;
    const ry = Math.random() * 2 - 1;
    const rz = Math.random();
    arr[idx] = pos.x;
    arr[idx+1] = pos.y;
    arr[idx+2] = pos.z;
    arr[idx+3] = rx * right.x + ry * up.x + rz * forward.x;
  }
}
