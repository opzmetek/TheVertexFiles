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

          --thumb: #000;

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
          width: var(--height);
          height: var(--height);
          clip-path: var(--hex);
          border-radius: 5px;
          transition: transform .25s ease;
          background-color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,.3);
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
  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          overflow: hidden;
          width: max-content;
        }

        .moveleft, .moveright {
          width: 50px;
          height: 80px;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }

        .moveleft {
          left: 10px;
        }

        .moveright {
          right: 10px;
        }

        button, label, input, a, span {
          position: relative;
          background: linear-gradient(145deg, #0e1625, #101c33);
          color: #a7d4ff;
          border: 1px solid #3db4ff;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          box-shadow: 0 0 10px rgba(61, 180, 255, 0.4);
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          user-select: none;
          transform-origin: center center;
          flex-direction: column;
          width: auto;
        }

        .childRoot {
          height: 100%;
          width: 100%;
          position: relative;
          min-height: 100px;
          top: 0;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          display: flex;
          justify-content: center;
          flex-direction: row;
          gap: 10px;
        }

        .childRoot::-webkit-scrollbar {
          display: none;
        }
      </style>

      <button class="moveleft">←</button>
      <button class="moveright">→</button>
      <div class="childRoot">
        <slot></slot>
      </div>
    `;

    this.childRoot = this.shadowRoot.querySelector(".childRoot");
  }

  connectedCallback() {
    let down = false;
    let lx = 0;

    this.childRoot.addEventListener("pointerdown", e => {
      down = true;
      lx = e.clientX;
    });

    this.childRoot.addEventListener("pointermove", e => {
      if (!down) return;

      const x = e.clientX;
      const dx = x - lx;
      lx = x;

      this.childRoot.scrollLeft -= dx;
    });

    this.childRoot.addEventListener("pointerup", () => {
      down = false;
    });

    this.childRoot.addEventListener("pointercancel", () => {
      down = false;
    });

    const left = this.shadowRoot.querySelector(".moveleft");
    const right = this.shadowRoot.querySelector(".moveright");

    left.onclick = e => {
      e.preventDefault();
      this.childRoot.scrollBy({
        left: -200,
        behavior: "smooth"
      });
    };

    right.onclick = e => {
      e.preventDefault();
      this.childRoot.scrollBy({
        left: 200,
        behavior: "smooth"
      });
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
