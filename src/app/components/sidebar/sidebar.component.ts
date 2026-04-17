import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isCollapsed = false;
  activeRoute = 'dashboard';

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  setRoute(route: string): void {
    this.activeRoute = route;
  }
}