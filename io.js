// io.js
import * as THREE from './three.module.js';
import Heightmap from './heightmap.js';

// Uložit scénu do .vrx a stáhnout
export function exportVRX(objects) {
  let totalBytes = 4;
  
  objects.forEach(o=>{
    totalBytes+=4;
    totalBytes+=o.length*36;
  });

  const buffer = new ArrayBuffer(totalBytes);
  const dv = new DataView(buffer);
  let off = 0;

  const u32 = v => { dv.setUint32(off, v, true); off += 4; };
  const f32 = v => { dv.setFloat32(off, v, true); off += 4; };

  u32(objects.length);
  
  for(const faces of objects){
    u32(faces.length);
    for (const face of faces){
      face.forEach(v=>{
        f32(v.x);
        f32(v.y);
        f32(v.z);
      });
    }
  }
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene.bin";
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importVRX(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  console.log("first 64 bytes:", bytes.slice(0, 64));
  console.log(buffer);
  const dv = new DataView(buffer);
  let off = 0;
  
  const rU32 = () => {
    const val = dv.getUint32(off, true);
    off += 4;
    return val;
  };
  const rF32 = () => {
    const val = dv.getFloat32(off, true);
    off += 4;
    return val;
  };


  const objectCount = rU32();
  const meshes = [];

  for (let o = 0; o < objectCount; o++) {
    const faceCount = rU32();
    const positions = new Float32Array(faceCount * 9);
    const bary = new Float32Array(faceCount * 9);

    for (let f = 0; f < faceCount * 9; f++) {
      positions[f] = rF32();
    }
    
    for(let f=0;f<faceCount;f++){
      const idx = f * 9;
      bary[idx + 0] = 1; bary[idx + 1] = 0; bary[idx + 2] = 0;
      bary[idx + 3] = 0; bary[idx + 4] = 1; bary[idx + 5] = 0;
      bary[idx + 6] = 0; bary[idx + 7] = 0; bary[idx + 8] = 1;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('barycentric',new THREE.BufferAttribute(bary,3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geom, mat);
    meshes.push(mesh);
  }
  
  if(objectCount===0){
    meshes.push(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xff0000})));
  }

  return meshes;
}

export async function exportHeightmap(heightmap){
  const arr = heightmap.map;
  const full = new Float32Array(arr.length+2);
  full.set(arr,2);
  full[0] = heightmap.xLen;
  full[1] = heightmap.yLen;
  const blob = new Blob([full], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene.bin";
  a.click();
  URL.revokeObjectURL(a.href);
}

function heightmapToMesh(heightmap) {
  const width = heightmap.xLen;
  const height = heightmap.yLen;

  const vertices = [];
  const indices = [];
  let index = 0;

  const used = Array.from({ length: height }, () => new Array(width).fill(false));

  const idxToCoord = (i, len) => {
    return (i - len / 2 + 0.5);
  }

  {
    const x0 = -width*0.5;
    const x1 = width*0.5;
    const z0 = -height*0.5;
    const z1 = height*0.5;

    vertices.push(
      x0, 0, z0,
      x1, 0, z0,
      x0, 0, z1,
      x1, 0, z1
    );

    indices.push(
      index, index + 2, index + 1,
      index + 1, index + 2, index + 3
    );
    index += 4;
  }

  for (let zi = 0; zi < height; zi++) {
    for (let xi = 0; xi < width; xi++) {
      if (used[zi][xi]) continue;

      const x = idxToCoord(xi, width);
      const z = idxToCoord(zi, height);
      const h = heightmap.get(z, x);
      if (h<=0){
        used[zi][xi] = true;
        continue;
      }

      let w = 1;
      while (xi + w < width && !used[zi][xi + w] &&
             heightmap.get(idxToCoord(xi + w, width), z) === h) w++;

      let d = 1;
      outer: while (zi + d < height) {
        for (let k = 0; k < w; k++) {
          if (used[zi + d][xi + k] ||
              heightmap.get(idxToCoord(xi + k, width), idxToCoord(zi + d, height)) !== h)
            break outer;
        }
        d++;
      }

      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          used[zi + dz][xi + dx] = true;
        }
      }

      const x0 = idxToCoord(xi, width);
      const x1 = idxToCoord(xi + w, width);
      const z0 = idxToCoord(zi, height);
      const z1 = idxToCoord(zi + d, height);
      const y = h;

      vertices.push(
        x0, y, z0,
        x1, y, z0,
        x0, y, z1,
        x1, y, z1
      );
      indices.push(index, index+2, index+1, index+1, index+2, index+3);
      index += 4;
      vertices.push(x0,0,z0, x1,0,z0, x0,y,z0, x1,y,z0);
      indices.push(index,index+2,index+1,index+1,index+2,index+3); index+=4;
      vertices.push(x0,0,z1, x1,0,z1, x0,y,z1, x1,y,z1);
      indices.push(index,index+1,index+2,index+1,index+3,index+2); index+=4;
      vertices.push(x0,0,z0, x0,0,z1, x0,y,z0, x0,y,z1);
      indices.push(index,index+2,index+1,index+1,index+2,index+3); index+=4;
      vertices.push(x1,0,z0, x1,0,z1, x1,y,z0, x1,y,z1);
      indices.push(index,index+1,index+2,index+1,index+3,index+2); index+=4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x88cc88,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geometry, material);
}

export async function importHeightmap(url){
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const values = new Float32Array(buf);
  const lenX = values[0];
  const lenY = values[1];
  const map = new Heightmap(values.slice(2),lenX,lenY);
  const mesh = heightmapToMesh(map);
  return {map,mesh};
}
