import NodeCache from 'node-cache';

const SECONDS_IN_MINUTE = 60;
const DEFAULT_TTL = SECONDS_IN_MINUTE;

// eslint-disable-next-line import/prefer-default-export
export class CashHelper {
  static cache = new NodeCache();

  static withPromiseCache<T>(
    asyncFn: () => Promise<T>,
    key: string,
    ttl?: number
  ): Promise<T> {
    let value = CashHelper.cache.get<Promise<T>>(key);
    if (!value) {
      value = asyncFn();
      CashHelper.cache.set<Promise<T>>(key, value, ttl || DEFAULT_TTL);
    }
    return value;
  }
}
