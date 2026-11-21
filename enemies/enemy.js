import {Game, World, EnemyAI, StaticTargetAI, mixins, explode} from "barrel";

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
    console.log("AI setup: ", meta.ai, this.ai);
    if(meta.inject&&typeof meta.inject==="object"){
      Object.assign(this.ai,meta.inject);
    }
    this.r=null;
    this.m=null;
    this.meta = meta;
  }
  
  move(dt, exp98) {
    this.ai.move(dt, exp98);
  }

  setMaterial(m) {
    function setMat(c) {
      c.material = m;
      c.children.forEach(setMat);
    }
    setMat(this.m);
  }

  damage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      const idx = World.enemies.indexOf(this);
      if (idx >= 0) {
        if (idx === World.enemies.length - 1) World.enemies.pop();
        else World.enemies[idx] = World.enemies.pop();
      }
      explode(this.m.p, Game.UP, 2, 2);
      explode(this.m.p, Game.DOWN, 2, 2);
      World.scene.remove(this.m);
    }
    else {
      this.setMaterial(World.eHitMaterial);
      const self = this;
      setTimeout(()=>{
        self.setMaterial(World.eMaterial);
      }, 300);
    }
  }
}
