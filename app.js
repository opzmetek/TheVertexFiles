//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import * as THREE from '/TheVertexFiles/three.module.js';
import {importHeightmap} from '/TheVertexFiles/io.js';
import {Game, World} from "/TheVertexFiles/core/state.js";
import {gameUI, loadUI, escape, loadGame} from "/TheVertexFiles/ui/ui.js";
import {GridMaterial} from "/TheVertexFiles/core/shader.js";
import {spawn} from "/TheVertexFiles/core/enemy/spawn.js";
import {di, remove, loadAll, showDebug} from "/TheVertexFiles/core/utils.js";
import {initAudio, analyse} from "/TheVertexFiles/music/audio.js";
import {moveStep, dash, anchor} from "/TheVertexFiles/core/player/move.js";
import {setupScene, setupFlags, initLevel, initUtil} from "/TheVertexFiles/core/boot.js";

setupScene();
Game.urlParams = new URLSearchParams(window.location.search);
Game.sensivity = 0.02;
Game.mobile = "ontouchstart" in window||navigator.maxTouchPoints>0||Game.urlParams.get("Game.mobile")==="true";

export function startGame(tId,lId){
  let lvl,meta,tColor1,tColor2,spawner;
  
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent="Loading level...";
    di("homeMenu").style.display = "none";
    Game.lvl = Game.manifest.levels[tId][lId];
    meta = Game.manifest.levels[tId]?.meta??{};
    const mmx = await importHeightmap("./towers/"+meta.obj+".vrx");
    World.mesh = mmx.mesh;
    World.mesh.heightmap = mmx.map;
    World.mesh.geometry.computeBoundingBox();
    World.mesh.geometry.computeBoundingSphere();
    World.mesh.geometry.computeVertexNormals();
    World.box = new THREE.Box3().setFromObject(World.mesh);
    await loadAll(Object.values(Game.lvl.enemies), loader, "./",".vrx", Game.objects);
    loader.textContent = "Loading audio...";
    await initAudio(meta.music||"music_01.mp3");
    di("game").style.display="block";
    di("game").appendChild(Game.renderer.domElement);
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
    const dTime = (millis-last)*0.001;
    last = millis;
    moveStep(dTime);
    analyse();
    Game.renderer.render(World.scene,Game.camera);
    World.enemies.forEach(e=>e.move(dTime,0));
    requestAnimationFrame(loop);
  }

  function reset(){
    World.enemies.forEach(e=>remove(e.m));
    World.enemies.length = 0;
    bullets.length = 0;
    remove(World.mesh);
    clearInterval(spawner);
    console.log("CLEAR");
  }
  
  start().then(()=>{
    requestAnimationFrame(loop);
  });
}

loadGame();
window.onload=loadUI;













