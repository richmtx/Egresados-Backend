import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KpiGenero {
  genero: string;
  total: number;
  porcentaje: number;
}

export interface ProporcionCarreraGenero {
  nombre_carrera: string;
  genero: string;
  total: number;
  porcentaje: number;
}

export interface EgresoAnioGenero {
  anio_egreso: number;
  genero: string;
  total: number;
  porcentaje_en_anio: number;
}

export interface ComposicionCarreraGenero {
  nombre_carrera: string;
  genero: string;
  total: number;
  porcentaje: number;
}

export interface EmpleabilidadGenero {
  genero: string;
  total: number;
  empleados: number;
  desempleados: number;
  pct_empleados: number;
  satisfaccion_promedio: number;
}

export interface SectorLaboralGenero {
  genero: string;
  sector: string;
  total: number;
  porcentaje: number;
}

export interface CoincidenciaLaboralGenero {
  genero: string;
  coincidencia: string;
  total: number;
  porcentaje: number;
}

export interface TiempoEmpleoGenero {
  genero: string;
  tiempo_promedio_anios: number;
}

export interface GeografiaGenero {
  genero: string;
  total: number;
  en_durango: number;
  fuera_durango_mexico: number;
  en_extranjero: number;
  pct_fuera_durango: number;
}

export interface TopCiudadesGenero {
  genero: string;
  ciudad_trabajo: string;
  total: number;
}

export interface TitulacionGenero {
  genero: string;
  total: number;
  titulados: number;
  en_tramite: number;
  no_titulados: number;
  pct_titulados: number;
  pct_en_tramite: number;
  pct_no_titulados: number;
}

export interface TitulacionAnioGenero {
  anio_egreso: number;
  genero: string;
  total: number;
  titulados: number;
  pct_titulados: number;
}

export interface PosgradoGenero {
  genero: string;
  total: number;
}

export interface PosgradoTipoGenero {
  genero: string;
  tipo_posgrado: string;
  total: number;
  porcentaje: number;
}

export interface InglesGenero {
  genero: string;
  nivel: string;
  total: number;
  porcentaje: number;
}

export interface SatisfaccionGenero {
  genero: string;
  promedio: number;
  total: number;
  muy_satisfecho: number;
  satisfecho: number;
  neutral: number;
  insatisfecho: number;
  muy_insatisfecho: number;
}

export interface HabilidadesGenero {
  genero: string;
  habilidad: string;
  total: number;
  porcentaje: number;
}

export interface EstadisticasGeneroResponse {
  kpisGenero: KpiGenero[];
  proporcionCarreraGenero: ProporcionCarreraGenero[];
  egresoAnioGenero: EgresoAnioGenero[];
  composicionCarreraGenero: ComposicionCarreraGenero[];
  empleabilidadGenero: EmpleabilidadGenero[];
  sectorLaboralGenero: SectorLaboralGenero[];
  coincidenciaLaboralGenero: CoincidenciaLaboralGenero[];
  tiempoEmpleoGenero: TiempoEmpleoGenero[];
  geografiaGenero: GeografiaGenero[];
  topCiudadesGenero: TopCiudadesGenero[];
  titulacionGenero: TitulacionGenero[];
  titulacionAnioGenero: TitulacionAnioGenero[];
  posgradoGenero: PosgradoGenero[];
  posgradoTipoGenero: PosgradoTipoGenero[];
  inglesGenero: InglesGenero[];
  satisfaccionGenero: SatisfaccionGenero[];
  habilidadesGenero: HabilidadesGenero[];
}

@Injectable({
  providedIn: 'root'
})
export class GenerosService {

  private readonly baseUrl = 'http://localhost:3000/egresados';

  constructor(private http: HttpClient) {}

  getEstadisticasGenero(
    carrera?: string,
    anio?: number
  ): Observable<EstadisticasGeneroResponse> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio)    params = params.set('anio', anio.toString());

    return this.http.get<EstadisticasGeneroResponse>(
      `${this.baseUrl}/estadisticas/genero`,
      { params }
    );
  }
}