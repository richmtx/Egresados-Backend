import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EgresadoDetalle {
  id_egresado: number;
  nombre_completo: string;
  correo: string;
  telefono: string;
  ciudad_residencia: string;
  anio_egreso: number;
  empresa: string;
  ciudad_trabajo: string;
  fecha_registro: string;
  numero_control: string;
  linkedin: string;
  puesto_trabajo: string;
  estatus_titulacion: string;
  satisfaccion_formacion: number;
  genero: string;
  nombre_carrera: string;
  nivel_ingles: string;
  antiguedad_empleo: string;
  coincidencia_laboral: string;
  situacion_laboral: string;
  certificacion_vigente: string;
  autorizo_estadisticas: boolean;
  autorizo_contacto: boolean;
  autorizo_eventos: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EgresadosService {

  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  getEgresadosDetalle(): Observable<EgresadoDetalle[]> {
    return this.http.get<EgresadoDetalle[]>(`${this.apiUrl}/egresados/detalles`);
  }

  deleteEgresado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/egresados/${id}`);
  }
}