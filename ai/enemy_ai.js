import {Vector3} from "/TheVertexFiles/three.module.js";
import {Game} from "/TheVertexFiles/core/state.js";
import {FastAStar} from "/TheVertexFiles/ai/astar.js";

export class EnemyAI{
  constructor(mesh,enemy,target){
    this.mesh = mesh;
    this.hm = mesh.heightmap;
    this.enemy = enemy;
    this.target = target;
    this.temp = new Vector3();
    this.rotate = new Vector3();
    this.vel = new Vector3();
    this.stuck = 0;
    this.easing = 2;
  }
  computeSteering(dt){
    return this.temp.subVectors(this.target, this.enemy.p).addScaledVector(this.rotate,this.stuck).normalize().multiplyScalar(this.enemy.speed);
  }
  updateSteering(dt){
    this.rotate.x += (Math.random()-0.5)*0.05;
    this.rotate.z += (Math.random()-0.5)*0.05;
  }
  move(dt){
    if(dt>0.4)dt=0.4;//spike
    const p = this.enemy.p;
    this.updateSteering(dt);
    const dir = this.computeSteering(dt);
    this.vel.lerp(dir,dt*this.easing);
    this.stuck*=Math.pow(0.98,dt);
    const y = p.y;
    let nx = p.x+this.vel.x*dt, nz = p.z+this.vel.z*dt;
    this.rotate.multiplyScalar(0.95);
    if(this.tryMove(nx, y, nz))return;
    else if(this.tryMove(nx, y, p.z))return;//only x
    else if(this.tryMove(p.x, y, nz))return;//only z
    this.onStuck();
  }
  onStuck(){
    this.rotate.set(Math.random()-0.5, 0, Math.random()-0.5);
    this.stuck = 1;
  }
  tryMove(x,y,z){
    const f = this.getMaxFloor(x, z);
    if(f > y+0.2)return false;
    this.enemy.p.set(x, f+0.001, z);
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
