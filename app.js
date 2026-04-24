//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import * as THREE from '/TheVertexFiles/three.module.js';
import {importVRX,importHeightmap} from '/TheVertexFiles/io.js';
import {Game, World, Audio, Player, PlayerConfig} from "/TheVertexFiles/core/state.js";
import {gameUI, loadUI, escape, loadGame} from "/TheVertexFiles/ui/ui.js";
import {createStartingPanel} from "/TheVertexFiles/ui/start.js";
import {GridMaterial} from "/TheVertexFiles/core/shader.js";
import {DDARaycast} from "/TheVertexFiles/core/raycast.js";
import {FastAStar} from "/TheVertexFiles/ai/astar.js";
import {EnemyAI, StaticTargetAI, aiTypes} from "/TheVertexFiles/ai/enemy_ai.js";
import {Enemy} from "/TheVertexFiles/core/enemy/enemy.js";
import {spawn, spawnEnemy} from "/TheVertexFiles/core/enemy/spawn.js";
import {di, remove, loadOne, loadAll, rnd, getByPath, showDebug} from "/TheVertexFiles/core/utils.js";
import {initAudio, analyse} from "/TheVertexFiles/music/audio.js";
import {moveStep, move, dash, anchor} from "/TheVertexFiles/core/player/move.js";

const UP = new THREE.Vector3(0, 1, 0);
Game.urlParams = new URLSearchParams(window.location.search);

let objects = {};
Game.sensivity = 0.02;
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
World.pitch.position.y+=2;
let level = 0;
Game.mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||Game.urlParams.get("Game.mobile")==="true";

export function startGame(tId,lId){
  const bullets = [];
  const enemies = [];
  let lvl,meta,tColor1,tColor2,spawner,eMaterial;
  
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent="Loading level...";
    di("homeMenu").style.display = "none";
    lvl = Game.manifest.levels[tId][lId];
    meta = Game.manifest.levels[tId]?.meta??{};
    const mmx = await importHeightmap("./towers/"+meta.obj+".vrx");
    World.mesh = mmx.mesh;
    World.mesh.heightmap = mmx.map;
    World.mesh.geometry.computeBoundingBox();
    World.mesh.geometry.computeBoundingSphere();
    World.mesh.geometry.computeVertexNormals();
    World.box = new THREE.Box3().setFromObject(World.mesh);
    objects = {...objects,...(await loadAll(Object.values(lvl.enemies),loader,"./",".vrx"))};
    loader.textContent = "Loading audio...";
    await initAudio(meta.music||"music_01.mp3");
    di("game").style.display="block";
    di("game").appendChild(renderer.domElement);
    tColor1 = meta.color;
    tColor2 = meta["alt-color"]||0x000000;
    World.mesh.material = GridMaterial(tColor2,tColor1);
    Game.eMaterial = GridMaterial(tColor1,tColor2,0.5);
    World.scene.add(World.mesh);
    if(Game.urlParams.get("debug")==="true")showDebug();
    gameUI(tColor1,dash,anchor);
    spawner = setInterval(spawn,5000);
    di("loadscreen").style.display = "none";
  }
  
  let last = 0;
  
  function loop(millis){
    if(!Game.running){
      reset();
      return;
    }
    if(Game.paused){
      last = millis;
      requestAnimationFrame(loop);
      analyse();
      Game.renderer.render(World.scene,Game.camera);
      return;
    }
    const d = millis - last;
    last = millis;
    const dTime = d*0.001;
    move(dTime);
    analyse();
    Game.renderer.render(World.scene,Game.camera);
    enemies.forEach(e=>e.move(dTime,0));
    requestAnimationFrame(loop);
  }

  function reset(){
    enemies.forEach(e=>remove(e.m));
    enemies.length = 0;
    bullets.length = 0;
    remove(World.mesh);
    clearInterval(spawner);
    console.log("CLEAR");
  }
  
  start().then(()=>{
    hm = World.mesh.heightmap;
    requestAnimationFrame(loop);
  });
}

loadGame();
window.onload=loadUI;













