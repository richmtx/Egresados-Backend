import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EgresadoDirectorio {
  id_egresado: number;
  nombre_completo: string;
  foto_url: string | null;
  genero: string | null;
  nombre_carrera: string;
  anio_egreso: number;
  estatus_titulacion: 'Titulado' | 'No titulado' | 'En trámite';
  sector_trabajo: string;
  empresa: string | null;
  puesto_trabajo: string | null;
  antiguedad_empleo: string | null;
  coincidencia_laboral: string | null;
  ciudad_trabajo: string | null;
  ciudad_residencia: string;
  linkedin: string | null;
  nivel_ingles: string;
  satisfaccion_formacion: number | null;
  certificaciones: string[];
  interes_colaborar: string[];
}

export interface DirectorioResponse {
  data: EgresadoDirectorio[];
  total: number;
}

export interface DirectorioFiltros {
  carreras: string[];
  anios: number[];
}

export interface DirectorioParams {
  page: number;
  limit: number;
  busqueda?: string;
  carrera?: string;
  anio?: number;
  titulacion?: string;
}

@Injectable({ providedIn: 'root' })
export class DirectorioService {

  private api = `${environment.apiUrl}/egresados/directorio`;

  constructor(private http: HttpClient) { }

  getDirectorio(params: DirectorioParams): Observable<DirectorioResponse> {
    let p = new HttpParams()
      .set('page', params.page.toString())
      .set('limit', params.limit.toString());
    if (params.busqueda)   p = p.set('busqueda', params.busqueda);
    if (params.carrera)    p = p.set('carrera', params.carrera);
    if (params.anio)       p = p.set('anio', params.anio.toString());
    if (params.titulacion) p = p.set('titulacion', params.titulacion);
    return this.http.get<DirectorioResponse>(this.api, { params: p });
  }

  getFiltros(): Observable<DirectorioFiltros> {
    return this.http.get<DirectorioFiltros>(`${this.api}/filtros`);
  }
}
