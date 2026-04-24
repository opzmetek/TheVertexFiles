import {ShaderMaterial, Color} from "/three.module.js";

export const GridMaterial = (bc = 0x000000,lineColor = 0xffa500,squareSize = 2.5) => new ShaderMaterial({
  uniforms: {
    lineColor: { value: new Color(lineColor) },
    squareSize: { value: squareSize },
    baseColor: { value: new Color(bc) },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
precision highp float;
uniform float squareSize;
uniform vec3 lineColor;
uniform vec3 baseColor;
varying vec3 vWorldPos;
varying vec3 vBary;

void main() 
{
    vec3 pos = vWorldPos;
    vec3 color = lineColor;

    // --- derivace pro anti-aliasing ---
    float dXx = abs(dFdx(pos.x));
    float dYx = abs(dFdy(pos.x));
    float dXy = abs(dFdx(pos.y));
    float dYy = abs(dFdy(pos.y));
    float dXz = abs(dFdx(pos.z));
    float dYz = abs(dFdy(pos.z));

    float widthX = max(dXx, dYx) * 2.5;
    float widthY = max(dXy, dYy) * 2.5;
    float widthZ = max(dXz, dYz) * 2.5;

    float alpha = 0.0;

    // --- osa X (linky v rovině YZ) ---
    float rem = mod(pos.x, squareSize);
    alpha += smoothstep(widthX,0.0, rem);
    alpha += smoothstep(widthX,0.0, squareSize - rem);

    // --- osa Y (linky v rovině XZ) ---
    rem = mod(pos.y, squareSize);
    alpha += smoothstep(widthY,0.0, rem);
    alpha += smoothstep(widthY,0.0, squareSize - rem);

    // --- osa Z (linky v rovině XY) ---
    rem = mod(pos.z, squareSize);
    alpha += smoothstep(widthZ,0.0, rem);
    alpha += smoothstep(widthZ,0.0, squareSize - rem);

    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(mix(baseColor,color, alpha),1.0);
}
  `,
});
