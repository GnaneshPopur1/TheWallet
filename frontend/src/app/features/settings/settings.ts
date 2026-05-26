import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  userEmail = '';
  venmoHandle = '';
  isSavingProfile = false;
  profileSaved = false;

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  isChangingPassword = false;
  passwordChanged = false;

  pushEnabled = true;
  budgetAlerts = true;

  isDeleting = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    this.authService.checkAuthStatus().subscribe((user) => {
      this.userEmail = user.email;
      this.venmoHandle = user.venmo_handle || '';
    });
  }

  saveProfile() {
    this.isSavingProfile = true;
    this.profileSaved = false;
    this.authService.updateVenmoHandle(this.venmoHandle).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileSaved = true;
        setTimeout(() => (this.profileSaved = false), 3000);
      },
      error: () => {
        this.isSavingProfile = false;
      },
    });
  }

  changePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      alert('Please fill out all password fields.');
      return;
    }

    if (this.newPassword.length < 8) {
      alert('New password must be at least 8 characters.');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      alert('New password confirmation does not match.');
      return;
    }

    this.isChangingPassword = true;
    this.passwordChanged = false;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http
      .patch(
        `${this.apiUrl}/auth/me/password`,
        {
          current_password: this.currentPassword,
          new_password: this.newPassword,
        },
        { headers },
      )
      .subscribe({
        next: () => {
          this.isChangingPassword = false;
          this.passwordChanged = true;
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
          setTimeout(() => (this.passwordChanged = false), 3000);
        },
        error: (err) => {
          this.isChangingPassword = false;
          alert(err.error?.error || 'Failed to change password');
        },
      });
  }

  deleteAccount() {
    const confirmed = confirm(
      'Are you absolutely sure you want to delete your account? This action cannot be undone. All your data will be permanently removed.',
    );

    if (!confirmed) return;

    this.isDeleting = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.delete(`${this.apiUrl}/auth/me`, { headers }).subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isDeleting = false;
        alert(err.error?.error || 'Failed to delete account');
      },
    });
  }
}
