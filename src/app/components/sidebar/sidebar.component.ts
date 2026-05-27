import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  activeRoute = '';
  esAdmin = false;
  nombreUsuario = '';
  rolLabel = '';

  private routerSub!: Subscription;

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    this.syncActiveRoute(this.router.url);

    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.syncActiveRoute(event.urlAfterRedirects);
    });

    // Leer datos del usuario en sesión
    const usuario = this.authService.getUsuario();
    this.esAdmin = usuario?.rol === 'admin';
    this.nombreUsuario = usuario?.nombre_completo ?? 'Usuario';
    this.rolLabel = this.esAdmin ? 'Admin Principal' : 'Invitado';
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

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }

  get iniciales(): string {
    return this.nombreUsuario
      .trim()
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}