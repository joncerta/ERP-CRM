import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  tenantId: string;
  userId: string;
}

/**
 * Carries the current request's tenant/user across async boundaries so
 * code that has no direct access to the HTTP request — like a TypeORM
 * subscriber reacting to a save() call several layers down — can still
 * answer "who did this". Populated once per request by
 * RequestContextInterceptor.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

  static run<T>(store: RequestContextStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  static get(): RequestContextStore | undefined {
    return this.storage.getStore();
  }
}
