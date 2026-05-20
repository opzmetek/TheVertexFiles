import {Vector3} from "three";
import {Game, FastAStar} from "barrel";

export class EnemyAI{
  constructor(mesh,enemy,target){
    this.mesh = mesh;
    this.hm = mesh.heightmap;
    this.enemy = enemy;
    this.target = target;
    this.temp = new Vector3();
    this.desired = new Vector3();
    this.vel = new Vector3();
    this.easing = 2;
    this.vertical = 0;
  }
  computeSteering(dt, exp){
    return this.temp.copy(this.desired.lerp(this.temp.subVectors(this.target, this.enemy.p).normalize(), exp)).multiplyScalar(this.enemy.speed);
  }
  updateSteering(dt, exp){
    this.desired.x += (Math.random()-0.5)*0.05;
    this.desired.z += (Math.random()-0.5)*0.05;
  }
  updateVertical(dt){
    let y = this.enemy.p.y;
    y -= this.vertical * dt;
    const f = this.getMaxFloor(this.enemy.p.x, this.enemy.p.z);
    if(y<=f){
      this.onGround = true;
      this.enemy.p.y = f + 0.01;
      this.vertical = 0;
    } else {
      this.enemy.p.y = y;
      this.vertical -= Game.gravity * dt;
    }
  }
  move(dt, exp){
    if(dt > 0.4)dt = 0.4;//spike
    const p = this.enemy.p;
    this.updateSteering(dt, exp);
    const dir = this.computeSteering(dt, exp);
    this.vel.lerp(dir, dt * this.easing);
    const y = p.y;
    let nx = p.x + this.vel.x * dt, nz = p.z + this.vel.z * dt;
    if(this.tryMove(nx, y, nz));
    else if(this.tryMove(nx, y, p.z));//only x
    else if(this.tryMove(p.x, y, nz));//only z
    else this.onStuck();
    this.updateVertical(dt);
  }
  onStuck(){
    this.desired.set(Math.random()-0.5, 0, Math.random()-0.5);
  }
  tryMove(x,y,z){
    const f = this.getMaxFloor(x, z);
    if(f > y+0.2)return false;
    this.enemy.p.x = x;
    this.enemy.p.z = z;
    return true;
  }
  getMaxFloor(px, pz) {
    const hm = this.hm;
    const x0 = Math.floor(px - this.enemy.halfSize), x1 = Math.floor(px + this.enemy.halfSize);
    const z0 = Math.floor(pz - this.enemy.halfSize), z1 = Math.floor(pz + this.enemy.halfSize);
    return Math.max(hm.get(z0, x0),hm.get(z1, x0),hm.get(z0, x1),hm.get(z1, x1));
  }
}

export class StaticTargetAI{
  constructor(mesh, enemy, target){
    this.mesh = mesh;
    this.enemy = enemy;
    this.hm = mesh.heightmap;
    StaticTargetAI.checkAStar(this.hm);
    this.recompute(target);
    this.i = 0;
    this.t = 0;
  }

  recompute(target){
    this.path = StaticTargetAI.sharedAStar.find(this.hm, this.enemy.p.x, this.enemy.p.z, this.target.x, this.target.z, this.enemy.maxJump);
    if(!this.path||this.path.length<2)return;
  }

  increment(){
    if(this.i+1>=this.path.length)return false;
    const p0 = this.path[this.i], p1 = this.path[this.i+1];
    const l = this.hm.xLen;
    this.x0 = p0%l+this.hm.xCenter;
    this.y0 = p0/l+this.hm.yCenter;
    const x1 = p1%l+this.hm.xCenter;
    const y1 = p1/l+this.hm.yCenter;
  }

  computeVerticalSpeed(hDiff){
    const L = Math.hypot(this.dx, this.dy);
    const t = L/this.enemy.speed;
    return (hDiff/t)+0.5*Game.gravity*t;
  }

  move(dt){
    
  }

  static checkAStar(hm){
    if(!this.sharedAStar)this.sharedAStar = new FastAStar(hm.xLen, hm.yLen);
  }
}

export const aiTypes = {base:EnemyAI, static: StaticTargetAI};
