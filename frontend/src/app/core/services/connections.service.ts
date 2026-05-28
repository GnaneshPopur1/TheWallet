import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface BankConnection {
  connection_id: string;
  institution_name: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionsService {
  private apiUrl = `${environment.apiUrl}/connections`;

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getConnections(): Observable<BankConnection[]> {
    return this.http.get<BankConnection[]>(this.apiUrl, this.getHeaders())
      .pipe(catchError(this.handleError<BankConnection[]>('getConnections', [])));
  }

  deleteConnection(connectionId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${connectionId}`, this.getHeaders())
      .pipe(catchError(this.handleError('deleteConnection')));
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
