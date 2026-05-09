class SliderSwitch extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --width: 64px;
          --height: 36px;

          --bg-off: #2b2b2b;
          --bg-on: #00bfff;

          --thumb: #fff;

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

          border-radius: 999px;

          transition:
            background .25s ease,
            box-shadow .25s ease;
        }

        .slider::before {
          content: "";

          position: absolute;

          width: calc(var(--height) - 8px);
          height: calc(var(--height) - 8px);

          left: 4px;
          top: 4px;

          border-radius: 50%;
          background: var(--thumb);

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

customElements.define(
  "s-switch",
  SliderSwitch
);
