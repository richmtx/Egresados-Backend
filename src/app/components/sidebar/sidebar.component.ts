import { Component, HostBinding } from '@angular/core';
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

  @HostBinding('class.collapsed')
  get collapsed() {
    return this.isCollapsed;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  setRoute(route: string): void {
    this.activeRoute = route;
    // this.router.navigate([`/admin/${route}`]);
  }
}