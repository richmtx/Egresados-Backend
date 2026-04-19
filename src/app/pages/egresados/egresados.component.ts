import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { EgresadosService, EgresadoDetalle, EgresadoPerfil } from './egresados.service';

@Component({
  selector: 'app-egresados',
  imports: [SidebarComponent, CommonModule],
  templateUrl: './egresados.component.html',
  styleUrl: './egresados.component.css'
})
export class EgresadosComponent implements OnInit {

  // Modal y toast
  modalVisible = false;
  egresadoPendiente: EgresadoDetalle | null = null;
  toastVisible = false;
  toastMensaje = '';
  toastError = false;
  private toastTimer: any;

  egresados: EgresadoDetalle[] = [];
  egresadosFiltrados: EgresadoDetalle[] = [];
  cargando = true;
  error = '';

  drawerVisible = false;
  perfilCargando = false;
  perfilSeleccionado: EgresadoPerfil | null = null;

  // Filtros
  busqueda = '';
  filtroCarrera = '';
  filtroAnio = '';
  filtroSituacion = '';
  filtroChip = 'todos';

  // Listas para los selects
  carreras: string[] = [];
  anios: number[] = [];
  situaciones: string[] = [];

  constructor(private egresadosService: EgresadosService) { }

  ngOnInit(): void {
    this.egresadosService.getEgresadosDetalle().subscribe({
      next: (data) => {
        this.egresados = data;
        this.egresadosFiltrados = data;
        this.cargarOpciones(data);
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'No se pudo conectar con el servidor';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  cargarOpciones(data: EgresadoDetalle[]): void {
    this.carreras = [...new Set(data.map(e => e.nombre_carrera))].sort();
    this.anios = [...new Set(data.map(e => e.anio_egreso))].sort((a, b) => b - a);
    this.situaciones = [...new Set(data.map(e => e.situacion_laboral))].sort();
  }

  aplicarFiltros(): void {
    this.egresadosFiltrados = this.egresados.filter(e => {

      const q = this.busqueda.toLowerCase();
      if (q && !e.nombre_completo.toLowerCase().includes(q) &&
        !e.nombre_carrera.toLowerCase().includes(q) &&
        !e.empresa.toLowerCase().includes(q)) return false;

      if (this.filtroCarrera && e.nombre_carrera !== this.filtroCarrera) return false;
      if (this.filtroAnio && e.anio_egreso !== +this.filtroAnio) return false;
      if (this.filtroSituacion && e.situacion_laboral !== this.filtroSituacion) return false;

      if (this.filtroChip === 'sin-encuesta') return false;
      if (this.filtroChip === 'contacto' && !e.autorizo_contacto) return false;
      if (this.filtroChip === 'titulado' && e.estatus_titulacion !== 'Titulado') return false;

      return true;
    });
  }

  onBusqueda(event: Event): void {
    this.busqueda = (event.target as HTMLInputElement).value;
    this.aplicarFiltros();
  }

  onFiltroCarrera(event: Event): void {
    this.filtroCarrera = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroAnio(event: Event): void {
    this.filtroAnio = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroSituacion(event: Event): void {
    this.filtroSituacion = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroChip(chip: string): void {
    this.filtroChip = chip;
    this.aplicarFiltros();
  }

  get satisfaccionPromedio(): string {
    if (!this.egresados.length) return '0.0';
    const suma = this.egresados.reduce((a, e) => a + e.satisfaccion_formacion, 0);
    return (suma / this.egresados.length).toFixed(1);
  }

  getIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return partes[0][0].toUpperCase();
  }

  getTotalEmpleados(): number {
    return this.egresados.filter(e =>
      e.situacion_laboral?.toLowerCase().includes('empleado') ||
      e.situacion_laboral?.toLowerCase().includes('empresa')
    ).length;
  }

  getTotalContacto(): number {
    return this.egresados.filter(e => e.autorizo_contacto).length;
  }

  // Abre el modal — ya NO llama confirm()
  eliminarEgresado(id: number): void {
    const egresado = this.egresados.find(e => e.id_egresado === id) ?? null;
    this.egresadoPendiente = egresado;
    this.modalVisible = true;
  }

  cancelarEliminar(): void {
    this.modalVisible = false;
    this.egresadoPendiente = null;
    this.mostrarToast('Eliminación cancelada', false);
  }

  confirmarEliminar(): void {
    if (!this.egresadoPendiente) return;
    const id = this.egresadoPendiente.id_egresado;
    const nombre = this.egresadoPendiente.nombre_completo;

    this.modalVisible = false;
    this.egresadoPendiente = null;

    this.egresadosService.deleteEgresado(id).subscribe({
      next: () => {
        this.egresados = this.egresados.filter(e => e.id_egresado !== id);
        this.aplicarFiltros();
        this.mostrarToast(`${nombre} fue eliminado correctamente`, false);
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al eliminar. Intenta de nuevo.', true);
      }
    });
  }

  mostrarToast(mensaje: string, esError: boolean): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastError = esError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3200);
  }

  getSituacionClass(situacion: string): string {
    if (!situacion) return 'chip-gray';
    const s = situacion.toLowerCase();

    if (s.includes('sector privado')) return 'chip-green';
    if (s.includes('sector público') || s.includes('publico')) return 'chip-teal';
    if (s.includes('empresario') || s.includes('freelance') || s.includes('cuenta propia')) return 'chip-amber';
    if (s.includes('desempleado') || s.includes('buscando')) return 'chip-red';
    if (s.includes('estudi')) return 'chip-purple';
    if (s.includes('hogar') || s.includes('otras actividades')) return 'chip-gray';

    return 'chip-gray';
  }

  getTitulacionClass(estatus: string): string {
    const map: Record<string, string> = {
      '1': 'chip-teal',
      '2': 'chip-amber',
      '3': 'chip-gray',
      'Titulado': 'chip-teal',
      'En trámite': 'chip-amber',
      'No titulado': 'chip-gray',
    };
    return map[estatus] ?? 'chip-gray';
  }

  getTitulacionLabel(estatus: string): string {
    const map: Record<string, string> = {
      '1': 'Titulado',
      '2': 'En trámite',
      '3': 'No titulado',
    };
    return map[estatus] ?? estatus;
  }

  // Métodos nuevos
  abrirPerfil(id: number): void {
    this.drawerVisible = true;
    this.perfilCargando = true;
    this.perfilSeleccionado = null;

    this.egresadosService.getPerfilEgresado(id).subscribe({
      next: (data) => {
        this.perfilSeleccionado = data;
        this.perfilCargando = false;
      },
      error: () => {
        this.perfilCargando = false;
        this.drawerVisible = false;
        this.mostrarToast('No se pudo cargar el perfil.', true);
      }
    });
  }

  cerrarPerfil(): void {
    this.drawerVisible = false;
    this.perfilSeleccionado = null;
  }

  getEstrellas(valor: number): boolean[] {
    return [1, 2, 3, 4, 5].map(i => i <= Math.round(valor));
  }

  todasHabilidades(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [
      ...this.perfilSeleccionado.habilidades,
      ...this.perfilSeleccionado.habilidades_otro
    ];
  }

  todasColaboraciones(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [
      ...this.perfilSeleccionado.colaboraciones,
      ...this.perfilSeleccionado.colaboraciones_otro
    ];
  }

  exportarPDF(): void {
    // Implementación pendiente
    this.mostrarToast('Función de exportar PDF próximamente.', false);
  }
}