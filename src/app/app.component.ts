import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Quote { symbol: string; price: number; change: number; changePercent: number; high: number; low: number; volume: number; timestamp: string; }
interface Technical { symbol: string; price: number; sma20: number; sma50: number; sma200: number; ema9: number; ema21: number; ema50: number; rsi14: number; atr14: number; volume: number; averageVolume20: number; relativeVolume20: number; support1: number; support2: number; resistance1: number; resistance2: number; trend: string; conditionsMet: number; totalConditions: number; }
interface Signal { symbol: string; signal: string; regime: string; score: number; trigger: string; invalidation: string; upsideScenario: string; downsideScenario: string; explanation: string; }
interface NewsArticle { symbol: string; id: number; publishedAt: string; headline: string; source: string; summary: string; url: string; imageUrl: string; category: string; related: string; }
interface Candle { symbol: string; timeframe: string; timestamp: string; open: number; high: number; low: number; close: number; volume: number; }
interface AlertRule { id: number; symbol: string; type: string; threshold: number; enabled: boolean; cooldownSeconds: number; lastTriggeredAt: string | null; }
interface AlertEvent { ruleId: number; symbol: string; type: string; value: number; threshold: number; triggeredAt: string; message: string; }
interface OptionContract { symbol: string; underlying: string; optionType: 'CALL'|'PUT'; expiration: string; strike: number; bid: number; ask: number; last: number; volume: number; openInterest: number; impliedVolatility: number; delta: number; gamma: number; theta: number; vega: number; rho: number; contractSize: number; }
interface OptionChain { underlying: string; expiration: string; contracts: OptionContract[]; }
interface UnusualOptionActivity { symbol: string; underlying: string; optionType: string; expiration: string; strike: number; volume: number; openInterest: number; volumeOpenInterestRatio: number; impliedVolatility: number; premium: number; reason: string; }
interface OptionScenario { underlying: string; optionType: string; strike: number; underlyingPrice: number; targetUnderlyingPrice: number; impliedVolatility: number; theoreticalPrice: number; currentIntrinsicValue: number; targetIntrinsicValue: number; estimatedProfitLoss: number; estimatedReturnPercent: number; delta: number; gamma: number; theta: number; vega: number; rho: number; }\ninterface StrategyLeg { optionType: 'CALL'|'PUT'; side: 'BUY'|'SELL'; strike: number; expiration: string; quantity: number; premium: number; impliedVolatility: number; contractSize: number; }\ninterface StrategyScenario { underlying: string; underlyingPrice: number; netPremium: number; maxProfit: number; maxLoss: number; breakevenPrices: number[]; delta: number; gamma: number; theta: number; vega: number; rho: number; payoff: { underlyingPrice: number; profitLoss: number }[]; }\ninterface IvSurface { spotPrice: number; points: { expiration: string; optionType: string; strike: number; moneyness: number; impliedVolatility: number }[]; skews: { expiration: string; averageCallIv: number; averagePutIv: number; putCallSkew: number }[]; }\ninterface OptionFlowAnalytics { underlying: string; callOpenInterest: number; putOpenInterest: number; putCallOpenInterestRatio: number; callVolume: number; putVolume: number; putCallVolumeRatio: number; totalOpenInterest: number; totalVolume: number; callVolumeShare: number; putVolumeShare: number; }\ninterface OptionAlertRule { id: number; underlying: string; symbol: string; type: string; threshold: number; enabled: boolean; cooldownSeconds: number; }\ninterface OptionAlertEvent { ruleId: number; underlying: string; symbol: string; type: string; value: number; threshold: number; triggeredAt: string; message: string; }

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
    private http = inject(HttpClient);
    api = 'http://localhost:8080/api';

    symbols = ['NDX', 'QQQ', 'SPY', 'AVGO', 'NVDA', 'AMD', 'TSLA'];
    quotes: Quote[] = [];
    technicals: Record<string, Technical> = {};
    signals: Record<string, Signal> = {};
    candles: Record<string, Candle[]> = {};
    news: NewsArticle[] = [];
    alerts: AlertRule[] = [];
    events: AlertEvent[] = [];
    selectedSymbol = 'NDX';
    loading = true;
    newsLoading = false;
    alertType = 'PRICE_ABOVE';
    alertThreshold = 0;
    alertCooldown = 300;
    error = '';
    optionExpirations: string[] = [];
    selectedExpiration = '';
    optionChain: OptionChain | null = null;
    unusualActivity: UnusualOptionActivity[] = [];
    optionType: 'CALL'|'PUT' = 'CALL';
    optionStrike = 0;
    optionIv = 0.30;
    optionTargetPrice = 0;
    optionRate = 0.04;
    optionScenario: OptionScenario | null = null;
    optionsLoading = false;

    ngOnInit() { this.refresh(); }

    refresh() {
        this.loading = true;
        this.error = '';
        this.http.get<Quote[]>(`${this.api}/quotes?symbols=${this.symbols.join(',')}`).subscribe({
            next: q => {
                this.quotes = q;
                this.symbols.forEach(s => {
                    this.loadTechnical(s);
                    this.loadSignal(s);
                    this.loadCandles(s);
                });
                this.loadSelectedData();
                this.loading = false;
            },
            error: () => {
                this.error = 'Backend is unavailable. Start the Spring Boot API on port 8080.';
                this.loading = false;
            }
        });
    }

    selectSymbol(symbol: string) {
        this.selectedSymbol = symbol;
        this.loadSelectedData();
    }

    loadTechnical(symbol: string) {
        this.http.get<Technical>(`${this.api}/technicals/${symbol}`).subscribe({
            next: x => this.technicals[symbol] = x
        });
    }

    loadSignal(symbol: string) {
        this.http.get<Signal>(`${this.api}/signals/${symbol}`).subscribe({
            next: x => this.signals[symbol] = x
        });
    }

    loadCandles(symbol: string) {
        this.http.get<Candle[]>(`${this.api}/candles/${symbol}?timeframe=1D`).subscribe({
            next: x => this.candles[symbol] = x.slice(-90)
        });
    }

    loadSelectedData() {
        this.newsLoading = true;
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        const from = start.toISOString().slice(0, 10);
        const to = end.toISOString().slice(0, 10);

        this.http.get<NewsArticle[]>(`${this.api}/news/${this.selectedSymbol}?from=${from}&to=${to}`).subscribe({
            next: x => { this.news = x.slice(0, 12); this.newsLoading = false; },
            error: () => { this.news = []; this.newsLoading = false; }
        });
        this.loadAlerts();
        this.loadOptions();
    }

    loadOptions() {
        this.optionsLoading = true;
        this.http.get<string[]>(`${this.api}/options/${this.selectedSymbol}/expirations`).subscribe({
            next: dates => {
                this.optionExpirations = dates;
                if (!this.selectedExpiration || !dates.includes(this.selectedExpiration)) this.selectedExpiration = dates[0] || '';
                if (this.selectedExpiration) this.loadOptionChain();
                else this.optionsLoading = false;
            },
            error: () => { this.optionExpirations = []; this.optionChain = null; this.unusualActivity = []; this.optionsLoading = false; }
        });
    }

    loadOptionChain() {
        if (!this.selectedExpiration) return;
        this.optionsLoading = true;
        this.http.get<OptionChain>(`${this.api}/options/${this.selectedSymbol}/chain?expiration=${this.selectedExpiration}`).subscribe({
            next: chain => {
                this.optionChain = chain;
                this.unusualActivity = [];
                this.optionsLoading = false;
                const first = chain.contracts.find(x => x.optionType === this.optionType);
                this.optionStrike = first?.strike || 0;
                this.optionIv = first?.impliedVolatility || 0.30;
                this.optionTargetPrice = this.quote(this.selectedSymbol)?.price || 0;
                this.http.get<UnusualOptionActivity[]>(`${this.api}/options/${this.selectedSymbol}/unusual?expiration=${this.selectedExpiration}`).subscribe({ next: x => this.unusualActivity = x.slice(0, 12) });
            },
            error: () => { this.optionChain = null; this.optionsLoading = false; }
        });
    }

    runOptionScenario() {
        this.http.post<OptionScenario>(`${this.api}/options/scenario`, {
            underlying: this.selectedSymbol,
            optionType: this.optionType,
            strike: Number(this.optionStrike),
            expiration: this.selectedExpiration,
            underlyingPrice: this.quote(this.selectedSymbol)?.price || 0,
            impliedVolatility: Number(this.optionIv),
            targetUnderlyingPrice: Number(this.optionTargetPrice),
            riskFreeRate: Number(this.optionRate),
            contractSize: 100
        }).subscribe({ next: x => this.optionScenario = x });
    }

    loadOptionAnalytics() {
        const spot = this.quote(this.selectedSymbol)?.price || 0;
        const expirations = this.optionExpirations.slice(0, 4).join(',');
        if (spot && expirations) this.http.get<IvSurface>(this.api + '/options/' + this.selectedSymbol + '/iv-surface?spot=' + spot + '&expirations=' + expirations).subscribe({ next: x => this.ivSurface = x });
        if (this.selectedExpiration) this.http.get<OptionFlowAnalytics>(this.api + '/options/' + this.selectedSymbol + '/flow?expiration=' + this.selectedExpiration).subscribe({ next: x => this.flowAnalytics = x });
    }
    addStrategyLeg() { this.strategyLegs = [...this.strategyLegs, { optionType: 'CALL', side: 'SELL', strike: this.optionStrike || 0, expiration: this.selectedExpiration, quantity: 1, premium: 0, impliedVolatility: this.optionIv || .30, contractSize: 100 }]; }
    removeStrategyLeg(index: number) { this.strategyLegs = this.strategyLegs.filter((_, i) => i !== index); }
    runStrategy() {
        const spot = this.quote(this.selectedSymbol)?.price || 0;
        const strikes = this.strategyLegs.map(x => x.strike).filter(x => x > 0);
        if (!spot || !this.strategyLegs.length || !strikes.length) return;
        const min = Math.max(0.01, Math.min(...strikes) * .7); const max = Math.max(...strikes) * 1.3;
        this.http.post<StrategyScenario>(this.api + '/options/strategies/scenario', { underlying: this.selectedSymbol, underlyingPrice: spot, riskFreeRate: this.optionRate, legs: this.strategyLegs, gridMinPrice: min, gridMaxPrice: max, gridPoints: 101 }).subscribe({ next: x => this.strategyScenario = x });
    }
    loadOptionAlerts() {
        this.optionAlertsLoading = true;
        this.http.get<OptionAlertRule[]>(this.api + '/options/alerts?underlying=' + this.selectedSymbol).subscribe({ next: x => { this.optionAlerts = x; this.optionAlertsLoading = false; }, error: () => this.optionAlertsLoading = false });
    }
    createOptionAlert() {
        this.http.post<OptionAlertRule>(this.api + '/options/alerts', { id: 0, underlying: this.selectedSymbol, symbol: '', type: this.optionAlertType, threshold: Number(this.optionAlertThreshold), enabled: true, cooldownSeconds: Number(this.optionAlertCooldown) }).subscribe({ next: x => this.optionAlerts = [...this.optionAlerts, x] });
    }
    deleteOptionAlert(id: number) { this.http.delete(this.api + '/options/alerts/' + id).subscribe({ next: () => this.optionAlerts = this.optionAlerts.filter(x => x.id !== id) }); }
    evaluateOptionAlerts() {
        if (!this.selectedExpiration) return;
        this.http.post<OptionAlertEvent[]>(this.api + '/options/alerts/evaluate/' + this.selectedSymbol + '?expiration=' + this.selectedExpiration, {}).subscribe({ next: x => this.events = x as any });
    }
    optionContracts(type: 'CALL'|'PUT') {
        return (this.optionChain?.contracts || []).filter(x => x.optionType === type).slice(0, 15);
    }

    loadAlerts() {
        this.http.get<AlertRule[]>(`${this.api}/alerts?symbol=${this.selectedSymbol}`).subscribe({
            next: x => this.alerts = x
        });
    }

    createAlert() {
        this.http.post<AlertRule>(`${this.api}/alerts`, {
            symbol: this.selectedSymbol,
            type: this.alertType,
            threshold: Number(this.alertThreshold),
            enabled: true,
            cooldownSeconds: Number(this.alertCooldown)
        }).subscribe({
            next: x => {
                this.alerts = [...this.alerts, x];
                this.alertThreshold = 0;
            }
        });
    }

    deleteAlert(id: number) {
        this.http.delete(`${this.api}/alerts/${id}`).subscribe({
            next: () => this.alerts = this.alerts.filter(x => x.id !== id)
        });
    }

    evaluateAlerts() {
        this.http.post<AlertEvent[]>(`${this.api}/alerts/evaluate/${this.selectedSymbol}`, {}).subscribe({
            next: x => {
                this.events = x;
                this.loadAlerts();
            }
        });
    }

    quote(symbol: string) { return this.quotes.find(x => x.symbol === symbol); }
    technical(symbol: string) { return this.technicals[symbol]; }
    signal(symbol: string) { return this.signals[symbol]; }
    fmt(n: number | undefined) { return n == null ? '-' : n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }

    chartBars(symbol: string) {
        const data = this.candles[symbol] || [];
        if (!data.length) return [];
        const min = Math.min(...data.map(x => x.low));
        const max = Math.max(...data.map(x => x.high));
        const range = max - min || 1;
        return data.map((c, i) => ({
            x: 12 + i * (776 / Math.max(data.length - 1, 1)),
            openY: 220 - ((c.open - min) / range) * 200,
            closeY: 220 - ((c.close - min) / range) * 200,
            highY: 220 - ((c.high - min) / range) * 200,
            lowY: 220 - ((c.low - min) / range) * 200,
            up: c.close >= c.open
        }));
    }

    barBodyY(bar: { openY: number; closeY: number }) { return Math.min(bar.openY, bar.closeY); }
    barBodyHeight(bar: { openY: number; closeY: number }) { return Math.max(2, Math.abs(bar.closeY - bar.openY)); }
}
