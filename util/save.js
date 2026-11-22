import {UserState} from "barrel"

class SaveManager {
  constructor() {
    this.dbName = "TheVertex_v1_save";
    this.storeName = "saves";
    this.db = null;
  }
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(slot, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        this.storeName,
        "readwrite"
      );
      const store = transaction.objectStore(this.storeName);
      store.put({...data,version: 1,savedAt: Date.now()}, slot);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async load(slot) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        this.storeName,
        "readonly"
      );
      const request = transaction.objectStore(this.storeName).get(slot);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }
  async delete(slot) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        this.storeName,
        "readwrite"
      ); transaction.objectStore(this.storeName).delete(slot);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const saveManager = new SaveManager();

export async function saveGame() {
  await saveManager.save("state_save", UserState);
}

export async function revive() {
  const data = await saveManager.load("state_save");
  if (data) {
    Object.assign(UserState, data);
  }
}
