export function MeeleeMixin(base){
  return class extends base{
    move(dt){
      super.move(dt);
      if(this.temp.subVectors(this.target, this.enemy.p).lengthSq()>this.attackDist*this.attackDist){
        
      }
    }
  }
}
