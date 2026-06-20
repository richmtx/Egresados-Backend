import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstadisticasEmpleabilidad {
  kpis: {
    total_egresados: number;
    empleados: number;
    desempleados: number;
    autorizo_contacto: number;
    autorizo_eventos: number;
    satisfaccion_promedio: number;
    titulados: number;
    en_tramite: number;
    no_titulados: number;
  };
  empleabilidadCarrera: {
    nombre_carrera: string;
    total: number | string;
    empleados: number | string;
  }[];
  sectorLaboral: {
    sector: string;
    total: number | string;
  }[];
  topEmpresas: {
    empresa: string;
    total: number | string;
  }[];
  coincidenciaCarrera: {
    nombre_carrera: string;
    coincidencia: string;
    total: number | string;
    porcentaje: number | string;
  }[];
  tiempoEmpleoCarrera: {
    nombre_carrera: string;
    total_egresados: number | string;
    anios_promedio_para_emplearse: number | string;
  }[];
  tiempoEmpleoGeneral: {
    anios_promedio_general: number | string;
  };
  distribucionTiempoEmpleo: {
    nombre_carrera: string;
    id_tiempo: number | string;
    rango: string;
    total: number | string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class EgresadosService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getEstadisticas(carrera?: string, anio?: number): Observable<EstadisticasEmpleabilidad> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EstadisticasEmpleabilidad>(`${this.API_URL}/egresados/estadisticas`, { params });
  }

  exportarPdfEmpleabilidad(carrera?: string, anio?: number): Observable<Blob> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get(`${this.API_URL}/egresados/empleabilidad/export/pdf`, { params, responseType: 'blob' });
  }

  exportarExcelEmpleabilidad(carrera?: string, anio?: number): Observable<Blob> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get(`${this.API_URL}/egresados/empleabilidad/export/excel`, { params, responseType: 'blob' });
  }
}