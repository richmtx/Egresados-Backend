import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TrayectoriaKpis {
  total_egresados: number;
  con_estudios_posteriores: number;
  con_emprendimiento: number;
  emprendimientos_activos: number;
  con_proyecto_social: number;
  con_certificaciones: number;
}

export interface EstudiosPorNivel {
  nivel: string;
  total: number;
}

export interface EstudiosPorEstado {
  estado: string;
  total: number;
}

export interface TopInstitucion {
  institucion: string;
  total: number;
}

export interface EstudiosPorCarrera {
  nombre_carrera: string;
  total_egresados: number;
  con_estudios: number;
  pct: number;
}

export interface EmprendimientoPorRango {
  rango: string;
  total: number;
}

export interface TopGiro {
  giro: string;
  total: number;
}

export interface EmprendimientoPorCarrera {
  nombre_carrera: string;
  total_egresados: number;
  con_emprendimiento: number;
  pct: number;
}

export interface ProyectosPorTipo {
  tipo: string;
  total: number;
}

export interface ProyectosPorCarrera {
  nombre_carrera: string;
  total_egresados: number;
  con_proyecto: number;
  pct: number;
}

export interface TopOrganizacion {
  organizacion: string;
  total: number;
}

export interface TopEmpresaPrimerEmpleo {
  empresa: string;
  total: number;
}

export interface TopPuestoPrimerEmpleo {
  puesto: string;
  total: number;
}

export interface TrayectoriaResponse {
  kpis: TrayectoriaKpis;
  estudiosPorNivel: EstudiosPorNivel[];
  estudiosPorEstado: EstudiosPorEstado[];
  topInstituciones: TopInstitucion[];
  estudiosPorCarrera: EstudiosPorCarrera[];
  emprendimientoPorRango: EmprendimientoPorRango[];
  topGiros: TopGiro[];
  emprendimientoPorCarrera: EmprendimientoPorCarrera[];
  proyectosPorTipo: ProyectosPorTipo[];
  proyectosPorCarrera: ProyectosPorCarrera[];
  topOrganizaciones: TopOrganizacion[];
  topEmpresasPrimerEmpleo: TopEmpresaPrimerEmpleo[];
  topPuestosPrimerEmpleo: TopPuestoPrimerEmpleo[];
  carrerasDisponibles: string[];
  aniosDisponibles: number[];
}

@Injectable({
  providedIn: 'root'
})
export class TrayectoriaService {

  private apiUrl = `${environment.apiUrl}/egresados/trayectoria`;

  constructor(private http: HttpClient) { }

  getTrayectoria(carrera?: string, anio?: number): Observable<TrayectoriaResponse> {
    let params: any = {};
    if (carrera) params['carrera'] = carrera;
    if (anio) params['anio'] = anio;
    return this.http.get<TrayectoriaResponse>(this.apiUrl, { params });
  }

  exportarPdf(carrera?: string, anio?: number): Observable<Blob> {
    let params: any = {};
    if (carrera) params['carrera'] = carrera;
    if (anio) params['anio'] = anio;
    return this.http.get(`${this.apiUrl}/export/pdf`, { params, responseType: 'blob' });
  }

  exportarExcel(carrera?: string, anio?: number): Observable<Blob> {
    let params: any = {};
    if (carrera) params['carrera'] = carrera;
    if (anio) params['anio'] = anio;
    return this.http.get(`${this.apiUrl}/export/excel`, { params, responseType: 'blob' });
  }
}
