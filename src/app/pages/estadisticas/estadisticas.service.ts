import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadisticasResponse, FiltrosEstadisticas } from './models/estadisticas.model';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

  private readonly apiUrl = 'http://localhost:3000/egresados/estadisticas';

  constructor(private http: HttpClient) {}

  getEstadisticas(filtros?: FiltrosEstadisticas): Observable<EstadisticasResponse> {
    let params = new HttpParams();

    if (filtros?.carrera) {
      params = params.set('carrera', filtros.carrera);
    }
    if (filtros?.anio) {
      params = params.set('anio', filtros.anio.toString());
    }

    return this.http.get<EstadisticasResponse>(this.apiUrl, { params });
  }
}