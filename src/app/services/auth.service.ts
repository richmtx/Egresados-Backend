import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/usuarios/login';

  constructor(private http: HttpClient) {}

  login(usuario: string, contrasena: string): Observable<any> {
    return this.http.post(this.apiUrl, { usuario, contrasena });
  }

  guardarSesion(usuarioData: any): void {
    sessionStorage.setItem('usuario', JSON.stringify(usuarioData));
  }

  cerrarSesion(): void {
    sessionStorage.removeItem('usuario');
  }

  estaAutenticado(): boolean {
    return !!sessionStorage.getItem('usuario');
  }

  getUsuario(): any {
    const data = sessionStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
  }
}