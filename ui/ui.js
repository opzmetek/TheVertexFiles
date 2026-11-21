import {Game, World, Player, PlayerConfig, keyCodes, di, createStartingPanel, playerShoot, emit, on} from "barrel";

const MAX_PITCH = 1.55;

export function loadUI(){
  di("cfar").onchange = e=>{
    Game.camera.far = +e.target.value;
    Game.camera.updateProjectionMatrix();
  }

  di("sensivity").onchange = e=>{
    Game.sensivity = +e.target.value;
  }

  di("lWidth").onchange = e=>{
    Game.lWidth = +e.target.value;
  }
  
  di("leaveBtn").onclick = e=>{
    Game.running = false;
    document.querySelectorAll(".options").forEach(e=>e.style.display="none");
    di("game").style.display="none";
    di("homeMenu").style.display="block";
  }

  let settings = di("keyset");
  for (let action in keyCodes) {
    let btn = document.createElement("button");
    btn.textContent = action + ": " + keyCodes[action];
    btn.onclick = () => {
        btn.textContent = "Press key...";
        document.onkeydown = (e) => {
            keyCodes[action] = e.key.toLowerCase();
            btn.textContent = action + ": " + e.key.toLowerCase();
            document.onkeydown = null;
        };
    };
    settings.appendChild(btn);
    settings.appendChild(document.createElement("br"));
  }
  
  di("start-game").onclick=createStartingPanel;
  window.addEventListener("resize",e=>{
   Game.renderer.setSize(window.innerWidth,window.innerHeight);
    Game.camera.aspect = window.innerWidth/window.innerHeight;
    Game.camera.updateProjectionMatrix();
  });
}

on("sprintstart", () => {
  if (Player.sprinting) return;
  Player.speed = PlayerConfig.speed * 2;
  Game.camera.fov += 20;
  Player.sprinting = true;
  Game.camera.updateProjectionMatrix();
});

on("sprintend", () => {
  if (!Player.sprinting) return;
  Player.speed = PlayerConfig.speed;
  Game.camera.fov -= 20;
  Player.sprinting = false;
  Game.camera.updateProjectionMatrix();
});

export function escape(){
  Game.paused = !Game.paused;
  if(Game.paused){
    document.querySelectorAll(".options").forEach(e=>e.style.display="flex");
  }else{
    document.querySelectorAll(".options").forEach(e=>e.style.display="none");
  }
}

export function gameUI(color,dash,anchor){
  Game.events = new AbortController();
  if(Game.mobile) screen.orientation.lock("landscape");
  const keys = {};
  document.addEventListener("keydown",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    keys[k]=true;
    if(k===keyCodes.jump&&Player.onGround&&!Game.paused)Player.vertVec = Player.jumpStrength;
    else if(k===keyCodes.dash&&!Game.paused)dash();
    else if(k===keyCodes.anchor&&!Game.paused)anchor();
    else if(k===keyCodes.escape || k === "delete")escape();
    updateKeys();
  }, {signal: Game.events.signal});
  document.addEventListener("keyup",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    delete keys[k];
    if(k===keyCodes.jump&&!Game.paused)Player.vertVec = 0;
    updateKeys();
  }, {signal: Game.events.signal});
  
  function updateKeys(){
    if(Game.paused)return;
    if(keys[keyCodes.moveBack])Game.input.mx=-1;
    else if(keys[keyCodes.moveFront])Game.input.mx=1;
    else Game.input.mx=0;
    if(keys[keyCodes.moveLeft])Game.input.my=-1;
    else if(keys[keyCodes.moveRight])Game.input.my=1;
    else Game.input.my=0;
    if(keys[keyCodes.sprint]) { if(!Player.sprinting) emit("sprintstart");}
    else if (Player.sprinting) emit("sprintend");
  }
  if(Game.mobile){
    let ly, lx, active;
    let shootTimeout = 300;
    let shootAwait = null;
    let shot = false;
    Game.renderer.domElement.addEventListener("pointermove",e=>{
      if (e.pointerId != active) return;
      const x = e.clientX, y = e.clientY;
      if(ly===undefined||lx===undefined){
        ly=y;
        lx=x;
      }
      if (shootAwait) { clearTimeout(shootAwait); shootAwait = null; }
      const dx = lx - x, dy = ly - y;
      World.yaw.rotation.y+=dx*Game.sensivity * Game.otherState.sensivityMultiplier;
      World.pitch.rotation.x = Math.max(Math.min(World.pitch.rotation.x+dy*Game.sensivity * Game.otherState.sensivityMultiplier, MAX_PITCH), -MAX_PITCH);
      lx=x;
      ly=y;
      if (!shootAwait) emit("shootmove", {x: lx, y: ly});
    }, {signal: Game.events.signal});
    Game.renderer.domElement.addEventListener("pointerdown",e=>{
      active = e.pointerId;
      Game.renderer.domElement.setPointerCapture(active);
      lx=e.clientX;ly=e.clientY;
      if(!document.pointerLockElement) pointerLock();
      shootAwait = setTimeout(() => {
        emit("shootstart", {x: lx, y: ly});
        shot = true;
        shootAwait = null;
      }, shootTimeout);
    }, {signal: Game.events.signal});
    const onEnd = e=>{
      active = null;
Game.renderer.domElement.releasePointerCapture(e.pointerId);
      if (shot) emit("shootend");
      shot = false;
      clearTimeout(shootAwait);
      shootAwait = null;
    }
    Game.renderer.domElement.addEventListener("pointerup", onEnd, {signal: Game.events.signal});
    Game.renderer.domElement.addEventListener("poinercancel", onEnd, {signal: Game.events.signal});
    const joystick = window.nipplejs.create({
      zone:di("joystick"),
      mode:"static",
      position:{left:"50px",bottom:"50px"},
      size:150,
      color:color
    });
    const ctrls = document.createElement("div");
    ctrls.id = "mobile-controls";
    di("game").appendChild(ctrls);
    const jumpBtn = document.createElement("button");
    ctrls.appendChild(jumpBtn);
    jumpBtn.textContent="⬆️";
    jumpBtn.onpointerdown = e=>{
      if(Player.onGround&&!Game.paused)Player.vertVec = Player.jumpStrength;
    }
    const dashBtn = document.createElement("button");
    ctrls.appendChild(dashBtn);
    dashBtn.textContent="💨";
    dashBtn.onpointerdown = dash;
    const anchorBtn = document.createElement("button");
    ctrls.appendChild(anchorBtn);
    anchorBtn.textContent="⏬";
    anchorBtn.onpointerdown = anchor;
    const sprintBtn = document.createElement("button");
    ctrls.appendChild(sprintBtn);
    sprintBtn.textContent="⏩";
    sprintBtn.onpointerdown = e=>{
      if(Player.sprinting) emit("sprintend");
      else emit("sprintstart");
    }
    const escBtn=document.createElement("button");
    ctrls.appendChild(escBtn);
    escBtn.textContent="⏸️";
    escBtn.onclick=escape;
    const settings = di("options-center");
    if (!settings.querySelector("#shootto")) {
      const shootTOL=document.createElement("label");
      shootTOL.innerHTML = `Shoot minimal interval: 0 <input id="shootto" type="range" min="0" max="1" value="0.3" step="0.01"> 1`;
      const shootTO = shootTOL.querySelector("#shootto");
      shootTO.addEventListener("change", e => {
        shootTimeout = (+e.target.value) * 1000;
      });
      settings.appendChild(shootTOL);
    }
    joystick.on("move",(e,data)=>{
      Game.input.my=data.vector.x * data.force;
      Game.input.mx=data.vector.y * data.force;
    });
    joystick.on("end",()=>{
      Game.input.mx = 0;
      Game.input.my = 0;
    });
    Game.setup.joystick = joystick;
  }else{
    Game.renderer.domElement.addEventListener("pointermove",e=>{
      World.yaw.rotation.y-=e.movementX*Game.sensivity * Game.otherState.sensivityMultiplier;
      World.pitch.rotation.x = Math.max(Math.min(World.pitch.rotation.x-e.movementY*Game.sensivity * Game.otherState.sensivityMultiplier, MAX_PITCH), -MAX_PITCH);
      emit("shootmove");
    }, {signal: Game.events.signal});
    Game.renderer.domElement.addEventListener("pointerdown",e=>{
      if(!document.pointerLockElement)pointerLock();
      else emit("shootstart");
    }, {signal: Game.events.signal});
    Game.renderer.domElement.addEventListener("pointerup", e=>{
      emit("shootend");
    }, {signal: Game.events.signal});
  }
}

export function pointerLock(){
  const gcanvas = di("game");
  gcanvas.requestFullscreen().then(()=>{
    if(!Game.mobile)Game.renderer.domElement.requestPointerLock();
  });
}

export async function loadGame(){
  const loadscreen = document.getElementById("loadscreen");
  const loader = document.createElement("span");
  loadscreen.appendChild(loader);
  loader.className="small";
  loader.id = "loader";
  try{
    loader.textContent = "Loading game...";
    const mRes = await fetch("./game-descriptor.json");
    Game.manifest = await mRes.json();
    loader.textContent = "Starting game...";
    setTimeout(function() {
      loadscreen.style.display="none";
      document.getElementById("homeMenu").style.display="block";
    }, 1000);
  }catch(e){
    loader.textContent="Error: "+e;
    console.error(e);
  }
}
