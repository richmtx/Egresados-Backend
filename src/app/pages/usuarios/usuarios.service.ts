import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
    id_usuario: number;
    usuario: string;
    nombre_completo: string;
    rol: 'admin' | 'invitado';
    estado: 'activo' | 'inactivo';
    ultimo_acceso: string | null;
    fecha_creacion: string;
}

export interface HistorialItem {
    id_historial: number;
    usuario: { id_usuario: number; usuario: string; nombre_completo: string };
    accion: string;
    descripcion: string;
    seccion: string;
    fecha_accion: string;
}

export interface CrearInvitadoResponse {
    usuario: Usuario;
    contrasena_temporal: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {

    private base = 'http://localhost:3000/usuarios';

    constructor(private http: HttpClient) { }

    getUsuarios(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(this.base);
    }

    crearInvitado(nombre_completo: string, admin_id: number): Observable<CrearInvitadoResponse> {
        return this.http.post<CrearInvitadoResponse>(`${this.base}/invitado`, { nombre_completo, admin_id });
    }

    cambiarEstado(id: number, estado: 'activo' | 'inactivo', admin_id: number): Observable<any> {
        return this.http.put(`${this.base}/${id}/estado`, { estado, admin_id });
    }

    eliminarUsuario(id: number, admin_id: number): Observable<any> {
        return this.http.delete(`${this.base}/${id}`, { body: { admin_id } });
    }

    getHistorial(limite = 50): Observable<HistorialItem[]> {
        return this.http.get<HistorialItem[]>(`${this.base}/historial?limite=${limite}`);
    }
}