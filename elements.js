import {WebGLRenderer, Scene, PerspectiveCamera} from "three";
import {loadOne, GridMaterial} from "barrel";

class SliderSwitch extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --width: 64px;
          --height: 36px;

          --cut: calc(var(--height)*0.5);

          --bg-off: #2b2b2b;
          --bg-on: #00bfff;

          --thumb: #fff;

          --hex: polygon(
            var(--cut) 0,
            calc(100% - var(--cut)) 0,
            100% 50%,
            calc(100% - var(--cut)) 100%,
            var(--cut) 100%,
            0 50%
          );
          display: inline-block;
        }

        label {
          position: relative;
          display: inline-block;

          width: var(--width);
          height: var(--height);

          cursor: pointer;
        }

        input {
          display: none;
        }

        .slider {
          position: absolute;
          inset: 0;

          background: var(--bg-off);

          clip-path: var(--hex);

          transition:
            background .25s ease,
            box-shadow .25s ease;
        }

        .slider::before {
          content: "";

          position: absolute;
          left: 0px;
          top: 0px;

          width: var(--width);
          height: var(--height);
          clip-path: var(--hex);
          
          background: var(--thumb);
          border-radius: 5px;

          transition: transform .25s ease;

          box-shadow:
            0 2px 8px rgba(0,0,0,.3);
        }

        input:checked + .slider {
          background: var(--bg-on);

          box-shadow:
            0 0 10px rgba(0,191,255,.5);
        }

        input:checked + .slider::before {
          transform:
            translateX(calc(var(--width) - var(--height)));
        }
      </style>

      <label>
        <input type="checkbox">
        <span class="slider"></span>
      </label>
    `;

    this.input =
      this.shadowRoot.querySelector("input");
  }

  connectedCallback() {
    if (this.hasAttribute("checked")) {
      this.input.checked = true;
    }

    this.input.addEventListener("change", () => {
      this.toggleAttribute(
        "checked",
        this.input.checked
      );

      this.dispatchEvent(
        new CustomEvent("change", {
          detail: {
            checked: this.input.checked
          }
        })
      );
    });
  }

  get checked() {
    return this.input.checked;
  }

  set checked(value) {
    this.input.checked = value;

    this.toggleAttribute("checked", value);
  }
}

class HorizontalScrollable extends HTMLElement {
  constructor(){
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          overflow: hidden;
        }
      
        .moveleft, .moveright 
          width: 50px;
          height: 80px;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }

        .moveleft {
          left: 10px;
        }

        .moveright {
          right: 10px;
        }

        .childRoot {
          height: 100%;
          position: absolute;
          left: 0px;
          top: 0px;
          overflow: hidden;
        }
      </style>

      <button class = ".moveleft></button>
      <button class = ".moveright></button>
    `;

    this.childRoot = document.createElement("div");
  }

  connectedCallback() {
    super.appendChild(this.childRoot);

    let down = false, lx = 0;

    this.addEventListener("pointerdown", e=>{
      down = true;
      lx = e.clientX;
    });
    
    this.addEventListener("pointermove", e=>{
      if(!down) return;
      const x = e.clientX;
      const dx = x - lx;
      lx = x;
      this.childRoot.scrollBy(dx);
    });

    this.addEventListener("pointerup", e=>{
      down = false;
    });

    const left = this.querySelector(".moveleft");
    const right = this.querySelector(".moveright");

    left.onclick = e=>{
      e.preventDefault();
      e.stopPropagation();
      this.childRoot.scrollBy({left: 200, behavior: "smooth"});
    };

    right.onclick = e=>{
      e.preventDefault();
      e.stopPropagation();
      this.childRoot.scrollBy({left: -200, behavior: "smooth"});
    };
  }
}

class ObjectViewElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          left-top-border-radius: 10px;
          right-bottom-border-radius: 10px;
        }

        canvas {
          width: 100%;
          height: 100%;
          left-top-border-radius: 10px;
          right-bottom-border-radius: 10px;
        }
      </style>
    `;

    ObjectViewElement.elements ??= [];
    ObjectViewElement.elements.push(this);
  }

  connectedCallback() {
    this.renderer = new WebGLRenderer();
    this.appendChild(this.renderer.domElement);
    this.camera = new PerspectiveCamera(0.01, 100, 60);
    this.camera.position.set(0, 1, -5);
    this.scene = new Scene();
    loadOne(this.getAttribute("obj")).then(o=>{
      this.obj = o;
      this.scene.add(this.obj);
      if(this.hasAttribute("scale"))this.obj.scale.setScalar(+this.getAttribute("scale"));
    });
    this.speed = +this.getAttribute("speed") ?? 1;
  }

  update(dt) {
    if(!this.obj) return;
    this.obj.rotation.y += dt * this.speed;
    this.renderer.render(this.scene, this.camera);
  }

  static last = performance.now();

  static loop(time) {
    const dt = time - this.last;
    this.last = time;
    this.elements.forEach(e=>e.update(dt));
    requestAnimationFrame((t)=>this.loop(t));
  }

  static {
    requestAnimationFrame((t)=>this.loop(t));
  }
}

customElements.define(
  "s-switch",
  SliderSwitch
);

customElements.define(
  "horizontal-scrollable",
  HorizontalScrollable
);
