import '../../test-setup';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import type { MenuCategory, MenuItem, Daypart } from '@models/menu.model';
import { isItemAvailable, isDaypartActive } from '@models/menu.model';
import { MenuService } from '@services/menu';
import { AuthService } from '@services/auth';

// --- Fixtures ---

function makeCategory(overrides: Partial<MenuCategory> = {}): MenuCategory {
  return {
    id: 'cat-1',
    name: 'Appetizers',
    displayOrder: 0,
    isActive: true,
    items: [],
    ...overrides,
  } as MenuCategory;
}

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'mi-1',
    name: 'Spring Rolls',
    price: 8.99,
    isActive: true,
    available: true,
    ...overrides,
  } as MenuItem;
}

function makeDaypart(overrides: Partial<Daypart> = {}): Daypart {
  return {
    id: 'dp-1',
    name: 'Lunch',
    isActive: true,
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '11:00',
    endTime: '14:00',
    ...overrides,
  };
}

// --- Pure function replicas of MenuService computed logic ---

function filterActiveCategories(categories: MenuCategory[]): MenuCategory[] {
  return categories.filter(cat => cat.isActive !== false);
}

function collectAllItems(categories: MenuCategory[]): MenuItem[] {
  const items: MenuItem[] = [];
  const collect = (cats: MenuCategory[]) => {
    for (const cat of cats) {
      if (cat.items) {
        items.push(...cat.items.filter(item => item.isActive !== false));
      }
      if (cat.subcategories) {
        collect(cat.subcategories);
      }
    }
  };
  collect(categories);
  return items;
}

function filterAvailableItems(
  items: MenuItem[],
  activeDaypartIds: string[],
  now: Date,
): MenuItem[] {
  return items.filter(item => {
    if (!isItemAvailable(item, now)) return false;
    if (activeDaypartIds.length === 0) return true;
    if (!item.daypartIds || item.daypartIds.length === 0) return true;
    return item.daypartIds.some(id => activeDaypartIds.includes(id));
  });
}

function filterPopularItems(items: MenuItem[]): MenuItem[] {
  return items.filter(item => item.popular || item.isPopular);
}

function findActiveSchedule<T extends { id: string }>(schedules: T[], activeId: string | null): T | null {
  if (!activeId) return null;
  return schedules.find(s => s.id === activeId) ?? null;
}

// --- Tests ---

describe('MenuService — filterActiveCategories', () => {
  it('returns only active categories', () => {
    const categories = [
      makeCategory({ id: 'cat-1', isActive: true }),
      makeCategory({ id: 'cat-2', isActive: false }),
      makeCategory({ id: 'cat-3', isActive: true }),
    ];
    expect(filterActiveCategories(categories)).toHaveLength(2);
  });

  it('treats undefined isActive as active', () => {
    const categories = [makeCategory({ isActive: undefined as any })];
    expect(filterActiveCategories(categories)).toHaveLength(1);
  });

  it('returns empty for no active categories', () => {
    const categories = [makeCategory({ isActive: false })];
    expect(filterActiveCategories(categories)).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(filterActiveCategories([])).toHaveLength(0);
  });
});

describe('MenuService — collectAllItems', () => {
  it('collects items from flat categories', () => {
    const categories = [
      makeCategory({
        items: [makeItem({ id: 'mi-1' }), makeItem({ id: 'mi-2' })],
      }),
      makeCategory({
        items: [makeItem({ id: 'mi-3' })],
      }),
    ];
    expect(collectAllItems(categories)).toHaveLength(3);
  });

  it('collects items from nested subcategories', () => {
    const categories = [
      makeCategory({
        items: [makeItem({ id: 'mi-1' })],
        subcategories: [
          makeCategory({
            id: 'sub-1',
            items: [makeItem({ id: 'mi-2' })],
          }),
        ],
      }),
    ];
    expect(collectAllItems(categories)).toHaveLength(2);
  });

  it('excludes inactive items', () => {
    const categories = [
      makeCategory({
        items: [
          makeItem({ id: 'mi-1', isActive: true }),
          makeItem({ id: 'mi-2', isActive: false }),
        ],
      }),
    ];
    expect(collectAllItems(categories)).toHaveLength(1);
  });

  it('handles categories with no items', () => {
    const categories = [makeCategory({ items: undefined as any })];
    expect(collectAllItems(categories)).toHaveLength(0);
  });

  it('returns empty for empty categories', () => {
    expect(collectAllItems([])).toHaveLength(0);
  });
});

describe('MenuService — filterPopularItems', () => {
  it('includes items with popular flag', () => {
    const items = [
      makeItem({ popular: true }),
      makeItem({ id: 'mi-2', popular: false }),
    ];
    expect(filterPopularItems(items)).toHaveLength(1);
  });

  it('includes items with isPopular flag', () => {
    const items = [
      makeItem({ isPopular: true } as any),
    ];
    expect(filterPopularItems(items)).toHaveLength(1);
  });

  it('returns empty when no popular items', () => {
    const items = [makeItem()];
    expect(filterPopularItems(items)).toHaveLength(0);
  });
});

describe('MenuService — findActiveSchedule', () => {
  const schedules = [
    { id: 'sched-1', name: 'Default' },
    { id: 'sched-2', name: 'Holiday' },
  ];

  it('finds matching schedule', () => {
    expect(findActiveSchedule(schedules, 'sched-1')?.name).toBe('Default');
  });

  it('returns null for null ID', () => {
    expect(findActiveSchedule(schedules, null)).toBeNull();
  });

  it('returns null for unknown ID', () => {
    expect(findActiveSchedule(schedules, 'nonexistent')).toBeNull();
  });

  it('returns null from empty list', () => {
    expect(findActiveSchedule([], 'sched-1')).toBeNull();
  });
});

describe('isDaypartActive (model function)', () => {
  it('returns true when active, on matching day, within time range', () => {
    const dp = makeDaypart({
      daysOfWeek: [3], // Wednesday
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed1200 = new Date('2026-02-25T12:00:00'); // Wednesday
    expect(isDaypartActive(dp, wed1200)).toBe(true);
  });

  it('returns false when inactive', () => {
    const dp = makeDaypart({ isActive: false });
    expect(isDaypartActive(dp, new Date('2026-02-25T12:00:00'))).toBe(false);
  });

  it('returns false when wrong day', () => {
    const dp = makeDaypart({
      daysOfWeek: [1], // Monday only
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed = new Date('2026-02-25T12:00:00'); // Wednesday
    expect(isDaypartActive(dp, wed)).toBe(false);
  });

  it('returns false before start time', () => {
    const dp = makeDaypart({
      daysOfWeek: [3],
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed0900 = new Date('2026-02-25T09:00:00');
    expect(isDaypartActive(dp, wed0900)).toBe(false);
  });

  it('returns false after end time', () => {
    const dp = makeDaypart({
      daysOfWeek: [3],
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed1500 = new Date('2026-02-25T15:00:00');
    expect(isDaypartActive(dp, wed1500)).toBe(false);
  });

  it('returns true at exact start time', () => {
    const dp = makeDaypart({
      daysOfWeek: [3],
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed1100 = new Date('2026-02-25T11:00:00');
    expect(isDaypartActive(dp, wed1100)).toBe(true);
  });

  it('returns true at exact end time', () => {
    const dp = makeDaypart({
      daysOfWeek: [3],
      startTime: '11:00',
      endTime: '14:00',
    });
    const wed1400 = new Date('2026-02-25T14:00:00');
    expect(isDaypartActive(dp, wed1400)).toBe(true);
  });
});

describe('isItemAvailable (model function)', () => {
  it('returns true when no availability windows', () => {
    const item = makeItem({ availabilityWindows: undefined });
    expect(isItemAvailable(item)).toBe(true);
  });

  it('returns true with empty windows array', () => {
    const item = makeItem({ availabilityWindows: [] });
    expect(isItemAvailable(item)).toBe(true);
  });

  it('returns true when within a window', () => {
    const item = makeItem({
      availabilityWindows: [
        { daysOfWeek: [3], startTime: '10:00', endTime: '22:00' },
      ],
    });
    const wed1200 = new Date('2026-02-25T12:00:00');
    expect(isItemAvailable(item, wed1200)).toBe(true);
  });

  it('returns false when outside all windows', () => {
    const item = makeItem({
      availabilityWindows: [
        { daysOfWeek: [1], startTime: '10:00', endTime: '14:00' },
      ],
    });
    const wed1200 = new Date('2026-02-25T12:00:00'); // Wednesday, not Monday
    expect(isItemAvailable(item, wed1200)).toBe(false);
  });

  it('matches if any window fits', () => {
    const item = makeItem({
      availabilityWindows: [
        { daysOfWeek: [1], startTime: '10:00', endTime: '14:00' },
        { daysOfWeek: [3], startTime: '11:00', endTime: '13:00' },
      ],
    });
    const wed1200 = new Date('2026-02-25T12:00:00');
    expect(isItemAvailable(item, wed1200)).toBe(true);
  });
});

describe('MenuService — filterAvailableItems', () => {
  it('filters out unavailable items', () => {
    const items = [
      makeItem({ id: 'mi-1' }),
      makeItem({
        id: 'mi-2',
        availabilityWindows: [
          { daysOfWeek: [1], startTime: '10:00', endTime: '14:00' },
        ],
      }),
    ];
    const wed1200 = new Date('2026-02-25T12:00:00');
    const result = filterAvailableItems(items, [], wed1200);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mi-1');
  });

  it('includes all when no daypart filter active', () => {
    const items = [makeItem(), makeItem({ id: 'mi-2' })];
    expect(filterAvailableItems(items, [], new Date())).toHaveLength(2);
  });

  it('filters by active daypart IDs', () => {
    const items = [
      makeItem({ id: 'mi-1', daypartIds: ['dp-1'] }),
      makeItem({ id: 'mi-2', daypartIds: ['dp-2'] }),
      makeItem({ id: 'mi-3' }), // no daypartIds — always included
    ];
    const result = filterAvailableItems(items, ['dp-1'], new Date());
    expect(result.map(i => i.id)).toEqual(['mi-1', 'mi-3']);
  });

  it('includes items with no daypartIds when dayparts are active', () => {
    const items = [makeItem({ daypartIds: [] })];
    expect(filterAvailableItems(items, ['dp-1'], new Date())).toHaveLength(1);
  });
});

// --- Catering pricing helpers ---

function filterCateringItems(items: MenuItem[]): MenuItem[] {
  return items.filter(item => (item.cateringPricing ?? []).length > 0);
}

describe('MenuService — cateringItems', () => {
  it('filters to items with catering pricing tiers', () => {
    const items = [
      makeItem({ id: 'mi-1', cateringPricing: [{ model: 'per_person', price: 8.5 }] }),
      makeItem({ id: 'mi-2' }),
    ];
    const result = filterCateringItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mi-1');
  });

  it('returns empty when no items have pricing', () => {
    const items = [
      makeItem({ id: 'mi-1' }),
      makeItem({ id: 'mi-2', cateringPricing: [] }),
    ];
    expect(filterCateringItems(items)).toHaveLength(0);
  });

  it('includes items with multiple tiers', () => {
    const items = [
      makeItem({
        id: 'mi-1',
        cateringPricing: [
          { model: 'per_person', price: 8.5, minimumQuantity: 10 },
          { model: 'per_tray', price: 85, servesQuantity: 12, label: 'Full Tray' },
        ],
      }),
    ];
    const result = filterCateringItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].cateringPricing).toHaveLength(2);
  });

  it('handles undefined cateringPricing gracefully', () => {
    const items = [makeItem({ cateringPricing: undefined })];
    expect(filterCateringItems(items)).toHaveLength(0);
  });
});

// ─── BUG-12: CRUD methods bypass _isLoading guard via _fetchMenu() ───────────
//
// Root cause: createCategory/updateCategory/deleteCategory set _isLoading=true,
// then called loadMenu() which has an early-exit guard: if (_isLoading()) return.
// Because the guard fired, _fetchMenu() never ran, and the categories signal
// was never updated — the list stayed stale after every CRUD operation.
//
// Fix: Extract private _fetchMenu() with no guard. CRUD methods call _fetchMenu()
// directly. loadMenu() retains the guard to prevent duplicate concurrent loads
// from component ngOnInit calls.
// ─────────────────────────────────────────────────────────────────────────────

function createMockAuthService() {
  const _token = signal('tok');
  const _user = signal({ firstName: 'Jeff' });
  return {
    isAuthenticated: computed(() => !!_token() && !!_user()),
    user: _user.asReadonly(),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
    selectedMerchantName: signal<string | null>('Test').asReadonly(),
    merchants: signal([{ id: 'r-1' }]).asReadonly(),
    userMerchants: computed(() => ['r-1']),
    selectMerchant: vi.fn(),
  };
}

describe('MenuService — BUG-12: _fetchMenu() bypass preserves categories after CRUD', () => {
  let service: MenuService;
  let httpMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const CAT_1: MenuCategory = { id: 'cat-1', name: 'Appetizers', merchantId: 'r-1', isActive: true, displayOrder: 0 };
  const CAT_NEW: MenuCategory = { id: 'cat-new', name: 'Desserts', merchantId: 'r-1', isActive: true, displayOrder: 1 };
  const CAT_1_RENAMED: MenuCategory = { ...CAT_1, name: 'Starters' };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MenuService,
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: HttpClient, useValue: httpMock },
      ],
    });

    service = TestBed.inject(MenuService);
  });

  // ── Guard tests ───────────────────────────────────────────────────────────

  it('loadMenuForRestaurant() returns early when _isLoading is already true', async () => {
    // First call uses a Subject that never emits — holds _isLoading=true indefinitely
    const slowSubject = new Subject<MenuCategory[]>();
    httpMock.get
      .mockReturnValueOnce(slowSubject.asObservable())
      .mockReturnValue(of([CAT_1]));

    // Start first load without awaiting (isLoading becomes true)
    const p1 = service.loadMenuForRestaurant('r-1');

    // Second call should hit the guard and return immediately
    await service.loadMenuForRestaurant('r-1');

    // Only one HTTP call was made — second call was guarded out
    expect(httpMock.get).toHaveBeenCalledTimes(1);

    // Complete the first load
    slowSubject.next([CAT_1]);
    slowSubject.complete();
    await p1;
  });

  it('loadMenuForRestaurant() with null merchantId sets error, makes no HTTP call', async () => {
    await service.loadMenuForRestaurant(null);
    expect(httpMock.get).not.toHaveBeenCalled();
    expect(service.error()).toBe('No restaurant selected');
  });

  // ── createCategory ────────────────────────────────────────────────────────

  it('createCategory() refreshes categories signal even though _isLoading was set true', async () => {
    // Seed initial state: one category
    httpMock.get.mockReturnValueOnce(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');
    expect(service.categories()).toHaveLength(1);

    // CRUD: POST creates new category, then GET returns both
    httpMock.post.mockReturnValueOnce(of(CAT_NEW));
    httpMock.get.mockReturnValueOnce(of([CAT_1, CAT_NEW]));

    const result = await service.createCategory({ name: 'Desserts' });

    expect(result?.name).toBe('Desserts');
    // _fetchMenu() was called (bypassing _isLoading guard): categories updated
    expect(service.categories()).toHaveLength(2);
    expect(service.categories()[1].name).toBe('Desserts');
  });

  it('createCategory() calls GET endpoint twice: once on initial load, once after CRUD', async () => {
    httpMock.get.mockReturnValue(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.post.mockReturnValueOnce(of(CAT_NEW));
    httpMock.get.mockReturnValueOnce(of([CAT_1, CAT_NEW]));

    await service.createCategory({ name: 'Desserts' });

    // get() called: 1 (initial load) + 1 (_fetchMenu after CRUD) = 2
    expect(httpMock.get).toHaveBeenCalledTimes(2);
  });

  it('createCategory() returns null and sets error on HTTP failure', async () => {
    httpMock.get.mockReturnValue(of([]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.post.mockReturnValue(throwError(() => new Error('Network error')));

    const result = await service.createCategory({ name: 'Desserts' });

    expect(result).toBeNull();
    expect(service.error()).toBe('Failed to create category');
  });

  // ── updateCategory ────────────────────────────────────────────────────────

  it('updateCategory() refreshes categories signal with renamed value', async () => {
    httpMock.get.mockReturnValueOnce(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');
    expect(service.categories()[0].name).toBe('Appetizers');

    httpMock.patch.mockReturnValueOnce(of({}));
    httpMock.get.mockReturnValueOnce(of([CAT_1_RENAMED]));

    const ok = await service.updateCategory('cat-1', { name: 'Starters' });

    expect(ok).toBe(true);
    expect(service.categories()[0].name).toBe('Starters');
  });

  it('updateCategory() calls GET endpoint for refresh after PATCH', async () => {
    httpMock.get.mockReturnValueOnce(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.patch.mockReturnValueOnce(of({}));
    httpMock.get.mockReturnValueOnce(of([CAT_1_RENAMED]));

    await service.updateCategory('cat-1', { name: 'Starters' });

    expect(httpMock.patch).toHaveBeenCalledTimes(1);
    // 1 initial load + 1 _fetchMenu after CRUD
    expect(httpMock.get).toHaveBeenCalledTimes(2);
  });

  it('updateCategory() returns false and sets error on HTTP failure', async () => {
    httpMock.get.mockReturnValue(of([]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.patch.mockReturnValue(throwError(() => new Error('Server error')));

    const ok = await service.updateCategory('cat-1', { name: 'Starters' });

    expect(ok).toBe(false);
    expect(service.error()).toBe('Failed to update category');
  });

  // ── deleteCategory ────────────────────────────────────────────────────────

  it('deleteCategory() removes category from signal after DELETE + refresh', async () => {
    httpMock.get.mockReturnValueOnce(of([CAT_1, CAT_NEW]));
    await service.loadMenuForRestaurant('r-1');
    expect(service.categories()).toHaveLength(2);

    httpMock.delete.mockReturnValueOnce(of(undefined));
    httpMock.get.mockReturnValueOnce(of([CAT_1]));

    const ok = await service.deleteCategory('cat-new');

    expect(ok).toBe(true);
    expect(service.categories()).toHaveLength(1);
    expect(service.categories()[0].id).toBe('cat-1');
  });

  it('deleteCategory() calls GET endpoint for refresh after DELETE', async () => {
    httpMock.get.mockReturnValueOnce(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.delete.mockReturnValueOnce(of(undefined));
    httpMock.get.mockReturnValueOnce(of([]));

    await service.deleteCategory('cat-1');

    expect(httpMock.delete).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledTimes(2);
  });

  it('deleteCategory() returns false and sets error on HTTP failure', async () => {
    httpMock.get.mockReturnValue(of([]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.delete.mockReturnValue(throwError(() => new Error('Delete failed')));

    const ok = await service.deleteCategory('cat-1');

    expect(ok).toBe(false);
    expect(service.error()).toBe('Failed to delete category');
  });

  // ── isLoading resets ──────────────────────────────────────────────────────

  it('isLoading resets to false after createCategory resolves', async () => {
    httpMock.get.mockReturnValue(of([]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.post.mockReturnValueOnce(of(CAT_NEW));
    httpMock.get.mockReturnValueOnce(of([CAT_NEW]));

    await service.createCategory({ name: 'Desserts' });

    expect(service.isLoading()).toBe(false);
  });

  it('isLoading resets to false after updateCategory resolves', async () => {
    httpMock.get.mockReturnValue(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.patch.mockReturnValueOnce(of({}));
    httpMock.get.mockReturnValueOnce(of([CAT_1_RENAMED]));

    await service.updateCategory('cat-1', { name: 'Starters' });

    expect(service.isLoading()).toBe(false);
  });

  it('isLoading resets to false after deleteCategory resolves', async () => {
    httpMock.get.mockReturnValue(of([CAT_1]));
    await service.loadMenuForRestaurant('r-1');

    httpMock.delete.mockReturnValueOnce(of(undefined));
    httpMock.get.mockReturnValueOnce(of([]));

    await service.deleteCategory('cat-1');

    expect(service.isLoading()).toBe(false);
  });
});
