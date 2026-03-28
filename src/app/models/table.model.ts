export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'maintenance' | 'closing';

export interface RestaurantTable {
  id: string;
  merchantId: string;
  tableNumber: string;
  tableName: string | null;
  capacity: number;
  section: string | null;
  status: string;
  serverName: string | null;
  posX: number | null;
  posY: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableFormData {
  tableNumber: string;
  tableName?: string;
  capacity: number;
  section?: string;
  posX?: number;
  posY?: number;
}

// --- Service Area (logical grouping of tables) ---

export interface ServiceArea {
  guid: string;
  name: string;
  description?: string;
  tables: RestaurantTable[];
  sortOrder: number;
  isActive: boolean;
  color?: string;
}

export interface ServiceAreaSummary {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  totalSeats: number;
  availableSeats: number;
}

export interface TableSummary {
  id: string;
  tableName: string | null;
  serviceAreaName: string;
  capacity: number;
  status: string;
}

// --- Helper functions ---

export function getTableDisplayName(
  table: RestaurantTable,
  serviceArea?: ServiceArea
): string {
  const label = table.tableName ?? `Area ${table.id.slice(-4)}`;
  return serviceArea ? `${serviceArea.name} - ${label}` : label;
}

export function getAvailableTables(serviceAreas: ServiceArea[]): TableSummary[] {
  return serviceAreas
    .filter((area) => area.isActive)
    .flatMap((area) =>
      area.tables
        .filter((t) => t.status === 'available')
        .map((t) => ({
          id: t.id,
          tableName: t.tableName,
          serviceAreaName: area.name,
          capacity: t.capacity,
          status: t.status,
        }))
    );
}

export function getServiceAreaSummary(area: ServiceArea): ServiceAreaSummary {
  const tables = area.tables;
  return {
    totalTables: tables.length,
    availableTables: tables.filter((t) => t.status === 'available').length,
    occupiedTables: tables.filter((t) => t.status === 'occupied').length,
    totalSeats: tables.reduce((sum, t) => sum + t.capacity, 0),
    availableSeats: tables
      .filter((t) => t.status === 'available')
      .reduce((sum, t) => sum + t.capacity, 0),
  };
}

export function findTableById(
  serviceAreas: ServiceArea[],
  tableId: string
): { table: RestaurantTable; serviceArea: ServiceArea } | null {
  for (const area of serviceAreas) {
    const table = area.tables.find((t) => t.id === tableId);
    if (table) {
      return { table, serviceArea: area };
    }
  }
  return null;
}

export function canSeatParty(table: RestaurantTable, partySize: number): boolean {
  return table.status === 'available' && table.capacity >= partySize;
}

// --- Default starter areas ---

export const DEFAULT_SERVICE_AREAS: ServiceArea[] = [
  {
    guid: 'area-dining-room',
    name: 'Dining Room',
    description: 'Main indoor dining area',
    tables: [],
    sortOrder: 1,
    isActive: true,
    color: '#6c757d',
  },
  {
    guid: 'area-bar',
    name: 'Bar',
    description: 'Bar seating area',
    tables: [],
    sortOrder: 2,
    isActive: true,
    color: '#0d6efd',
  },
  {
    guid: 'area-patio',
    name: 'Patio',
    description: 'Outdoor patio seating',
    tables: [],
    sortOrder: 3,
    isActive: true,
    color: '#198754',
  },
];
