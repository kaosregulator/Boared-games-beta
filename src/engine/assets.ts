export type AssetKind = 'model' | 'texture' | 'audio' | 'board' | 'piece' | 'optional';
export type AssetState = 'idle' | 'queued' | 'loading' | 'ready' | 'failed';

export interface AssetRecord {
  id: string;
  url: string;
  kind: AssetKind;
  state: AssetState;
  priority: number;
  dependencies: string[];
  optional: boolean;
  error?: string;
}

const catalog = new Map<string, AssetRecord>();

export function defineAsset(input: Omit<AssetRecord, 'state' | 'error' | 'dependencies'> & { dependencies?: string[]; state?: AssetState }) {
  const prev = catalog.get(input.id);
  if (prev) return prev;
  const rec: AssetRecord = {
    id: input.id,
    url: input.url,
    kind: input.kind,
    state: input.state ?? 'idle',
    priority: input.priority,
    dependencies: (input.dependencies ?? []).slice(),
    optional: input.optional,
  };
  catalog.set(rec.id, rec);
  return rec;
}

export function setAssetState(id: string, state: AssetState, error?: string) {
  const rec = catalog.get(id);
  if (!rec) return;
  rec.state = state;
  rec.error = error;
}

export function listAssets(): AssetRecord[] {
  return [...catalog.values()].map(rec => ({ ...rec, dependencies: rec.dependencies.slice() }));
}

export function resetAssetsForTests() {
  catalog.clear();
}
