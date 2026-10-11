export interface SavedPlacement {
  id: string;
  name: string;
  position: [number, number, number];
  rotY: number;
  /** Target height in meters. */
  height: number;
  /** Extra lift above the anchor, so one object can sit on another. */
  lift: number;
  shadow: boolean;
  anchorId: string;
}

const DB_NAME = 'boared-room';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('placements')) db.createObjectStore('placements');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function savePlacement(placement: SavedPlacement, bytes: ArrayBuffer): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['files', 'placements'], 'readwrite');
  tx.objectStore('files').put(bytes, placement.id);
  tx.objectStore('placements').put(placement, placement.id);
  await txDone(tx);
  db.close();
}

export async function deletePlacement(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['files', 'placements'], 'readwrite');
  tx.objectStore('files').delete(id);
  tx.objectStore('placements').delete(id);
  await txDone(tx);
  db.close();
}

export async function loadPlacements(): Promise<{ placement: SavedPlacement; url: string }[]> {
  const db = await openDb();
  const tx = db.transaction(['files', 'placements'], 'readonly');
  const pairs = await new Promise<{ placement: SavedPlacement; bytes: ArrayBuffer }[]>((resolve, reject) => {
    const found: { placement: SavedPlacement; bytes: ArrayBuffer }[] = [];
    const req = tx.objectStore('placements').openCursor();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(found);
        return;
      }
      const placement = cursor.value as SavedPlacement;
      const fileReq = tx.objectStore('files').get(cursor.key);
      fileReq.onerror = () => reject(fileReq.error);
      fileReq.onsuccess = () => {
        const bytes = fileReq.result as ArrayBuffer | undefined;
        if (bytes) found.push({ placement, bytes });
        cursor.continue();
      };
    };
  });
  await txDone(tx);
  db.close();
  return pairs.map(({ placement, bytes }) => ({
    placement,
    url: URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' })),
  }));
}
