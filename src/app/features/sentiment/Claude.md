# Sentiment Feature

## Purpose
Client-side sentiment analysis of order special instructions. Scores text as positive/neutral/negative and flags actionable keywords (complaints, allergies, rush requests, dietary needs, modifications).

## Routes
- `/sentiment` — SentimentDashboard (auth-guarded)

## Components

### SentimentDashboard (`os-sentiment`)
Two tabs: overview and detail list. Loads all orders from the API, extracts `specialInstructions`, and runs keyword-based sentiment scoring client-side (no AI API call). Summary shows total analyzed, positive/neutral/negative counts, average score, top 10 keywords, and flag counts. Filterable by sentiment category. Entries show order number, instruction text, score bar, and flag badges.

**Services:** HttpClient (direct), AuthService

## Models
- `@models/sentiment.model` — SentimentEntry, SentimentCategory, SentimentFlag, SentimentSummary, SentimentTab

## Key Patterns
- Analysis is fully client-side using keyword matching (no Claude API call)
- Positive/negative keywords hardcoded in component
- 6 flag categories: complaint, allergy, rush, compliment, dietary, modification
- Score range: -100 to +100
- Uses `effect()` to auto-load when authenticated and merchant selected
- Fetches raw orders via HttpClient (not OrderService) to access `specialInstructions`
