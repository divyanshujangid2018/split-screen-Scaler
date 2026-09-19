/** Small capped LRU-ish cache so re-scrolling past a row doesn't re-read the file, while
 *  never holding unbounded memory for thousands of previews across a long session. */
export class CappedCache<T> {
  private map = new Map<string, T>();
  constructor(private limit: number) {}

  get(key: string): T | undefined {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }

  set(key: string, value: T) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}

export const textPreviewCache = new CappedCache<string>(400);
export const imagePreviewCache = new CappedCache<string>(150);
