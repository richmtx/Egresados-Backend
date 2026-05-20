import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReporteHistorial {
    id_reporte: number;
    tipo_reporte: string;
    organismo: string;
    carrera: string | null;
    anio: number | null;
    formato: string;
    generado_por: string;
    fecha_generacion: string;
}

export interface DatosReporte {
    organismo: string;
    tipo: string;
    anio: number | null;
    carrera: string;
    secciones: any;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {

    private base = 'http://localhost:3000/reportes';

    constructor(private http: HttpClient) { }

    getDatosTecNM(anio?: number, carrera?: string): Observable<DatosReporte> {
        let params = new HttpParams();
        if (anio) params = params.set('anio', anio.toString());
        if (carrera) params = params.set('carrera', carrera);
        return this.http.get<DatosReporte>(`${this.base}/tecnm`, { params });
    }

    // Los reportes ITD reutilizan el mismo endpoint de datos consolidados
    getDatosITD(anio?: number, carrera?: string): Observable<DatosReporte> {
        let params = new HttpParams();
        if (anio) params = params.set('anio', anio.toString());
        if (carrera) params = params.set('carrera', carrera);
        return this.http.get<DatosReporte>(`${this.base}/tecnm`, { params });
    }

    getHistorial(): Observable<ReporteHistorial[]> {
        return this.http.get<ReporteHistorial[]>(`${this.base}/historial`);
    }

    registrarEnHistorial(dto: {
        tipo_reporte: string;
        organismo: string;
        carrera?: string;
        anio?: number;
        formato: string;
        generado_por?: string;
    }): Observable<ReporteHistorial> {
        return this.http.post<ReporteHistorial>(`${this.base}/historial`, dto);
    }

    eliminarDelHistorial(id: number): Observable<{ mensaje: string }> {
        return this.http.delete<{ mensaje: string }>(`${this.base}/historial/${id}`);
    }
}