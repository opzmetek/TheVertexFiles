import {PlaneGeometry, InstancedMesh} from "three";
import {Game, World, BillboardMaterial} from "barrel";

let particles;

export function initParticles(){
  const geo = new PlaneGeometry(0.05,0.05);
  const mat = new BillboardMaterial(World.colors[0]);
  particles = new InstancedMesh(geo, mat, 1000);
  World.scene.add(particles);
}
