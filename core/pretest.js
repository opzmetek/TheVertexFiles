import { RGBAFormat, FloatType, Scene, BufferGeometry, Mesh, NearestFilter, ClampToEdgeWrapping, Camera, Float32BufferAttribute, WebGLRenderTarget } from "three"
import { Game, World, GridRenderMaterial } from "barrel"

const width = window.innerWidth, height = window.innerHeight;
const buffer = new Float32Array(width * height * 4);
const renderTarget = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: FloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
});

const gtex = renderTarget.texture;
const quadScene = new Scene();
const quadGeom = new BufferGeometry();
const quadCam = new Camera();

quadGeom.setAttribute('position',
    new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1,  3, 0], 3)
);
const quadMat = GridRenderMaterial(World.colors[0], World.colors[1], gtex);
quadScene.add(new Mesh(quadGeom, quadMat));

export function setThickness(val) {
    quadMat.uniforms.thickness.value = val;
}

export function render() {
  if (!World.eMaterial.uniforms.depthTex.value) {
    World.eMaterial.uniforms.depthTex.value = gtex;
    World.eHitMaterial.uniforms.depthTex.value = gtex;
  }
  const r = Game.renderer;
  r.autoClear = false;
  r.setRenderTarget(renderTarget);
  r.clear(true, true, true);
  r.render(World.worldScene, Game.camera);
  r.setRenderTarget(null);
  r.render(quadScene, quadCam);
  r.render(World.scene, Game.camera);
}
