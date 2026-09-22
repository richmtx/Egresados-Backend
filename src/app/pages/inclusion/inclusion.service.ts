import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Conteo ya convertido a número.
 * null = oculto por el umbral de privacidad del backend (NO es cero ni error).
 */
export type Conteo = number | null;

/**
 * MySQL entrega los conteos como string; algunos endpoints (p.ej. lengua_indigena)
 * ya los mandan como number. null llega cuando el grupo está oculto.
 */
export type ConteoRaw = string | number | null;

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

// Bloque de cobertura temporal: totales exactos, SIN umbral de privacidad
export interface DecadaCobertura {
  etiqueta: string;
  desde: number;
  hasta: number;
  total: ConteoRaw;
}

export interface CoberturaInclusion {
  anio_min: number;
  anio_max: number;
  decadas: DecadaCobertura[];
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
  cobertura: CoberturaInclusion;
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
  /** Conteo exacto, sin umbral de privacidad */
  consintieron: ConteoRaw;
  personas_con_discapacidad: ConteoRaw;
  se_consideran_indigenas: ConteoRaw;
  se_consideran_afromexicanos: ConteoRaw;
}

// 4. /inclusion/por-anio-egreso
export interface InclusionAnio {
  anio_egreso: number;
  /** Conteo exacto, sin umbral de privacidad */
  consintieron: ConteoRaw;
  personas_con_discapacidad: ConteoRaw;
  se_consideran_indigenas: ConteoRaw;
  se_consideran_afromexicanos: ConteoRaw;
}

// 5. /inclusion/identidad-por-pregunta
export interface RespuestaIdentidad {
  clave: string;
  descripcion: string;
  total: ConteoRaw;
}

export interface PreguntaIdentidad {
  pregunta_clave: string;
  pregunta: string;
  respuestas: RespuestaIdentidad[];
}

export interface LenguaIndigena {
  lengua: string;
  total: ConteoRaw;
}

/** Este endpoint no usa el envoltorio InclusionResponse<T>: lengua_indigena va junto a datos, no dentro. */
export interface IdentidadPorPreguntaResponse {
  umbral: number;
  nota: string;
  datos: PreguntaIdentidad[];
  lengua_indigena: LenguaIndigena[];
}

// 6. /inclusion/consentimiento/:id (solo admin)
// Solo indica si hubo consentimiento; NUNCA incluye las respuestas de discapacidad ni identidad.
export interface ConsentimientoInclusion {
  id_egresado: number;
  consintio: boolean;
  fecha_consentimiento: string | null;
}

export interface RetiroConsentimientoResponse {
  mensaje: string;
  filas_eliminadas: number;
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

  getIdentidadPorPregunta(): Observable<IdentidadPorPreguntaResponse> {
    return this.http.get<IdentidadPorPreguntaResponse>(`${this.apiUrl}/identidad-por-pregunta`);
  }

  getConsentimiento(id: number): Observable<ConsentimientoInclusion> {
    return this.http.get<ConsentimientoInclusion>(`${this.apiUrl}/consentimiento/${id}`);
  }

  /** Elimina las respuestas de discapacidad e identidad cultural; el resto del registro no se toca. */
  retirarConsentimiento(id: number): Observable<RetiroConsentimientoResponse> {
    return this.http.delete<RetiroConsentimientoResponse>(`${this.apiUrl}/consentimiento/${id}`);
  }

  /** Solo admin. Documento imprimible con el resumen de inclusión. */
  exportarPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/pdf`, { responseType: 'blob' });
  }

  /** Solo admin. Hoja de cálculo .xlsx con el resumen de inclusión. */
  exportarExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/excel`, { responseType: 'blob' });
  }
}
