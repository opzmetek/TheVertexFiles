import {World, Game, Player, PlayerConfig} from "barrel";
import {BoxGeometry, MeshBasicMaterial, AdditiveBlending, Mesh} from "three";

let bulletTemplate;

function createBullet(){
  if(bulletTemplate) return bulletTemplate.clone();
  const geometry = new BoxGeometry(0.05, 0.05, 1);
  const material = new MeshBasicMaterial({
    color: World.col1,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending
  });
  bulletTemplate = new Mesh(geometry, material);
  return bulletTemplate;
}
