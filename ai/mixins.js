import {Game} from "barrel";

function MeeleeMixin(base) {
  return class extends base {
    move(dt) {
      super.move(dt);
      console.log("Meelee move", this.enemy.p);
      if(this.temp.subVectors(this.target, this.enemy.p).lengthSq() < this.attackDist * this.attackDist){
        this.attack();
      }
    }

    attack() {
      console.log("Attacking");
    }
  }
}

function SpiderMixin(base) {
  return class extends base {
    constructor(mesh, enemy, target) {
      super(mesh, enemy, target);
      this.frameDt = 0;
    }
    move(dt) {
      this.frameDt = Math.min(dt, 0.4);
      super.move(this.frameDt);
    }
    tryMove(x, y, z){
      const f = this.getMaxFloor(x, z);
      if(f > y + 0.2) {
        this.enemy.p.y += this.enemy.speed * this.frameDt;
      }
      return true;
    }
  }
}

function FloatingMixin(base) {
  return class extends base {
    updateVertical(dt) {
      let y = this.enemy.p.y + this.vel.y * dt;
      const f = this.getMaxFloor(this.enemy.p.x, this.enemy.p.z);
      if(f + 0.5 > y){
        this.enemy.p.y = f + 0.5;
      } else {
        this.enemy.p.y = y;
      }
    }

    onStuck(dt) {
      this.enemy.p.y += this.enemy.speed * dt * 0.1;
    }
  }
}
function JumperMixin(base) {
  return class extends base {
    constructor(mesh, enemy, target) {
      super(mesh, enemy, target);
      this.jumpForce = Math.sqrt(2 * this.enemy.maxJump * Game.gravity);
      console.log("Jumper init ",this.jumpForce, this.maxJump);
    }
    onStuck() {
      if(this.onGround){
        this.vertical = this.jumpForce;
      }
    }
  }
}

export const mixins = {meelee: MeeleeMixin, spider: SpiderMixin, floating: FloatingMixin, jumper: JumperMixin};
