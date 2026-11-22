import {World, Game, loadAll, di, importHeightmap, initAudio, GridMaterial, gameUI, dash, anchor, spawn, revive, PlayerConfig, saveManager} from "barrel";
import {Scene, WebGLRenderer, PerspectiveCamera, Object3D, Box3, Vector3} from "three";

export async function initLevel(tId, lId, loader) {
  Game.lvl = Game.manifest.levels[tId][lId];
  const meta = Game.manifest.levels[tId]?.meta ?? {};
  const mmx = await importHeightmap("/TheVertexFiles/towers/" + meta.obj + ".vrx");
  World.mesh = mmx.mesh;
  World.mesh.heightmap = mmx.map;
  World.mesh.geometry.computeBoundingBox();
  World.mesh.geometry.computeBoundingSphere();
  World.mesh.geometry.computeVertexNormals();
  World.box = new Box3().setFromObject(World.mesh);
  await loadAll(Object.values(Game.lvl.enemies),loader,"/TheVertexFiles/enemies/",".vrx",Game.objects);
  World.scene.add(World.mesh);
  return meta;
}

export async function initUtil(meta, loader) {
  loader.textContent = "Loading audio...";
  await initAudio(meta.music || "music_01.mp3");
  const tColor1 = meta.color;
  const tColor2 = meta["alt-color"] || 0x000000;
  World.colors = [tColor1, tColor2];
  World.mesh.material = GridMaterial(tColor2, tColor1);
  World.eMaterial = GridMaterial(tColor1, tColor2, 0.5);
  World.eHitMaterial = GridMaterial(tColor2, tColor1, 0.5);
  di("game").style.display = "block";
  di("game").appendChild(Game.renderer.domElement);
  gameUI(tColor1, dash, anchor);
  if (Game.urlParams.get("debug") === "true") {
    showDebug();
  }
  Game.spawner = setInterval(spawn, 5000);
  return { tColor1, tColor2 };
}

function customFn(){
  Vector3.prototype.addX = function(x){this.x+=x;}
  Vector3.prototype.addY = function(y){this.y+=y;}
  Vector3.prototype.addZ = function(z){this.z+=z;}
}

export function setupScene(){
  customFn();
  World.scene = new Scene();
  Game.renderer = new WebGLRenderer();
  Game.renderer.setPixelRatio(window.devicePixelRatio);
  Game.renderer.setSize(window.innerWidth, window.innerHeight);
  Game.camera = new PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,100);
  World.pitch = new Object3D();
  World.yaw = new Object3D();
  World.yaw.add(World.pitch);
  World.yaw.position.set(-2,0,-2);
  World.pitch.add(Game.camera);
  World.scene.add(World.yaw);
  World.pitch.position.y+=PlayerConfig.height;
}

export async function loadGame(){
  const loadscreen = document.getElementById("loadscreen");
  const loader = document.createElement("span");
  loadscreen.appendChild(loader);
  loader.className="small";
  loader.id = "loader";
  try{
    loader.textContent = "Loading game...";
    const mRes = await fetch("./game-descriptor.json");
    Game.manifest = await mRes.json();
    await saveManager.init();
    await revive();
    loader.textContent = "Starting game...";
    setTimeout(function() {
      loadscreen.style.display="none";
      document.getElementById("homeMenu").style.display="block";
    }, 1000);
  }catch(e){
    loader.textContent="Error: "+e;
    console.error(e);
  }
}

export function setupFlags(){
  Game.urlParams = new URLSearchParams(window.location.search);
  Game.sensivity = 0.02;
  Game.mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||Game.urlParams.get("mobile")==="true";
}
