import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/usuarios/login`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  login(usuario: string, contrasena: string): Observable<any> {
    return this.http.post(this.apiUrl, { usuario, contrasena });
  }

  guardarSesion(usuarioData: any): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('usuario', JSON.stringify(usuarioData));
    }
  }

  cerrarSesion(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('usuario');
    }
  }

  estaAutenticado(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!sessionStorage.getItem('usuario');
    }
    return false;
  }

  getUsuario(): any {
    if (isPlatformBrowser(this.platformId)) {
      const data = sessionStorage.getItem('usuario');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }
}