import {World} from "/TheVertexFiles/core/state.js";
import {importVrx} from "/TheVertexFiles/io.js";
import {Group} from "/TheVertexFiles/three.module.js";

function getByPath(obj,path,stepsUp=0){
  const p=path.split('.');
  return (stepsUp>0?p.slice(0,-stepsUp):p).reduce((acc, key) => acc?.[key], obj);
}

export function rnd(min,max){
  return min+Math.floor(Math.random()*(max-min));
}

export function di(n){
  return document.getElementById(n);
}

export async function loadAll(arr,loader,prefix = "",suffix = ""){
  const objects = [];
  for(const o of arr){
    const array = (await loadOne(prefix+o+suffix, loader));
    const group = new Group();
    array.forEach(m=>group.add(m));
    objects[o] = group;
  }
  return objects;
}

export async function loadOne(o,loader){
  if(loader)loader.textContent=("From "+o);
  return await importVRX(o);
}

export function remove(m){
  World.scene.remove(m);
  if(m.material)m.material.dispatch();
  if(m.geometry)m.geometry.dispatch();
  if(m.childern)m.childern.forEach(c=>remove(c));
}
