import { Component, OnInit, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { RespuestasService, Respuesta } from './respuestas.service';
import { EstudioPosterior, Emprendimiento, ProyectoSocial } from '../egresados/egresados.service';
import { AuthService } from '../../services/auth.service';
import { InclusionService } from '../inclusion/inclusion.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RespuestaPerfil extends Respuesta {
  certificaciones: string[];
  habilidades: string[];
  habilidades_otro: string[];
  colaboraciones: string[];
  colaboraciones_otro: string[];
  foto_url: string | null;

  // ── Nuevos campos ──
  facebook: string | null;
  instagram: string | null;
  tiempo_primer_empleo: string | null;
  medio_primer_empleo: string | null;
  primer_empleo_empresa: string | null;
  primer_empleo_puesto: string | null;

  // ── Datos personales ──
  pais_nacimiento: string | null;

  // ── Trayectoria adicional ──
  estudios: EstudioPosterior[];
  emprendimientos: Emprendimiento[];
  proyectos_sociales: ProyectoSocial[];
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

  // Exportación PDF
  exportandoPdf = false;

  // ── Datos de inclusión (solo consentimiento; nunca las respuestas) ──
  consentimientoEstado: 'cargando' | 'consintio' | 'no_consintio' | 'no_disponible' = 'cargando';
  consentimientoFecha: string | null = null;
  modalRetiroVisible = false;
  retirandoConsentimiento = false;
  private consentimientoSub?: Subscription;

  // URL base para imágenes
  private readonly BASE_URL = environment.apiUrl;

  private destroyRef = inject(DestroyRef);

  get totalRespuestas() { return this.respuestas.length; }
  get autorizaronContacto() { return this.respuestas.filter(r => r.autorizo_contacto).length; }
  get revisadas() { return this.respuestas.filter(r => r.revisado).length; }
  get sinRevisar() { return this.respuestas.filter(r => !r.revisado).length; }

  constructor(
    private respuestasService: RespuestasService,
    private authService: AuthService,
    private inclusionService: InclusionService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) { }

  ngOnInit(): void {
    this.cargarRespuestas();
  }

  cargarRespuestas(): void {
    this.cargando = true;
    this.respuestasService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.respuestas = data.map(r => ({
          ...r,
          revisado: Boolean(r.revisado),
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
        .filter((a): a is number => a !== null),
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
          r.numero_control?.toLowerCase().includes(term) ||
          r.situacion_laboral?.toLowerCase().includes(term);
        if (!hayMatch) return false;
      }
      if (this.filtroCarrera && r.nombre_carrera !== this.filtroCarrera) return false;
      if (this.filtroAnio) {
        const anioRegistro = r.fecha_registro
          ? new Date(r.fecha_registro).getFullYear()
          : null;
        if (anioRegistro !== +this.filtroAnio) return false;
      }
      if (this.filtroRevisado === 'revisado' && !r.revisado) return false;
      if (this.filtroRevisado === 'sin_revisar' && r.revisado) return false;
      return true;
    });
  }

  // ── Foto de perfil ────────────────────────────────────────────────
  getFotoUrl(fotoUrl: string | null): string | null {
    if (!fotoUrl) return null;
    if (fotoUrl.startsWith('data:') || fotoUrl.startsWith('http')) {
      return fotoUrl;
    }
    return `${this.BASE_URL}/${fotoUrl}`;
  }

  // ── Drawer / perfil ───────────────────────────────────────────────
  abrirPerfil(id: number, fila: Respuesta): void {

    // ✅ Si no está revisado, persiste en BD
    if (!fila.revisado) {
      const usuario = this.authService.getUsuario();
      const nombre = usuario?.usuario ?? 'admin';

      this.respuestasService.marcarRevisado(id, nombre).subscribe({
        next: () => {
          fila.revisado = true;
          // Los getters sinRevisar / revisadas se recalculan automáticamente
        },
        error: () => {
          // Silencioso: no bloquea la apertura del perfil
        },
      });
    }

    this.drawerVisible = true;
    this.perfilCargando = true;
    this.perfilSeleccionado = null;
    this.cargarConsentimiento(id);

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
          foto_url: data.foto_url ?? null,
          estudios: data.estudios ?? [],
          emprendimientos: data.emprendimientos ?? [],
          proyectos_sociales: data.proyectos_sociales ?? [],
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
    this.consentimientoSub?.unsubscribe();
  }

  // ── Datos de inclusión ──
  /** Petición aparte del perfil: si falla, solo la sección muestra "No disponible". */
  private cargarConsentimiento(id: number): void {
    this.consentimientoSub?.unsubscribe();
    this.consentimientoEstado = 'cargando';
    this.consentimientoFecha = null;
    this.modalRetiroVisible = false;

    this.consentimientoSub = this.inclusionService.getConsentimiento(id).subscribe({
      next: (res) => {
        this.consentimientoEstado = res.consintio ? 'consintio' : 'no_consintio';
        this.consentimientoFecha = res.fecha_consentimiento ?? null;
      },
      error: () => {
        this.consentimientoEstado = 'no_disponible';
      }
    });
  }

  /** Fecha en español (ej. "12 de marzo de 2026"); '' si no viene o no es válida. */
  get consentimientoFechaTexto(): string {
    const f = this.consentimientoFecha;
    if (!f) return '';
    // Una fecha sin hora ("2026-03-12") se interpreta en UTC y se corre un día en México
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f);
    const d = soloFecha ? new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]) : new Date(f);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  abrirModalRetiro(): void {
    this.modalRetiroVisible = true;
  }

  cancelarRetiro(): void {
    if (this.retirandoConsentimiento) return;
    this.modalRetiroVisible = false;
  }

  confirmarRetiro(): void {
    if (!this.perfilSeleccionado || this.retirandoConsentimiento) return;

    const id = this.perfilSeleccionado.id_egresado;
    this.retirandoConsentimiento = true;

    this.inclusionService.retirarConsentimiento(id).subscribe({
      next: () => {
        this.retirandoConsentimiento = false;
        this.modalRetiroVisible = false;
        // Solo actualiza la sección si el drawer sigue en el mismo egresado
        if (this.perfilSeleccionado?.id_egresado === id) {
          this.consentimientoEstado = 'no_consintio';
          this.consentimientoFecha = null;
        }
        this.mostrarToast('Datos de inclusión retirados correctamente.', false);
      },
      error: () => {
        this.retirandoConsentimiento = false;
        this.modalRetiroVisible = false;
        this.mostrarToast('No se pudieron retirar los datos de inclusión. Intenta de nuevo.', true);
      }
    });
  }

  exportarPDF(): void {
    if (!this.perfilSeleccionado || this.exportandoPdf) return;

    const { id_egresado, nombre_completo } = this.perfilSeleccionado;

    this.exportandoPdf = true;
    this.mostrarToast('Generando PDF...', false);

    this.respuestasService.exportarPerfilPdf(id_egresado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.descargarBlob(blob, this.nombreArchivoPdf(nombre_completo));
          this.exportandoPdf = false;
          this.mostrarToast('PDF exportado correctamente.', false);
        },
        error: (err) => {
          console.error('Error exportando PDF:', err);
          this.exportandoPdf = false;
          this.mostrarToast('No se pudo exportar el PDF.', true);
        },
      });
  }

  // ── Helpers de descarga ───────────────────────────────────────────
  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    // Guard SSR: solo en navegador
    if (!isPlatformBrowser(this.platformId)) return;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private nombreArchivoPdf(nombre: string): string {
    const limpio = (nombre || 'egresado')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const fecha = new Date().toISOString().slice(0, 10);
    return `perfil_${limpio}_${fecha}.pdf`;
  }

  // ── Toast ─────────────────────────────────────────────────────────
  mostrarToast(mensaje: string, esError: boolean): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastError = esError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => (this.toastVisible = false), 3200);
  }

  // ── Helpers visuales ──────────────────────────────────────────────
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
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  /** Une las partes con valor, omitiendo null/vacías para no dejar separadores sueltos. */
  unirLinea(partes: (string | number | null | undefined)[]): string {
    return partes
      .filter(p => p !== null && p !== undefined && String(p).trim() !== '')
      .join(' · ');
  }

  getEstrellas(valor: number): boolean[] {
    return [1, 2, 3, 4, 5].map(i => i <= Math.round(valor));
  }

  todasHabilidades(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [
      ...this.perfilSeleccionado.habilidades,
      ...this.perfilSeleccionado.habilidades_otro,
    ];
  }

  todasColaboraciones(): string[] {
    if (!this.perfilSeleccionado) return [];
    return [
      ...this.perfilSeleccionado.colaboraciones,
      ...this.perfilSeleccionado.colaboraciones_otro,
    ];
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
      'Titulado': 'chip-teal',
      'En trámite': 'chip-amber',
      'No titulado': 'chip-gray',
      '1': 'chip-teal',
      '2': 'chip-amber',
      '3': 'chip-gray',
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

  get generacionTexto(): string {
    const p = this.perfilSeleccionado;
    if (!p?.anio_ingreso) return '—';

    const fin = p.anio_egreso ? ` – ${p.anio_egreso}` : '';
    const periodo = p.periodo_ingreso && p.periodo_ingreso !== 'No lo recuerdo'
      ? `${p.periodo_ingreso} `
      : '';

    return `${periodo}${p.anio_ingreso}${fin}`;
  }
}