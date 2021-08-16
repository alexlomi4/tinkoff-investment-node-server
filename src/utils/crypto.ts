import crypto = require('crypto');

const hasher = crypto.createHash('sha256');

// eslint-disable-next-line import/prefer-default-export
export class CryptoHelper {
  static getHash(sourceValue: string): string {
    return hasher.copy().update(sourceValue).digest('hex');
  }
}
