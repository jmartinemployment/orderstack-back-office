import { Component, inject, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../environments/environment';
// Uses raw backend response (any[]) — avoids depending on the mapped Order model
import {
  SentimentEntry,
  SentimentCategory,
  SentimentFlag,
  SentimentSummary,
  SentimentTab,
} from '../../../models/sentiment.model';
import type { SentimentAnalyticsResponse } from '../../../models/sentiment.model';

const NEGATIVE_KEYWORDS = ['wrong', 'cold', 'late', 'slow', 'bad', 'terrible', 'awful', 'disgusting', 'horrible', 'complaint', 'refund', 'angry', 'upset', 'mistake', 'missing', 'raw', 'burnt', 'overcooked', 'undercooked', 'stale', 'rude'];
const POSITIVE_KEYWORDS = ['great', 'excellent', 'perfect', 'amazing', 'love', 'delicious', 'wonderful', 'fantastic', 'best', 'thank', 'thanks', 'awesome', 'incredible', 'fresh', 'good'];
const FLAG_KEYWORDS: Record<SentimentFlag, string[]> = {
  complaint: ['complaint', 'wrong', 'mistake', 'refund', 'unhappy', 'upset'],
  allergy: ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'celiac', 'lactose'],
  rush: ['rush', 'hurry', 'asap', 'quick', 'fast', 'urgent', 'immediately'],
  compliment: ['great', 'excellent', 'amazing', 'love', 'best', 'thank', 'awesome', 'perfect'],
  dietary: ['vegan', 'vegetarian', 'keto', 'halal', 'kosher', 'low-carb', 'sugar-free', 'gluten-free'],
  modification: ['no ', 'without', 'extra', 'add', 'remove', 'substitute', 'instead', 'on the side', 'light', 'double'],
};

@Component({
  selector: 'os-sentiment',
  imports: [PercentPipe],
  templateUrl: './sentiment-dashboard.html',
  styleUrl: './sentiment-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SentimentDashboard {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<SentimentTab>('overview');
  private readonly _entries = signal<SentimentEntry[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _sentimentFilter = signal<SentimentCategory | 'all'>('all');
  private readonly _useBackendData = signal(false);
  private readonly _backendSummary = signal<SentimentAnalyticsResponse | null>(null);

  readonly activeTab = this._activeTab.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sentimentFilter = this._sentimentFilter.asReadonly();
  readonly useBackendData = this._useBackendData.asReadonly();
  readonly backendSummary = this._backendSummary.asReadonly();

  readonly filteredEntries = computed(() => {
    const filter = this._sentimentFilter();
    const list = this._entries();
    return filter === 'all' ? list : list.filter(e => e.sentiment === filter);
  });

  readonly summary = computed<SentimentSummary>(() => {
    const entries = this._entries();
    const positive = entries.filter(e => e.sentiment === 'positive').length;
    const neutral = entries.filter(e => e.sentiment === 'neutral').length;
    const negative = entries.filter(e => e.sentiment === 'negative').length;
    const avgScore = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.score, 0) / entries.length
      : 0;

    // Keyword frequency
    const wordMap = new Map<string, number>();
    for (const entry of entries) {
      for (const kw of entry.keywords) {
        wordMap.set(kw, (wordMap.get(kw) ?? 0) + 1);
      }
    }
    const topKeywords = [...wordMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Flag counts
    const flagCounts = {} as Record<SentimentFlag, number>;
    const allFlags: SentimentFlag[] = ['complaint', 'allergy', 'rush', 'compliment', 'dietary', 'modification'];
    for (const flag of allFlags) {
      flagCounts[flag] = entries.filter(e => e.flags.includes(flag)).length;
    }

    return { totalAnalyzed: entries.length, positive, neutral, negative, avgScore, topKeywords, flagCounts };
  });

  readonly positiveRate = computed(() => {
    const total = this.summary().totalAnalyzed;
    return total > 0 ? this.summary().positive / total : 0;
  });

  readonly negativeRate = computed(() => {
    const total = this.summary().totalAnalyzed;
    return total > 0 ? this.summary().negative / total : 0;
  });

  readonly sentimentScore = computed(() => Math.round(this.summary().avgScore));

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedMerchantId()) {
        untracked(() => this.loadAndAnalyze());
      }
    });
  }

  setTab(tab: SentimentTab): void {
    this._activeTab.set(tab);
  }

  setSentimentFilter(filter: SentimentCategory | 'all'): void {
    this._sentimentFilter.set(filter);
  }

  async loadAndAnalyze(): Promise<void> {
    const merchantId = this.authService.selectedMerchantId();
    if (!merchantId || this._isLoading()) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const mid = this.authService.selectedMerchantId();
      if (mid) {
        try {
          const backendData = await firstValueFrom(
            this.http.get<SentimentAnalyticsResponse>(
              `${environment.apiUrl}/merchant/${mid}/analytics/sentiment?days=30`
            ).pipe(timeout(8_000))
          );
          if (backendData.totalAnalyzed > 0) {
            this._useBackendData.set(true);
            this._backendSummary.set(backendData);
            this._isLoading.set(false);
            return;
          }
        } catch {
          // Fall through to local analysis
        }
      }
      this._useBackendData.set(false);
      this._backendSummary.set(null);

      const orders = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/merchant/${merchantId}/orders`).pipe(
          timeout(15_000),
        ),
      );

      const entries: SentimentEntry[] = [];
      for (const order of (Array.isArray(orders) ? orders : [])) {
        if (order.specialInstructions?.trim()) {
          entries.push(this.analyzeText(order.id, order.orderNumber ?? order.id.slice(-4).toUpperCase(), order.specialInstructions));
        }
      }

      this._entries.set([...entries].sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime()));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders';
      this._error.set(msg.includes('Timeout') ? 'Request timed out — try refreshing' : msg);
    } finally {
      this._isLoading.set(false);
    }
  }

  private analyzeText(orderId: string, orderNumber: string, text: string): SentimentEntry {
    const lower = text.toLowerCase();
    const { score, keywords } = this.scoreText(lower);
    const flags = this.detectFlags(lower);
    const sentiment = this.categorizeScore(score);

    return {
      orderId,
      orderNumber,
      instructions: text,
      sentiment,
      score,
      keywords,
      flags,
      analyzedAt: new Date(),
    };
  }

  private scoreText(lower: string): { score: number; keywords: string[] } {
    const words = lower.split(/\s+/);
    let score = 0;
    const keywords: string[] = [];

    for (const word of words) {
      if (NEGATIVE_KEYWORDS.some(nw => word.includes(nw))) {
        score -= 15;
        if (!keywords.includes(word)) keywords.push(word);
      }
      if (POSITIVE_KEYWORDS.some(pw => word.includes(pw))) {
        score += 15;
        if (!keywords.includes(word)) keywords.push(word);
      }
    }

    return { score: Math.max(-100, Math.min(100, score)), keywords };
  }

  private detectFlags(lower: string): SentimentFlag[] {
    const flags: SentimentFlag[] = [];
    for (const [flag, kws] of Object.entries(FLAG_KEYWORDS) as [SentimentFlag, string[]][]) {
      if (kws.some(kw => lower.includes(kw))) {
        flags.push(flag);
      }
    }
    return flags;
  }

  private categorizeScore(score: number): SentimentCategory {
    if (score > 10) return 'positive';
    if (score < -10) return 'negative';
    return 'neutral';
  }

  getSentimentClass(sentiment: SentimentCategory): string {
    switch (sentiment) {
      case 'positive': return 'sentiment-positive';
      case 'neutral': return 'sentiment-neutral';
      case 'negative': return 'sentiment-negative';
    }
  }

  getSentimentIcon(sentiment: SentimentCategory): string {
    switch (sentiment) {
      case 'positive': return '+';
      case 'neutral': return '~';
      case 'negative': return '-';
    }
  }

  getFlagLabel(flag: SentimentFlag): string {
    switch (flag) {
      case 'complaint': return 'Complaint';
      case 'allergy': return 'Allergy';
      case 'rush': return 'Rush';
      case 'compliment': return 'Compliment';
      case 'dietary': return 'Dietary';
      case 'modification': return 'Modification';
    }
  }

  getFlagClass(flag: SentimentFlag): string {
    switch (flag) {
      case 'complaint': return 'flag-complaint';
      case 'allergy': return 'flag-allergy';
      case 'rush': return 'flag-rush';
      case 'compliment': return 'flag-compliment';
      case 'dietary': return 'flag-dietary';
      case 'modification': return 'flag-modification';
    }
  }

  getAllFlags(): SentimentFlag[] {
    return ['complaint', 'allergy', 'rush', 'compliment', 'dietary', 'modification'];
  }

  getEntriesByFlag(flag: SentimentFlag): SentimentEntry[] {
    return this._entries().filter(e => e.flags.includes(flag)).slice(0, 3);
  }

  getScoreBarWidth(score: number): number {
    return Math.abs(score);
  }
}
