// --- Pool distribution methods ---

export type TipPoolMethod = 'even' | 'by_hours' | 'by_sales';

export type TipOutMethod = 'percentage_of_tips' | 'percentage_of_sales';

// --- Rules ---

export interface TipPoolRule {
  id: string;
  name: string;
  method: TipPoolMethod;
  participantRoles: string[];   // e.g. ['server', 'bartender'] — future role granularity
  isActive: boolean;
}

export interface TipOutRule {
  id: string;
  name: string;
  method: TipOutMethod;
  sourceRole: string;           // e.g. 'server'
  targetRole: string;           // e.g. 'bartender'
  percentage: number;           // 0-100
  isActive: boolean;
}

// --- Entries and summaries ---

export interface TipEntry {
  orderId: string;
  orderNumber: string;
  serverGuid: string;
  serverName: string;
  tipAmount: number;
  orderTotal: number;
  closedDate: Date;
}

export interface ServerTipSummary {
  serverGuid: string;
  serverName: string;
  totalTips: number;
  totalSales: number;
  orderCount: number;
  pooledShareIn: number;        // Tips received from pool
  tipOutGiven: number;          // Tips given away via tip-out rules
  tipOutReceived: number;       // Tips received via tip-out rules
  netTips: number;              // totalTips + pooledShareIn + tipOutReceived - tipOutGiven
}

export interface TipReport {
  startDate: Date;
  endDate: Date;
  entries: TipEntry[];
  serverSummaries: ServerTipSummary[];
  totalTips: number;
  totalSales: number;
  averageTipPercent: number;
}

// --- Compliance ---

export interface ComplianceCheck {
  serverGuid: string;
  serverName: string;
  hoursWorked: number;
  totalCompensation: number;    // hourlyRate * hours + netTips
  effectiveHourlyRate: number;  // totalCompensation / hoursWorked
  meetsMinWage: boolean;
  minimumWage: number;
}
