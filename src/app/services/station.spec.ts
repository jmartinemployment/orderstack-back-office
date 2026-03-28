import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface KdsStation {
  id: string;
  name: string;
  isActive: boolean;
  categoryIds: string[];
}

interface StationCategoryMapping {
  id: string;
  stationId: string;
  categoryId: string;
}

// --- Pure function replicas ---

function activeStations(stations: KdsStation[]): KdsStation[] {
  return stations.filter(s => s.isActive);
}

function categoryToStationMap(mappings: StationCategoryMapping[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const mapping of mappings) {
    map.set(mapping.categoryId, mapping.stationId);
  }
  return map;
}

// List mutations
function addStation(stations: KdsStation[], station: KdsStation): KdsStation[] {
  return [...stations, station];
}

function updateStationInList(stations: KdsStation[], id: string, updated: KdsStation): KdsStation[] {
  return stations.map(s => s.id === id ? updated : s);
}

function deleteStationFromList(stations: KdsStation[], id: string): KdsStation[] {
  return stations.filter(s => s.id !== id);
}

function removeMappingsForStation(mappings: StationCategoryMapping[], stationId: string): StationCategoryMapping[] {
  return mappings.filter(m => m.stationId !== stationId);
}

function setCategoryIdsOnStation(stations: KdsStation[], stationId: string, categoryIds: string[]): KdsStation[] {
  return stations.map(s => s.id === stationId ? { ...s, categoryIds } : s);
}

// --- Tests ---

const stations: KdsStation[] = [
  { id: 's-1', name: 'Grill', isActive: true, categoryIds: ['cat-1', 'cat-2'] },
  { id: 's-2', name: 'Salads', isActive: false, categoryIds: ['cat-3'] },
  { id: 's-3', name: 'Bar', isActive: true, categoryIds: [] },
];

const mappings: StationCategoryMapping[] = [
  { id: 'm-1', stationId: 's-1', categoryId: 'cat-1' },
  { id: 'm-2', stationId: 's-1', categoryId: 'cat-2' },
  { id: 'm-3', stationId: 's-2', categoryId: 'cat-3' },
];

describe('StationService — activeStations', () => {
  it('filters active stations', () => {
    expect(activeStations(stations)).toHaveLength(2);
  });

  it('returns empty for no active', () => {
    expect(activeStations([stations[1]])).toHaveLength(0);
  });

  it('returns empty for empty list', () => {
    expect(activeStations([])).toHaveLength(0);
  });
});

describe('StationService — categoryToStationMap', () => {
  it('builds map from mappings', () => {
    const map = categoryToStationMap(mappings);
    expect(map.get('cat-1')).toBe('s-1');
    expect(map.get('cat-2')).toBe('s-1');
    expect(map.get('cat-3')).toBe('s-2');
    expect(map.size).toBe(3);
  });

  it('returns empty map for no mappings', () => {
    expect(categoryToStationMap([]).size).toBe(0);
  });
});

describe('StationService — list mutations', () => {
  it('addStation appends', () => {
    const result = addStation(stations, { id: 's-4', name: 'Dessert', isActive: true, categoryIds: [] });
    expect(result).toHaveLength(4);
  });

  it('updateStationInList replaces matching', () => {
    const updated = { ...stations[0], name: 'Grill Updated' };
    expect(updateStationInList(stations, 's-1', updated)[0].name).toBe('Grill Updated');
  });

  it('deleteStationFromList removes matching', () => {
    expect(deleteStationFromList(stations, 's-2')).toHaveLength(2);
  });

  it('removeMappingsForStation removes all mappings for station', () => {
    const result = removeMappingsForStation(mappings, 's-1');
    expect(result).toHaveLength(1);
    expect(result[0].stationId).toBe('s-2');
  });

  it('setCategoryIdsOnStation updates categoryIds', () => {
    const result = setCategoryIdsOnStation(stations, 's-3', ['cat-4', 'cat-5']);
    expect(result[2].categoryIds).toEqual(['cat-4', 'cat-5']);
  });
});
