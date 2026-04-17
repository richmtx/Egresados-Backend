import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule], 
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isCollapsed = false;
  activeRoute = 'dashboard';

  constructor(private router: Router) {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  setRoute(route: string): void {
    this.activeRoute = route;
    this.router.navigate([`/${route}`]);
  }
}