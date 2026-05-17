import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { UsuariosService, Usuario, HistorialItem } from './usuarios.service';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {

  // Datos
  usuarios: Usuario[] = [];
  historial: HistorialItem[] = [];

  // Estado de carga
  cargando = false;
  cargandoHistorial = false;
  error = '';

  // Modal crear invitado
  modalAbierto = false;
  nuevoNombre = '';
  creando = false;
  errorModal = '';
  usuarioCreado: { usuario: string; contrasena: string } | null = null;

  // Modal confirmar eliminación
  modalEliminar = false;
  usuarioAEliminar: Usuario | null = null;
  eliminando = false;

  // Admin activo (simulado — viene del login)
  // En tu sistema real lo leerás de localStorage o del servicio de auth
  adminActual: Usuario | null = null;

  copiado = false;

  constructor(
    private usuariosService: UsuariosService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarHistorial();
    this.leerAdminLocal();
  }

  leerAdminLocal(): void {
    this.adminActual = this.authService.getUsuario();
  }

  // Getters para las cards
  get totalAdmins(): number {
    return this.usuarios.filter(u => u.rol === 'admin').length;
  }

  get totalInvitados(): number {
    return this.usuarios.filter(u => u.rol === 'invitado').length;
  }

  get ultimoAcceso(): { nombre: string; tiempo: string } | null {
    const conAcceso = this.usuarios
      .filter(u => u.ultimo_acceso)
      .sort((a, b) => new Date(b.ultimo_acceso!).getTime() - new Date(a.ultimo_acceso!).getTime());
    if (!conAcceso.length) return null;
    return {
      nombre: conAcceso[0].nombre_completo,
      tiempo: this.tiempoRelativo(conAcceso[0].ultimo_acceso!)
    };
  }

  // Carga de datos
  cargarUsuarios(): void {
    this.cargando = true;
    this.error = '';
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => { this.usuarios = data; this.cargando = false; },
      error: () => { this.error = 'No se pudieron cargar los usuarios.'; this.cargando = false; }
    });
  }

  cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.usuariosService.getHistorial(20).subscribe({
      next: (data) => { this.historial = data; this.cargandoHistorial = false; },
      error: () => { this.cargandoHistorial = false; }
    });
  }

  // Modal crear invitado
  abrirModal(): void {
    this.modalAbierto = true;
    this.nuevoNombre = '';
    this.errorModal = '';
    this.usuarioCreado = null;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.usuarioCreado = null;
    this.nuevoNombre = '';
    this.errorModal = '';
  }

  crearInvitado(): void {
    if (!this.nuevoNombre.trim()) { this.errorModal = 'El nombre es obligatorio.'; return; }
    if (!this.adminActual) { this.errorModal = 'No se detectó sesión de administrador.'; return; }
    this.creando = true;
    this.errorModal = '';
    this.usuariosService.crearInvitado(this.nuevoNombre.trim(), this.adminActual.id_usuario).subscribe({
      next: (res) => {
        this.usuarioCreado = { usuario: res.usuario.usuario, contrasena: res.contrasena_temporal };
        this.creando = false;
        this.cargarUsuarios();
        this.cargarHistorial();
      },
      error: (err) => {
        this.errorModal = err?.error?.message ?? 'Error al crear el usuario.';
        this.creando = false;
      }
    });
  }

  copiarCredenciales(): void {
    if (!this.usuarioCreado) return;
    const texto = `Usuario: ${this.usuarioCreado.usuario}\nContraseña: ${this.usuarioCreado.contrasena}`;
    navigator.clipboard.writeText(texto).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 3000);
    });
  }

  // Cambiar estado (activo / inactivo)
  toggleEstado(u: Usuario): void {
    if (u.rol === 'admin' || !this.adminActual) return;
    const nuevoEstado = u.estado === 'activo' ? 'inactivo' : 'activo';
    this.usuariosService.cambiarEstado(u.id_usuario, nuevoEstado, this.adminActual.id_usuario).subscribe({
      next: () => { u.estado = nuevoEstado; this.cargarHistorial(); },
      error: () => { }
    });
  }

  // Modal eliminar
  confirmarEliminar(u: Usuario): void {
    this.usuarioAEliminar = u;
    this.modalEliminar = true;
  }

  cancelarEliminar(): void {
    this.modalEliminar = false;
    this.usuarioAEliminar = null;
  }

  eliminarUsuario(): void {
    if (!this.usuarioAEliminar || !this.adminActual) return;
    this.eliminando = true;
    this.usuariosService.eliminarUsuario(this.usuarioAEliminar.id_usuario, this.adminActual.id_usuario).subscribe({
      next: () => {
        this.eliminando = false;
        this.modalEliminar = false;
        this.usuarioAEliminar = null;
        this.cargarUsuarios();
        this.cargarHistorial();
      },
      error: () => { this.eliminando = false; }
    });
  }

  // Helpers
  iniciales(nombre: string): string {
    return nombre.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  tiempoRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Justo ahora';
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const dias = Math.floor(hrs / 24);
    if (dias === 1) return 'Ayer';
    return `Hace ${dias} días`;
  }

  iconoAccion(accion: string): string {
    const mapa: Record<string, string> = {
      login: 'login',
      crear_usuario: 'crear',
      eliminar_usuario: 'eliminar',
      cambiar_estado: 'estado',
      exportar: 'exportar',
    };
    return mapa[accion] ?? 'otro';
  }

  colorAvatar(rol: string): string {
    return rol === 'admin' ? 'av-purple' : 'av-blue';
  }

  get invitadosActivos(): number {
    return this.usuarios.filter(u => u.rol === 'invitado' && u.estado === 'activo').length;
  }
}