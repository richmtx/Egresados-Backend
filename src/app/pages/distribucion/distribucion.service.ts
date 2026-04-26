import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KpisGeo {
    total_mapeados: number;
    con_ciudad_trabajo: number;
    en_extranjero: number;
    paises_distintos: number;
    ciudades_trabajo_distintas: number;
}

export interface CiudadTrabajo {
    ciudad_trabajo: string;
    total: number;
}

export interface PaisTrabajo {
    pais: string;
    total: number;
}

export interface ExtranjerDetalle {
    ciudad_trabajo: string;
    pais: string;
    total: number;
}

export interface MovilidadAnio {
    anio_egreso: number;
    total: number;
    fuera_durango: number;
    en_extranjero: number;
    pct_fuera_durango: number;
    pct_extranjero: number;
}

export interface MovilidadCarrera {
    nombre_carrera: string;
    total: number;
    fuera_durango: number;
    pct_fuera_durango: number;
}

export interface DistribucionGeoResponse {
    kpisGeo: KpisGeo;
    topCiudadesTrabajo: CiudadTrabajo[];
    extranjerosPorPais: PaisTrabajo[];
    extranjerosDetalle: ExtranjerDetalle[];
    movilidadPorAnio: MovilidadAnio[];
    movilidadPorCarrera: MovilidadCarrera[];
}

@Injectable({ providedIn: 'root' })
export class DistribucionService {

    private readonly base = 'http://localhost:3000/egresados';

    constructor(private http: HttpClient) { }

    getDistribucion(
        carrera?: string,
        anio?: number,
    ): Observable<DistribucionGeoResponse> {
        let params = new HttpParams();
        if (carrera) params = params.set('carrera', carrera);
        if (anio) params = params.set('anio', String(anio));
        return this.http.get<DistribucionGeoResponse>(
            `${this.base}/distribucion-geografica`,
            { params },
        );
    }
}