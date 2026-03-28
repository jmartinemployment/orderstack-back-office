import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface LocationGroup {
  id: string;
  name: string;
}

interface LocationGroupMember {
  id: string;
  merchantId: string;
}

interface CrossLocationInventoryItem {
  id: string;
  name: string;
  isLowStockAnywhere: boolean;
}

interface LocationHealth {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
}

// --- Pure function replicas ---

function groupCount(groups: LocationGroup[]): number {
  return groups.length;
}

function lowStockItems(items: CrossLocationInventoryItem[]): CrossLocationInventoryItem[] {
  return items.filter(item => item.isLowStockAnywhere);
}

function offlineLocations(locations: LocationHealth[]): LocationHealth[] {
  return locations.filter(loc => loc.status !== 'online');
}

// List mutations
function addGroup(groups: LocationGroup[], group: LocationGroup): LocationGroup[] {
  return [...groups, group];
}

function updateGroupInList(groups: LocationGroup[], id: string, updated: LocationGroup): LocationGroup[] {
  return groups.map(g => g.id === id ? updated : g);
}

function deleteGroupFromList(groups: LocationGroup[], id: string): LocationGroup[] {
  return groups.filter(g => g.id !== id);
}

function addMember(members: LocationGroupMember[], member: LocationGroupMember): LocationGroupMember[] {
  return [...members, member];
}

function removeMember(members: LocationGroupMember[], memberId: string): LocationGroupMember[] {
  return members.filter(m => m.id !== memberId);
}

// --- Tests ---

describe('MultiLocationService — computed signals', () => {
  it('groupCount returns length', () => {
    expect(groupCount([{ id: 'g-1', name: 'A' }, { id: 'g-2', name: 'B' }])).toBe(2);
  });

  it('groupCount returns 0 for empty', () => {
    expect(groupCount([])).toBe(0);
  });

  it('lowStockItems filters low stock', () => {
    const items: CrossLocationInventoryItem[] = [
      { id: 'i-1', name: 'Item A', isLowStockAnywhere: true },
      { id: 'i-2', name: 'Item B', isLowStockAnywhere: false },
      { id: 'i-3', name: 'Item C', isLowStockAnywhere: true },
    ];
    expect(lowStockItems(items)).toHaveLength(2);
  });

  it('offlineLocations filters non-online', () => {
    const locations: LocationHealth[] = [
      { id: 'l-1', name: 'Downtown', status: 'online' },
      { id: 'l-2', name: 'Airport', status: 'offline' },
      { id: 'l-3', name: 'Mall', status: 'degraded' },
    ];
    expect(offlineLocations(locations)).toHaveLength(2);
  });
});

describe('MultiLocationService — group mutations', () => {
  const groups: LocationGroup[] = [{ id: 'g-1', name: 'Florida' }];

  it('addGroup appends', () => {
    expect(addGroup(groups, { id: 'g-2', name: 'Texas' })).toHaveLength(2);
  });

  it('updateGroupInList replaces matching', () => {
    const result = updateGroupInList(groups, 'g-1', { id: 'g-1', name: 'Updated' });
    expect(result[0].name).toBe('Updated');
  });

  it('deleteGroupFromList removes matching', () => {
    expect(deleteGroupFromList(groups, 'g-1')).toHaveLength(0);
  });
});

describe('MultiLocationService — member mutations', () => {
  const members: LocationGroupMember[] = [{ id: 'm-1', merchantId: 'r-1' }];

  it('addMember appends', () => {
    expect(addMember(members, { id: 'm-2', merchantId: 'r-2' })).toHaveLength(2);
  });

  it('removeMember removes matching', () => {
    expect(removeMember(members, 'm-1')).toHaveLength(0);
  });
});

// --- BUG-30: API route path mismatch (restaurant-groups → merchant-groups) ---

describe('MultiLocationService — API route paths (BUG-30)', () => {
  // Read the service source to verify all API paths use merchant-groups
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const serviceSource = readFileSync(
    resolve(__dirname, 'multi-location.ts'),
    'utf-8',
  );

  it('uses /merchant-groups/ in all API URLs (not /restaurant-groups/)', () => {
    expect(serviceSource).not.toContain('/restaurant-groups/');
  });

  it('location-groups endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups');
  });

  it('cross-location-report endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/cross-location-report');
  });

  it('sync-menu/history endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/sync-menu/history');
  });

  it('sync-menu/preview endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/sync-menu/preview');
  });

  it('sync-menu (execute) endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/sync-menu`');
  });

  it('propagate-settings endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/propagate-settings');
  });

  it('staff endpoints use merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/staff');
  });

  it('inventory endpoints use merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/inventory');
  });

  it('health endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/health');
  });

  it('campaigns endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/campaigns');
  });

  it('benchmarks endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/benchmarks');
  });

  it('compliance endpoint uses merchant-groups prefix', () => {
    expect(serviceSource).toContain('/merchant-groups/${this.groupId}/location-groups/${lgId}/compliance');
  });

  it('all group-scoped API calls use merchant-groups (not restaurant-groups)', () => {
    // Extract all URL template literals from the source
    const urlMatches = serviceSource.match(/`\$\{this\.apiUrl\}\/[^`]+`/g) ?? [];
    // Exclude /online/locations/ which is a separate public endpoint
    const groupUrls = urlMatches.filter(u => !u.includes('/online/'));
    for (const url of groupUrls) {
      expect(url, `URL should use merchant-groups: ${url}`).toContain('merchant-groups');
      expect(url, `URL should NOT use restaurant-groups: ${url}`).not.toContain('restaurant-groups');
    }
  });
});

// --- BUG-33: 404-tolerant error handling for all multi-location methods ---

describe('MultiLocationService — 404 tolerance (BUG-33)', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const serviceSource = readFileSync(
    resolve(__dirname, 'multi-location.ts'),
    'utf-8',
  );

  it('imports HttpErrorResponse', () => {
    expect(serviceSource).toContain('HttpErrorResponse');
  });

  const methods = [
    { name: 'loadGroups', signal: '_groups', emptyValue: '[]' },
    { name: 'loadCrossLocationReport', signal: '_crossLocationReport', emptyValue: 'null' },
    { name: 'loadSyncHistory', signal: '_syncHistory', emptyValue: '[]' },
    { name: 'loadCrossLocationStaff', signal: '_crossLocationStaff', emptyValue: '[]' },
    { name: 'loadCrossLocationInventory', signal: '_crossLocationInventory', emptyValue: '[]' },
    { name: 'loadInventoryTransfers', signal: '_inventoryTransfers', emptyValue: '[]' },
    { name: 'loadLocationHealth', signal: '_locationHealth', emptyValue: '[]' },
    { name: 'loadGroupCampaigns', signal: '_groupCampaigns', emptyValue: '[]' },
    { name: 'loadBenchmarks', signal: '_benchmarks', emptyValue: '[]' },
    { name: 'loadCompliance', signal: '_compliance', emptyValue: '[]' },
  ];

  for (const { name, signal, emptyValue } of methods) {
    it(`${name} handles 404 by setting ${signal} to ${emptyValue}`, () => {
      // Extract the method body
      const methodStart = serviceSource.indexOf(`async ${name}(`);
      expect(methodStart, `Method ${name} should exist`).toBeGreaterThan(-1);
      // Get ~80 lines of the method body
      const methodBody = serviceSource.slice(methodStart, methodStart + 1500);
      expect(methodBody).toContain('err instanceof HttpErrorResponse');
      expect(methodBody).toContain('err.status === 404');
      expect(methodBody).toContain(`this.${signal}.set(${emptyValue})`);
    });
  }

  it('no Phase 2/3 load method uses bare catch without 404 check', () => {
    const phase2Methods = [
      'loadCrossLocationStaff',
      'loadCrossLocationInventory',
      'loadInventoryTransfers',
      'loadLocationHealth',
      'loadGroupCampaigns',
      'loadBenchmarks',
      'loadCompliance',
    ];
    for (const method of phase2Methods) {
      const methodStart = serviceSource.indexOf(`async ${method}(`);
      // Find end of this method by locating the next async method or end of class
      const nextMethodStart = serviceSource.indexOf('\n  async ', methodStart + 1);
      const methodEnd = nextMethodStart > -1 ? nextMethodStart : methodStart + 800;
      const methodBody = serviceSource.slice(methodStart, methodEnd);
      // Should NOT have a bare catch (without err parameter)
      const hasBareLoadCatch = /\} catch \{/.exec(methodBody);
      expect(
        hasBareLoadCatch,
        `${method} should not have bare catch — must check for 404`,
      ).toBeNull();
    }
  });
});
