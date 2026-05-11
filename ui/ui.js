import {Game, World, Player, PlayerConfig, keyCodes, di, createStartingPanel, playerShoot, emit} from "barrel";

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
    Game.running=false;
    Game.renderer.domElement.remove();
    di("game").style.display="none";
    di("homeMenu").style.display="block";
  }
  
  di("start-game").onclick=createStartingPanel;
  window.addEventListener("resize",e=>{
   Game.renderer.setSize(window.innerWidth,window.innerHeight);
    Game.camera.aspect = window.innerWidth/window.innerHeight;
    Game.camera.updateProjectionMatrix();
  });
}

export function escape(){
  Game.paused = !Game.paused;
  if(Game.paused){
    di("options").style.display="flex";
  }else{
    di("options").style.display="none";
  }
}

export function gameUI(color,dash,anchor){
  if(Game.mobile) screen.orientation.lock("landscape");
  const keys = {};
  document.addEventListener("keydown",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    keys[k]=true;
    if(k===keyCodes.jump&&Player.onGround&&!Game.paused)Player.vertVec = Player.jumpStrength;
    else if(k===keyCodes.dash&&!Game.paused)dash();
    else if(k===keyCodes.anchor&&!Game.paused)anchor();
    else if(k===keyCodes.escape)escape();
    updateKeys();
  });
  document.addEventListener("keyup",e=>{
    e.preventDefault();
    const k = e.key.toLowerCase();
    delete keys[k];
    if(k===keyCodes.jump&&!Game.paused)Player.vertVec = 0;
    updateKeys();
  });
  
  function updateKeys(){
    if(Game.paused)return;
    if(keys[keyCodes.moveBack])Game.input.mx=-1;
    else if(keys[keyCodes.moveFront])Game.input.mx=1;
    else Game.input.mx=0;
    if(keys[keyCodes.moveLeft])Game.input.my=-1;
    else if(keys[keyCodes.moveRight])Game.input.my=1;
    else Game.input.my=0;
    if(keys[keyCodes.sprint])Player.speed = PlayerConfig.speed*2;
    else Player.speed = PlayerConfig.speed;
  }
  if(Game.mobile){
    let ly,lx;
    Game.renderer.domElement.addEventListener("pointermove",e=>{
      const x = e.clientX,y = e.clientY;
      if(ly===undefined||lx===undefined){
        ly=y;
        lx=x;
      }
      const dx = lx-x,dy=ly-y;
      World.yaw.rotation.y+=dx*Game.sensivity;
      World.pitch.rotation.x = Math.max(Math.min(World.pitch.rotation.x+dy*Game.sensivity, MAX_PITCH), -MAX_PITCH);
      lx=x;
      ly=y;
      emit("shootmove", {x: lx, y: ly});
    });
    Game.renderer.domElement.addEventListener("pointerdown",e=>{
      lx=e.clientX;ly=e.clientY;
      if(!document.pointerLockElement)pointerLock();
      else emit("shootstart", {x: lx, y: ly});
    });
    Game.renderer.domElement.addEventListener("pointerup", e=>{
      emit("shootend");
    });
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
      if(Player.speed>PlayerConfig.speed)Player.speed = PlayerConfig.speed;
      else if(Player.speed===PlayerConfig.speed)Player.speed = PlayerConfig.speed*2;
    }
    const escBtn=document.createElement("button");
    ctrls.appendChild(escBtn);
    escBtn.textContent="⏸️";
    escBtn.onclick=escape;
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
      World.yaw.rotation.y-=e.movementX*Game.sensivity;
      World.pitch.rotation.x = Math.max(Math.min(World.pitch.rotation.x-e.movementY*Game.sensivity, MAX_PITCH), -MAX_PITCH);
      emit("shootmove");
    });
    Game.renderer.domElement.addEventListener("pointerdown",e=>{
      if(!document.pointerLockElement)pointerLock();
      else emit("shootstart");
    });
    Game.renderer.domElement.addEventListener("pointerup", e=>{
      emit("shootend");
    });
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
