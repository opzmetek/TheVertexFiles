export const Game{
  scene: null,
  renderer: null,
  input: {
    mx: 0,
    my: 0
  },
  running: true,
  paused: false,
  sensivity: 0.01,
  lWidth: 1
}

export const Audio{
  analyser: null,
  bin: null,
  audioCtx: null
}

export const World{
  mesh: null,
  box: null,
  material: null,
  eMaterial: null,
  pitch: null,
  yaw: null
}

export const Player{
  player:{
    speed: 30
  },
  jumpStrength: 240,
  speed: 30,
  vertVec: 0,
  onGround: true
}
