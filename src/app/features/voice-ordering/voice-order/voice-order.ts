import { Component, inject, signal, computed, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../../services/menu';
import { CartService } from '../../../services/cart';
import { AuthService } from '../../../services/auth';
import { MenuItem } from '../../../models/menu.model';
import { VoiceState, VoiceLanguage, VoiceMatch, VoiceTranscript } from '../../../models/voice.model';
import { LoadingSpinner } from '../../../shared/loading-spinner/loading-spinner';

@Component({
  selector: 'os-voice-order',
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './voice-order.html',
  styleUrl: './voice-order.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceOrder implements OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);

  private recognition: any = null;
  private readonly synthesis = globalThis.speechSynthesis;

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _state = signal<VoiceState>('idle');
  private readonly _language = signal<VoiceLanguage>('en');
  private readonly _transcripts = signal<VoiceTranscript[]>([]);
  private readonly _interimText = signal('');
  private readonly _matches = signal<VoiceMatch[]>([]);
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _isSupported = signal(this.checkSpeechSupport());

  readonly state = this._state.asReadonly();
  readonly language = this._language.asReadonly();
  readonly transcripts = this._transcripts.asReadonly();
  readonly interimText = this._interimText.asReadonly();
  readonly matches = this._matches.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isSupported = this._isSupported.asReadonly();

  readonly cartItems = this.cartService.items;
  readonly cartTotal = this.cartService.total;
  readonly cartItemCount = this.cartService.itemCount;
  readonly isLoading = this.menuService.isLoading;

  readonly lastTranscript = computed(() => {
    const list = this._transcripts();
    return list.length > 0 ? list[list.length - 1].text : '';
  });

  readonly menuItems = computed(() =>
    this.menuService.allItems().filter(i => i.isActive !== false && !i.eightySixed)
  );

  readonly pendingMatches = computed(() =>
    this._matches().filter(m => m.confidence > 0)
  );

  ngOnDestroy(): void {
    this.stopListening();
    this.synthesis?.cancel();
  }

  setLanguage(lang: VoiceLanguage): void {
    this._language.set(lang);
    if (this._state() === 'listening') {
      this.stopListening();
      this.startListening();
    }
  }

  startListening(): void {
    if (!this._isSupported()) {
      this._errorMessage.set('Speech recognition is not supported in this browser.');
      return;
    }

    this._errorMessage.set(null);
    this._interimText.set('');
    this._state.set('listening');

    const SpeechRecognitionApi = (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionApi();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this._language() === 'es' ? 'es-US' : 'en-US';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          this._transcripts.update(prev => [...prev, { text, isFinal: true, timestamp: new Date() }]);
          this._interimText.set('');
          this.processTranscript(text);
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        this._interimText.set(interim);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        this._errorMessage.set(`Speech error: ${event.error}`);
        this._state.set('error');
      }
    };

    this.recognition.onend = () => {
      if (this._state() === 'listening') {
        // Restart if still supposed to be listening
        try {
          this.recognition?.start();
        } catch {
          this._state.set('idle');
        }
      }
    };

    try {
      this.recognition.start();
    } catch {
      this._errorMessage.set('Failed to start speech recognition.');
      this._state.set('error');
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this._state.set('processing');
      this.recognition.onend = null;
      this.recognition.stop();
      this.recognition = null;
    }
    setTimeout(() => {
      if (this._state() === 'processing') {
        this._state.set(this._matches().length > 0 ? 'confirming' : 'idle');
      }
    }, 500);
  }

  confirmMatch(match: VoiceMatch): void {
    const menuItem = this.menuItems().find(i => i.id === match.menuItemId);
    if (menuItem) {
      for (let i = 0; i < match.quantity; i++) {
        this.cartService.addItem(menuItem);
      }
      this.speak(
        this._language() === 'es'
          ? `${match.quantity} ${match.menuItemName} agregado al carrito`
          : `Added ${match.quantity} ${match.menuItemName} to cart`
      );
    }
    this._matches.update(prev => prev.filter(m => m.menuItemId !== match.menuItemId));
    if (this._matches().length === 0) {
      this._state.set('idle');
    }
  }

  removeMatch(menuItemId: string): void {
    this._matches.update(prev => prev.filter(m => m.menuItemId !== menuItemId));
    if (this._matches().length === 0) {
      this._state.set('idle');
    }
  }

  confirmAllMatches(): void {
    for (const match of this._matches()) {
      const menuItem = this.menuItems().find(i => i.id === match.menuItemId);
      if (menuItem) {
        for (let i = 0; i < match.quantity; i++) {
          this.cartService.addItem(menuItem);
        }
      }
    }
    const count = this._matches().reduce((sum, m) => sum + m.quantity, 0);
    const plural = count === 1 ? '' : 's';
    const message = this._language() === 'es'
      ? `${count} artículo${plural} agregado${plural} al carrito`
      : `Added ${count} item${plural} to cart`;
    this.speak(message);
    this._matches.set([]);
    this._state.set('idle');
  }

  clearSession(): void {
    this.stopListening();
    this._transcripts.set([]);
    this._matches.set([]);
    this._interimText.set('');
    this._errorMessage.set(null);
    this._state.set('idle');
  }

  private readonly quantityWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };

  private processTranscript(text: string): void {
    const items = this.menuItems();
    const lower = text.toLowerCase();

    for (const item of items) {
      this.matchItemToTranscript(item, lower);
    }
  }

  private matchItemToTranscript(item: MenuItem, lower: string): void {
    const matchScore = this.fuzzyMatch(lower, item.name.toLowerCase())
      || (item.nameEn ? this.fuzzyMatch(lower, item.nameEn.toLowerCase()) : 0);

    if (matchScore <= 0.4) return;
    if (this._matches().some(m => m.menuItemId === item.id)) return;

    const quantity = this.extractQuantity(lower);
    this._matches.update(prev => [...prev, {
      menuItemId: item.id,
      menuItemName: item.name,
      price: Number(item.price),
      quantity,
      confidence: matchScore,
    }]);
  }

  private extractQuantity(lower: string): number {
    const numMatch = /(\d+)\s/.exec(lower);
    if (numMatch) {
      return Number.parseInt(numMatch[1], 10);
    }
    for (const [word, num] of Object.entries(this.quantityWords)) {
      if (lower.includes(word)) {
        return num;
      }
    }
    return 1;
  }

  private fuzzyMatch(input: string, target: string): number {
    // Simple word-overlap matching
    const inputWords = input.split(/\s+/);
    const targetWords = target.split(/\s+/);

    let matches = 0;
    for (const tw of targetWords) {
      if (tw.length < 3) continue; // skip short words
      for (const iw of inputWords) {
        if (iw.includes(tw) || tw.includes(iw)) {
          matches++;
          break;
        }
      }
    }

    const significantWords = targetWords.filter(w => w.length >= 3).length;
    return significantWords > 0 ? matches / significantWords : 0;
  }

  private speak(text: string): void {
    if (!this.synthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this._language() === 'es' ? 'es-US' : 'en-US';
    utterance.rate = 1;
    utterance.volume = 0.8;
    this.synthesis.speak(utterance);
  }

  private checkSpeechSupport(): boolean {
    return !!((globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition);
  }
}
