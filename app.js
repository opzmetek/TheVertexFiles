//app.js - The Vertex Project
//version: 0.0.0
//author: DYNAMYT
//license: none

//imports
import {Game, World, Audio, Player, Animation, System, loadUI, loadGame, di, remove, revive, setGuns, destroyThree, analyse, moveStep, setupScene, setupFlags, initLevel, initUtil, initParticles, updateBullets, updateParticles} from "/TheVertexFiles/barrel.js";

setupScene();
setupFlags();

export function startGame(tId,lId){
  async function start(){
    di("loadscreen").style.display = "flex";
    const loader = di("loader");
    loader.textContent = "Loading level...";
    di("homeMenu").style.display = "none";
    setGuns();
    const meta = await initLevel(tId, lId, loader);
    await initUtil(meta, loader);
    initParticles();
    di("loadscreen").style.display = "none";
    Game.running = true;
    Game.paused = false;
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
    destroyThree({ renderer: Game.renderer, camera: World.camera, scene: World.scene });
    Game.events.abort();
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
