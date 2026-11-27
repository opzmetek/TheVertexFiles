import { DataTexture, RGBAFormat, FloatType, Scene, BufferGeometry, Mesh, NearestFilter, ClampToEdgeWrapping, Camera, Float32BufferAttribute } from "three"
import { Game, World, GridRenderMaterial } from "barrel"

const width = window.innerWidth, height = window.innerHeight;
const buffer = new Float32Array(width * height * 4);
const gtex = new DataTexture(buffer, width, height, RGBAFormat, FloatType);
gtex.minFilter = NearestFilter;
gtex.magFilter = NearestFilter;
gtex.wrapS = ClampToEdgeWrapping;
gtex.wrapT = ClampToEdgeWrapping;
gtex.generateMipmaps = false;
const quadScene = new Scene();
const quadGeom = new BufferGeometry();
const quadCam = new Camera();

quadGeom.setAttribute('position',
    new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1,  3, 0], 3)
);
const quadMat = GridRenderMaterial(World.colors[0], World.colors[1], gtex);
quadScene.add(new Mesh(quadGeom, quadMat));

export function setThickness(val) {
    quadMat.thickness.value = val;
}

export function render() {
  const r = Game.renderer;
  r.setRenderTarget(gtex);
  r.render(World.worldScene, Game.camera);
  r.setRenderTarget(null);
  r.render(quadScene, quadCam);
  r.render(World.scene, Game.camera);
}
