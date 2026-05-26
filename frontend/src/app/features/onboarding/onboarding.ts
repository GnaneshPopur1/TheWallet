import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PlaidService } from '../../core/services/plaid.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class Onboarding {
  currentStep = 1;
  isConnecting = false;
  isFinishing = false;

  budgetPeriod = 'MONTHLY';
  budgetAmount: number | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private plaidService: PlaidService,
    private http: HttpClient,
    private router: Router,
  ) {}

  connectBank() {
    this.isConnecting = true;
    this.plaidService.openLink(() => {
      this.isConnecting = false;
      this.currentStep = 2;
    });
  }

  skipStep() {
    if (this.currentStep === 1) {
      this.currentStep = 2;
    } else {
      this.completeOnboarding();
    }
  }

  finishOnboarding() {
    this.isFinishing = true;

    if (!this.budgetAmount || this.budgetAmount <= 0) {
      this.completeOnboarding();
      return;
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Create the budget first
    this.http
      .post(
        `${this.apiUrl}/budgets`,
        {
          period: this.budgetPeriod,
          amount_limit: this.budgetAmount,
        },
        { headers },
      )
      .subscribe({
        next: () => {
          this.completeOnboarding();
        },
        error: () => {
          // Even if budget creation fails, complete onboarding
          this.completeOnboarding();
        },
      });
  }

  private completeOnboarding() {
    this.authService.completeOnboarding().subscribe({
      next: () => {
        this.isFinishing = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isFinishing = false;
        this.router.navigate(['/dashboard']);
      },
    });
  }
}
