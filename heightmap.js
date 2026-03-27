export default class Heightmap {
  constructor(map, xl, yl) {
    this.map = map ? map : new Float32Array(xl * yl);
    this.xLen = xl;
    this.yLen = yl;
    this.xCenter = xl * 0.5;
    this.yCenter = yl * 0.5;
  }

  get(x, y) {
    const xx = Math.floor(this.xCenter + x);
    const yy = Math.floor(this.yCenter + y);
    if (xx < 0 || xx >= this.xLen || yy < 0 || yy >= this.yLen) return 0;
    return this.map[yy * this.xLen + xx]; // správně řádek*width + sloupec
  }

  set(x, y, value) {
    const xx = Math.floor(this.xCenter + x);
    const yy = Math.floor(this.yCenter + y);
    if (xx < 0 || xx >= this.xLen || yy < 0 || yy >= this.yLen) return;
    this.map[yy * this.xLen + xx] = value; // správně řádek*width + sloupec
  }
}
