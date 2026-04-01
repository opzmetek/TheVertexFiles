export default class Heightmap {
  constructor(map, xl, yl) {
    this.map = map ? map : new Float32Array(xl * yl);
    this.xLen = xl;
    this.yLen = yl;
    this.xCenter = xl * 0.5;
    this.yCenter = yl * 0.5;
  }

  get(x, y) {
    const xx = (this.xCenter + x)|0;
    const yy = (this.yCenter + y)|0;
    if (xx < 0 || xx >= this.xLen || yy < 0 || yy >= this.yLen) return 0;
    return this.map[yy * this.xLen + xx];
  }

  set(x, y, value) {
    const xx = (this.xCenter + x)|0;
    const yy = (this.yCenter + y)|0;
    console.log("setting {"+xx+"/"+this.xLen+", "+yy+"/"+this.yLen+"} to "+value);
    if (xx < 0 || xx >= this.xLen || yy < 0 || yy >= this.yLen) return;
    this.map[yy * this.xLen + xx] = value;
  }
}
