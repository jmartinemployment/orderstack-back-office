import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface StaffPinRecord {
  id: string;
  name: string;
  pin: string;
  role: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
}

interface PermissionSet {
  id: string;
  name: string;
}

interface DeviceRegistration {
  id: string;
  name: string;
  status: string;
}

// --- Pure function replicas ---

function canManagePins(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'owner' || role === 'manager';
}

// List mutations
function addPin(pins: StaffPinRecord[], pin: StaffPinRecord): StaffPinRecord[] {
  return [...pins, pin];
}

function updatePinInList(pins: StaffPinRecord[], id: string, updated: StaffPinRecord): StaffPinRecord[] {
  return pins.map(p => p.id === id ? updated : p);
}

function removePinFromList(pins: StaffPinRecord[], id: string): StaffPinRecord[] {
  return pins.filter(p => p.id !== id);
}

function addTeamMember(members: TeamMember[], member: TeamMember): TeamMember[] {
  return [...members, member];
}

function updateTeamMemberInList(members: TeamMember[], id: string, updated: TeamMember): TeamMember[] {
  return members.map(m => m.id === id ? updated : m);
}

function removeDeviceFromList(devices: DeviceRegistration[], id: string): DeviceRegistration[] {
  return devices.filter(d => d.id !== id);
}

// --- Tests ---

describe('StaffManagementService — canManagePins', () => {
  it('true for super_admin', () => expect(canManagePins('super_admin')).toBe(true));
  it('true for owner', () => expect(canManagePins('owner')).toBe(true));
  it('true for manager', () => expect(canManagePins('manager')).toBe(true));
  it('false for staff', () => expect(canManagePins('staff')).toBe(false));
  it('false for undefined', () => expect(canManagePins(undefined)).toBe(false));
});

describe('StaffManagementService — list mutations', () => {
  it('addPin appends', () => {
    const pins: StaffPinRecord[] = [{ id: 'p-1', name: 'A', pin: '1234', role: 'server' }];
    expect(addPin(pins, { id: 'p-2', name: 'B', pin: '5678', role: 'host' })).toHaveLength(2);
  });

  it('updatePinInList replaces matching', () => {
    const pins: StaffPinRecord[] = [{ id: 'p-1', name: 'A', pin: '1234', role: 'server' }];
    const updated: StaffPinRecord = { ...pins[0], role: 'manager' };
    expect(updatePinInList(pins, 'p-1', updated)[0].role).toBe('manager');
  });

  it('removePinFromList removes matching', () => {
    const pins: StaffPinRecord[] = [{ id: 'p-1', name: 'A', pin: '1234', role: 'server' }];
    expect(removePinFromList(pins, 'p-1')).toHaveLength(0);
  });

  it('addTeamMember appends', () => {
    expect(addTeamMember([], { id: 'tm-1', firstName: 'A', lastName: 'B' })).toHaveLength(1);
  });

  it('removeDeviceFromList removes matching', () => {
    const devices: DeviceRegistration[] = [{ id: 'd-1', name: 'POS 1', status: 'active' }];
    expect(removeDeviceFromList(devices, 'd-1')).toHaveLength(0);
  });
});
