import OpenAPI from '@tinkoff/invest-openapi-js-sdk';
import ApiWithHashedToken, { OpenApiConfig } from './@types/investment';
import { CryptoHelper } from './utils/crypto';

export default class CustomApi extends OpenAPI implements ApiWithHashedToken {
  hashedToken: string;

  constructor({
    apiURL,
    socketURL,
    secretToken,
    brokerAccountId,
  }: OpenApiConfig) {
    super({ apiURL, socketURL, secretToken, brokerAccountId });
    this.hashedToken = CryptoHelper.getHash(secretToken);
  }

  getKeyForRequest(prefix: string): string {
    return `${prefix} : ${this.hashedToken}`;
  }
}
