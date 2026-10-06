import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EgresadoDetalle {
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
  foto_url: string | null;
}

export interface EstudioPosterior {
  nivel: string;
  nombre_programa: string;
  institucion: string;
  estado: string;
  anio: number | null;
}

export interface Emprendimiento {
  nombre: string;
  giro: string;
  anio_inicio: number | null;
  sigue_operando: boolean;
  rango_empleados: string | null;
}

export interface ProyectoSocial {
  nombre: string;
  tipo: string;
  anio: number | null;
  organizacion: string | null;
}

export interface EgresadoPerfil extends EgresadoDetalle {
  linkedin: string | null;
  certificaciones: string[];
  habilidades: string[];
  habilidades_otro: string[];
  colaboraciones: string[];
  colaboraciones_otro: string[];
  coincidencia_laboral: string;
  antiguedad_empleo: string;
  puesto_trabajo: string | null;
  ciudad_trabajo: string | null;
  numero_control: string;
  telefono: string;
  ciudad_residencia: string;
  foto_url: string | null;

  // ── Redes sociales (Datos personales) ──
  facebook: string | null;
  instagram: string | null;

  // ── Primer empleo (Situación laboral) ──
  tiempo_primer_empleo: string | null;
  medio_primer_empleo: string | null;
  primer_empleo_empresa: string | null;
  primer_empleo_puesto: string | null;

  // ── Datos personales ──
  pais_nacimiento: string | null;

  // ── Trayectoria adicional ──
  estudios: EstudioPosterior[];
  emprendimientos: Emprendimiento[];
  proyectos_sociales: ProyectoSocial[];
}

/** Respuesta de GET /egresados/:id/resumen-eliminacion (solo admin). */
export interface ResumenEliminacion {
  egresado: {
    id_egresado: number;
    nombre_completo: string;
    /** Puede venir null o con el texto 'Desconocido' */
    numero_control: string | null;
    carrera: string | null;
    anio_egreso: number | null;
    /** null cuando no tiene empleo registrado */
    empresa: string | null;
    situacion_laboral: string | null;
  };
  /** Los conteos ya vienen como number. Habilidades y colaboraciones incluyen el texto libre. */
  perdidas: {
    habilidades: number;
    colaboraciones: number;
    certificaciones: number;
    estudios: number;
    emprendimientos: number;
    proyectos_sociales: number;
    datos_sensibles: boolean;
  };
  avisos: {
    en_par_duplicado_pendiente: boolean;
    /** Empresa del catálogo a la que está ligado; null si no aplica */
    empresa_catalogo: string | { nombre: string } | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EgresadosService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getEgresadosDetalle(): Observable<EgresadoDetalle[]> {
    return this.http.get<EgresadoDetalle[]>(`${this.apiUrl}/egresados/detalles`);
  }

  getPerfilEgresado(id: number): Observable<EgresadoPerfil> {
    return this.http.get<EgresadoPerfil>(`${this.apiUrl}/egresados/${id}/perfil`);
  }

  getResumenEliminacion(id: number): Observable<ResumenEliminacion> {
    return this.http.get<ResumenEliminacion>(`${this.apiUrl}/egresados/${id}/resumen-eliminacion`);
  }

  deleteEgresado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/egresados/${id}`);
  }

  exportarPdf(filtros: {
    nombre?: string;
    empresa?: string;
    carrera?: string;
    anio?: string;
    situacion_laboral?: string;
    estatus_titulacion?: string;
    autorizo_contacto?: boolean;
    autorizo_eventos?: boolean;
    autorizo_estadisticas?: boolean;
  }): Observable<Blob> {
    const params = this.buildParams(filtros);
    return this.http.get(`${this.apiUrl}/egresados/export/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  exportarExcel(filtros: {
    nombre?: string;
    empresa?: string;
    carrera?: string;
    anio?: string;
    situacion_laboral?: string;
    estatus_titulacion?: string;
    autorizo_contacto?: boolean;
    autorizo_eventos?: boolean;
    autorizo_estadisticas?: boolean;
  }): Observable<Blob> {
    const params = this.buildParams(filtros);
    return this.http.get(`${this.apiUrl}/egresados/export/excel`, {
      params,
      responseType: 'blob',
    });
  }

  private buildParams(filtros: Record<string, any>): Record<string, string> {
    const params: Record<string, string> = {};
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });
    return params;
  }

  exportarPerfilPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/egresados/${id}/export/pdf`, {
      responseType: 'blob',
    });
  }

  enviarCorreo(destinatariosEgresados: string[], asunto: string, mensaje: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/correo/enviar`, {
      // El correo institucional va visible en "Para" (remitente visible)
      destinatarios: [environment.correoInstitucional],
      // Todos los egresados van ocultos entre sí
      bcc: destinatariosEgresados,
      asunto,
      mensaje,
    });
  }
}