import {Vector3} from "/three.module.js";

function DDARaycast(mesh, ray, near=0, far=Infinity){
  if(!mesh.heightmap)return {hit:false,point:ray.origin,object:mesh,error:true,distance:0};
  const dx = ray.direction.x;
  const dy = ray.direction.y;
  const dz = ray.direction.z;
  let ox = ray.origin.x;
  let oy = ray.origin.y;
  let oz = ray.origin.z;
  const cellSize = 1;
  let cx = Math.floor(ox / cellSize);
  let cz = Math.floor(oz / cellSize);
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? cellSize / Math.abs(dx) : Infinity;
  const tDeltaZ = dz !== 0 ? cellSize / Math.abs(dz) : Infinity;
  let tMaxX = dx > 0 ? ((cx + 1) * cellSize - ox) / dx : dx < 0 ? (cx * cellSize - ox) / dx : Infinity;
  let tMaxZ = dz > 0 ? ((cz + 1) * cellSize - oz) / dz : dz < 0 ? (cz * cellSize - oz) / dz : Infinity;
  let t = 0;
  while (t < far) {
    const h = mesh.heightmap.get(cx,cz);
    if (h !== undefined) {
      const yHit = oy + dy * t;
      if (yHit <= h && t >= near) {
        const point = ray.at(t, new Vector3());
        return {
          hit: true,
          distance: t,
          point,
          object: mesh
        };
      }
    }
    if (tMaxX < tMaxZ) {
      cx += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else {
      cz += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
    if (cx < 0 || cz < 0 || cx >= mesh.heightmap.xLen || cz >= mesh.heightmap.yLen) break;
  }
  return {hit: false, distance: far, point: ray.at(far, new Vector3()), object:mesh};
}
