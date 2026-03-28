# AI Chat

## Purpose
Conversational AI assistant for restaurant operators. Answers natural-language questions about sales, menu performance, labor costs, and business insights using structured AI response cards.

## Route
`/ai-chat`

## Components
- **ChatAssistant** (`os-ai-chat`) — Full chat interface with message history, suggested queries, quick-query buttons, and AI insight cards (KPI, chart, table, text). Supports pinning cards to the Command Center dashboard.

## Services
- `ChatService` — WebSocket-based message history
- `AnalyticsService` — `queryAi()` for structured AI responses, `pinWidget()` for dashboard pinning
- `AuthService` — Authentication state

## Models
- `ChatMessage`, `AiInsightCard`, `AiQueryResponse` (from `@models/chat.model` and `@models/analytics.model`)

## Key Patterns
- Widget messages track AI responses with structured data (cards, follow-ups, sources)
- Suggested queries and quick-query buttons for common questions
- Cards can be pinned to Command Center dashboard
- Auto-scrolls to bottom on new messages
