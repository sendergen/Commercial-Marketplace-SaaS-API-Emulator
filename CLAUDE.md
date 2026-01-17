# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js/TypeScript emulator for Microsoft Commercial Marketplace SaaS Fulfillment APIs. It allows developers to test marketplace integrations without requiring Azure Partner Center setup or AAD configuration.

## Common Commands

```bash
# Install dependencies and build
npm run build

# Start the emulator
npm run start

# Run tests
npm test

# Run a single test file
npx jest src/__tests__/subscription-api-resolve.test.ts

# Lint
npm run eslint

# Format code
npm run prettier-format

# Build Docker image
docker build -t marketplace-api-emulator -f docker/Dockerfile .

# Run Docker container
docker run -d -p 8080:80 marketplace-api-emulator
```

## Architecture

### Entry Point & Configuration
- `src/index.ts` - Express server setup, middleware configuration, environment variable parsing
- Configuration via `.env` file or environment variables (see `docs/config.md`)

### API Structure
The emulator implements Microsoft SaaS Fulfillment APIs v2:

| File | Purpose |
|------|---------|
| `src/subscription-api.ts` | Route definitions for subscription endpoints |
| `src/subscription-api-impl.ts` | Implementation of resolve, activate, CRUD operations |
| `src/operations-api.ts` | Route definitions for operations endpoints |
| `src/operations-api-impl.ts` | Implementation of async operation tracking |
| `src/webhook-api.ts` | Webhook notification routes |
| `src/webhook-api-impl.ts` | Webhook payload delivery to configured endpoints |

### Services Container Pattern
`src/services/container.ts` creates a dependency injection container with:
- `stateStore` - In-memory + file-persisted subscription/offer data
- `jwt` / `purchaseToken` - Token encoding/decoding utilities
- `tokens` - AAD token service for webhook authentication
- `notifications` - WebSocket notification service
- `context` - Request context (correlation IDs)
- `logger` - Contextual logging

### State Management
- `src/services/default-state-store.ts` - Implements `StateStore` interface
- Data persisted to `config/data.json`
- Stores: Publishers → Subscriptions → Operations, and Offers → Plans

### Key Types (`src/types.ts`)
- `Subscription` - SaaS subscription with status, beneficiary, purchaser, plan
- `Operation` - Async operation (ChangePlan, ChangeQuantity, Reinstate, Unsubscribe, etc.)
- `Offer` / `Plan` - Product catalog structure
- `Config` - All environment configuration options

### Middleware Chain
1. `handleRequestIds` - Adds correlation/request IDs
2. `extractPublisher` - Extracts publisher ID from query param or bearer token
3. `checkApiVersion` - Validates `api-version` query parameter
4. `checkToken` - Optional AAD token validation (when `REQUIRE_AUTH=true`)

### Client UI
Static files in `src/client/` serve the emulator's built-in landing page and token generator UI.

## Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3978 (local) / 80 (Docker) | Server port |
| `WEBHOOK_URL` | `http://localhost:PORT/webhook` | Your webhook endpoint |
| `LANDING_PAGE_URL` | `http://localhost:PORT/landing.html` | Your landing page |
| `REQUIRE_AUTH` | false | Require AAD bearer tokens |
| `SKIP_DATA_LOAD` | false | Start with empty state |
| `NO_SAMPLES` | false | Skip loading sample offers |

## Testing

Tests are in `src/__tests__/` using Jest with ts-jest. Test files follow pattern `*-api-*.test.ts`.

Helper utilities in `src/testHelpers/helpers.ts` provide mock services container setup.
