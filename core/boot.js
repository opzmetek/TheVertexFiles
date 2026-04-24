import {Scene, WebGLRenderer, PerspectiveCamera, Object3D} from "/TheVertexFiles/three.module.js";
import {World, Game} from "/TheVertexFiles/core/state.js";

const PLAYER_HEIGHT = 2;

export function setupScene(){ 
  World.scene = new THREE.Scene();
  Game.renderer = new THREE.WebGLRenderer();
  Game.renderer.setSize(window.innerWidth, window.innerHeight);
  Game.camera = new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,100);
  World.pitch = new THREE.Object3D();
  World.yaw = new THREE.Object3D();
  World.yaw.add(World.pitch);
  World.yaw.position.set(-2,0,-2);
  World.pitch.add(Game.camera);
  World.scene.add(World.yaw);
  World.pitch.position.y+=PLAYER_HEIGHT;
}

export function setupFlags(){
  Game.urlParams = new URLSearchParams(window.location.search);
  Game.sensivity = 0.02;
  Game.mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||Game.urlParams.get("Game.mobile")==="true";
}
