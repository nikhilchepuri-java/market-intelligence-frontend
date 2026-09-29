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
