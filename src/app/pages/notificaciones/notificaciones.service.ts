import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id_notificacion: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  leida: boolean;
  fecha_creacion: string;
  id_egresado: number | null;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {

  private readonly api = `${environment.apiUrl}/notificaciones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(this.api);
  }

  marcarLeida(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/leer`, {});
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.patch<void>(`${this.api}/marcar-todas`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  eliminarLeidas(): Observable<void> {
    return this.http.delete<void>(`${this.api}/leidas`);
  }

  eliminarTodas(): Observable<void> {
    return this.http.delete<void>(`${this.api}/todas`);
  }
}
