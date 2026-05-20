// io.js
import * as THREE from './three.module.js';
import Heightmap from './heightmap.js';

export function exportVRX(objects, animations) {
  const objectData = [];
  let totalLength = 0;
  objects.forEach((object, i)=>{
    const g = object.geometry.clone().toNonIndexed();
    const p = object.position;
    g.translate(p.x, p.y, p.z);
    const pos = g.attributes.position;
    const obj = {vertices: pos.array, length: pos.array.length};
    objectData[i] = obj;
    totalLength += obj.length;
    g.dispose();
  });

  const vertices = new Float32Array(totalLength);
  const objSizes = new Uint32Array(objectData.length);
  let vi = 0;

  objectData.forEach((obj, i)=>{
    vertices.set(obj.vertices, vi);
    vi += obj.length;
    objSizes[i] = obj.length;
  });

  let anims = [];

  animations.forEach(anim => {
    for(const obj of objects) {
      const bone = anim.bones[obj.name];
      if(!bone){
        anims.push(0, anim.duration, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        continue;
      }
      anims.push(bone.offset, bone.duration, bone.ox, bone.oy, bone.oz, bone.minPitch, bone.minYaw, bone.minRoll, bone.maxPitch, bone.maxYaw, bone.maxRoll);
    }
  });

  const animsFinal = new Float32Array(anims);

  const sizes = new Uint32Array([
    vertices.byteLength,
    animsFinal.byteLength,
    objSizes.byteLength,
    objects.length,
    animations.length
  ]);
  
  const blob = new Blob([sizes, vertices, animsFinal, objSizes], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene.vrx";
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importVRX(url) {

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  let off = 0;

  const [verticesByteLength, animsByteLength, objectSizesByteLength, objectCount, animationCount] = new Uint32Array(buffer, 0, 5);
  off += 20;

  const vertexCount = verticesByteLength / 4;

  const vertices = new Float32Array(buffer, off , vertexCount);
  off += verticesByteLength;
  
  const anims = new Float32Array(buffer, off, animsByteLength / 4);
  off += animsByteLength;

  const sizes = new Uint32Array(buffer, off, objectSizesByteLength / 4);
  off += objectSizesByteLength;

  const meshes = [];
  let vi = 0;

  for(let o = 0; o < sizes.length; o++) {
    const length = sizes[o];
    const positions = vertices.subarray(vi, vi += length);

    const bary = new Float32Array(length);

    for(let f = 0; f < length / 9 ; f++) {
      const idx = f * 9;
      bary[idx + 0] = 1;
      bary[idx + 1] = 0;
      bary[idx + 2] = 0;
      bary[idx + 3] = 0;
      bary[idx + 4] = 1;
      bary[idx + 5] = 0;
      bary[idx + 6] = 0;
      bary[idx + 7] = 0;
      bary[idx + 8] = 1;
    }

    const geom = new THREE.BufferGeometry();

    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geom.setAttribute(
      "barycentric",
      new THREE.BufferAttribute(bary, 3)
    );

    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({color: 0xffffff}); //Will be changed
    const mesh = new THREE.Mesh(geom, mat);
    mesh.animations = [];
    meshes.push(mesh);
  }

  let an = 0;

  for(let a = 0; a < animationCount; a++) {
    for(let o = 0; o < objectCount; o++) {
      const anim = {
        offset:    anims[an++],
        duration:  anims[an++],
        ox:        anims[an++],
        oy:        anims[an++],
        oz:        anims[an++],
        minPitch:  anims[an++],
        minYaw:    anims[an++],
        minRoll:   anims[an++],
        maxPitch:  anims[an++],
        maxYaw:    anims[an++],
        maxRoll:   anims[an++]
      };
      meshes[o].animations.push(anim);
    }
  }
  if(meshes.length === 0) {
    meshes.push(
      new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({
          color: 0xff0000
        })
      )
    );
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
