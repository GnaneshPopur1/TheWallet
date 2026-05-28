import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CreditScoreRecord {
  credit_score: number;
  recorded_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private apiUrl = `${environment.apiUrl}/credit`;

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getHistory(months: number = 6): Observable<CreditScoreRecord[]> {
    return this.http.get<CreditScoreRecord[]>(`${this.apiUrl}/history?months=${months}`, this.getHeaders())
      .pipe(catchError(this.handleError<CreditScoreRecord[]>('getHistory', [])));
  }

  refreshScore(): Observable<any> {
    return this.http.post(`${this.apiUrl}/refresh`, {}, this.getHeaders())
      .pipe(catchError(this.handleError('refreshScore')));
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
