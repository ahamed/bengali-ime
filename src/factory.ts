export class Factory {
  private static readonly instances = new Map<new () => unknown, unknown>();

  static make<T>(cls: new () => T): T {
    if (Factory.instances.has(cls)) {
      return Factory.instances.get(cls) as T;
    }
    const instance = new cls();
    Factory.instances.set(cls, instance);
    return instance;
  }

  static clear() {
    Factory.instances.clear();
  }
}
