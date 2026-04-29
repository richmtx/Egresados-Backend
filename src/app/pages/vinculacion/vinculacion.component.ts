import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  VinculacionService,
  EgresadoContacto,
} from './vinculacion.service';
import { EstadisticasService } from '../estadisticas/estadisticas.service';

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

const OTRO_KEY = '__otro__';

@Component({
  selector: 'app-vinculacion',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './vinculacion.component.html',
  styleUrl: './vinculacion.component.css',
})
export class VinculacionComponent implements OnInit {

  cargando = true;
  error: string | null = null;

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

  panelVisible = false;
  panel: PanelDetalle = {
    titulo: '',
    egresados: [],
    cargando: false,
    error: null,
    mostrarDescripcionOtro: false,
  };
  filaActiva: string | null = null;

  satColores = SAT_COLORES;

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

  private cargarTodo(): void {
    this.cargando = true;
    this.error = null;

    forkJoin({
      stats: this.vinculacionSvc.getEstadisticas(),
      colaborTots: this.vinculacionSvc.getTotalesColaboraciones(),
      habTots: this.vinculacionSvc.getTotalesHabilidades(),
      distSat: this.vinculacionSvc.getDistribucionSatisfaccion(),
      totalEg: this.estadisticasSvc.getEstadisticas(),
    }).subscribe({
      next: ({ stats, colaborTots, habTots, distSat, totalEg }) => {

        // Total de egresados desde el endpoint de Estadísticas
        this.totalEgresados = +totalEg.kpis.total_egresados || 0;

        // KPIs de vinculación
        const kpis = stats.kpis;
        this.satisfaccionProm = +kpis.satisfaccion_promedio || 0;

        const autContacto = +kpis.autorizo_contacto || 0;
        const autEventos = +kpis.autorizo_eventos || 0;

        // Autorizaciones
        const totalEst = (stats.participacionCarrera as any[])
          .reduce((acc: number, r: any) => acc + (+r.autorizo_contacto || 0), 0);

        this.autorizaciones[0].total = totalEst;
        this.autorizaciones[0].porcentaje = this.pct(totalEst, this.totalEgresados);
        this.autorizaciones[1].total = autContacto;
        this.autorizaciones[1].porcentaje = this.pct(autContacto, this.totalEgresados);
        this.autorizaciones[2].total = autEventos;
        this.autorizaciones[2].porcentaje = this.pct(autEventos, this.totalEgresados);

        // Distribución REAL de satisfacción
        const totalConRespuesta = distSat.reduce((s, r) => s + (+r.total || 0), 0);
        this.distribucionSatisfaccion = [5, 4, 3, 2, 1].map((n) => {
          const fila = distSat.find(r => +r.nivel === n);
          const count = fila ? +fila.total : 0;
          return {
            nivel: n,
            pct: totalConRespuesta > 0 ? Math.round((count / totalConRespuesta) * 100) : 0,
          };
        });

        // Colaboraciones
        const otroColab = colaborTots.find(c => c.descripcion === OTRO_KEY);
        const noParticipa = colaborTots.find(
          c => c.descripcion !== OTRO_KEY &&
            c.descripcion.toLowerCase().includes('no me es posible')
        );
        const resto = colaborTots.filter(
          c => c.descripcion !== OTRO_KEY &&
            !c.descripcion.toLowerCase().includes('no me es posible')
        );

        const ordenadas = [
          ...resto.sort((a, b) => (+b.total || 0) - (+a.total || 0)),
          ...(noParticipa ? [noParticipa] : []),
          ...(otroColab ? [otroColab] : []),
        ];

        this.colaboraciones = ordenadas.map((c) => ({
          descripcion: c.descripcion === OTRO_KEY ? 'Otro' : c.descripcion,
          total: +c.total || 0,
          porcentaje: this.pct(+c.total || 0, this.totalEgresados),
          esFinal: c.descripcion.toLowerCase().includes('no me es posible'),
          esOtro: c.descripcion === OTRO_KEY,
        }));

        // Habilidades
        const otroHab = habTots.find(h => h.habilidad === OTRO_KEY);
        const restoHab = habTots.filter(h => h.habilidad !== OTRO_KEY);

        const ordenadasHab = [
          ...restoHab.sort((a, b) => (+b.total || 0) - (+a.total || 0)),
          ...(otroHab ? [otroHab] : []),
        ];

        this.habilidades = ordenadasHab.map((h) => ({
          habilidad: h.habilidad === OTRO_KEY ? 'Otro' : h.habilidad,
          total: +h.total || 0,
          porcentaje: this.pct(+h.total || 0, this.totalEgresados),
          esOtro: h.habilidad === OTRO_KEY,
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

  private pctSatisfaccion(nivel: number, promedio: number): number {
    const tablas: Record<number, number[]> = {
      5: [3, 5, 10, 47, 35],
      4: [3, 7, 14, 48, 28],
      3: [5, 10, 35, 32, 18],
      2: [10, 20, 35, 25, 10],
      1: [25, 30, 25, 12, 8],
    };
    const idx = Math.min(5, Math.max(1, Math.round(promedio)));
    return tablas[idx]?.[5 - nivel] ?? 20;
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
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  getAvatarClass(genero: string): string {
    return genero === 'Femenino' ? 'avatar-f' : 'avatar-m';
  }

  // Abrir panel: colaboración
  abrirColaboracion(row: ColaboracionRow): void {
    const key = 'colab:' + row.descripcion;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;

    if (row.esOtro) {
      this.abrirPanel('Otro — respuesta libre', true);
      this.vinculacionSvc.getEgresadosColaboracionOtro().subscribe({
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
      this.vinculacionSvc.getEgresadosPorColaboracion(row.descripcion).subscribe({
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

  // Abrir panel: habilidad
  abrirHabilidad(row: HabilidadRow): void {
    const key = 'hab:' + row.habilidad;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;

    if (row.esOtro) {
      this.abrirPanel('Otro — respuesta libre', true);
      this.vinculacionSvc.getEgresadosHabilidadOtro().subscribe({
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
      this.vinculacionSvc.getEgresadosPorHabilidad(row.habilidad).subscribe({
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

  // Abrir panel: autorización
  abrirAutorizacion(auth: typeof this.autorizaciones[0]): void {
    const key = 'auth:' + auth.tipo;
    if (this.filaActiva === key) { this.cerrarPanel(); return; }
    this.filaActiva = key;
    this.abrirPanel(auth.label, false);

    this.vinculacionSvc.getEgresadosPorAutorizacion(auth.tipo).subscribe({
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
  }

  esFilaActiva(key: string): boolean {
    return this.filaActiva === key;
  }

  exportarPDF(): void { window.print(); }
}