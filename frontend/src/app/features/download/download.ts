import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './download.html',
  styleUrl: './download.scss',
})
export class DownloadComponent {}
