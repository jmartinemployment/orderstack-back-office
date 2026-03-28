# Marketing

## Purpose
Campaign builder for email, SMS, and push notification marketing to customers.

## Route
`/marketing`

## Components
- **CampaignBuilder** (`os-campaign-builder`) — Campaign list, create/edit campaigns, audience targeting, content editor, scheduling, performance tracking

## Services
- `MarketingService` — Campaign CRUD, automations, send, analytics

## Models
- `marketing.model` — Campaign, Automation, AudienceSegment

## Known API Gaps (404s)
- `GET /marketing/automations` — Not implemented
