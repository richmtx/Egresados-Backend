import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Conteo ya convertido a número.
 * null = oculto por el umbral de privacidad del backend (NO es cero ni error).
 */
export type Conteo = number | null;

/** MySQL entrega los conteos como string; null llega cuando el grupo está oculto. */
export type ConteoRaw = string | null;

/**
 * Convierte un conteo del backend preservando el null.
 * Number(null) === 0, y aquí un 0 falso sería un error grave: oculto ≠ cero.
 * Un valor no numérico también se trata como oculto, nunca como 0.
 */
export const aConteo = (v: ConteoRaw | undefined): Conteo => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

/** Envoltorio común de los endpoints de inclusión */
export interface InclusionResponse<T> {
  umbral: number;
  nota: string;
  datos: T;
}

// 1. /inclusion/resumen
export interface InclusionResumenDatos {
  total_egresados: ConteoRaw;
  consintieron: ConteoRaw;
  no_consintieron: ConteoRaw;
  personas_con_discapacidad: ConteoRaw;
  se_consideran_indigenas: ConteoRaw;
  hablan_lengua_indigena: ConteoRaw;
  se_consideran_afromexicanos: ConteoRaw;
  nacidos_fuera_de_mexico: ConteoRaw;
}

// 2. /inclusion/discapacidad-por-dominio
export interface GradoDiscapacidad {
  grado: string;
  descripcion: string;
  total: ConteoRaw;
}

export interface DominioDiscapacidad {
  dominio: string;
  pregunta: string;
  grados: GradoDiscapacidad[];
}

// 3. /inclusion/por-carrera
export interface InclusionCarrera {
  carrera: string;
  personas_con_discapacidad: ConteoRaw;
  se_consideran_indigenas: ConteoRaw;
  se_consideran_afromexicanos: ConteoRaw;
}

// 4. /inclusion/por-anio-egreso
export interface InclusionAnio {
  anio_egreso: number;
  personas_con_discapacidad: ConteoRaw;
  se_consideran_indigenas: ConteoRaw;
  se_consideran_afromexicanos: ConteoRaw;
}

@Injectable({
  providedIn: 'root'
})
export class InclusionService {

  private apiUrl = `${environment.apiUrl}/inclusion`;

  constructor(private http: HttpClient) { }

  getResumen(): Observable<InclusionResponse<InclusionResumenDatos>> {
    return this.http.get<InclusionResponse<InclusionResumenDatos>>(`${this.apiUrl}/resumen`);
  }

  getDiscapacidadPorDominio(): Observable<InclusionResponse<DominioDiscapacidad[]>> {
    return this.http.get<InclusionResponse<DominioDiscapacidad[]>>(`${this.apiUrl}/discapacidad-por-dominio`);
  }

  getPorCarrera(): Observable<InclusionResponse<InclusionCarrera[]>> {
    return this.http.get<InclusionResponse<InclusionCarrera[]>>(`${this.apiUrl}/por-carrera`);
  }

  getPorAnioEgreso(): Observable<InclusionResponse<InclusionAnio[]>> {
    return this.http.get<InclusionResponse<InclusionAnio[]>>(`${this.apiUrl}/por-anio-egreso`);
  }
}
