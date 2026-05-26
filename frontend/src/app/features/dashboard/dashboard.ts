import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService, Account, Transaction } from '../../core/services/account.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { PlaidService } from '../../core/services/plaid.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  accounts: Account[] = [];
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  netWorth: number = 0;
  roundUpBalance: number = 0;
  isSimulatingRoundUps: boolean = false;
  isEmailVerified: boolean = true;
  venmoHandle: string = '';
  isUpdatingVenmo: boolean = false;
  isLoadingTransactions: boolean = false;
  searchQuery: string = '';
  filterType: 'all' | 'expenses' | 'income' | 'recurring' = 'all';

  // Line chart properties for Net Worth
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [650, 590, 800, 810, 850, 950, 1050],
        label: 'Net Worth',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        fill: 'origin',
      },
    ],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.5 },
    },
    scales: {
      y: { display: false },
      x: { display: false },
    },
    plugins: {
      legend: { display: false },
    },
  };

  // Doughnut chart properties for Cash Flow / Budget
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: ['Dining', 'Housing', 'Subscriptions', 'Other'],
    datasets: [
      { data: [350, 450, 100, 50], backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'] },
    ],
  };
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } },
  };

  constructor(
    private accountService: AccountService,
    private authService: AuthService,
    private plaidService: PlaidService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.roundUpBalance = user.round_up_balance || 0;
        this.isEmailVerified = user.is_email_verified ?? true;
        this.venmoHandle = user.venmo_handle || '';
      }
    });

    this.fetchData();
  }

  simulateRoundUps() {
    this.isSimulatingRoundUps = true;
    this.accountService.simulateRoundUps().subscribe((res) => {
      this.isSimulatingRoundUps = false;
      if (res && res.success) {
        this.authService.checkAuthStatus().subscribe(); // refresh balance
      }
    });
  }

  fetchData() {
    this.accountService.getAccounts().subscribe((data) => {
      this.accounts = data || [];
      this.netWorth = this.accounts.reduce((acc, curr) => acc + curr.current_balance, 0);

      if (this.accounts.length === 0) {
        this.transactions = [];
        this.filterTransactions();
        this.isLoadingTransactions = false;
        return;
      }

      this.isLoadingTransactions = true;
      const transactionRequests = this.accounts.map((account) =>
        this.accountService.getTransactions(account.account_id),
      );

      forkJoin(transactionRequests.length ? transactionRequests : [of([])]).subscribe({
        next: (results) => {
          this.transactions = results
            .flat()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.filterTransactions();
          this.isLoadingTransactions = false;
        },
        error: () => {
          this.transactions = [];
          this.filterTransactions();
          this.isLoadingTransactions = false;
        },
      });
    });
  }

  filterTransactions() {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredTransactions = this.transactions.filter((transaction) => {
      const matchesQuery = !query || transaction.merchant_name.toLowerCase().includes(query);
      const matchesType =
        this.filterType === 'all' ||
        (this.filterType === 'expenses' && transaction.amount < 0) ||
        (this.filterType === 'income' && transaction.amount > 0) ||
        (this.filterType === 'recurring' && transaction.is_recurring);

      return matchesQuery && matchesType;
    });
  }

  exportCSV() {
    const headers = ['Date', 'Merchant', 'Amount', 'Recurring'];
    const rows = this.filteredTransactions.map((transaction) => [
      transaction.date,
      transaction.merchant_name,
      transaction.amount.toFixed(2),
      transaction.is_recurring ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'thewallet-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  connectBank() {
    this.plaidService.openLink(() => {
      // Callback runs after successful link and sync
      console.log('Bank connected and synced!');
      this.fetchData();
    });
  }

  updateVenmo() {
    this.isUpdatingVenmo = true;
    this.authService.updateVenmoHandle(this.venmoHandle).subscribe(() => {
      this.isUpdatingVenmo = false;
    });
  }

  splitTransaction(t: Transaction) {
    t.isSplitting = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http
      .post<any>(
        `${environment.apiUrl}/roommates/split-transaction`,
        {
          transaction_id: t.transaction_id,
        },
        { headers },
      )
      .subscribe({
        next: (res) => {
          t.isSplitting = false;
          alert(res.message || 'Transaction split successfully!');
        },
        error: (err) => {
          t.isSplitting = false;
          alert(err.error?.error || 'Failed to split. Make sure you are in a roommate group.');
        },
      });
  }
}
