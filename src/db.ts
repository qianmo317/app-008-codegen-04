import type { MoveTask, Box, FurnitureItem, DamageRecord, NewDamageRecord } from './types';

const DB_NAME = 'MovingBoxTracker';
const DB_VERSION = 1;
const STORE_TASKS = 'tasks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
      }
    };
  });
}

export async function getAllTasks(): Promise<MoveTask[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readonly');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as MoveTask[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getTask(id: string): Promise<MoveTask | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readonly');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as MoveTask) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTask(task: MoveTask): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readwrite');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.put(task);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TASKS, 'readwrite');
    const store = tx.objectStore(STORE_TASKS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function addBox(taskId: string, box: Box): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  task.boxes.push(box);
  await saveTask(task);
}

export async function updateBox(taskId: string, box: Box): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const idx = task.boxes.findIndex((b) => b.id === box.id);
  if (idx === -1) throw new Error('Box not found');
  task.boxes[idx] = box;
  await saveTask(task);
}

export async function deleteBox(taskId: string, boxId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  task.boxes = task.boxes.filter((b) => b.id !== boxId);
  await saveTask(task);
}

// ---- 大件清点簿 ----

function furnitureList(task: MoveTask): FurnitureItem[] {
  if (!task.furniture) task.furniture = [];
  return task.furniture;
}

export class DuplicateFurnitureError extends Error {
  constructor(name: string) {
    super(`「${name}」已经建过档了，同一件东西不能重复建档`);
    this.name = 'DuplicateFurnitureError';
  }
}

export async function listFurniture(taskId: string): Promise<FurnitureItem[]> {
  const task = await getTask(taskId);
  return task ? furnitureList(task) : [];
}

export async function addFurniture(taskId: string, item: FurnitureItem): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const list = furnitureList(task);
  // 同一件东西不许重复建档：同一本清点簿内名称唯一
  if (list.some((f) => f.name.trim() === item.name.trim())) {
    throw new DuplicateFurnitureError(item.name.trim());
  }
  list.push(item);
  await saveTask(task);
}

export async function updateFurniture(taskId: string, item: FurnitureItem): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const list = furnitureList(task);
  const idx = list.findIndex((f) => f.id === item.id);
  if (idx === -1) throw new Error('Furniture not found');
  list[idx] = item;
  await saveTask(task);
}

export async function deleteFurniture(taskId: string, itemId: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  furnitureList(task);
  task.furniture = task.furniture!.filter((f) => f.id !== itemId);
  await saveTask(task);
}

export async function addPreDamage(taskId: string, itemId: string, damage: DamageRecord): Promise<FurnitureItem> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const item = furnitureList(task).find((f) => f.id === itemId);
  if (!item) throw new Error('Furniture not found');
  item.preDamages.push(damage);
  item.updatedAt = Date.now();
  await saveTask(task);
  return item;
}

export async function addNewDamage(taskId: string, itemId: string, damage: NewDamageRecord): Promise<FurnitureItem> {
  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found');
  const item = furnitureList(task).find((f) => f.id === itemId);
  if (!item) throw new Error('Furniture not found');
  item.newDamages.push(damage);
  item.updatedAt = Date.now();
  await saveTask(task);
  return item;
}
