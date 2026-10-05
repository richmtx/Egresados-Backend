import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type EstadoVariante = 'pendiente' | 'fusionado' | 'descartado';

// 1. POST /admin/empresas/detectar
export interface DeteccionEmpresas {
  /** Grupos (claves) con más de un texto distinto en esta corrida */
  grupos: number;
  grupos_empresa: number;
  grupos_primer_empleo: number;
  variantes: number;
  variantes_nuevas: number;
  variantes_actualizadas: number;
  /** Variantes ya fusionadas o descartadas que el detector no tocó */
  variantes_respetadas: number;
  variantes_eliminadas: number;
  total_pendientes: number;
}

// 2. GET /admin/empresas/candidatos
export interface VarianteEmpresa {
  id_empresa_candidato: number;
  /** Texto crudo, tal como lo escribió la persona: espacios incluidos */
  nombre_variante: string;
  ocurrencias_empresa: number;
  ocurrencias_primer_empleo: number;
  estado: EstadoVariante;
  empresa_id?: number | null;
  /** Empresa del catálogo a la que quedó ligada (solo fusionadas) */
  empresa_nombre?: string | null;
  revisado_por?: string | null;
  revisado_en?: string | null;
}

export interface GrupoEmpresa {
  nombre_clave: string;
  nombre_sugerido: string;
  variantes: VarianteEmpresa[];
}

// 3. POST /admin/empresas/fusionar
export interface FusionarEmpresasPeticion {
  nombre_canonico: string;
  /** Textos crudos exactos; la API los compara sin recortar */
  variantes: string[];
}

export interface FusionEmpresasResultado {
  empresa: { id_empresa: number; nombre: string; creada: boolean };
  egresados_ligados: { empresa: number; primer_empleo: number };
}

// 4. GET /admin/empresas
export interface EmpresaCatalogo {
  id_empresa: number;
  nombre: string;
  creado_en?: string | null;
  egresados_empresa: number;
  egresados_primer_empleo: number;
}

// 5. GET /admin/empresas/textos (fusión manual)
export interface TextoEmpresa {
  /** Texto crudo exacto, sin recortar */
  texto: string;
  ocurrencias_empresa: number;
  ocurrencias_primer_empleo: number;
  /** Lleno si el texto ya está ligado al catálogo */
  empresa_id: number | null;
  empresa_nombre: string | null;
}

export interface TextosEmpresa {
  textos: TextoEmpresa[];
  /** Textos que coinciden con la búsqueda, no solo los que vienen en `textos` */
  total: number;
  limite: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresasService {

  private apiUrl = `${environment.apiUrl}/admin/empresas`;

  constructor(private http: HttpClient) { }

  /** Solo PROPONE variantes; nunca liga egresados por su cuenta. */
  detectar(): Observable<DeteccionEmpresas> {
    return this.http.post<DeteccionEmpresas>(`${this.apiUrl}/detectar`, {});
  }

  listarCandidatos(estado: EstadoVariante): Observable<GrupoEmpresa[]> {
    const params = new HttpParams().set('estado', estado);
    return this.http.get<GrupoEmpresa[] | { grupos: GrupoEmpresa[] }>(`${this.apiUrl}/candidatos`, { params })
      .pipe(map(r => Array.isArray(r) ? r : r?.grupos ?? []));
  }

  /** Liga los egresados al catálogo. No modifica el texto que escribió la persona. */
  fusionar(peticion: FusionarEmpresasPeticion): Observable<FusionEmpresasResultado> {
    return this.http.post<FusionEmpresasResultado>(`${this.apiUrl}/fusionar`, peticion);
  }

  /** Marca UNA variante como "no es la misma empresa". No borra nada. */
  descartar(idCandidato: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/candidatos/${idCandidato}/descartar`, {});
  }

  listarCatalogo(busqueda?: string): Observable<EmpresaCatalogo[]> {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<EmpresaCatalogo[] | { empresas: EmpresaCatalogo[] }>(this.apiUrl, { params })
      .pipe(map(r => Array.isArray(r) ? r : r?.empresas ?? []));
  }

  /** 409 si tiene egresados ligados. */
  eliminar(idEmpresa: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${idEmpresa}`);
  }

  /** Regresa a pendientes una variante descartada. 409 si ya está fusionada, 404 si no existe. */
  reactivar(idCandidato: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/candidatos/${idCandidato}/reactivar`, {});
  }

  /**
   * Textos de empresa de las dos columnas, con sus conteos. La búsqueda la
   * resuelve el servidor. La API rechaza con 400 un `limite` mayor a 500.
   */
  listarTextos(busqueda: string | undefined, limite: number): Observable<TextosEmpresa> {
    let params = new HttpParams().set('limite', limite);
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<TextosEmpresa>(`${this.apiUrl}/textos`, { params });
  }
}
