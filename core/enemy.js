import {Game} from "/TheVertexFiles/core/state.js";
import {aiTypes} from "/TheVertexFiles/ai/enemy_ai.js";

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
    const aiConst = aiTypes[meta.aiType]||"base";
    if(!aiConst)console.error("No ai found:",meta.aiType);
    this.ai = new aiConst(tMesh,this,target);
    if(meta.ai&&typeof meta.ai==="object"){
      Object.assign(this.ai,meta.ai);
    }
    this.r=null;
    this.m=null;
    this.meta = meta;
  }
  move(dt){
    this.ai.move(dt);
  }
}
