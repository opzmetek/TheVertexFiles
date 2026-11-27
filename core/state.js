import { Vector3, Scene } from "three"

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
  objects: {},
  shake: 0,
  setup: {
    fov: 60
  },
  otherState: {
    sensivityMultiplier: 1
  },
  events: new AbortController(),
  UP: new Vector3(0, 1, 0),
  DOWN: new Vector3(0,-1, 0)
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
  worldScene: new Scene(),
  material: null,
  eMaterial: null,
  pitch: null,
  yaw: null,
  enemies: [],
  bullets: [],
  colors: [0, 0]
}

export const Player = {
  jumpStrength: 280,
  speed: 20,
  vertVec: 0,
  onGround: true,
  velocityX: 0,
  velocityY: 0,
  gun: []
}

export const PlayerConfig = {
  size:0.5,
  halfSize:0.25,
  speed:20,
  dashLength: 30,
  dashDelay: 1000,
  height: 2
}

export const Guns = [
  {
    name: "Machine Gun",
    type: "machine",
    fireRate: 4,
    damage: 15
  },
  {
    name: "Sniper",
    type: "sniper",
    fireRate: 0.5,
    damage: 150
  },
  {
    name: "Pistol",
    type: "pistol",
    fireRate: 1.1,
    damage: 40
  }
]

export const UserState = {
  xp: 0,
  unlockedGuns: new Set(),
  crystals: 0,
  maxCrystals: 0
}
