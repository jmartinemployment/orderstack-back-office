import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChatService } from '../../../services/chat';
import { AuthService } from '../../../services/auth';
import { AnalyticsService } from '../../../services/analytics';
import { AiInsightCard } from '../../../models/index';

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cards?: AiInsightCard[];
  suggestedFollowUps?: string[];
  sources?: string[];
}

@Component({
  selector: 'os-ai-chat',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAssistant {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _inputValue = signal('');
  readonly inputValue = this._inputValue.asReadonly();

  readonly messages = this.chatService.messages;
  readonly isTyping = this.chatService.isTyping;
  readonly error = this.chatService.error;
  readonly isQueryingAi = this.analyticsService.isQueryingAi;

  // Widget messages track AI responses with structured data
  private readonly _widgetMessages = signal<WidgetMessage[]>([]);
  readonly widgetMessages = this._widgetMessages.asReadonly();

  private readonly _pinnedCardIds = signal<Set<string>>(new Set());

  readonly hasMessages = computed(() =>
    this.messages().length > 0 || this._widgetMessages().length > 0
  );

  readonly allMessages = computed<WidgetMessage[]>(() => {
    // Merge regular chat messages and widget messages, sorted by timestamp
    const chatMsgs: WidgetMessage[] = this.messages().map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      sources: m.sources,
    }));
    const widgetMsgs = this._widgetMessages();
    return [...chatMsgs, ...widgetMsgs].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  });

  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly suggestedQueries = [
    'How did we do today?',
    'Which menu items should I cut?',
    'What\'s our best seller this week?',
    'Show me labor cost trend',
    'What\'s our average profit margin?',
    'Any critical alerts I should know about?',
  ];

  readonly quickQueries = [
    { label: 'Best Seller', query: 'What\'s our best seller this week?' },
    { label: 'Slowest Day', query: 'What was our slowest day this week?' },
    { label: 'Labor Cost', query: 'Show me labor cost trend' },
    { label: 'Top Customer', query: 'Who is our top customer this month?' },
    { label: 'Revenue vs Last Month', query: 'How does this month\'s revenue compare to last month?' },
  ];

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._inputValue.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async send(): Promise<void> {
    const value = this._inputValue().trim();
    if (!value || this.isTyping() || this.isQueryingAi()) return;

    this._inputValue.set('');

    // Add user message to widget messages
    this._widgetMessages.update(msgs => [...msgs, {
      id: crypto.randomUUID(),
      role: 'user',
      content: value,
      timestamp: new Date(),
    }]);

    this.scrollToBottom();

    // Query AI for structured response
    const response = await this.analyticsService.queryAi(value);

    // Add AI response with cards
    this._widgetMessages.update(msgs => [...msgs, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.cards.length > 0
        ? response.cards.map(c => c.title).join(', ')
        : 'No data available for that query.',
      timestamp: new Date(),
      cards: response.cards,
      suggestedFollowUps: response.suggestedFollowUps,
    }]);

    this.scrollToBottom();
  }

  async sendSuggested(query: string): Promise<void> {
    if (this.isTyping() || this.isQueryingAi()) return;
    this._inputValue.set(query);
    await this.send();
  }

  clearChat(): void {
    this.chatService.clearConversation();
    this._widgetMessages.set([]);
    this._pinnedCardIds.set(new Set());
  }

  pinCard(card: AiInsightCard): void {
    this.analyticsService.pinWidget(card);
    this._pinnedCardIds.update(ids => {
      const next = new Set(ids);
      next.add(card.id);
      return next;
    });
  }

  isCardPinned(cardId: string): boolean {
    return this._pinnedCardIds().has(cardId);
  }

  getCardChartLabels(card: AiInsightCard): string[] {
    return (card.data['labels'] as string[]) ?? [];
  }

  getCardChartValues(card: AiInsightCard): number[] {
    return (card.data['values'] as number[]) ?? [];
  }

  getCardChartMax(card: AiInsightCard): number {
    const values = this.getCardChartValues(card);
    return Math.max(1, ...values);
  }

  getCardTableRows(card: AiInsightCard): Record<string, unknown>[] {
    return (card.data['rows'] as Record<string, unknown>[]) ?? [];
  }

  getCardText(card: AiInsightCard): string {
    return (card.data['text'] as string) ?? '';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
