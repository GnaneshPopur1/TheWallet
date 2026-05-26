import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  email: string;
  password?: string;
  name?: string;
  round_up_balance?: number;
  venmo_handle?: string;
  is_email_verified?: boolean;
  has_completed_onboarding?: boolean;
}

export interface AuthResponse {
  token?: string;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

  register(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password });
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  logout() {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  checkAuthStatus(): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<User>(`${this.apiUrl}/me`, { headers }).pipe(
      tap(user => {
        user.name = user.email.split('@')[0];
        this.currentUserSubject.next(user);
      })
    );
  }

  updateVenmoHandle(venmo_handle: string): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put<User>(`${this.apiUrl}/me`, { venmo_handle }, { headers }).pipe(
      tap(user => {
        const current = this.currentUserSubject.value;
        if (current) {
          this.currentUserSubject.next({ ...current, venmo_handle: user.venmo_handle });
        }
      })
    );
  }

  completeOnboarding(): Observable<User> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<User>(`${this.apiUrl}/me/complete-onboarding`, {}, { headers }).pipe(
      tap(user => {
        const current = this.currentUserSubject.value;
        if (current) {
          this.currentUserSubject.next({ ...current, has_completed_onboarding: true });
        }
      })
    );
  }
}
