import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  activeRoute = '';

  private routerSub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Sincronizar con la ruta actual al cargar el componente
    this.syncActiveRoute(this.router.url);

    // Escuchar cada cambio de ruta
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.syncActiveRoute(event.urlAfterRedirects);
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private syncActiveRoute(url: string): void {
    const segment = url.split('/')[1]?.split('?')[0] || 'dashboard';
    this.activeRoute = segment;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  setRoute(route: string): void {
    this.router.navigate([`/${route}`]);
  }
}