import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AcademicTerm {
  term_id: string;
  semester_name: string;
  tuition_total: number;
  aid_applied: number;
  dining_dollars_bal: number;
  end_date?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AcademicsService {
  private apiUrl = `${environment.apiUrl}/academics`;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  getTerms(): Observable<AcademicTerm[]> {
    return this.http
      .get<AcademicTerm[]>(`${this.apiUrl}/terms`, this.getHeaders())
      .pipe(catchError(this.handleError<AcademicTerm[]>('getTerms', [])));
  }

  getTermData(): Observable<AcademicTerm> {
    return this.http
      .get<AcademicTerm>(`${this.apiUrl}/terms/current`, this.getHeaders())
      .pipe(catchError(this.handleError<AcademicTerm>('getTermData')));
  }

  getDiningData(): Observable<{
    safe_daily_spend: number;
    days_remaining: number;
    dining_dollars: number;
  }> {
    return this.http
      .get<any>(`${this.apiUrl}/dining`, this.getHeaders())
      .pipe(catchError(this.handleError<any>('getDiningData')));
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
