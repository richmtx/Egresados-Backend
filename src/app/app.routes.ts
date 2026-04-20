import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EgresadosComponent } from './pages/egresados/egresados.component';
import { RespuestasComponent } from './pages/respuestas/respuestas.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'egresados', component: EgresadosComponent },
  { path: 'respuestas', component: RespuestasComponent },
];
