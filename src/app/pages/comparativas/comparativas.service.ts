import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ComparativaResumen {
    nombre_carrera: string;
    total: number;
    pct_empleados: number;
    pct_titulados: number;
    satisfaccion_promedio: number;
    pct_fuera_durango: number;
}

export interface ComparativaEmpleo {
    nombre_carrera: string;
    total: number;
    empleados: number;
    desempleados: number;
    pct_empleados: number;
}

export interface ComparativaTitulacion {
    nombre_carrera: string;
    total: number;
    titulados: number;
    en_tramite: number;
    no_titulados: number;
    pct_titulados: number;
    pct_en_tramite: number;
    pct_no_titulados: number;
}

export interface ComparativaSectorCarrera {
    nombre_carrera: string;
    sector: string;
    total: number;
    porcentaje: number;
}

export interface ComparativaIngles {
    nombre_carrera: string;
    nivel: string;
    total: number;
    porcentaje: number;
}

export interface ComparativaSatisfaccion {
    nombre_carrera: string;
    promedio: number;
    promedio_pct: number;
    total: number;
    muy_satisfecho: number;
    satisfecho: number;
    neutral: number;
    insatisfecho: number;
    muy_insatisfecho: number;
}

export interface ComparativaMigracion {
    nombre_carrera: string;
    total: number;
    en_durango: number;
    fuera_durango_mexico: number;
    en_extranjero: number;
    pct_fuera_durango: number;
    pct_extranjero: number;
}

export interface ComparativasResponse {
    carreras: string[];
    resumen: ComparativaResumen[];
    empleo: ComparativaEmpleo[];
    titulacion: ComparativaTitulacion[];
    sectorCarrera: ComparativaSectorCarrera[];
    ingles: ComparativaIngles[];
    satisfaccion: ComparativaSatisfaccion[];
    migracion: ComparativaMigracion[];
}

export interface CarrerasDisponiblesResponse {
    nombre_carrera: string;
}

@Injectable({
    providedIn: 'root'
})
export class ComparativasService {

    private readonly base = 'http://localhost:3000';

    constructor(private http: HttpClient) { }

    getCarrerasDisponibles(): Observable<CarrerasDisponiblesResponse[]> {
        return this.http.get<CarrerasDisponiblesResponse[]>(`${this.base}/carreras`);
    }

    getComparativas(carreras: string[]): Observable<ComparativasResponse> {
        const params = new HttpParams().set('carreras', carreras.join(','));
        return this.http.get<ComparativasResponse>(`${this.base}/egresados/comparativas`, { params });
    }
}