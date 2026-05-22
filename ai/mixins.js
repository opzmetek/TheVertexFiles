import {Game} from "barrel";

function MeeleeMixin(base) {
  return class extends base {
    move(dt, exp) {
      super.move(dt, exp);
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
    move(dt, exp) {
      this.frameDt = Math.min(dt, 0.4);
      super.move(this.frameDt, exp);
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

function RangedMixin(base) {
  return class extends base {
    constructor(a, b, c) {
      super(a, b, c);
      this.lastShoot = 0;
      this.prefferedDistance ??= 20;
      this.fireRate ??= 0.5;
    }
    
    computeSteering(dt, exp) {
      const diff = this.temp.subVectors(this.target, this.enemy.p);
      if(diff.lengthSq() < this.prefferedDistance) diff.negate();
      const des = diff.setY(0).normalize();
      return this.temp.copy(this.desired.lerp(des, exp)).multiplyScalar(this.enemy.speed);
    }

    move(dt, exp) {
      super.move(dt, exp);
      this.lastShoot += dt;
      if(this.lastShoot >= 1 / this.fireRate) this.shoot();
    }

    shoot() {
      console.log("Enemy shooting");
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

    computeSteering(dt, exp){
      return this.temp.copy(this.desired.lerp(this.temp.subVectors(this.target, this.enemy.p).normalize(), exp)).multiplyScalar(this.enemy.speed);
    }
  }
}
function JumperMixin(base) {
  return class extends base {
    constructor(mesh, enemy, target) {
      super(mesh, enemy, target);
      this.jumpForce = Math.sqrt(2 * this.enemy.maxJump * Game.gravity);
    }

    move(dt, exp) {
      super.move(dt, exp);
      if(this.velocity.lengthSq() < 0.1) this.onStuck();
    }
    
    onStuck() {
      if(this.onGround){
        this.vertical = this.jumpForce;
      }
    }
  }
}

export const mixins = {meelee: MeeleeMixin, spider: SpiderMixin, floating: FloatingMixin, jumper: JumperMixin};
