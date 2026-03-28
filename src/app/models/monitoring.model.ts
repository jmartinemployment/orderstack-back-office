export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'revenue' | 'inventory' | 'kitchen' | 'orders' | 'system';

export interface MonitoringAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  suggestedAction?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface MonitoringSnapshot {
  timestamp: Date;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  activeAlerts: number;
  criticalAlerts: number;
  lowStockItems: number;
  overdueOrders: number;
}

export interface AnomalyRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  description: string;
}

export type MonitoringTab = 'live' | 'alerts' | 'rules';
