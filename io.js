// io.js
import * as THREE from './three.module.js';
import Heightmap from './heightmap.js';

export function exportVRX(objects, animations) {
  const allVertices = new Map();
  const verts = [];
  let indiceCount = 0;
  const genKey = (x, y, z) => `${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`;
  objects.forEach(object=>{
    const g = object.geometry.toNonIndexed();
    const p = object.position;
    g.translate(p.x, p.y, p.z);
    const pos = g.attributes.position;
    const faces = [];
    for(let i = 0; i < pos.count; i ++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const key = genKey(x, y, z);
      if(!allVertices.has(key)){
        allVertices.set(key, verts.length);
        verts.push(x, y, z);
      }
      if(i%3 === 0)faces.push([{x, y, z}]);
      else faces[faces.length - 1].push({x, y, z});
    }
    object.faces = faces;
  });

  const vertices = new Float32Array(verts);
  const indices = new Uint16Array(indiceCount + objects.length);
  let iOff = 0;

  objects.forEach(obj=>{
    const start = iOff;
    let length = 0;
    iOff++;
    obj.faces.forEach(face=>{
      face.forEach(v=>{
        const key = genKey(v.x, v.y, v.z);
        indices[iOff++] = allVertices.get(key);
      });
      length += face.length;
    });
    indices[start] = length;
  });

  let anims = [];

  animations.forEach(anim => {
    for(const obj of objects) {
      const bone = anim.bones[obj.name];
      if(!bone) anims.push(0, anim.duration, 0      , 0      , 0      , 0            , 0          , 0           , 0            , 0          , 0);
      anims.push(bone.offset, bone.duration, bone.ox, bone.oy, bone.oz, bone.minPitch, bone.minYaw, bone.minRoll, bone.maxPitch, bone.maxYaw, bone.maxRoll);
    }
  });

  const animsFinal = new Float32Array(anims);

  const sizes = new Uint16Array([
    vertices.byteLength,
    indices.byteLength,
    animsFinal.byteLength,
    animations.length,
    objects.length
  ]);
  
  const blob = new Blob([sizes, vertices, indices, animsFinal], { type: "application/octet-stream" });
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

  // pole pro sledování, které buňky jsou už zpracované
  const used = Array.from({ length: height }, () => new Array(width).fill(false));

  // pomocná funkce pro převod indexu na souřadnici
  const idxToCoord = (i, len) => (i - len / 2 + 0.5);
  const idxToEdge   = (i, len) => (i - len / 2);

  // první podložka (plane)
  const x0_plane = -width * 0.5;
  const x1_plane = width * 0.5;
  const z0_plane = -height * 0.5;
  const z1_plane = height * 0.5;

  vertices.push(
    x0_plane, 0, z0_plane,
    x1_plane, 0, z0_plane,
    x0_plane, 0, z1_plane,
    x1_plane, 0, z1_plane
  );

  indices.push(index, index + 2, index + 1, index + 1, index + 2, index + 3);
  index += 4;

  for (let zi = 0; zi < height; zi++) {
    for (let xi = 0; xi < width; xi++) {
      if (used[zi][xi]) continue;

      const x = idxToCoord(xi, width);
      const z = idxToCoord(zi, height);
      const h = heightmap.get(z, x);

      if (h <= 0) {
        used[zi][xi] = true;
        continue;
      }

      let w = 1;
      while (
        xi + w < width &&
        !used[zi][xi + w] &&
        heightmap.get(z, idxToCoord(xi + w, width)) === h
      ) w++;

      // zjistí délku stejné výšky
      let d = 1;
      outer: while (zi + d < height) {
        for (let k = 0; k < w; k++) {
          if (
            used[zi + d][xi + k] ||
            heightmap.get(idxToCoord(zi + d, height),idxToCoord(xi + k, width)) !== h
          ) break outer;
        }
        d++;
      }

      // označí použité buňky
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          used[zi + dz][xi + dx] = true;
        }
      }

      // souřadnice bloků
      const x0 = idxToEdge(xi, width);
      const x1 = idxToEdge(xi + w, width);
      const z0 = idxToEdge(zi, height);
      const z1 = idxToEdge(zi + d, height);
      const y = h;

// horní plocha (směrem nahoru)
vertices.push(
  x0, y, z0,  // 0
  x1, y, z0,  // 1
  x0, y, z1,  // 2
  x1, y, z1   // 3
);
indices.push(
  index, index + 2, index + 1,
  index + 1, index + 2, index + 3
);
index += 4;

// přední stěna (směrem k z0)
vertices.push(
  x0, 0, z0,  // 0
  x1, 0, z0,  // 1
  x0, y, z0,  // 2
  x1, y, z0   // 3
);
indices.push(
  index, index + 2, index + 1,
  index + 1, index + 2, index + 3
);
index += 4;

// zadní stěna (směrem k z1)
vertices.push(
  x0, 0, z1,  // 0
  x1, 0, z1,  // 1
  x0, y, z1,  // 2
  x1, y, z1   // 3
);
indices.push(
  index, index + 1, index + 2,
  index + 2, index + 1, index + 3
);
index += 4;

// levá stěna (směrem k x0)
vertices.push(
  x0, 0, z0,  // 0
  x0, 0, z1,  // 1
  x0, y, z0,  // 2
  x0, y, z1   // 3
);
indices.push(
  index, index + 2, index + 1,
  index + 1, index + 2, index + 3
);
index += 4;

// pravá stěna (směrem k x1)
vertices.push(
  x1, 0, z0,  // 0
  x1, 0, z1,  // 1
  x1, y, z0,  // 2
  x1, y, z1   // 3
);
indices.push(
  index, index + 1, index + 2,
  index + 2, index + 1, index + 3
);
index += 4;
    }
  }

  // vytvoření geometrie
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // materiál
  const material = new THREE.MeshStandardMaterial({ color: 0x88cc88, side: THREE.DoubleSide });

  // návrat mesh
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
