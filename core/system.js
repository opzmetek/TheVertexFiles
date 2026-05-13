import {World, Game, Animation, analyse, moveStep, updateBullets, updateParticles} from "barrel";

export class System {
  static last = 0;
  
  static updateState(state, time){
    state.dt = (time - this.last) * 0.001;
    state.exp98 = Math.pow(0.98, state.dt * 60);
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
    this.applyShake(state);
    Game.renderer.render(World.scene, Game.camera);
  }

  static applyShake(state){
    const m = 2.4 * Game.shake * state.dt * Game.otherState.sensivityMultiplier;
    Game.camera.rotation.set(
      (Math.random() - 0.5) * m,
      (Math.random() - 0.5) * m,
      (Math.random() - 0.5) * m
    );
    Game.shake *= (state.exp98 * state.exp98);
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
