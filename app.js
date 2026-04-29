//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import {Game, World, gameUI, loadUI, escape, loadGame, GridMaterial, spawn, di, remove, loadAll, showDebug, initAudio, analyse, moveStep, dash, anchor, setupScene, setupFlags, initLevel, initUtil} from "/TheVertexFiles/barrel.js";

setupScene();
setupFlags();

export function startGame(tId,lId){
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent = "Loading level...";
    di("homeMenu").style.display = "none";
    const meta = await initLevel(tId, lId, loader);
    await initUtil(meta, loader);
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
