import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EgresadosComponent } from './pages/egresados/egresados.component';
import { RespuestasComponent } from './pages/respuestas/respuestas.component';
import { EstadisticasComponent } from './pages/estadisticas/estadisticas.component';
import { EmpleabilidadComponent } from './pages/empleabilidad/empleabilidad.component';
import { DistribucionComponent } from './pages/distribucion/distribucion.component';
import { TitulacionComponent } from './pages/titulacion/titulacion.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'egresados', component: EgresadosComponent },
  { path: 'respuestas', component: RespuestasComponent },
  { path: 'estadisticas', component: EstadisticasComponent},
  { path: 'empleabilidad', component: EmpleabilidadComponent},
  { path: 'distribucion', component: DistribucionComponent},
  { path: 'titulacion', component: TitulacionComponent},
];