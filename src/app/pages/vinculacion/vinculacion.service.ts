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
  descripcion_otro?: string;
}

export interface TotalColaboracion {
  descripcion: string;
  total: number;
}

export interface TotalHabilidad {
  habilidad: string;
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

  // Totales pre-cargados
  getTotalesColaboraciones(carrera?: string, anio?: number): Observable<TotalColaboracion[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<TotalColaboracion[]>(
      `${this.apiUrl}/egresados/vinculacion/totales-colaboraciones`, { params }
    );
  }

  getTotalesHabilidades(carrera?: string, anio?: number): Observable<TotalHabilidad[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<TotalHabilidad[]>(
      `${this.apiUrl}/egresados/vinculacion/totales-habilidades`, { params }
    );
  }

  // Egresados por categoría fija
  getEgresadosPorColaboracion(tipo: string, carrera?: string, anio?: number): Observable<EgresadoContacto[]> {
    let params = new HttpParams().set('tipo', tipo);
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/colaboracion`, { params }
    );
  }

  getEgresadosPorHabilidad(tipo: string, carrera?: string, anio?: number): Observable<EgresadoContacto[]> {
    let params = new HttpParams().set('tipo', tipo);
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/habilidad`, { params }
    );
  }

  getEgresadosPorAutorizacion(
    tipo: 'estadisticas' | 'contacto' | 'eventos',
    carrera?: string,
    anio?: number,
  ): Observable<EgresadoContacto[]> {
    let params = new HttpParams().set('tipo', tipo);
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/autorizacion`, { params }
    );
  }

  getEgresadosColaboracionOtro(carrera?: string, anio?: number): Observable<EgresadoContacto[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/colaboracion-otro`, { params }
    );
  }

  getEgresadosHabilidadOtro(carrera?: string, anio?: number): Observable<EgresadoContacto[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoContacto[]>(
      `${this.apiUrl}/egresados/vinculacion/habilidad-otro`, { params }
    );
  }

  getDistribucionSatisfaccion(carrera?: string, anio?: number): Observable<{ nivel: number; total: number }[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<{ nivel: number; total: number }[]>(
      `${this.apiUrl}/egresados/vinculacion/distribucion-satisfaccion`, { params }
    );
  }

  getCarrerasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/egresados/vinculacion/carreras`);
  }

  getAniosDisponibles(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/egresados/vinculacion/anios`);
  }
}