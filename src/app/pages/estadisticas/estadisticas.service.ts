import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadisticasResponse, FiltrosEstadisticas } from './models/estadisticas.model';
import { ChartImages, ExportEstadisticasRequest } from './models/estadisticas-export.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

  private readonly apiUrl = `${environment.apiUrl}/egresados/estadisticas`;

  constructor(private http: HttpClient) { }

  getEstadisticas(filtros?: FiltrosEstadisticas): Observable<EstadisticasResponse> {
    let params = new HttpParams();
    if (filtros?.carrera) params = params.set('carrera', filtros.carrera);
    if (filtros?.anio)    params = params.set('anio', filtros.anio.toString());
    return this.http.get<EstadisticasResponse>(this.apiUrl, { params });
  }

  /**
   * Exporta el PDF enviando también las imágenes de las gráficas capturadas
   * en el navegador para que el backend las incruste en el documento.
   */
  exportarPdf(filtros?: FiltrosEstadisticas, chartImages?: ChartImages): Observable<Blob> {
    const body: ExportEstadisticasRequest = {
      carrera:     filtros?.carrera,
      anio:        filtros?.anio,
      chartImages: chartImages ?? {},
    };
    return this.http.post(
      `${this.apiUrl}/export/pdf`,
      body,
      { responseType: 'blob' }
    );
  }

  /**
   * Exporta el Excel enviando también las imágenes de las gráficas capturadas
   * en el navegador para que el backend las incruste en cada hoja.
   */
  exportarExcel(filtros?: FiltrosEstadisticas, chartImages?: ChartImages): Observable<Blob> {
    const body: ExportEstadisticasRequest = {
      carrera:     filtros?.carrera,
      anio:        filtros?.anio,
      chartImages: chartImages ?? {},
    };
    return this.http.post(
      `${this.apiUrl}/export/excel`,
      body,
      { responseType: 'blob' }
    );
  }
}