export interface ComboItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  isRequired: boolean;
  substituteGroupId?: string;
}

export interface ComboSubstituteGroup {
  id: string;
  name: string;
  options: { menuItemId: string; menuItemName: string; priceAdjustment: number }[];
}

export interface Combo {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: number;
  regularPrice: number;
  savings: number;
  items: ComboItem[];
  substituteGroups: ComboSubstituteGroup[];
  isActive: boolean;
  displayOrder: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComboFormData {
  name: string;
  description?: string;
  basePrice: number;
  items: Omit<ComboItem, 'menuItemName'>[];
  substituteGroups?: ComboSubstituteGroup[];
  categoryId?: string;
  isActive?: boolean;
}
