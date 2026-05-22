import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardResumen {
    kpis: {
        total_egresados: number;
        pendientes_revision: number;
        tasa_empleo: number;
        satisfaccion_promedio: number;
        pct_titulados: number;
        total_titulados: number;
        total_respondidas: number;
        pct_cobertura: number;
    };
    graficas: {
        porCarrera: { nombre_carrera: string; total: string }[];
        situacionLaboral: { situacion: string; total: string; porcentaje: string }[];
        respuestasPorMes: { mes: string; mes_label: string; total: string }[];
        generosPorAnio: { anio_egreso: number; genero: string; total: string }[];
    };
    actividad: {
        ultimasRespuestas: {
            id_egresado: number;
            nombre_completo: string;
            fecha_registro: string;
            foto_url: string | null;
            revisado: number;
            nombre_carrera: string;
            genero: string | null;
        }[];
        egresadosRecientes: {
            id_egresado: number;
            nombre_completo: string;
            fecha_registro: string;
            foto_url: string | null;
            nombre_carrera: string;
            genero: string | null;
        }[];
        notificaciones: {
            id_notificacion: number;
            tipo: string;
            titulo: string;
            descripcion: string;
            leida: boolean;
            fecha_creacion: string;
        }[];
        totalNotificacionesSinLeer: number;
    };
    periodo: {
        respuestas_este_mes: number;
        respuestas_mes_anterior: number;
        diferencia: number;
        tendencia: 'up' | 'down' | 'equal';
    };
    pendientesDetalle: {
        id_egresado: number;
        nombre_completo: string;
        fecha_registro: string;
        foto_url: string | null;
        nombre_carrera: string;
    }[];
    topDestacados: {
        carrera_top_empleo: { nombre_carrera: string; pct_empleados: string } | null;
        ciudad_top_trabajo: { ciudad_trabajo: string; total: string } | null;
        empresa_top: { empresa: string; total: string } | null;
        anio_top_titulacion: { anio_egreso: number; pct_titulados: string } | null;
    };
    resumenCarrera: {
        nombre_carrera: string;
        total: string;
        pct_empleados: string;
        pct_titulados: string;
        satisfaccion_promedio: string;
    }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly base = `${environment.apiUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    getResumen(): Observable<DashboardResumen> {
        return this.http.get<DashboardResumen>(`${this.base}/resumen`);
    }
}