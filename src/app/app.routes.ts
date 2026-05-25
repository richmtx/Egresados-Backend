import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EgresadosComponent } from './pages/egresados/egresados.component';
import { RespuestasComponent } from './pages/respuestas/respuestas.component';
import { EstadisticasComponent } from './pages/estadisticas/estadisticas.component';
import { EmpleabilidadComponent } from './pages/empleabilidad/empleabilidad.component';
import { DistribucionComponent } from './pages/distribucion/distribucion.component';
import { TitulacionComponent } from './pages/titulacion/titulacion.component';
import { NotificacionesComponent } from './pages/notificaciones/notificaciones.component';
import { VinculacionComponent } from './pages/vinculacion/vinculacion.component';
import { GenerosComponent } from './pages/generos/generos.component';
import { ComparativasComponent } from './pages/comparativas/comparativas.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { DirectorioComponent } from './pages/directorio/directorio.component';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },

  // Solo admins
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'egresados', component: EgresadosComponent, canActivate: [adminGuard] },
  { path: 'respuestas', component: RespuestasComponent, canActivate: [adminGuard] },
  { path: 'estadisticas', component: EstadisticasComponent, canActivate: [authGuard] },
  { path: 'empleabilidad', component: EmpleabilidadComponent, canActivate: [adminGuard] },
  { path: 'distribucion', component: DistribucionComponent, canActivate: [adminGuard] },
  { path: 'titulacion', component: TitulacionComponent, canActivate: [adminGuard] },
  { path: 'notificaciones', component: NotificacionesComponent, canActivate: [authGuard] },
  { path: 'vinculacion', component: VinculacionComponent, canActivate: [adminGuard] },
  { path: 'generos', component: GenerosComponent, canActivate: [adminGuard] },
  { path: 'comparativas', component: ComparativasComponent, canActivate: [adminGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [adminGuard] },

  // Accesible para admin e invitado (solo requiere login)
  { path: 'directorio', component: DirectorioComponent, canActivate: [authGuard] },

  // Cualquier ruta no encontrada → login
  { path: '**', redirectTo: '' }
];