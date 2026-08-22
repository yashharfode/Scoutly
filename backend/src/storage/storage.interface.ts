export interface LocalStorage<T> { get(): Promise<T>; save(value: T): Promise<T>; }
