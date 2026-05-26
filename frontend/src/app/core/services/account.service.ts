import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Account {
  account_id: string;
  account_type: string;
  current_balance: number;
}

export interface Transaction {
  transaction_id: string;
  amount: number;
  merchant_name: string;
  date: string;
  is_recurring: boolean;
  isSplitting?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = `${environment.apiUrl}/accounts`;

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.apiUrl, this.getHeaders())
      .pipe(catchError(this.handleError<Account[]>('getAccounts', [])));
  }

  getTransactions(accountId: string, limit: number = 50): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/${accountId}/transactions?limit=${limit}`, this.getHeaders())
      .pipe(catchError(this.handleError<Transaction[]>('getTransactions', [])));
  }


  getSubscriptions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/subscriptions`, this.getHeaders())
      .pipe(catchError(this.handleError<Transaction[]>('getSubscriptions', [])));
  }

  scanReceipt(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<any>(`${environment.apiUrl}/receipts/scan`, formData, this.getHeaders())
      .pipe(catchError(this.handleError<any>('scanReceipt', null)));
  }

  simulateRoundUps(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roundups/simulate`, {}, this.getHeaders())
      .pipe(catchError(this.handleError<any>('simulateRoundUps', null)));
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
