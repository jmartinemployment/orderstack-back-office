import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChatMessage, ChatRequest, ChatResponse } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isTyping = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _conversationId = signal<string | null>(null);

  readonly messages = this._messages.asReadonly();
  readonly isTyping = this._isTyping.asReadonly();
  readonly error = this._error.asReadonly();

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId();
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.merchantId || !content.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    this._messages.update(msgs => [...msgs, userMessage]);
    this._isTyping.set(true);
    this._error.set(null);

    try {
      const request: ChatRequest = {
        message: content.trim(),
        conversationId: this._conversationId() ?? undefined,
      };

      const response = await firstValueFrom(
        this.http.post<ChatResponse>(
          `${this.apiUrl}/merchant/${this.merchantId}/chat`,
          request
        )
      );

      this._conversationId.set(response.conversationId);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        sources: response.sources,
      };
      this._messages.update(msgs => [...msgs, assistantMessage]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get response';
      this._error.set(message);

      // Add error message as assistant response
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I couldn\'t process that request. The AI chat service may not be available yet. Please try again later.',
        timestamp: new Date(),
      };
      this._messages.update(msgs => [...msgs, errorMessage]);
    } finally {
      this._isTyping.set(false);
    }
  }

  clearConversation(): void {
    this._messages.set([]);
    this._conversationId.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }
}
