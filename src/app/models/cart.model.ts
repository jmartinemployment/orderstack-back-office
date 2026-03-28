import { OrderType, CustomerInfo } from './order.model';
import { MenuItem, Modifier, WeightUnit } from './menu.model';

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers?: Modifier[];
  modifierSummary?: string;
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
  weightUnit?: WeightUnit;
}

export interface Cart {
  items: CartItem[];
  orderType: OrderType;
  customer?: CustomerInfo;
  tableId?: string;
  specialInstructions?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface CartState {
  cart: Cart;
  isOpen: boolean;
}
