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

@Injectable({ providedIn: 'root' })
export class DirectorioService {

  private api = `${environment.apiUrl}/egresados/directorio`;

  constructor(private http: HttpClient) { }

  getDirectorio(carrera?: string, anio?: number): Observable<EgresadoDirectorio[]> {
    let params = new HttpParams();
    if (carrera) params = params.set('carrera', carrera);
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<EgresadoDirectorio[]>(this.api, { params });
  }
}