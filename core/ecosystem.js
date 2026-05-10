const listeners = {};

export function on(name, callback){
  if(listeners[name])listeners[name].push(callback);
  else listeners[name] = [callback];
}

export function emit(name, ...args){
  listeners[name]?.forEach(l=>l(...args));
}

export function resetEventSystem(){
  listeners = {};
}
