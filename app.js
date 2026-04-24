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
setupFlags();

export function startGame(tId,lId){
  async function start(){
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













