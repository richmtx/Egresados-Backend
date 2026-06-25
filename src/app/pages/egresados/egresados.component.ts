import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { EgresadosService, EgresadoDetalle, EgresadoPerfil } from './egresados.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-egresados',
  imports: [SidebarComponent, CommonModule, FormsModule],
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
  filtrosChip: Set<string> = new Set(['todos']);

  // Listas para los selects
  carreras: string[] = [];
  anios: number[] = [];
  situaciones: string[] = [];

  // URL base para las imágenes
  private readonly BASE_URL = environment.apiUrl;
  private destroyRef = inject(DestroyRef);

  // ── Modal correo ──
  modalCorreoVisible = false;
  correoAsunto = '';
  correoMensaje = '';
  readonly MAX_CHIPS_VISIBLES = 5;
  correoCargando = false;
  correosExpandidos = false;

  exportMenuVisible = false;
  exportando = false;

  constructor(
    private egresadosService: EgresadosService,
    private usuariosService: UsuariosService,
  ) { }

  private logAccion(accion: string, descripcion: string, seccion: string): void {
    this.usuariosService.registrarAccion(accion, descripcion, seccion).subscribe({ error: () => { } });
  }

  /** Ordena dejando el registro más reciente (id más alto) hasta arriba */
  private ordenarRecientesPrimero(data: EgresadoDetalle[]): EgresadoDetalle[] {
    return [...data].sort((a, b) => b.id_egresado - a.id_egresado);
  }

  ngOnInit(): void {
    this.egresadosService.getEgresadosDetalle().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.egresados = this.ordenarRecientesPrimero(data);
        this.egresadosFiltrados = this.egresados;
        this.cargarOpciones(this.egresados);
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

      if (!this.filtrosChip.has('todos')) {
        if (this.filtrosChip.has('contacto') && !e.autorizo_contacto) return false;
        if (this.filtrosChip.has('eventos') && !e.autorizo_eventos) return false;

        const chipsTitulacion = ['titulado', 'en-tramite', 'no-titulado'];
        const algunTitulacionActivo = chipsTitulacion.some(c => this.filtrosChip.has(c));

        if (algunTitulacionActivo) {
          const label = this.getTitulacionLabel(e.estatus_titulacion);
          const coincide =
            (this.filtrosChip.has('titulado') && label === 'Titulado') ||
            (this.filtrosChip.has('en-tramite') && label === 'En trámite') ||
            (this.filtrosChip.has('no-titulado') && label === 'No titulado');
          if (!coincide) return false;
        }
      }

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
    if (chip === 'todos') {
      this.filtrosChip.clear();
      this.filtrosChip.add('todos');
    } else {
      this.filtrosChip.delete('todos');
      if (this.filtrosChip.has(chip)) {
        this.filtrosChip.delete(chip);
        if (this.filtrosChip.size === 0) this.filtrosChip.add('todos');
      } else {
        this.filtrosChip.add(chip);
      }
    }
    this.aplicarFiltros();
  }

  isChipActivo(chip: string): boolean {
    return this.filtrosChip.has(chip);
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

  getFotoUrl(fotoUrl: string | null): string | null {
    if (!fotoUrl) return null;
    // Si ya es Base64 o URL absoluta, devolverlo directo
    if (fotoUrl.startsWith('data:') || fotoUrl.startsWith('http')) {
      return fotoUrl;
    }
    // Si es ruta relativa (servidor ITD), agregar base URL
    return `${this.BASE_URL}/${fotoUrl}`;
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

  eliminarEgresado(id: number): void {
    const egresado = this.egresados.find(e => e.id_egresado === id) ?? null;
    this.egresadoPendiente = egresado;
    this.modalVisible = true;
  }

  egresadoEliminadoTemporal: EgresadoDetalle | null = null;

  confirmarEliminar(): void {
    if (!this.egresadoPendiente) return;

    const egresado = this.egresadoPendiente;
    const id = egresado.id_egresado;

    this.egresadoEliminadoTemporal = egresado;
    this.egresados = this.egresados.filter(e => e.id_egresado !== id);
    this.aplicarFiltros();
    this.modalVisible = false;
    this.egresadoPendiente = null;

    clearTimeout(this.toastTimer);
    this.toastMensaje = `${egresado.nombre_completo} fue eliminado`;
    this.toastError = false;
    this.toastVisible = true;

    this.toastTimer = setTimeout(() => {
      this.egresadosService.deleteEgresado(id).subscribe({
        next: () => {
          this.logAccion('eliminar_egresado', `Eliminó egresado: ${egresado.nombre_completo}`, 'egresados');
          this.egresadoEliminadoTemporal = null;
          this.toastVisible = false;
        },
        error: () => {
          if (this.egresadoEliminadoTemporal) {
            this.egresados = this.ordenarRecientesPrimero(
              [...this.egresados, this.egresadoEliminadoTemporal]
            );
            this.aplicarFiltros();
            this.egresadoEliminadoTemporal = null;
          }
          this.mostrarToast('Error al eliminar. Intenta de nuevo.', true);
        }
      });
    }, 10000);
  }

  deshacerEliminar(): void {
    clearTimeout(this.toastTimer);

    if (this.egresadoEliminadoTemporal) {
      this.egresados = this.ordenarRecientesPrimero(
        [...this.egresados, this.egresadoEliminadoTemporal]
      );
      this.aplicarFiltros();
      this.egresadoEliminadoTemporal = null;
    }

    this.toastVisible = false;
  }

  cancelarEliminar(): void {
    this.modalVisible = false;
    this.egresadoPendiente = null;
  }

  mostrarToast(mensaje: string, esError: boolean): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastError = esError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => this.toastVisible = false, 4500);
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

  // ── Modal correo: helpers ──
  /** Correos de los egresados actualmente filtrados que tengan correo */
  get correosDestinatarios(): string[] {
    return this.egresadosFiltrados
      .map(e => (e as any).correo as string)
      .filter(c => !!c);
  }

  /** Chips visibles (primeros N) */
  get chipsVisibles(): string[] {
    return this.correosDestinatarios.slice(0, this.MAX_CHIPS_VISIBLES);
  }

  /** Cuántos correos quedan ocultos */
  get correosRestantes(): number {
    return Math.max(0, this.correosDestinatarios.length - this.MAX_CHIPS_VISIBLES);
  }

  /** Resumen de filtros activos para el asunto por defecto */
  get resumenFiltros(): string {
    const partes: string[] = [];
    if (this.filtroCarrera) partes.push(this.filtroCarrera);
    if (this.filtroAnio) partes.push(`Generación ${this.filtroAnio}`);
    if (this.filtroSituacion) partes.push(this.filtroSituacion);
    if (!this.filtrosChip.has('todos')) {
      const labels: Record<string, string> = {
        contacto: 'Con autorización de contacto',
        eventos: 'Con autorización de eventos',
        titulado: 'Titulados',
        'en-tramite': 'En trámite',
        'no-titulado': 'No titulados',
      };
      this.filtrosChip.forEach(c => { if (labels[c]) partes.push(labels[c]); });
    }
    return partes.length ? partes.join(' · ') : 'Egresados';
  }

  abrirModalCorreo(): void {
    this.correoAsunto = this.resumenFiltros;
    this.correoMensaje = '';
    this.modalCorreoVisible = true;
    this.correosExpandidos = false;
  }

  cerrarModalCorreo(): void {
    this.modalCorreoVisible = false;
  }

  enviarCorreo(): void {
    if (this.correoCargando) return;
    this.correoCargando = true;

    // Número real de destinatarios (van a BCC en el servicio)
    const totalReal = this.correosDestinatarios.length;

    this.egresadosService.enviarCorreo(
      this.correosDestinatarios,
      this.correoAsunto,
      this.correoMensaje
    ).subscribe({
      next: () => {
        this.logAccion('correo', `Envió correo masivo a ${totalReal} egresado(s): "${this.correoAsunto}"`, 'egresados');
        this.correoCargando = false;
        this.cerrarModalCorreo();
        this.mostrarToast(`Correo enviado a ${totalReal} egresado(s).`, false);
      },
      error: () => {
        this.correoCargando = false;
        this.mostrarToast('Error al enviar el correo. Intenta de nuevo.', true);
      }
    });
  }

  hayFiltrosActivos(): boolean {
    return (
      this.busqueda !== '' ||
      this.filtroCarrera !== '' ||
      this.filtroAnio !== '' ||
      this.filtroSituacion !== '' ||
      !this.filtrosChip.has('todos')
    );
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.filtroSituacion = '';
    this.filtrosChip.clear();
    this.filtrosChip.add('todos');
    this.aplicarFiltros();
  }

  // Construcción de filtros activos para exportar
  private getFiltrosExport(): Record<string, any> {
    const filtros: Record<string, any> = {};

    if (this.busqueda) filtros['nombre'] = this.busqueda;
    if (this.filtroCarrera) filtros['carrera'] = this.filtroCarrera;
    if (this.filtroAnio) filtros['anio'] = this.filtroAnio;
    if (this.filtroSituacion) filtros['situacion_laboral'] = this.filtroSituacion;

    // Chips de titulación
    if (this.filtrosChip.has('titulado')) filtros['estatus_titulacion'] = 'Titulado';
    if (this.filtrosChip.has('en-tramite')) filtros['estatus_titulacion'] = 'En trámite';
    if (this.filtrosChip.has('no-titulado')) filtros['estatus_titulacion'] = 'No titulado';

    // Chips de autorización
    if (this.filtrosChip.has('contacto')) filtros['autorizo_contacto'] = true;
    if (this.filtrosChip.has('eventos')) filtros['autorizo_eventos'] = true;

    return filtros;
  }

  // Descarga genérica
  private descargarArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Exportar PDF — lista filtrada (botón del dropdown)
  exportarListaPDF(): void {
    this.exportando = true;
    this.exportMenuVisible = false;
    const fecha = new Date().toISOString().split('T')[0];

    this.egresadosService.exportarPdf(this.getFiltrosExport()).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `egresados_${fecha}.pdf`);
        this.logAccion('exportar', `Exportó lista de egresados en PDF (${this.egresadosFiltrados.length} registros)`, 'egresados');
        this.exportando = false;
        this.mostrarToast('PDF exportado correctamente.', false);
      },
      error: () => {
        this.exportando = false;
        this.mostrarToast('Error al exportar el PDF.', true);
      }
    });
  }

  // Exportar PDF — perfil individual (botón del drawer)
  exportarPDF(): void {
    if (!this.perfilSeleccionado) return;

    const id = this.perfilSeleccionado.id_egresado;
    const nombre = this.perfilSeleccionado.nombre_completo
      .replace(/\s+/g, '_').toLowerCase();
    const fecha = new Date().toISOString().split('T')[0];

    this.egresadosService.exportarPerfilPdf(id).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `perfil_${nombre}_${fecha}.pdf`);
        this.logAccion('exportar', `Exportó perfil PDF de ${this.perfilSeleccionado!.nombre_completo}`, 'egresados');
        this.mostrarToast('PDF del perfil exportado correctamente.', false);
      },
      error: () => {
        this.mostrarToast('Error al exportar el PDF del perfil.', true);
      }
    });
  }

  // Exportar Excel (lista filtrada)
  exportarExcel(): void {
    this.exportando = true;
    this.exportMenuVisible = false;
    const fecha = new Date().toISOString().split('T')[0];

    this.egresadosService.exportarExcel(this.getFiltrosExport()).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `egresados_${fecha}.xlsx`);
        this.logAccion('exportar', `Exportó lista de egresados en Excel (${this.egresadosFiltrados.length} registros)`, 'egresados');
        this.exportando = false;
        this.mostrarToast('Excel exportado correctamente.', false);
      },
      error: () => {
        this.exportando = false;
        this.mostrarToast('Error al exportar el Excel.', true);
      }
    });
  }

  toggleExportMenu(): void {
    this.exportMenuVisible = !this.exportMenuVisible;
  }

  cerrarExportMenu(): void {
    this.exportMenuVisible = false;
  }
}