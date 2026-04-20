import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { RespuestasService, Respuesta } from './respuestas.service';

export interface RespuestaPerfil extends Respuesta {
  certificaciones: string[];
  habilidades: string[];
  habilidades_otro: string[];
  colaboraciones: string[];
  colaboraciones_otro: string[];
}

@Component({
  selector: 'app-respuestas',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './respuestas.component.html',
  styleUrl: './respuestas.component.css',
})
export class RespuestasComponent implements OnInit {

  respuestas: Respuesta[] = [];
  respuestasFiltradas: Respuesta[] = [];

  searchTerm = '';
  filtroCarrera = '';
  filtroAnio = '';
  filtroRevisado = '';

  carreras: string[] = [];
  anios: number[] = [];

  cargando = true;

  // Drawer
  drawerVisible = false;
  perfilCargando = false;
  perfilSeleccionado: RespuestaPerfil | null = null;

  // Toast
  toastVisible = false;
  toastMensaje = '';
  toastError = false;
  private toastTimer: any;

  get totalRespuestas() { return this.respuestas.length; }
  get autorizaronContacto() { return this.respuestas.filter(r => r.autorizo_contacto).length; }
  get revisadas() { return this.respuestas.filter(r => r.revisado).length; }
  get sinRevisar() { return this.respuestas.filter(r => !r.revisado).length; }

  constructor(
    private respuestasService: RespuestasService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) { }

  ngOnInit(): void {
    this.cargarRespuestas();
  }

  cargarRespuestas(): void {
    this.cargando = true;
    this.respuestasService.getAll().subscribe({
      next: (data) => {
        this.respuestas = data.map(r => ({
          ...r,
          revisado: this.estaRevisado(r.id_egresado),
        }));
        this.poblarFiltros();
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando respuestas:', err);
        this.cargando = false;
      },
    });
  }

  private poblarFiltros(): void {
    const setCarreras = new Set(this.respuestas.map(r => r.nombre_carrera).filter(Boolean));
    this.carreras = Array.from(setCarreras).sort();

    const setAnios = new Set(
      this.respuestas
        .map(r => r.fecha_registro ? new Date(r.fecha_registro).getFullYear() : null)
        .filter((a): a is number => a !== null)
    );
    this.anios = Array.from(setAnios).sort((a, b) => b - a);
  }

  aplicarFiltros(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.respuestasFiltradas = this.respuestas.filter(r => {
      if (term) {
        const hayMatch =
          r.nombre_completo?.toLowerCase().includes(term) ||
          r.nombre_carrera?.toLowerCase().includes(term) ||
          r.empresa?.toLowerCase().includes(term) ||
          r.situacion_laboral?.toLowerCase().includes(term);
        if (!hayMatch) return false;
      }
      if (this.filtroCarrera && r.nombre_carrera !== this.filtroCarrera) return false;
      if (this.filtroAnio) {
        const anioRegistro = r.fecha_registro ? new Date(r.fecha_registro).getFullYear() : null;
        if (anioRegistro !== +this.filtroAnio) return false;
      }
      if (this.filtroRevisado === 'revisado' && !r.revisado) return false;
      if (this.filtroRevisado === 'sin_revisar' && r.revisado) return false;
      return true;
    });
  }

  // ── Drawer ────────────────────────────────────────────────────────────────────
  abrirPerfil(id: number, fila: Respuesta): void {
    // Marcar como revisado en la tabla al abrir
    this.marcarRevisado(id);
    fila.revisado = true;

    this.drawerVisible = true;
    this.perfilCargando = true;
    this.perfilSeleccionado = null;

    this.respuestasService.getPerfil(id).subscribe({
      next: (data) => {
        this.perfilSeleccionado = {
          ...data,
          revisado: true,
          certificaciones: data.certificaciones ?? [],
          habilidades: data.habilidades ?? [],
          habilidades_otro: data.habilidades_otro ?? [],
          colaboraciones: data.colaboraciones ?? [],
          colaboraciones_otro: data.colaboraciones_otro ?? [],
        };
        this.perfilCargando = false;
      },
      error: () => {
        this.perfilCargando = false;
        this.drawerVisible = false;
        this.mostrarToast('No se pudo cargar el perfil.', true);
      },
    });
  }

  cerrarPerfil(): void {
    this.drawerVisible = false;
    this.perfilSeleccionado = null;
  }

  exportarPDF(): void {
    this.mostrarToast('Función de exportar PDF próximamente.', false);
  }

  mostrarToast(mensaje: string, esError: boolean): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastError = esError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3200);
  }

  // ── localStorage ─────────────────────────────────────────────────────────────
  private isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  private marcarRevisado(id: number): void {
    if (!this.isBrowser()) return;
    const s = this.getRevisadosSet();
    s.add(id);
    localStorage.setItem('revisados_egresados', JSON.stringify(Array.from(s)));
  }

  private estaRevisado(id: number): boolean {
    if (!this.isBrowser()) return false;
    return this.getRevisadosSet().has(id);
  }

  private getRevisadosSet(): Set<number> {
    if (!this.isBrowser()) return new Set();
    const raw = localStorage.getItem('revisados_egresados');
    if (!raw) return new Set();
    try { return new Set(JSON.parse(raw) as number[]); }
    catch { return new Set(); }
  }

  // ── Helpers visuales ─────────────────────────────────────────────────────────
  getInitials(nombre: string): string {
    if (!nombre) return '?';
    const parts = nombre.trim().split(' ');
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[1][0]).toUpperCase();
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getEstrellas(valor: number): boolean[] {
    return [1, 2, 3, 4, 5].map(i => i <= Math.round(valor));
  }

  todasHabilidades(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [...this.perfilSeleccionado.habilidades, ...this.perfilSeleccionado.habilidades_otro];
  }

  todasColaboraciones(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [...this.perfilSeleccionado.colaboraciones, ...this.perfilSeleccionado.colaboraciones_otro];
  }

  getSituacionClass(situacion: string): string {
    if (!situacion) return 'chip-gray';
    const s = situacion.toLowerCase();
    if (s.includes('sector privado')) return 'chip-green';
    if (s.includes('sector público') || s.includes('publico')) return 'chip-teal';
    if (s.includes('empresario') || s.includes('freelance') || s.includes('cuenta')) return 'chip-amber';
    if (s.includes('desempleado') || s.includes('buscando')) return 'chip-red';
    if (s.includes('estudi') || s.includes('posgrado')) return 'chip-purple';
    return 'chip-gray';
  }

  getTitulacionClass(estatus: string): string {
    const map: Record<string, string> = {
      'Titulado': 'chip-teal', 'En trámite': 'chip-amber', 'No titulado': 'chip-gray',
      '1': 'chip-teal', '2': 'chip-amber', '3': 'chip-gray',
    };
    return map[estatus] ?? 'chip-gray';
  }

  getTitulacionLabel(estatus: string): string {
    const map: Record<string, string> = { '1': 'Titulado', '2': 'En trámite', '3': 'No titulado' };
    return map[estatus] ?? estatus;
  }

  exportar(): void {
    console.log('Exportar respuestas:', this.respuestasFiltradas);
  }
}