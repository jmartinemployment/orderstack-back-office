# Voice Ordering Feature

## Purpose
Browser-based voice ordering using the Web Speech API. Listens to spoken menu item names, fuzzy-matches against the active menu, and adds confirmed items to the cart. Bilingual: English and Spanish.

## Routes
- `/voice-order` — VoiceOrder (auth-guarded)

## Components

### VoiceOrder (`os-voice-order`)
States: idle → listening → processing → confirming → error. Language toggle (en/es). Continuous speech recognition with interim text display. Transcript history with timestamps.

Fuzzy matching: word-overlap scoring against menu item names (and `nameEn` for bilingual items). Quantity extraction from spoken numbers ("two burgers", "3 tacos") and Spanish equivalents ("dos", "tres"). Confidence threshold > 0.4 required for match.

Confirmation UI: pending matches shown as cards with item name, price, quantity, confidence score. Confirm individual items or confirm all. Each confirmation adds to CartService and speaks confirmation via SpeechSynthesis.

**Services:** MenuService, CartService, AuthService

## Models
- `@models/voice.model` — VoiceState, VoiceLanguage, VoiceMatch, VoiceTranscript

## Key Patterns
- Uses `window.SpeechRecognition` / `webkitSpeechRecognition` (Chrome/Edge only)
- `isSupported` signal checks for API availability
- Recognition auto-restarts on `onend` if still in listening state
- Filters menu to active, non-86'd items
- SpeechSynthesis for audible confirmation (en-US or es-US)
- Implements OnDestroy to stop recognition and cancel synthesis
- No backend AI call — matching is client-side fuzzy word overlap
