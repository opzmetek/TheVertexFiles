export class Animation {

  static processes = Object.create(null)
  
  static register(name, anim){
    this.processes[name] = {
      start: performance.now(),
      duration: anim.duration??1000,
      ease: anim.easing??this.Linear,
      mode: anim.easeType??this.In,
      onUpdate: anim.setter??(()=>{}),
      onEnd: anim.onEnd??(()=>{}),
      loop: anim.loop || false,
      loopInvert: anim.loopInvert || false,
      invert: false;
    };
  }

  static unregister(name){
    delete this.processes[name];
  }

  static update(){
    const now = performance.now();
    for(const pName in this.processes){
      const process = this.processes[pName];
      const elapsed = now - process.start;
      let t = elapsed / process.duration;
      if(t >= 1){
        process.onUpdate(process.invert?0 : 1);
        if(process.loop){
          process.start = now;
        }else if(process.loopInvert){
          process.start = now;
          process.invert = !process.invert;
        }else{
          process.onEnd();
          this.unregister(pName);
        }
        continue;
      }
      if(process.invert) t = 1 - t;
      const time = process.mode(t, process.ease);
      process.onUpdate(time);
    }
  }

  static In(t, call){
    return call(t);
  }

  static Out(t, call){
    return 1 - call(1 - t);
  }

  static InOut(t, call){
    return t > 0.5 ? call(t*2) * 0.5 : 1 - call(1-t*2) * 0.5;
  }

  static Linear(t){
    return t;
  }

  static Quad(t){
    return t * t;
  }

  static Smooth(t){
    return t * t * (3 - 2 * t);
  }
};
