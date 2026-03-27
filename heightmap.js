export default class Heightmap{
  constructor(map,xl,yl){
    this.map = map?map:new Float32Array(xl*yl);
    this.xLen = xl;
    this.yLen = yl;
    this.xCenter = xl*0.5;
    this.yCenter = yl*0.5;
  }
  
  get(x,y){
    const xx = this.xCenter+x;
    const yy = this.yCenter+y;
    if(xx>=this.xLen||yy>=this.yLen)return 0;
    return this.map[xx*this.xLen+yy];
  }
  
  set(x,y,value){
    const xx = this.xCenter+x;
    const yy = this.yCenter+y;
    if(xx>=this.xLen||yy>=this.yLen)return;
    this.map[xx*this.xLen+yy] = value;
  }
}
