export class FastAStar {
  constructor(width, height){
    const len = width * height;
    this.w = width;
    this.h = height;
    this.len = len;
    this.g = new Float32Array(len);
    this.f = new Float32Array(len);
    this.parent = new Int32Array(len);
    this.closed = new Uint8Array(len);
    this.heap = new Int32Array(len);
    this.heapSize = 0;
    this.DX = new Int8Array([1,0,-1,0, 1,1,-1,-1]);
    this.DZ = new Int8Array([0,1,0,-1, 1,-1,1,-1]);
  }

  reset(){
    this.heapSize = 0;
    this.closed.fill(0);
    this.g.fill(Infinity);
    this.parent.fill(-1);
  }

  heapPush(idx){
    let i = this.heapSize++;
    const heap = this.heap;
    const f = this.f;
    while (i > 0){
      const p = (i - 1) >> 1;
      const parentIdx = heap[p];
      if (f[parentIdx] <= f[idx]) break;
      heap[i] = parentIdx;
      i = p;
    }
    heap[i] = idx;
  }

  heapPop(){
    const heap = this.heap;
    const f = this.f;
    const root = heap[0];
    const last = heap[--this.heapSize];
    let i = 0;
    while (true){
      let l = i * 2 + 1;
      let r = l + 1;
      if (l >= this.heapSize) break;
      let best = heap[l];
      let bestI = l;
      if (r < this.heapSize && f[heap[r]] < f[best]){
        best = heap[r];
        bestI = r;
      }
      if (f[last] <= f[best]) break;
      heap[i] = best;
      i = bestI;
    }
    heap[i] = last;
    return root;
  }
  find(hm, sx, sz, tx, tz, maxJump){
    sx|=0;sz|=0;tx|=0;tz|=0;
    const w = this.w, h = this.h;
    const hw = w>>1, hh = h>>1;
    const DX = this.DX, DZ = this.DZ;
    const start = (sx+hw) * w + (sz+hh);
    const target =(tx+hw) * w + (tz+hh);
    this.reset();
    const g = this.g;
    const f = this.f;
    const parent = this.parent;
    const closed = this.closed;
    g[start] = 0;
    f[start] = (tx - sx) * (tx - sx) + (tz - sz) * (tz - sz);
    parent[start] = -1;
    this.heapPush(start);
    while (this.heapSize > 0){
      const current = this.heapPop();
      if (closed[current]) continue;
      closed[current] = 1;
      if (current === target){
        return this.reconstruct(target);
      }
      const cx = (Math.floor(current / w))-hw;
      const cz = (current % w)-hh;
      const ch = hm.get(cz, cx);
      for (let i = 0; i < 8; i++){
        const dx = DX[i];
        const dz = DZ[i];
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < -hw || nz < -hh || nx >= hw || nz >= hh) continue;
        const nIdx = (nx+hw) * w + (nz+hh);
        if (closed[nIdx]) continue;
        const nh = hm.get(nz, nx);
        const diff = nh - ch;
        const hDiff = diff > 0 ? diff : 0;
        if (hDiff > maxJump) continue;
        const cost = (dx && dz ? 1.4142 : 1) + hDiff * 10;
        const newG = g[current] + cost;
        if (newG < g[nIdx]){
          g[nIdx] = newG;
          const ddx = tx - nx;
          const ddz = tz - nz;
          const h = ddx * ddx + ddz * ddz;
          f[nIdx] = newG + h;
          parent[nIdx] = current;
          this.heapPush(nIdx);
        }
      }
    }
    return [];
  }
  reconstruct(end){
    const parent = this.parent;
    const path = [];
    let cur = end;
    while (cur >= 0&&path.length<100){
      path.push(cur);
      cur = parent[cur];
    }
    path.reverse();
    return path;
  }
}
