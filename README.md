# Market Intelligence Frontend

Angular frontend for the Market Intelligence application. The UI is a standalone Angular application that consumes the Spring Boot backend API running at http://localhost:8080/api.

Repository: nikhilchepuri-java/market-intelligence-frontend

## Current application

The frontend currently provides a single market-intelligence dashboard with:
- Market quote cards for NDX, QQQ, SPY, AVGO, NVDA, AMD, and TSLA
- Automatic handling of symbols for which realtime quote data is unavailable
- Technical indicators and market levels
- Rule-based market signals and scenario analysis
- Daily historical OHLC candles
- Seven-day news view
- Realtime/data-provider health diagnostics
- Price/RSI/relative-volume/support/resistance alerts
- Options expiration and option-chain views
- Unusual options activity
- Single-option scenario analysis
- Multi-leg options strategy analysis
- Implied-volatility surface/skew analytics
- Put/call flow analytics
- Options alerts
- V3 research tools: feature-store generation/loading, pattern detection, strategy backtesting, and walk-forward logistic-regression validation

The UI is analytical only. It does not place trades or execute orders.

## Frontend architecture

The application is built with:
- Angular 20
- TypeScript 5.9
- RxJS 7.8
- Angular standalone components
- Angular HttpClient for backend communication
- Angular Forms for interactive controls
- A single root AppComponent with the dashboard sections rendered from src/app/app.component.ts, src/app/app.component.html, src/app/app.component.css, and src/main.ts

The frontend CI workflow uses Node.js 22, runs npm ci, and then runs npm run build.

## Backend dependency

The frontend expects the Spring Boot backend to be available at:

http://localhost:8080/api

The current frontend hard-codes this API base URL in AppComponent. If the backend is unavailable, the dashboard displays a backend/realtime-data error rather than silently treating the application as healthy.

## Main API usage

### Market data

- GET /api/quotes?symbols=...
- GET /api/technicals/{symbol}
- GET /api/signals/{symbol}
- GET /api/candles/{symbol}?timeframe=1D
- GET /api/news/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD
- GET /api/data-status

Quotes are refreshed automatically every 30 seconds. Selected technical/signal/candle data is refreshed every 60 seconds.

### Alerts

- GET /api/alerts?symbol={symbol}
- POST /api/alerts
- DELETE /api/alerts/{id}
- POST /api/alerts/evaluate/{symbol}

### Options

- GET /api/options/{symbol}/expirations
- GET /api/options/{symbol}/chain?expiration={expiration}
- GET /api/options/{symbol}/unusual?expiration={expiration}
- POST /api/options/scenario
- GET /api/options/{symbol}/iv-surface?spot=...&expirations=...
- GET /api/options/{symbol}/flow?expiration={expiration}
- GET /api/options/alerts?underlying={symbol}
- POST /api/options/alerts
- DELETE /api/options/alerts/{id}
- POST /api/options/alerts/evaluate/{symbol}?expiration={expiration}
- POST /api/options/strategies/scenario

### V3 research

- POST /api/v3/features/build
- GET /api/v3/features
- GET /api/v3/patterns
- POST /api/v3/backtest
- POST /api/v3/ml/walk-forward

## Historical candle behavior

The current frontend requests daily candles with GET /api/candles/{symbol}?timeframe=1D and then keeps the latest 90 returned candles in the browser.

The current UI therefore displays a 90-day daily candle view. There is currently no 7D/30D/90D selector implemented in the frontend and the frontend does not yet send the backend optional range=7D, range=30D, or range=90D parameter.

The backend now supports those range parameters and defaults to 90 days when no range is supplied. If a range selector is added to this frontend, it should pass the selected value through to /api/candles/{symbol}?timeframe=1D&range=7D, /api/candles/{symbol}?timeframe=1D&range=30D, or /api/candles/{symbol}?timeframe=1D&range=90D.

### NDX and QQQ

The frontend exposes both NDX and QQQ.

For historical candles, the backend uses QQQ as the supported proxy for NDX when Alpha Vantage does not provide the requested NDX index series. The backend keeps the requested symbol in the returned candle model, so an NDX chart can be labeled NDX even though its historical candle source is the QQQ proxy.

This distinction should be preserved in future UI documentation so users understand that an NDX historical chart may represent QQQ proxy data.

## Data-provider status

The dashboard calls /api/data-status and displays provider/health information.

The current backend architecture uses:
- Finnhub for realtime quotes and news
- Alpha Vantage for historical candles
- Tradier for options

Provider credentials are configured in the backend, not in the Angular source code.

## Running locally

Install dependencies:

npm ci

Start the development server:

npm start

Build the production application:

npm run build

The Angular development server is configured through the standard Angular CLI workflow. The backend should be running separately on port 8080.

## Project structure

- angular.json
- package.json
- package-lock.json
- src/index.html
- src/main.ts
- src/app/app.component.ts
- src/app/app.component.html
- src/app/app.component.css
- tsconfig.json
- tsconfig.app.json
- .github/workflows/frontend.yml

## Important implementation notes

- The frontend currently assumes the backend is local at http://localhost:8080/api.
- Realtime quote refresh runs every 30 seconds.
- Selected market detail refresh runs every 60 seconds.
- The initial dashboard loads quotes, technicals, signals, candles, news, alerts, and options data.
- The UI explicitly reports unavailable realtime symbols.
- Historical candles are daily and currently capped to the latest 90 records in the frontend.
- NDX historical candles can be backed by QQQ proxy data through the backend.
- Options and research calculations are requested from the backend; the frontend primarily collects inputs and renders results.
- Walk-forward ML results are presented as historical/out-of-sample validation metrics and are not presented as guaranteed future performance.
- The application does not execute trades.

## Relationship to the backend repository

Backend repository:
https://github.com/nikhilchepuri-java/market-intelligence-backend

The backend README is the source of truth for provider configuration, API credentials, provider routing, Alpha Vantage throttling, candle-range behavior, and server-side market-data implementation.