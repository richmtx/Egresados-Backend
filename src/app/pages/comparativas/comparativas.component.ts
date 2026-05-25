import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  ComparativasService,
  ComparativasResponse,
  ComparativaResumen,
} from './comparativas.service';

const COLORES = ['#6366f1', '#10b981', '#f59e0b'];
const COLORES_LIGHT = ['#ede9fe', '#dcfce7', '#fef3c7'];

@Component({
  selector: 'app-comparativas',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './comparativas.component.html',
  styleUrl: './comparativas.component.css',
})
export class ComparativasComponent implements OnInit, OnDestroy {

  private chartFontFamily = "'Plus Jakarta Sans', 'Segoe UI', sans-serif";

  private baseChart = (type: any, height: number) => ({
    type,
    height,
    fontFamily: this.chartFontFamily,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, easing: 'easeinout', speed: 600 }
  });

  private baseGrid = {
    borderColor: 'rgba(100,116,139,.1)',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } }
  };

  private baseLegend = {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    fontSize: '12px',
    labels: { colors: '#64748b' },
    markers: { width: 8, height: 8, radius: 2 }
  };

  // ── Estado ──────────────────────────────────────────────────────
  carrerasDisponibles: string[] = [];
  seleccion: (string | null)[] = [null, null, null];
  datos: ComparativasResponse | null = null;
  cargando = false;
  error = false;
  tabActiva: 'resumen' | 'empleo' | 'titulacion' | 'sector' | 'ingles_migracion' | 'satisfaccion' = 'resumen';

  // ── Modal ────────────────────────────────────────────────────────
  modalAbierto = false;
  modalTitulo = '';
  modalSubtitulo = '';
  modalTipo = '';
  modalChart: any = {};

  // ── Charts ───────────────────────────────────────────────────────
  chartEmpleo: any = {};
  chartTitulacion: any = {};
  chartSectorCarrera: any = {};
  chartInglesApilado: any = {};
  chartSatisfaccion: any = {};
  chartMigracion: any = {};
  chartRadar: any = {};
  chartHeatmap: any = {};

  private destroyRef = inject(DestroyRef);

  constructor(
    private svc: ComparativasService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.svc.getCarrerasDisponibles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.carrerasDisponibles = res.map((r) => r.nombre_carrera);
      },
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  // ── Selección ────────────────────────────────────────────────────
  get seleccionActiva(): string[] {
    return this.seleccion.filter((c): c is string => !!c);
  }

  get puedeComparar(): boolean {
    return this.seleccionActiva.length >= 2;
  }

  limpiarSeleccion(): void {
    this.seleccion = [null, null, null];
    this.datos = null;
    this.error = false;
  }

  opcionesPara(idx: number): string[] {
    const otras = this.seleccion.filter((_, i) => i !== idx).filter(Boolean) as string[];
    return this.carrerasDisponibles.filter((c) => !otras.includes(c));
  }

  colorCarrera(idx: number): string {
    return COLORES[idx] ?? '#6b7280';
  }

  colorCarreraLight(idx: number): string {
    return COLORES_LIGHT[idx] ?? '#f3f4f6';
  }

  getColorIdx(carrera: string): number {
    return this.seleccionActiva.indexOf(carrera);
  }

  // ── Comparar ─────────────────────────────────────────────────────
  comparar(): void {
    if (!this.puedeComparar) return;
    this.cargando = true;
    this.error = false;
    this.datos = null;

    this.svc.getComparativas(this.seleccionActiva).subscribe({
      next: (res) => {
        this.datos = res;
        this.cargando = false;
        this.tabActiva = 'resumen';
        this.construirCharts(res);
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  // ── Construcción de charts ────────────────────────────────────────
  private construirCharts(d: ComparativasResponse): void {
    const carreras = d.resumen.map((r) => r.nombre_carrera);
    const colores = carreras.map((_, i) => COLORES[i] ?? '#6b7280');

    // 1. Empleo agrupado
    this.chartEmpleo = {
      series: [
        { name: 'Empleados',    data: d.empleo.map((e) => +e.empleados) },
        { name: 'Desempleados', data: d.empleo.map((e) => +e.desempleados) },
      ],
      chart: this.baseChart('bar', 260),
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#10b981', '#ef4444'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } },
    };

    // 2. Titulación apilada 100%
    this.chartTitulacion = {
      series: [
        { name: 'Titulado',    data: d.titulacion.map((t) => +t.pct_titulados) },
        { name: 'En trámite',  data: d.titulacion.map((t) => +t.pct_en_tramite) },
        { name: 'No titulado', data: d.titulacion.map((t) => +t.pct_no_titulados) },
      ],
      chart: { ...this.baseChart('bar', 260), stacked: true, stackType: '100%' },
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      plotOptions: { bar: { columnWidth: '50%' } },
      dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%`, style: { fontFamily: this.chartFontFamily, fontSize: '10px' } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      yaxis: { labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    };

    // 3. Sector laboral agrupado
    const sectores = [...new Set(d.sectorCarrera.map((s) => s.sector))];
    this.chartSectorCarrera = {
      series: sectores.map((sec) => ({
        name: sec,
        data: carreras.map((car) => {
          const found = d.sectorCarrera.find((s) => s.nombre_carrera === car && s.sector === sec);
          return found ? +found.porcentaje : 0;
        }),
      })),
      chart: this.baseChart('bar', 280),
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6'],
      plotOptions: { bar: { borderRadius: 3, columnWidth: '65%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      yaxis: { labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    };

    // 4. Inglés apilado 100%
    const nivelesIngles = [...new Set(d.ingles.map((i) => i.nivel))];
    this.chartInglesApilado = {
      series: nivelesIngles.map((niv) => ({
        name: niv,
        data: carreras.map((car) => {
          const found = d.ingles.find((i) => i.nombre_carrera === car && i.nivel === niv);
          return found ? +found.porcentaje : 0;
        }),
      })),
      chart: { ...this.baseChart('bar', 260), stacked: true, stackType: '100%' },
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'].slice(0, nivelesIngles.length),
      plotOptions: { bar: { columnWidth: '50%' } },
      dataLabels: { enabled: true, formatter: (v: number) => v > 5 ? `${v.toFixed(0)}%` : '', style: { fontFamily: this.chartFontFamily, fontSize: '10px' } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      yaxis: { labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    };

    // 5. Satisfacción barras distribuidas
    this.chartSatisfaccion = {
      series: [{ name: 'Promedio', data: d.satisfaccion.map((s) => +s.promedio) }],
      chart: this.baseChart('bar', 220),
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: colores,
      plotOptions: {
        bar: { borderRadius: 4, columnWidth: '45%', distributed: true, dataLabels: { position: 'top' } },
      },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => `${v}/5`,
        offsetY: -18,
        style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: ['#374151'] },
      },
      legend: { show: false },
      grid: this.baseGrid,
      yaxis: { min: 0, max: 5, labels: { formatter: (v: number) => v.toFixed(1), style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      tooltip: { y: { formatter: (v: number) => `${v}/5` } },
    };

    // 6. Migración agrupada
    this.chartMigracion = {
      series: [
        { name: 'En Durango',              data: d.migracion.map((m) => +m.en_durango) },
        { name: 'Fuera de Durango (Méx.)', data: d.migracion.map((m) => +m.fuera_durango_mexico) },
        { name: 'En el extranjero',        data: d.migracion.map((m) => +m.en_extranjero) },
      ],
      chart: this.baseChart('bar', 260),
      xaxis: { categories: carreras, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#6366f1', '#f59e0b', '#ef4444'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } },
    };

    // 7. Radar comparativo
    const inglesAvanzado = (carrera: string): number => {
      const avanz = d.ingles.find(
        (i) => i.nombre_carrera === carrera && i.nivel.toLowerCase().includes('avan')
      );
      return avanz ? +avanz.porcentaje : 0;
    };
    this.chartRadar = {
      series: d.resumen.map((r) => ({
        name: r.nombre_carrera,
        data: [
          +r.pct_empleados,
          +r.pct_titulados,
          inglesAvanzado(r.nombre_carrera),
          +(+r.satisfaccion_promedio * 20).toFixed(1),
          +r.pct_fuera_durango,
        ],
      })),
      chart: this.baseChart('radar', 320),
      xaxis: { categories: ['Empleo', 'Titulación', 'Inglés avanz.', 'Satisfacción', 'Fuera Dgo.'] },
      colors: colores,
      fill: { opacity: 0.15 },
      stroke: { width: 2 },
      markers: { size: 4 },
      yaxis: { show: false },
      legend: { ...this.baseLegend, position: 'bottom' },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    };

    // 8. Heatmap
    this.chartHeatmap = {
      series: d.resumen.map((r) => ({
        name: r.nombre_carrera,
        data: [
          { x: 'Empleo %',       y: +r.pct_empleados },
          { x: 'Titulación %',   y: +r.pct_titulados },
          { x: 'Satisfacción %', y: +(+r.satisfaccion_promedio * 20).toFixed(1) },
          { x: 'Fuera Dgo. %',   y: +r.pct_fuera_durango },
          { x: 'Extranjero %',   y: +(d.migracion.find((m) => m.nombre_carrera === r.nombre_carrera)?.pct_extranjero ?? 0) },
        ],
      })),
      chart: this.baseChart('heatmap', 220),
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '11px' } },
      colors: ['#6366f1'],
      xaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { show: false },
      tooltip: { y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    };
  }

  // ── Helpers de template ───────────────────────────────────────────
  getPct(a: number, b: number): string {
    if (!b) return '0';
    return ((a / b) * 100).toFixed(1);
  }

  getLider(campo: keyof ComparativaResumen): { carrera: string; valor: number | string } | null {
    if (!this.datos?.resumen.length) return null;
    const sorted = [...this.datos.resumen].sort((a, b) => +(b[campo] ?? 0) - +(a[campo] ?? 0));
    return { carrera: sorted[0].nombre_carrera, valor: sorted[0][campo] as number };
  }

  getSectores(): string[] {
    if (!this.datos) return [];
    return [...new Set(this.datos.sectorCarrera.map((s) => s.sector))];
  }

  getSectorValor(carrera: string, sector: string): string {
    if (!this.datos) return '0';
    const found = this.datos.sectorCarrera.find(
      (s) => s.nombre_carrera === carrera && s.sector === sector
    );
    return found ? found.porcentaje.toString() : '0';
  }

  setTab(tab: typeof this.tabActiva): void {
    this.tabActiva = tab;
  }

  // ── Modal ─────────────────────────────────────────────────────────
  abrirModal(tipo: string, titulo: string, subtitulo: string, chart: any): void {
    this.modalChart = {
      ...chart,
      chart: { ...chart.chart, height: tipo === 'bar' ? Math.max(420, (chart.chart?.height || 300) + 160) : 460 },
    };
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalAbierto = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  // Exportar PDF
  exportar(): void {}
}