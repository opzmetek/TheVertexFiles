import {World, Audio} from "/TheVertexFiles/core/state.js";

function analyse() {
  Audio.analyser.getByteTimeDomainData(Audio.bin);
  let sum = 0;
  for(let i=0;i<Audio.bin.length;i++){
    sum+=bin[i];
  }
  const avg = sum/Audio.bin.length;
  const energy = avg / 255;
  World.mesh.material.uniforms.thickness.value = (1.0+energy * energy * 2.0) * Game.lWidth;
}
