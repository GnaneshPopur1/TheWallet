import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { AuthService } from './core/services/auth.service';
import { ChatbotComponent } from './shared/components/chatbot/chatbot';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'TheWallet';
  isDarkTheme = true;

  readonly VAPID_PUBLIC_KEY = "BGGFPOvmB9PP-ZC3WthhNF3t8-4AHqaivta5CDcqILPNT1boj2kwqiX7M0EL2rxJAa0VkTg8rBp1puyZcjUd7Pw";

  constructor(
    public authService: AuthService, 
    private router: Router,
    private swPush: SwPush,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.authService.checkAuthStatus().subscribe(user => {
      if (user) {
        this.subscribeToNotifications();
      }
    });
    
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.isDarkTheme = false;
      document.body.classList.add('light-theme');
    }
  }

  subscribeToNotifications() {
    if (this.swPush.isEnabled) {
      this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      })
      .then(sub => {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        this.http.post(`${environment.apiUrl}/notifications/subscribe`, sub, { headers }).subscribe();
      })
      .catch(err => console.error("Could not subscribe to notifications", err));
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    if (this.isDarkTheme) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
