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

  // velikost jednoho bloku
  const BLOCK_SIZE = 1;

  // pomocná funkce pro souřadnice bloku
  const coordX = (i) => (i - width / 2 + 0.5) * BLOCK_SIZE;
  const coordZ = (i) => (i - height / 2 + 0.5) * BLOCK_SIZE;

  for (let zi = 0; zi < height; zi++) {
    for (let xi = 0; xi < width; xi++) {
      if (used[zi][xi]) continue;

      const h = heightmap.get(zi, xi);
      if (h <= 0) {
        used[zi][xi] = true;
        continue;
      }

      // zjistíme maximální šířku stejné výšky
      let w = 1;
      while (xi + w < width && !used[zi][xi + w] && heightmap.get(zi, xi + w) === h) w++;

      // zjistíme maximální hloubku stejné výšky
      let d = 1;
      outer: while (zi + d < height) {
        for (let k = 0; k < w; k++) {
          if (used[zi + d][xi + k] || heightmap.get(zi + d, xi + k) !== h) break outer;
        }
        d++;
      }

      // označíme bloky jako použité
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          used[zi + dz][xi + dx] = true;
        }
      }

      // souřadnice kvádru
      const x0 = coordX(xi);
      const x1 = coordX(xi + w);
      const z0 = coordZ(zi);
      const z1 = coordZ(zi + d);
      const y = h;

      // horní plocha
      vertices.push(
        x0, y, z0,
        x1, y, z0,
        x0, y, z1,
        x1, y, z1
      );
      indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
      index += 4;

      // stěny (jen pokud sousední blok nemá stejnou výšku)
      const neighbors = [
        { dx: -1, dz: 0 }, // levá
        { dx: 1, dz: 0 },  // pravá
        { dx: 0, dz: -1 }, // přední
        { dx: 0, dz: 1 }   // zadní
      ];

      for (const n of neighbors) {
        const nx = xi + n.dx;
        const nz = zi + n.dz;
        const nh = (nx >= 0 && nx < width && nz >= 0 && nz < height)
          ? heightmap.get(nz, nx) : 0;
        if (nh >= h) continue; // soused má stejnou nebo vyšší výšku

        // stěna ve směru n.dx/nz
        let sx0 = x0, sx1 = x1;
        let sz0 = z0, sz1 = z1;
        let sy0 = 0, sy1 = y;

        if (n.dx === -1) { sx1 = sx0; }        // levá
        else if (n.dx === 1) { sx0 = sx1; }    // pravá
        else if (n.dz === -1) { sz1 = sz0; }   // přední
        else if (n.dz === 1) { sz0 = sz1; }    // zadní

        vertices.push(
          sx0, sy0, sz0,
          sx1, sy0, sz1,
          sx0, sy1, sz0,
          sx1, sy1, sz1
        );
        indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
        index += 4;
      }
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
