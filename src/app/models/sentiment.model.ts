export type SentimentCategory = 'positive' | 'neutral' | 'negative';

export interface SentimentEntry {
  orderId: string;
  orderNumber: string;
  instructions: string;
  sentiment: SentimentCategory;
  score: number;
  keywords: string[];
  flags: SentimentFlag[];
  analyzedAt: Date;
}

export type SentimentFlag = 'complaint' | 'allergy' | 'rush' | 'compliment' | 'dietary' | 'modification';

export interface SentimentSummary {
  totalAnalyzed: number;
  positive: number;
  neutral: number;
  negative: number;
  avgScore: number;
  topKeywords: { word: string; count: number }[];
  flagCounts: Record<SentimentFlag, number>;
}

export interface SentimentTrend {
  date: string;
  avgScore: number;
  positiveCount: number;
  negativeCount: number;
  totalCount: number;
}

export type SentimentTab = 'overview' | 'entries' | 'trends';

export type SentimentUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface OrderSentimentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string | null;
  sentiment: SentimentCategory;
  flags: SentimentFlag[];
  urgency: SentimentUrgency;
  summary: string;
  analyzedAt: string;
  isRead: boolean;
}

export interface SentimentAlertEvent {
  type: 'sentiment_alert';
  record: OrderSentimentRecord;
  restaurantId: string;
}

export interface SentimentAnalyticsResponse {
  trends: SentimentTrend[];
  topFlags: { flag: SentimentFlag; count: number }[];
  topKeywords: { word: string; count: number }[];
  alertCount: number;
  totalAnalyzed: number;
  positive: number;
  neutral: number;
  negative: number;
}
