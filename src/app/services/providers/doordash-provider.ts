import { BaseHttpDeliveryProvider } from './base-http-delivery-provider';

export class DoorDashDeliveryProvider extends BaseHttpDeliveryProvider {
  override readonly type = 'doordash' as const;
}
