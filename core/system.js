import {World, Game, Animation, analyse, moveStep, updateBullets, updateParticles} from "barrel";

export class System {
  static last = 0;
  
  static updateState(time, state){
    state.dt = (time - this.last) * 0.001;
    state.exp98 = Math.pow(0.98, dt * 60);
    this.last = time;
  }

  static updateAudio(state){
    analyse();
  }

  static updateEnemies(state){
    for(const e of World.enemies){
      e.move(state.dt, state.exp98);
    }
  }

  static updatePlayer(state){
    moveStep(state.dt);
  }

  static updateBullets(state){
    updateBullets(state.dt);
  }

  static render(state){
    Animation.update();
    updateParticles(state.dt);
    Game.renderer.render(World.scene, Game.camera);
  }

  static renderOnly(state){
    Game.renderer.render(World.scene, Game.camera);
  }

  static updateAndRender(state){
    this.updateAudio(state);
    this.updateEnemies(state);
    this.updatePlayer(state);
    this.updateBullets(state);
    this.render(state);
  }
}
