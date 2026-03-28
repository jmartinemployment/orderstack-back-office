import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface GiftCard {
  id: string;
  code: string;
  type: 'physical' | 'digital';
  status: 'active' | 'disabled' | 'redeemed';
  currentBalance: number;
  originalBalance: number;
}

// --- Pure function replicas of GiftCardService computed logic ---

function activeCards(cards: GiftCard[]): GiftCard[] {
  return cards.filter(c => c.status === 'active' && c.currentBalance > 0);
}

function physicalCards(cards: GiftCard[]): GiftCard[] {
  return cards.filter(c => c.type === 'physical');
}

function digitalCards(cards: GiftCard[]): GiftCard[] {
  return cards.filter(c => c.type === 'digital');
}

function totalOutstandingBalance(cards: GiftCard[]): number {
  return activeCards(cards).reduce((sum, c) => sum + c.currentBalance, 0);
}

// List mutations
function prependCard(cards: GiftCard[], card: GiftCard): GiftCard[] {
  return [card, ...cards];
}

function updateCardInList(cards: GiftCard[], cardId: string, updated: GiftCard): GiftCard[] {
  return cards.map(c => c.id === cardId ? updated : c);
}

// --- Tests ---

describe('GiftCardService — activeCards', () => {
  const cards: GiftCard[] = [
    { id: '1', code: 'A', type: 'physical', status: 'active', currentBalance: 50, originalBalance: 50 },
    { id: '2', code: 'B', type: 'digital', status: 'disabled', currentBalance: 25, originalBalance: 50 },
    { id: '3', code: 'C', type: 'digital', status: 'active', currentBalance: 0, originalBalance: 50 },
    { id: '4', code: 'D', type: 'physical', status: 'active', currentBalance: 100, originalBalance: 100 },
  ];

  it('includes only active with positive balance', () => {
    expect(activeCards(cards)).toHaveLength(2);
  });

  it('excludes disabled', () => {
    expect(activeCards(cards).every(c => c.status === 'active')).toBe(true);
  });

  it('excludes zero balance', () => {
    expect(activeCards(cards).every(c => c.currentBalance > 0)).toBe(true);
  });
});

describe('GiftCardService — physicalCards / digitalCards', () => {
  const cards: GiftCard[] = [
    { id: '1', code: 'A', type: 'physical', status: 'active', currentBalance: 50, originalBalance: 50 },
    { id: '2', code: 'B', type: 'digital', status: 'active', currentBalance: 25, originalBalance: 50 },
  ];

  it('physicalCards filters by type', () => {
    expect(physicalCards(cards)).toHaveLength(1);
    expect(physicalCards(cards)[0].type).toBe('physical');
  });

  it('digitalCards filters by type', () => {
    expect(digitalCards(cards)).toHaveLength(1);
    expect(digitalCards(cards)[0].type).toBe('digital');
  });
});

describe('GiftCardService — totalOutstandingBalance', () => {
  it('sums active card balances', () => {
    const cards: GiftCard[] = [
      { id: '1', code: 'A', type: 'physical', status: 'active', currentBalance: 50, originalBalance: 50 },
      { id: '2', code: 'B', type: 'digital', status: 'active', currentBalance: 30, originalBalance: 50 },
      { id: '3', code: 'C', type: 'digital', status: 'disabled', currentBalance: 100, originalBalance: 100 },
    ];
    expect(totalOutstandingBalance(cards)).toBe(80);
  });

  it('returns 0 for empty', () => {
    expect(totalOutstandingBalance([])).toBe(0);
  });
});

describe('GiftCardService — list mutations', () => {
  it('prependCard adds to beginning', () => {
    const cards: GiftCard[] = [{ id: '1', code: 'A', type: 'physical', status: 'active', currentBalance: 50, originalBalance: 50 }];
    const newCard: GiftCard = { id: '2', code: 'B', type: 'digital', status: 'active', currentBalance: 25, originalBalance: 25 };
    const result = prependCard(cards, newCard);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2');
  });

  it('updateCardInList replaces matching', () => {
    const cards: GiftCard[] = [{ id: '1', code: 'A', type: 'physical', status: 'active', currentBalance: 50, originalBalance: 50 }];
    const updated: GiftCard = { ...cards[0], status: 'disabled' };
    expect(updateCardInList(cards, '1', updated)[0].status).toBe('disabled');
  });
});
