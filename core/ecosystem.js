class X {
  static listeners = {}
}

export function on(name, callback){
  const listeners = X.listeners;
  if(listeners[name])listeners[name].push(callback);
  else listeners[name] = [callback];
}

export function emit(name, ...args){
  const listeners = X.listeners;
  listeners[name]?.forEach(l=>l(...args));
}

export function resetEventSystem(){
  X.listeners = {};
}
