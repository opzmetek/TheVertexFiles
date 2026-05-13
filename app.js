//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import {Game, World, Audio, Animation, System, loadUI, loadGame, di, remove, analyse, moveStep, setupScene, setupFlags, initLevel, initUtil, initParticles, updateBullets, updateParticles} from "/TheVertexFiles/barrel.js";

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
    initParticles();
    di("loadscreen").style.display = "none";
  }

  const state = {};
  
  function loop(millis){
    if(!checkRun(millis))return;
    System.updateState(state, millis);
    System.updateAndRender(state);
    requestAnimationFrame(loop);
  }

  function pausedFrame(millis){
    System.updateState(state, millis);
    System.updateAudio();
    System.renderOnly(state);
    requestAnimationFrame(loop);
  }

  function checkRun(t){
    if(!Game.running){
      reset();
      return false;
    }else if(Game.paused){
      pausedFrame(t);
      return false;
    }
    return true;
  }

  function reset(){
    World.enemies.forEach(e=>remove(e.m));
    World.enemies.length = 0;
    World.bullets.length = 0;
    remove(World.mesh);
    Audio.audioCtx.close();
    Game.setup?.joystick?.destroy();
    di("mobile-controls")?.remove();
    clearInterval(Game.spawner);
    Game.paused = false;
    console.log("CLEAR");
  }
  
  start().then(()=>{
    requestAnimationFrame(loop);
  });
}

loadGame();
window.onload=loadUI;
