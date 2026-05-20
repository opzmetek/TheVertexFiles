import {Game, EnemyAI, StaticTargetAI, mixins} from "barrel";

export class Enemy{
  constructor(name,tMesh,pos,target){
    this.name = name;
    this.p = pos;
    const meta = Game.manifest.enemies[name];
    if(!meta)console.error("No enemy found:",name);
    this.maxHp = this.hp = meta.maxHP??100;
    this.maxJump = meta.maxJump??30;
    this.speed = meta.speed??20;
    this.size = meta.size??1;
    this.halfSize = this.size/2;
    this.ai = new ((meta.ai??[]).reduce((cls, m)=>mixins[m](cls), EnemyAI))(tMesh, this, target);
    if(meta.inject&&typeof meta.inject==="object"){
      Object.assign(this.ai,meta.inject);
    }
    this.r=null;
    this.m=null;
    this.meta = meta;
  }
  move(dt, exp98){
    this.ai.move(dt, exp98);
  }
}
