import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  activeSection: string = 'home';

  @HostListener('window:scroll')
  onScroll() {
    const sections = ['home', 'features', 'about'];
    let current = 'home';

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        // If the top of the section is above the middle of the viewport
        const rect = element.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2) {
          current = section;
        }
      }
    }
    
    this.activeSection = current;
  }
}
