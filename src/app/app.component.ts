import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Quote { symbol:string; price:number; change:number; changePercent:number; high:number; low:number; volume:number; timestamp:string; }
interface Signal { symbol:string; signal:string; regime:string; score:number; trigger:string; invalidation:string; upsideScenario:string; downsideScenario:string; explanation:string; }

@Component({selector:'app-root',standalone:true,imports:[CommonModule],templateUrl:'./app.component.html',styleUrl:'./app.component.css'})
export class AppComponent implements OnInit {
 private http=inject(HttpClient); api='http://localhost:8080/api';
 symbols=['NDX','QQQ','SPY','AVGO','NVDA','AMD','TSLA']; quotes:Quote[]=[]; signals:Record<string,Signal>={}; loading=true;
 ngOnInit(){this.refresh();}
 refresh(){this.loading=true;this.http.get<Quote[]>(`${this.api}/quotes?symbols=${this.symbols.join(',')}`).subscribe({next:q=>{this.quotes=q;this.loading=false;this.symbols.forEach(s=>this.loadSignal(s));},error:()=>this.loading=false});}
 loadSignal(s:string){this.http.get<Signal>(`${this.api}/signals/${s}`).subscribe(x=>this.signals[s]=x);}
 quote(s:string){return this.quotes.find(x=>x.symbol===s);}
 fmt(n:number){return n?.toLocaleString(undefined,{maximumFractionDigits:2})??'-';}
}
