import {} from "barrel"

export function animate(e) {
   
}

export function construct(o) {
  const meshes = o.meshes;
  let root;
  o.parents.forEach((p, i) =>{
    if (p===-1) root = meshes[i];
    else meshes[p].add(meshes[i]);
  });
  return {root, meshes};
}

function smoothstep(tt) {
  const t = Math.abs(tt % 2 - 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
