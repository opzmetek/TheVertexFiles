import {World, Audio} from "/TheVertexFiles/core/state.js";

export function analyse() {
  Audio.analyser.getByteTimeDomainData(Audio.bin);
  let sum = 0;
  for(let i=0;i<Audio.bin.length;i++){
    sum+=bin[i];
  }
  const avg = sum/Audio.bin.length;
  const energy = avg / 255;
  World.mesh.material.uniforms.thickness.value = (1.0+energy * energy * 2.0) * Game.lWidth;
}



export async function initAudio(name){
  Audio.audioCtx = new (window.AudioContext||window.WebkitAudioContext)();
  Audio.analyser = Audio.audioCtx.createAnalyser();
  Audio.analyser.fftSize = 32;
  const res = await fetch("./music/"+name);
  const buff = await res.arrayBuffer();
  console.log(res, buff);
  const buffer = await Audio.audioCtx.decodeAudioData(buff);
  Audio.source = Audio.audioCtx.createBufferSource();
  Audio.source.buffer = buffer;
  Audio.source.connect(Audio.analyser);
  Audio.analyser.connect(Audio.audioCtx.destination);
  Audio.bin = new Uint8Array(Audio.analyser.frequencyBinCount);
  Audio.source.start();
}
