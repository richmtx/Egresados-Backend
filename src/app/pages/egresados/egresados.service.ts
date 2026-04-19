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

export interface EgresadoPerfil extends EgresadoDetalle {
  linkedin: string;
  certificacion_vigente: string;
  certificaciones: string[];
  habilidades: string[];
  habilidades_otro: string[];
  colaboraciones: string[];
  colaboraciones_otro: string[];
  coincidencia_laboral: string;
  antiguedad_empleo: string;
  puesto_trabajo: string;
  ciudad_trabajo: string;
  numero_control: string;
  telefono: string;
  ciudad_residencia: string;
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

  getPerfilEgresado(id: number): Observable<EgresadoPerfil> {
    return this.http.get<EgresadoPerfil>(`${this.apiUrl}/egresados/${id}/perfil`);
  }

  deleteEgresado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/egresados/${id}`);
  }
}