# Memory Storage Abstraction

```ts
export interface MemoryRecord {
  readonly id: string;
  readonly scope: "short-term" | "long-term";
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MemoryStore {
  put(record: MemoryRecord): Promise<void>;
  get(id: string): Promise<MemoryRecord | undefined>;
  search(query: string): Promise<MemoryRecord[]>;
  delete(id: string): Promise<void>;
}
```

File storage is the default mental model. Database-backed storage can implement the same contract later.
