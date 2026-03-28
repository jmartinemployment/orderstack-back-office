export interface KdsStation {
  id: string;
  merchantId: string;
  name: string;
  color: string | null;
  displayOrder: number;
  isExpo: boolean;
  isActive: boolean;
  categoryIds: string[];
  boundDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StationFormData {
  name: string;
  color?: string;
  displayOrder?: number;
  isExpo?: boolean;
  isActive?: boolean;
  boundDeviceId?: string | null;
}

export interface StationCategoryMapping {
  stationId: string;
  categoryId: string;
}
