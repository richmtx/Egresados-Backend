import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { VinculacionService, EgresadoContacto, } from './vinculacion.service';
import { EstadisticasService } from '../estadisticas/estadisticas.service';
import { UsuariosService } from '../usuarios/usuarios.service';

interface ColaboracionRow {
  descripcion: string;
  total: number;
  porcentaje: number;
  esFinal: boolean;
  esOtro: boolean;
}

interface HabilidadRow {
  habilidad: string;
  total: number;
  porcentaje: number;
  esOtro: boolean;
}

interface PanelDetalle {
  titulo: string;
  egresados: EgresadoContacto[];
  cargando: boolean;
  error: string | null;
  mostrarDescripcionOtro: boolean;
}

export const SAT_COLORES: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};

@Component({
  selector: 'app-vinculacion',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './vinculacion.component.html',
  styleUrl: './vinculacion.component.css',
})
export class VinculacionComponent implements OnInit {

  cargando = true;
  error: string | null = null;

  // Filtros
  filtroCarrera = '';
  filtroAnio = '';
  todasLasCarreras: string[] = [];
  todosLosAnios: number[] = [];

  modalCorreoVisible = false;
  correoAsunto = '';
  correoMensaje = '';
  correosExpandido = false;

  // Datos
  totalEgresados = 0;
  satisfaccionProm = 0;

  colaboraciones: ColaboracionRow[] = [];
  habilidades: HabilidadRow[] = [];
  distribucionSatisfaccion: { nivel: number; pct: number }[] = [];

  autorizaciones = [
    { tipo: 'estadisticas' as const, label: 'Fines estadísticos', total: 0, porcentaje: 0 },
    { tipo: 'contacto' as const, label: 'Oportunidades laborales', total: 0, porcentaje: 0 },
    { tipo: 'eventos' as const, label: 'Actividades y eventos institucionales', total: 0, porcentaje: 0 },
  ];

  // Panel lateral
  panelVisible = false;
  panel: PanelDetalle = {
    titulo: '',
    egresados: [],
    cargando: false,
    error: null,
    mostrarDescripcionOtro: false,
  };

  // Agrega estas propiedades junto a las otras del panel
  panelSeccion: 'colab' | 'hab' | 'auth' | null = null;
  panelValor: string = '';

  filaActiva: string | null = null;

  satColores = SAT_COLORES;

  toastVisible = false;
  toastMensaje = '';
  toastError = false;
  private toastTimer: any;
  correoCargando = false;

  // URL base para imágenes
  private readonly BASE_URL = 'http://localhost:3000';
  private destroyRef = inject(DestroyRef);
  private usuariosService = inject(UsuariosService);

  // Export
  exportMenuVisible = false;
  exportando = false;

  get roundedSatisfaccion(): number {
    return Math.round(this.satisfaccionProm);
  }

  constructor(
    private vinculacionSvc: VinculacionService,
    private estadisticasSvc: EstadisticasService,
  ) { }

  ngOnInit(): void {
    this.cargarTodo();
  }

  // Foto de perfil
  getFotoUrl(fotoUrl: string | null | undefined): string | null {
    if (!fotoUrl) return null;

    // Base64 (Railway) o URL absoluta → se usa tal cual
    if (fotoUrl.startsWith('data:') || fotoUrl.startsWith('http')) {
      return fotoUrl;
    }

    // Ruta relativa en disco (servidor ITD) → se le antepone la base
    return `${this.BASE_URL}/${fotoUrl}`;
  }

  // Filtros
  onFiltroChange(): void {
    this.cerrarPanel();
    this.cargarTodo();
  }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cerrarPanel();
    this.cargarTodo();
  }

  // Carga principal
  private cargarTodo(): void {
    this.cargando = true;
    this.error = null;

    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? +this.filtroAnio : undefined;

    forkJoin({
      stats: this.vinculacionSvc.getEstadisticas(carrera, anio),
      colaborTots: this.vinculacionSvc.getTotalesColaboraciones(carrera, anio),
      habTots: this.vinculacionSvc.getTotalesHabilidades(carrera, anio),
      distSat: this.vinculacionSvc.getDistribucionSatisfaccion(carrera, anio),
      totalEg: this.estadisticasSvc.getEstadisticas(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ stats, colaborTots, habTots, distSat, totalEg }) => {

        this.totalEgresados = +totalEg.kpis.total_egresados || 0;

        const kpis = stats.kpis;
        this.satisfaccionProm = +kpis.satisfaccion_promedio || 0;

        if (!carrera && !anio) {
          const carrerasEnResp: string[] = (stats.participacionCarrera as any[])
            .map((r: any) => r.nombre_carrera as string)
            .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
            .sort();
          this.todasLasCarreras = carrerasEnResp;

          const aniosEnResp: number[] = (stats.evolucionGeneracion as any[])
            .map((r: any) => +r.anio_egreso)
            .filter((v: number, i: number, arr: number[]) => !isNaN(v) && arr.indexOf(v) === i)
            .sort((a, b) => b - a);
          this.todosLosAnios = aniosEnResp;
        }

        if (this.todasLasCarreras.length === 0) {
          this.todasLasCarreras = (stats.participacionCarrera as any[])
            .map((r: any) => r.nombre_carrera as string)
            .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
            .sort();
        }

        // Autorizaciones
        const autContacto = +kpis.autorizo_contacto || 0;
        const autEventos = +kpis.autorizo_eventos || 0;
        const totalEst = (stats.participacionCarrera as any[])
          .reduce((acc: number, r: any) => acc + (+r.autorizo_contacto || 0), 0);

        this.autorizaciones[0].total = totalEst;
        this.autorizaciones[0].porcentaje = this.pct(totalEst, this.totalEgresados);
        this.autorizaciones[1].total = autContacto;
        this.autorizaciones[1].porcentaje = this.pct(autContacto, this.totalEgresados);
        this.autorizaciones[2].total = autEventos;
        this.autorizaciones[2].porcentaje = this.pct(autEventos, this.totalEgresados);

        // Distribución de satisfacción
        const totalConRespuesta = distSat.reduce((s, r) => s + (+r.total || 0), 0);
        this.distribucionSatisfaccion = [5, 4, 3, 2, 1].map((n) => {
          const fila = distSat.find(r => +r.nivel === n);
          const count = fila ? +fila.total : 0;
          return {
            nivel: n,
            pct: totalConRespuesta > 0 ? Math.round((count / totalConRespuesta) * 100) : 0,
          };
        });

        // Colaboraciones — el backend devuelve 'Otro' como string literal
        const otroColab = colaborTots.find(c => c.descripcion === 'Otro');
        const noParticipa = colaborTots.find(
          c => c.descripcion !== 'Otro' &&
            c.descripcion.toLowerCase().includes('no me es posible')
        );
        const resto = colaborTots.filter(
          c => c.descripcion !== 'Otro' &&
            !c.descripcion.toLowerCase().includes('no me es posible')
        );

        const ordenadas = [
          ...resto.sort((a, b) => (+b.total || 0) - (+a.total || 0)),
          ...(noParticipa ? [noParticipa] : []),
          ...(otroColab ? [otroColab] : []),
        ];

        this.colaboraciones = ordenadas.map(c => ({
          descripcion: c.descripcion,
          total: +c.total || 0,
          porcentaje: this.pct(+c.total || 0, this.totalEgresados),
          esFinal: c.descripcion.toLowerCase().includes('no me es posible'),
          esOtro: c.descripcion === 'Otro',
        }));

        // Habilidades — el backend devuelve 'Otro' como string literal
        const otroHab = habTots.find(h => h.habilidad === 'Otro');
        const restoHab = habTots.filter(h => h.habilidad !== 'Otro');
        const ordenadasHab = [
          ...restoHab.sort((a, b) => (+b.total || 0) - (+a.total || 0)),
          ...(otroHab ? [otroHab] : []),
        ];

        this.habilidades = ordenadasHab.map(h => ({
          habilidad: h.habilidad,
          total: +h.total || 0,
          porcentaje: this.pct(+h.total || 0, this.totalEgresados),
          esOtro: h.habilidad === 'Otro',
        }));

        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los datos de vinculación.';
        this.cargando = false;
      },
    });
  }

  // Helpers
  pct(valor: number, total: number): number {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
  }

  getFilaPct(nivel: number): number {
    return this.distribucionSatisfaccion.find(d => d.nivel === nivel)?.pct ?? 0;
  }

  getSatColor(nivel: number): string {
    return SAT_COLORES[nivel] ?? '#9ca3af';
  }

  labelCorto(texto: string, max = 42): string {
    return texto.length > max ? texto.slice(0, max) + '…' : texto;
  }

  getIniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  getAvatarClass(genero: string): string {
    return genero === 'Femenino' ? 'avatar-f' : 'avatar-m';
  }

  // Panel: colaboración
  abrirColaboracion(row: ColaboracionRow): void {
    const key = 'colab:' + row.descripcion;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;

    // ── NUEVO ──
    this.panelSeccion = 'colab';
    this.panelValor = row.esOtro ? 'Otro' : row.descripcion;

    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? +this.filtroAnio : undefined;

    if (row.esOtro) {
      this.abrirPanel('Otro — respuesta libre', true);
      this.vinculacionSvc.getEgresadosColaboracionOtro(carrera, anio).subscribe({
        next: (eg) => {
          this.panel.egresados = eg;
          this.panel.cargando = false;
          row.total = eg.length;
          row.porcentaje = this.pct(eg.length, this.totalEgresados);
        },
        error: () => {
          this.panel.error = 'No se pudieron cargar los egresados.';
          this.panel.cargando = false;
        },
      });
    } else {
      this.abrirPanel(row.descripcion, false);
      this.vinculacionSvc.getEgresadosPorColaboracion(row.descripcion, carrera, anio).subscribe({
        next: (eg) => {
          this.panel.egresados = eg;
          this.panel.cargando = false;
          row.total = eg.length;
          row.porcentaje = this.pct(eg.length, this.totalEgresados);
        },
        error: () => {
          this.panel.error = 'No se pudieron cargar los egresados.';
          this.panel.cargando = false;
        },
      });
    }
  }

  abrirHabilidad(row: HabilidadRow): void {
    const key = 'hab:' + row.habilidad;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;

    this.panelSeccion = 'hab';
    this.panelValor = row.esOtro ? 'Otro' : row.habilidad;


    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? +this.filtroAnio : undefined;

    if (row.esOtro) {
      this.abrirPanel('Otro — respuesta libre', true);
      this.vinculacionSvc.getEgresadosHabilidadOtro(carrera, anio).subscribe({
        next: (eg) => {
          this.panel.egresados = eg;
          this.panel.cargando = false;
          row.total = eg.length;
          row.porcentaje = this.pct(eg.length, this.totalEgresados);
        },
        error: () => {
          this.panel.error = 'No se pudieron cargar los egresados.';
          this.panel.cargando = false;
        },
      });
    } else {
      this.abrirPanel(row.habilidad, false);
      this.vinculacionSvc.getEgresadosPorHabilidad(row.habilidad, carrera, anio).subscribe({
        next: (eg) => {
          this.panel.egresados = eg;
          this.panel.cargando = false;
          row.total = eg.length;
          row.porcentaje = this.pct(eg.length, this.totalEgresados);
        },
        error: () => {
          this.panel.error = 'No se pudieron cargar los egresados.';
          this.panel.cargando = false;
        },
      });
    }
  }

  // Panel: autorización
  abrirAutorizacion(auth: typeof this.autorizaciones[0]): void {
    const key = 'auth:' + auth.tipo;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;
    this.abrirPanel(auth.label, false);

    this.panelSeccion = 'auth';
    this.panelValor = auth.tipo;

    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? +this.filtroAnio : undefined;

    this.vinculacionSvc.getEgresadosPorAutorizacion(auth.tipo, carrera, anio).subscribe({
      next: (eg) => {
        this.panel.egresados = eg;
        this.panel.cargando = false;
        auth.total = eg.length;
        auth.porcentaje = this.pct(eg.length, this.totalEgresados);
      },
      error: () => {
        this.panel.error = 'No se pudieron cargar los egresados.';
        this.panel.cargando = false;
      },
    });
  }

  // Panel helpers
  private abrirPanel(titulo: string, mostrarDescripcionOtro: boolean): void {
    this.panel = {
      titulo,
      egresados: [],
      cargando: true,
      error: null,
      mostrarDescripcionOtro,
    };
    this.panelVisible = true;
  }

  cerrarPanel(): void {
    this.panelVisible = false;
    this.filaActiva = null;
    this.panelSeccion = null;
    this.panelValor = '';
  }

  esFilaActiva(key: string): boolean {
    return this.filaActiva === key;
  }

  exportarPDF(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;

    // Si hay un panel abierto, exportar solo esa sección
    if (this.panelSeccion && this.panelValor) {
      this.vinculacionSvc.exportarPanelPdf(
        this.panelSeccion,
        this.panelValor,
        this.panel.titulo,
        this.filtroCarrera || undefined,
        this.filtroAnio ? +this.filtroAnio : undefined,
      ).subscribe({
        next: (blob: Blob) => {
          const slug = this.panelValor.toLowerCase().replace(/\s+/g, '_').slice(0, 30);
          this.descargarArchivo(blob, `vinculacion_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
          this.logAccion('exportar', `Exportó panel "${this.panel.titulo}" en PDF`, 'vinculacion');
          this.exportando = false;
        },
        error: () => { this.exportando = false; },
      });
      return;
    }

    // Sin panel abierto → exportar reporte general
    this.vinculacionSvc.exportarPdf(
      this.filtroCarrera || undefined,
      this.filtroAnio ? +this.filtroAnio : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `vinculacion_${new Date().toISOString().split('T')[0]}.pdf`);
        this.logAccion('exportar', 'Exportó Vinculación en PDF', 'vinculacion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; },
    });
  }

  exportarExcel(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.vinculacionSvc.exportarExcel(
      this.filtroCarrera || undefined,
      this.filtroAnio ? +this.filtroAnio : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `vinculacion_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', 'Exportó Vinculación en Excel', 'vinculacion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  private descargarArchivo(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
  }

  private logAccion(accion: string, descripcion: string, seccion: string): void {
    this.usuariosService.registrarAccion(accion, descripcion, seccion).subscribe({ error: () => { } });
  }

  abrirModalCorreo(): void {
    if (this.panel.egresados.length === 0) return;
    this.correosExpandido = false;
    this.correoAsunto = this.panel.titulo;
    this.correoMensaje = '';
    this.modalCorreoVisible = true;
  }

  cerrarModalCorreo(): void {
    this.modalCorreoVisible = false;
  }

  enviarCorreo(): void {
    if (this.panel.egresados.length === 0) return;
    if (this.correoCargando) return;

    this.correoCargando = true;

    const destinatarios = this.panel.egresados
      .map(e => e.correo)
      .filter(Boolean);

    this.vinculacionSvc.enviarCorreo(
      destinatarios,
      this.correoAsunto || this.panel.titulo,
      this.correoMensaje
    ).subscribe({
      next: (res) => {
        this.correoCargando = false;
        this.cerrarModalCorreo();
        this.mostrarToast(`Correo enviado a ${res.enviados} egresado(s).`, false);
      },
      error: () => {
        this.correoCargando = false;
        this.mostrarToast('Error al enviar el correo. Intenta de nuevo.', true);
      }
    });
  }

  mostrarToast(mensaje: string, esError: boolean): void {
    clearTimeout(this.toastTimer);
    this.toastMensaje = mensaje;
    this.toastError = esError;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => this.toastVisible = false, 4500);
  }

  exportarPanelExcel(): void {
    if (this.exportando || !this.panelSeccion || !this.panelValor) return;
    this.exportando = true;
    this.vinculacionSvc.exportarPanelExcel(
      this.panelSeccion,
      this.panelValor,
      this.panel.titulo,
      this.filtroCarrera || undefined,
      this.filtroAnio ? +this.filtroAnio : undefined,
    ).subscribe({
      next: (blob: Blob) => {
        const slug = this.panelValor.toLowerCase().replace(/\s+/g, '_').slice(0, 30);
        this.descargarArchivo(blob, `vinculacion_${slug}_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', `Exportó panel "${this.panel.titulo}" en Excel`, 'vinculacion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; },
    });
  }
}