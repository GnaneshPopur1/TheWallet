import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreditService, CreditScoreRecord } from '../../core/services/credit.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-credit',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './credit.html',
  styleUrl: './credit.scss',
})
export class Credit implements OnInit {
  history: CreditScoreRecord[] = [];
  currentScore: number | null = null;
  isLoading = false;
  isRefreshing = false;

  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Credit Score',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        fill: 'origin',
      },
    ],
    labels: [],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.3 },
    },
    scales: {
      y: { min: 300, max: 850 },
    },
    plugins: {
      legend: { display: false },
    },
  };

  constructor(private creditService: CreditService) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.isLoading = true;
    this.creditService.getHistory(6).subscribe((data) => {
      this.history = data;
      if (data.length > 0) {
        this.currentScore = data[data.length - 1].credit_score;
        this.updateChart();
      }
      this.isLoading = false;
    });
  }

  updateChart() {
    const labels = this.history.map(record => new Date(record.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const dataPoints = this.history.map(record => record.credit_score);
    
    this.lineChartData = {
      datasets: [
        {
          ...this.lineChartData.datasets[0],
          data: dataPoints
        }
      ],
      labels: labels
    };
  }

  refreshScore() {
    this.isRefreshing = true;
    this.creditService.refreshScore().subscribe(() => {
      this.isRefreshing = false;
      this.loadHistory();
    });
  }

  getScoreRating(): { label: string, colorClass: string } {
    if (!this.currentScore) return { label: 'Unknown', colorClass: '' };
    if (this.currentScore >= 750) return { label: 'Excellent', colorClass: 'excellent' };
    if (this.currentScore >= 700) return { label: 'Good', colorClass: 'good' };
    if (this.currentScore >= 650) return { label: 'Fair', colorClass: 'fair' };
    return { label: 'Poor', colorClass: 'poor' };
  }
}
