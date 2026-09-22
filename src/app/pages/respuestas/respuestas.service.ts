import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Respuesta {
  id_egresado: number;
  nombre_completo: string;
  correo: string;
  telefono: string;
  ciudad_residencia: string;
  anio_ingreso: number | null;
  periodo_ingreso: string | null;
  anio_egreso: number;
  empresa: string | null;
  ciudad_trabajo: string | null;
  fecha_registro: string;
  numero_control: string;
  linkedin: string | null;
  puesto_trabajo: string | null;
  estatus_titulacion: string;
  satisfaccion_formacion: number;
  genero: string;
  nombre_carrera: string;
  nivel_ingles: string;
  antiguedad_empleo: string;
  coincidencia_laboral: string;
  situacion_laboral: string;
  autorizo_estadisticas: boolean;
  autorizo_contacto: boolean;
  autorizo_eventos: boolean;
  revisado: boolean;
  foto_url: string | null;
  fecha_revision: string | null;
  revisado_por: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class RespuestasService {

  private readonly base = `${environment.apiUrl}/egresados`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Respuesta[]> {
    return this.http.get<Respuesta[]>(`${this.base}/detalles`);
  }

  getPerfil(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}/perfil`);
  }

  marcarRevisado(id: number, revisadoPor: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/revisado`, {
      revisado: true,
      revisado_por: revisadoPor,
    });
  }

  getPendientesRevision(): Observable<{ total: number; egresados: any[] }> {
    return this.http.get<{ total: number; egresados: any[] }>(`${this.base}/pendientes-revision`);
  }

  exportarPerfilPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/export/pdf`, {
      responseType: 'blob',
    });
  }
}