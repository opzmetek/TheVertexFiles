import { Texture, RGBAFormat, FloatType, Scene, PlaneGeometry, Mesh } from "three"
import { Game, GridRenderMaterial } from "barrel"

const width = window.innerWidth, height = window.innerHeight;
const buffer = new Float32Array(width * height * 4);
const gtex = new DataTexture(buffer, width, height, RGBAFormat, FloatType);

const quadScene = new Scene();
const quadGeom = new PlaneGeometry();
const quadMat = GridRenderMaterial(World.colors[0], World.colors[1]);
quadScene.add(new Mesh(quadGeom, quadMat));

export function render() {
  const r = Game.renderer;
  r.setRenderTarget(gtex);
  r.render(World.worldScene, Game.camera);
  
}
