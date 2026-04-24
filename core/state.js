export const Game = {
  camera: null,
  renderer: null,
  input: {
    mx: 0,
    my: 0
  },
  running: true,
  paused: false,
  sensivity: 0.01,
  lWidth: 1,
  manifest: {},
  timers:{dash:0},
  gravity: 600,
  objects: []
}

export const Audio = {
  analyser: null,
  bin: null,
  audioCtx: null,
  source: null
}

export const World = {
  scene: null,
  mesh: null,
  box: null,
  material: null,
  eMaterial: null,
  pitch: null,
  yaw: null,
  enemies: []
}

export const Player = {
  jumpStrength: 280,
  speed: 20,
  vertVec: 0,
  onGround: true
}

export const PlayerConfig = {
  size:0.5,
  halfSize:0.25,
  speed:20,
  dashLength: 30,
  dashDelay: 1000
}
