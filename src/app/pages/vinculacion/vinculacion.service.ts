import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EgresadoContacto {
  id_egresado: number;
  nombre_completo: string;
  correo: string;
  telefono: string;
  nombre_carrera: string;
  genero: string;
  descripcion_otro?: string;   // solo en los endpoints de "Otro"
}

export interface TotalColaboracion {
  descripcion: string;   // '__otro__' para el registro especial
  total: number;
}

export interface TotalHabilidad {
  habilidad: string;     // '__otro__' para el registro especial
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class VinculacionService {

  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getEstadisticas(carrera?: string, anio?: number): Observable<any> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<any>(`${this.apiUrl}/egresados/estadisticas`, { params });
  }

  // ── Totales pre-cargados ──────────────────────────────────────────────────
  getTotalesColaboraciones(): Observable<TotalColaboracion[]> {
    return this.http.get<TotalColaboracion[]>(
      `${this.apiUrl}/egresados/vinculacion/totales-colaboraciones`
    );
  }

  getTotalesHabilidades(): Observable<TotalHabilidad[]> {
    return this.http.get<TotalHabilidad[]>(
      `${this.apiUrl}/egresados/vinculacion/totales-habilidades`
    );
  }

  // ── Egresados por categoría fija ──────────────────────────────────────────
  getEgresadosPorColaboracion(tipo: string): Observable<EgresadoContacto[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/colaboracion`, { params }
    );
  }

  getEgresadosPorHabilidad(tipo: string): Observable<EgresadoContacto[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/habilidad`, { params }
    );
  }

  getEgresadosPorAutorizacion(
    tipo: 'estadisticas' | 'contacto' | 'eventos'
  ): Observable<EgresadoContacto[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/autorizacion`, { params }
    );
  }

  // ── Egresados con respuesta "Otro" ────────────────────────────────────────
  getEgresadosColaboracionOtro(): Observable<EgresadoContacto[]> {
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/colaboracion-otro`
    );
  }

  getEgresadosHabilidadOtro(): Observable<EgresadoContacto[]> {
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/habilidad-otro`
    );
  }

  getDistribucionSatisfaccion(): Observable<{ nivel: number; total: number }[]> {
    return this.http.get<{ nivel: number; total: number }[]>(
      `${this.apiUrl}/egresados/vinculacion/distribucion-satisfaccion`
    );
  }
}