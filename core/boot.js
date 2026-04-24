import {Scene, WebGLRenderer, PerspectiveCamera, Object3D, Box3} from "/TheVertexFiles/three.module.js";
import {World, Game} from "/TheVertexFiles/core/state.js";
import {loadAll} from "/TheVertexFiles/core/utils.js";
import {importHeightmap} from "/TheVertexFiles/io.js";
import {initAudio} from "/TheVertexFiles/music/audio.js";
import {GridMaterial} from "/TheVertexFiles/core/shader.js";
import {gameUI} from "/TheVertexFiles/ui/ui.js";
import {dash, anchor} from "/TheVertexFiles/core/player/move.js";

const PLAYER_HEIGHT = 2;

export async function initLevel(tId, lId, loader) {
  Game.lvl = Game.manifest.levels[tId][lId];
  const meta = Game.manifest.levels[tId]?.meta ?? {};
  const mmx = await importHeightmap("./towers/" + meta.obj + ".vrx");
  World.mesh = mmx.mesh;
  World.mesh.heightmap = mmx.map;
  World.mesh.geometry.computeBoundingBox();
  World.mesh.geometry.computeBoundingSphere();
  World.mesh.geometry.computeVertexNormals();
  World.box = new Box3().setFromObject(World.mesh);
  await loadAll(Object.values(Game.lvl.enemies),loader,"./",".vrx",Game.objects);
  World.scene.add(World.mesh);
  return meta;
}

export async function initUtil(meta, loader) {
  loader.textContent = "Loading audio...";
  await initAudio(meta.music || "music_01.mp3");
  const tColor1 = meta.color;
  const tColor2 = meta["alt-color"] || 0x000000;
  World.mesh.material = GridMaterial(tColor2, tColor1);
  Game.eMaterial = GridMaterial(tColor1, tColor2, 0.5);
  di("game").style.display = "block";
  di("game").appendChild(Game.renderer.domElement);
  gameUI(tColor1, dash, anchor);
  if (Game.urlParams.get("debug") === "true") {
    showDebug();
  }
  Game.spawner = setInterval(spawn, 5000);
  return { tColor1, tColor2 };
}

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
