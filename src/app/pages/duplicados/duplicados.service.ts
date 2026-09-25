import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoCandidato = 'pendiente' | 'confirmado' | 'descartado';

// 1. /duplicados/resumen
export interface DuplicadosResumen {
  pendientes: number;
  confirmados: number;
  descartados: number;
  /** Egresados distintos que aparecen en algún par PENDIENTE */
  egresados_involucrados: number;
  /** ISO; null si nunca se ha corrido la detección */
  ultima_deteccion: string | null;
}

// 2. POST /duplicados/detectar
export interface DeteccionResultado {
  total_egresados: number;
  pares_evaluados: number;
  candidatos_nuevos: number;
  candidatos_actualizados: number;
  /** Pares ya decididos por un admin que el detector no tocó */
  candidatos_respetados: number;
  candidatos_eliminados: number;
  total_pendientes: number;
}

// 3. GET /duplicados
export interface EgresadoDuplicado {
  id_egresado: number;
  nombre_completo: string | null;
  correo: string | null;
  telefono: string | null;
  numero_control: string | null;
  nombre_carrera: string | null;
  anio_ingreso: number | null;
  anio_egreso: number | null;
  fecha_registro: string | null;
  registro_completo: boolean;
  revisado: boolean;
}

export interface CandidatoDuplicado {
  id_candidato: number;
  id_egresado_a: number;
  id_egresado_b: number;
  score: number;
  /** Etiquetas legibles de las señales encendidas, listas para mostrar */
  senales: string[];
  coincide_num_control: boolean;
  coincide_correo: boolean;
  coincide_telefono: boolean;
  coincide_nombre: boolean;
  coincide_carrera: boolean;
  similitud_nombre: number;
  diferencia_anios: number | null;
  estado: EstadoCandidato;
  detectado_en: string;
  revisado_por: string | null;
  revisado_en: string | null;
  notas: string | null;
  egresado_a: EgresadoDuplicado | null;
  egresado_b: EgresadoDuplicado | null;
}

/** Un caso: componente conectado de pares (A~B, B~C => un solo grupo) */
export interface GrupoDuplicado {
  ids: number[];
  score_max: number;
  candidatos: CandidatoDuplicado[];
  egresados: EgresadoDuplicado[];
}

export interface ListaDuplicados {
  grupos: GrupoDuplicado[];
  /** Total de GRUPOS (no de pares) */
  total: number;
}

// 4. PATCH /duplicados/:id/descartar
export interface DescarteResultado {
  mensaje: string;
  id_candidato: number;
}

// 5. POST /duplicados/fusionar
export interface FusionarPeticion {
  id_egresado_conservado: number;
  ids_eliminados: number[];
  notas?: string;
}

export interface FusionarResultado {
  mensaje: string;
  id_egresado_conservado: number;
  fusiones: {
    id_fusion: number;
    id_egresado_eliminado: number;
    id_candidato: number;
    hijos_reasignados: Record<string, number>;
    hijos_no_movidos: Record<string, number>;
    campos_completados: Record<string, unknown>;
  }[];
}

// 6. /duplicados/fusiones y /duplicados/fusiones/:id
export interface Fusion {
  id_fusion: number;
  /** null si el conservado ya no existe */
  id_egresado_conservado: number | null;
  nombre_conservado: string | null;
  id_egresado_eliminado: number;
  nombre_eliminado: string;
  correo_eliminado: string;
  numero_control_eliminado: string;
  hijos_reasignados: Record<string, number> | null;
  campos_completados: Record<string, unknown> | null;
  id_candidato: number | null;
  fusionado_por: string | null;
  fusionado_en: string;
  notas: string | null;
}

export interface ListaFusiones {
  fusiones: Fusion[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DuplicadosService {

  private apiUrl = `${environment.apiUrl}/duplicados`;

  constructor(private http: HttpClient) { }

  getResumen(): Observable<DuplicadosResumen> {
    return this.http.get<DuplicadosResumen>(`${this.apiUrl}/resumen`);
  }

  /** Solo PROPONE pares; nunca fusiona ni borra. */
  detectar(): Observable<DeteccionResultado> {
    return this.http.post<DeteccionResultado>(`${this.apiUrl}/detectar`, {});
  }

  listar(estado: EstadoCandidato, limit = 50, offset = 0, carrera?: string): Observable<ListaDuplicados> {
    let params = new HttpParams()
      .set('estado', estado)
      .set('limit', limit)
      .set('offset', offset);
    if (carrera) params = params.set('carrera', carrera);
    return this.http.get<ListaDuplicados>(this.apiUrl, { params });
  }

  /** Marca UN par como personas distintas. No borra nada. */
  descartar(idCandidato: number, notas?: string): Observable<DescarteResultado> {
    return this.http.patch<DescarteResultado>(`${this.apiUrl}/${idCandidato}/descartar`, notas ? { notas } : {});
  }

  /** BORRA los ids_eliminados tras mover sus datos al conservado. Irreversible desde el sistema. */
  fusionar(peticion: FusionarPeticion): Observable<FusionarResultado> {
    return this.http.post<FusionarResultado>(`${this.apiUrl}/fusionar`, peticion);
  }

  listarFusiones(limit = 20, offset = 0): Observable<ListaFusiones> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<ListaFusiones>(`${this.apiUrl}/fusiones`, { params });
  }

  getFusion(id: number): Observable<Fusion> {
    return this.http.get<Fusion>(`${this.apiUrl}/fusiones/${id}`);
  }
}
