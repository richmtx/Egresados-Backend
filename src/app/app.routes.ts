import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },

  // Solo admins
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'egresados', loadComponent: () => import('./pages/egresados/egresados.component').then(m => m.EgresadosComponent), canActivate: [adminGuard] },
  { path: 'respuestas', loadComponent: () => import('./pages/respuestas/respuestas.component').then(m => m.RespuestasComponent), canActivate: [adminGuard] },
  { path: 'estadisticas', loadComponent: () => import('./pages/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent), canActivate: [authGuard] },
  { path: 'empleabilidad', loadComponent: () => import('./pages/empleabilidad/empleabilidad.component').then(m => m.EmpleabilidadComponent), canActivate: [adminGuard] },
  { path: 'distribucion', loadComponent: () => import('./pages/distribucion/distribucion.component').then(m => m.DistribucionComponent), canActivate: [adminGuard] },
  { path: 'titulacion', loadComponent: () => import('./pages/titulacion/titulacion.component').then(m => m.TitulacionComponent), canActivate: [adminGuard] },
  { path: 'notificaciones', loadComponent: () => import('./pages/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent), canActivate: [authGuard] },
  { path: 'vinculacion', loadComponent: () => import('./pages/vinculacion/vinculacion.component').then(m => m.VinculacionComponent), canActivate: [adminGuard] },
  { path: 'generos', loadComponent: () => import('./pages/generos/generos.component').then(m => m.GenerosComponent), canActivate: [adminGuard] },
  { path: 'comparativas', loadComponent: () => import('./pages/comparativas/comparativas.component').then(m => m.ComparativasComponent), canActivate: [adminGuard] },
  { path: 'usuarios', loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [adminGuard] },

  // Accesible para admin e invitado (solo requiere login)
  { path: 'directorio', loadComponent: () => import('./pages/directorio/directorio.component').then(m => m.DirectorioComponent), canActivate: [authGuard] },

  // Cualquier ruta no encontrada → login
  { path: '**', redirectTo: '' }
];