import {Game, Player, World, Audio, importVRX} from "barrel";
import {Group, AxesHelper, SkeletonHelper} from "three";

export function getByPath(obj,path,stepsUp=0){
  const p=path.split('.');
  return (stepsUp>0?p.slice(0,-stepsUp):p).reduce((acc, key) => acc?.[key], obj);
}

export function rnd(min,max){
  return min+Math.floor(Math.random()*(max-min));
}

export function di(n){
  return document.getElementById(n);
}

export async function loadAll(arr,loader,prefix = "",suffix = "", objects){
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
  console.log(o);
  return await importVRX(o);
}

export function remove(m){
  World.scene.remove(m);
  if(m.childern)m.childern.forEach(c=>remove(c));
}

function destroyThree({ scene, renderer, camera }) {
  if (scene) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene.traverse(object => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }
      if (object.material) {
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        mats.forEach(material => { materials.add(material) });
      }
      object.skeleton?.dispose();
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    scene.clear();
  }
  if (camera) {
    camera.clear();
    camera = null;
  }
  if (renderer) {
    renderer.renderLists.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  scene = null;
  renderer = null;
}

export function destroy() {
  destroyThree({ renderer: Game.renderer, scene: World.scene, camera: Game.camera });
  World.enemies.length = 0;
  World.bullets.length = 0;
  Audio.audioCtx.close();
}

export function showDebug() {
  const axesHelper = new AxesHelper(1);
  axesHelper.position = World.yaw.position;
  World.scene.add(axesHelper);
  const skeletonHelper = new SkeletonHelper(World.mesh);
  World.scene.add(skeletonHelper);
  if(Game.mobile){
    const origWarn = console.warn;
    const origError = console.error;
    console.warn = function (...args) {
      alert("WARN:\n" + args.join(" "));
      origWarn.apply(console, args);
    };
    console.error = function (...args) {
      alert("ERROR:\n" + args.join(" "));
      origError.apply(console, args);
    };
    window.onerror = function (message, source, lineno, colno, error) {
      alert("EXCEPTION:\n" + message + "\n" + source + ":" + lineno + ":" + colno);
    };
    window.onunhandledrejection = function (event) {
      alert("UNHANDLED PROMISE:\n" + event.reason);
    };
  }
  return { axesHelper, skeletonHelper };
}
