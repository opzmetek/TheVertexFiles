import {Player, Guns, di} from "barrel"

const guns = di("guns");

let g0 = null, g1 = null;

Guns.forEach(g => {
  const el = document.createElement("div");
  el.classList.add("gun");
  guns.appendChild(el);
  const name = document.createElement("h3");
  name.classList = "glow";
  name.textContent = g.name ?? "Default";
  el.appendChild(name);
  el.onclick = e => {
    if (g0 && g0.gun === g) return;
    g0?.el.style.borderColor = "blue";
    g1?.el.style.borderColor = "";
    if (g0) g1 = { gun: g0.gun, el: g0.el };
    g0 = { gun: g, el };
    el.style.borderColor = "red";
  }
});

export function setGuns() {
  Player.gun[0] = g0;
  Player.gun[1] = g1;
}
