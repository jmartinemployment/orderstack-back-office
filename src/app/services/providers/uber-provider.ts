import { BaseHttpDeliveryProvider } from './base-http-delivery-provider';

export class UberDeliveryProvider extends BaseHttpDeliveryProvider {
  override readonly type = 'uber' as const;
}
