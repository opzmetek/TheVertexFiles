import { RGBAFormat, HalfFloatType, Scene, BufferGeometry, Mesh, LinearFilter, ClampToEdgeWrapping, Camera, Float32BufferAttribute, WebGLRenderTarget } from "three"
import { Game, World, GridRenderMaterial } from "barrel"

let renderTarget, gtex, quadCam, quadGeom, quadMat, quadScene;

export function initPretest() {
  const width = Math.floor(window.innerWidth * window.devicePixelRatio);
  const height = Math.floor(window.innerHeight * window.devicePixelRatio);
  const buffer = new Float32Array(width * height * 4);
  renderTarget = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
  });

  gtex = renderTarget.texture;
  quadScene = new Scene();
  quadGeom = new BufferGeometry();
  quadCam = new Camera();

  quadGeom.setAttribute('position',
    new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1,  3, 0], 3)
  );
  quadMat = GridRenderMaterial(World.colors[0], World.colors[1], gtex);
  quadScene.add(new Mesh(quadGeom, quadMat));
}

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
