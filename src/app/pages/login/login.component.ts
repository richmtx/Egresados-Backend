import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  usuario: string = '';
  contrasena: string = '';
  mostrarPassword: boolean = false;
  cargando: boolean = false;
  errorMensaje: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  onSubmit() {
    this.errorMensaje = '';

    // Validación básica
    if (!this.usuario.trim() || !this.contrasena.trim()) {
      this.errorMensaje = 'Por favor ingresa usuario y contraseña';
      return;
    }

    this.cargando = true;

    this.authService.login(this.usuario, this.contrasena).subscribe({
      next: (res) => {
        this.authService.guardarSesion(res.usuario);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 401) {
          this.errorMensaje = 'Usuario o contraseña incorrectos';
        } else {
          this.errorMensaje = 'Error de conexión, intenta más tarde';
        }
      }
    });
  }
}