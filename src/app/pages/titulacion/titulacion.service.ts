import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TitulacionKpis {
  total_egresados: number;
  titulados: number;
  en_tramite: number;
  no_titulados: number;
}

export interface TitulacionCarrera {
  nombre_carrera: string;
  total: number;
  titulados: number;
  en_tramite: number;
  no_titulados: number;
  pct_titulados: number;
  pct_en_tramite: number;
  pct_no_titulados: number;
}

export interface TitulacionAnio {
  anio_egreso: number;
  total: number;
  titulados: number;
  en_tramite: number;
  pct_titulados: number;
}

export interface PosgradoPorTipo {
  tipo_posgrado: string;
  total: number;
}

export interface TotalPosgrado {
  total: number;
}

export interface TitulacionCarreraAnio {
  nombre_carrera: string;
  anio_egreso: number;
  total: number;
  titulados: number;
  en_tramite: number;
  no_titulados: number;
  pct_titulados: number;
}

export interface EstadisticasResponse {
  kpis: TitulacionKpis;
  titulacionAnio: TitulacionAnio[];
  titulacionCarrera: TitulacionCarrera[];
  posgradoPorTipo: PosgradoPorTipo[];
  totalPosgrado: TotalPosgrado;
  titulacionCarreraAnio: TitulacionCarreraAnio[];
}

@Injectable({
  providedIn: 'root'
})
export class TitulacionService {

  private apiUrl = 'http://localhost:3000/egresados/estadisticas';

  constructor(private http: HttpClient) {}

  getEstadisticas(carrera?: string, anio?: number): Observable<EstadisticasResponse> {
    let params: any = {};
    if (carrera) params['carrera'] = carrera;
    if (anio)    params['anio']    = anio;
    return this.http.get<EstadisticasResponse>(this.apiUrl, { params });
  }
}