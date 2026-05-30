import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasResponse, FiltrosEstadisticas } from './models/estadisticas.model';
import { UsuariosService } from '../usuarios/usuarios.service';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent implements OnInit, OnDestroy {

  datos: EstadisticasResponse | null = null;
  cargando = true;
  error = false;

  filtroCarrera = '';
  filtroAnio = '';
  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];

  modalAbierto = false;
  modalTitulo = '';
  modalSubtitulo = '';
  modalTipo = '';
  modalChart: any = {};
  chartInglesCarreraModal: any;

  exportMenuVisible = false;
  exportando = false;

  abrirModal(tipo: string, titulo: string, subtitulo: string, chartConfig: any): void {
    if (tipo === 'radar' && chartConfig.xaxis?.categories?.length > 5) {
      const categorias: string[] = chartConfig.xaxis.categories;
      const valores: number[] = chartConfig.series[0]?.data ?? [];
      const pares = categorias
        .map((cat: string, i: number) => ({ cat, val: valores[i] ?? 0 }))
        .sort((a: any, b: any) => b.val - a.val);

      this.modalChart = {
        series: [{ name: 'Satisfacción promedio', data: pares.map((p: any) => p.val) }],
        chart: { ...this.baseChart('bar', Math.max(420, pares.length * 44)), height: Math.max(420, pares.length * 44) },
        xaxis: {
          categories: pares.map((p: any) => p.cat),
          labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 260 },
          axisBorder: { show: false }, axisTicks: { show: false }, min: 0, max: 5
        },
        yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
        plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
        dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? val.toFixed(1) : '' },
        colors: ['#6366f1'], legend: { show: false },
        grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)} / 5` } }
      };
      this.modalTipo = 'bar';
      this.modalTitulo = titulo;
      this.modalSubtitulo = subtitulo + ' · ordenado por satisfacción';
      this.modalAbierto = true;
      if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
      return;
    }

    this.modalChart = {
      ...chartConfig,
      chart: { ...chartConfig.chart, height: tipo === 'bar' ? Math.max(420, (chartConfig.chart?.height || 300) + 160) : 460 }
    };
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalAbierto = true;
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  private PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#0ea5e9'];
  private chartFontFamily = "'Plus Jakarta Sans', 'Segoe UI', sans-serif";

  private baseChart = (type: any, height: number) => ({
    type, height,
    fontFamily: this.chartFontFamily,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, easing: 'easeinout', speed: 600 }
  });

  private baseGrid = { borderColor: 'rgba(100,116,139,.1)', strokeDashArray: 4, xaxis: { lines: { show: false } } };
  private baseLegend = {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", fontSize: '12px',
    labels: { colors: '#64748b' }, markers: { width: 8, height: 8, radius: 2 }
  };

  chartSituacion: any = {};
  chartEmpCarrera: any = {};
  chartTitulacion: any = {};
  chartTendTitulacion: any = {};
  chartIngles: any = {};
  chartInglesCarrera: any = {};
  chartRadar: any = {};
  chartEmpresas: any = {};
  chartEvolucion: any = {};
  chartSector: any = {};
  chartParticipacion: any = {};
  chartFueraDurango: any = {};
  chartFueraMexico: any = {};

  insights: { icon: SafeHtml; iconColor: string; bg: string; titulo: string; descripcion: string }[] = [];

  private destroyRef = inject(DestroyRef);
  private usuariosService = inject(UsuariosService);

  constructor(
    private estadisticasService: EstadisticasService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  // ── CARGA DE DATOS ─────────────────────────────────────────────────────────

  cargarEstadisticas(): void {
    this.cargando = true;
    this.error = false;
    const filtros: FiltrosEstadisticas = {};
    if (this.filtroCarrera) filtros.carrera = this.filtroCarrera;
    if (this.filtroAnio) filtros.anio = parseInt(this.filtroAnio);

    this.estadisticasService.getEstadisticas(filtros).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.datos = data;
        this.poblarFiltros(data);
        this.construirTodasLasGraficas(data);
        this.generarInsights(data);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
        this.error = true;
        this.cargando = false;
      }
    });
  }

  get leyendaSituacion(): { label: string; color: string }[] {
    if (!this.datos) return [];
    return this.datos.situacionLaboral.map((s, i) => ({ label: s.situacion, color: this.PALETTE[i % this.PALETTE.length] }));
  }

  onFiltroChange(): void { this.cargarEstadisticas(); }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarEstadisticas();
  }

  // ── EXPORTACIÓN ────────────────────────────────────────────────────────────

  exportarPDF(): void {
    if (!this.datos || this.exportando) return;
    this.exportMenuVisible = false;
    this.exportando = true;

    const filtros: FiltrosEstadisticas = {};
    if (this.filtroCarrera) filtros.carrera = this.filtroCarrera;
    if (this.filtroAnio) filtros.anio = parseInt(this.filtroAnio);

    this.estadisticasService.exportarPdf(filtros).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `estadisticas_generales_${new Date().toISOString().split('T')[0]}.pdf`);
        this.logAccion('exportar', 'Exportó Estadísticas Generales en PDF', 'estadisticas');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  exportarExcel(): void {
    if (!this.datos || this.exportando) return;
    this.exportMenuVisible = false;
    this.exportando = true;

    const filtros: FiltrosEstadisticas = {};
    if (this.filtroCarrera) filtros.carrera = this.filtroCarrera;
    if (this.filtroAnio) filtros.anio = parseInt(this.filtroAnio);

    this.estadisticasService.exportarExcel(filtros).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `estadisticas_generales_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', 'Exportó Estadísticas Generales en Excel', 'estadisticas');
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

  // ── HELPERS ────────────────────────────────────────────────────────────────

  getPct(parte: number, total: number): string {
    if (!total) return '0';
    return ((parte / total) * 100).toFixed(1);
  }

  private poblarFiltros(data: EstadisticasResponse): void {
    const carreras = [...new Set(data.empleabilidadCarrera.map(e => e.nombre_carrera))];
    const anios = [...new Set(data.titulacionAnio.map(t => t.anio_egreso))].sort();
    if (!this.filtroCarrera) this.carrerasDisponibles = carreras;
    if (!this.filtroAnio) this.aniosDisponibles = anios;
  }

  private abrevCarrera(nombre: string): string {
    return nombre
      .replace('Ingeniería ', 'Ing. ')
      .replace('Sistemas Computacionales (Presencial / Virtual)', 'Sistemas Comp.')
      .replace('Sistemas Computacionales', 'Sistemas Comp.');
  }

  // ── CONSTRUCCIÓN DE GRÁFICAS ───────────────────────────────────────────────

  private construirTodasLasGraficas(data: EstadisticasResponse): void {
    this.buildSituacionLaboral(data);
    this.buildEmpCarrera(data);
    this.buildTitulacion(data);
    this.buildTendTitulacion(data);
    this.buildIngles(data);
    this.buildInglesCarrera(data);
    this.buildRadar(data);
    this.buildEmpresas(data);
    this.buildEvolucion(data);
    this.buildSector(data);
    this.buildParticipacion(data);
    this.buildFueraDurango(data);
    this.buildFueraMexico(data);
  }

  // 1. Situación laboral – Barras
  private buildSituacionLaboral(data: EstadisticasResponse): void {
    const total = data.situacionLaboral.reduce((s, i) => s + +i.total, 0);
    const sorted = [...data.situacionLaboral].sort((a, b) => +b.total - +a.total);
    const abrevSituacion = (s: string): string => s
      .replace('Empleado en el sector privado', 'Sector privado')
      .replace('Empleado en el sector público', 'Sector público')
      .replace('Empresario / Trabajo por cuenta propia (Freelance)', 'Freelance')
      .replace('Estudiando Posgrado', 'Posgrado')
      .replace('Dedicado al hogar u otras actividades', 'Hogar / Otras');

    this.chartSituacion = {
      series: [{ name: 'Egresados', data: sorted.map(s => +s.total) }],
      chart: { ...this.baseChart('bar', 300) },
      xaxis: {
        categories: sorted.map(s => abrevSituacion(s.situacion)),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#374151' }, rotate: -30, rotateAlways: true, trim: false, maxHeight: 80 },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: false, borderRadius: 5, columnWidth: '50%', dataLabels: { position: 'top' } } },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${((val / total) * 100).toFixed(1)}%`,
        offsetY: -20,
        style: { fontFamily: this.chartFontFamily, fontSize: '10px', fontWeight: '700', colors: ['#374151'] },
        dropShadow: { enabled: false }
      },
      colors: this.PALETTE, distributed: true, legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: {
        x: { formatter: (_: any, opts: any) => sorted[opts.dataPointIndex]?.situacion ?? '' },
        y: { formatter: (v: number) => `${v} egresados (${((v / total) * 100).toFixed(1)}%)` }
      }
    };
  }

  // 2. Empleabilidad por carrera – Barras
  private buildEmpCarrera(data: EstadisticasResponse): void {
    const sorted = [...data.empleabilidadCarrera].sort((a, b) => (+b.empleados / +b.total) - (+a.empleados / +a.total));
    const labels = sorted.map(e => this.abrevCarrera(e.nombre_carrera));

    this.chartEmpCarrera = {
      series: [
        { name: 'Empleados', data: sorted.map(e => +e.empleados) },
        { name: 'Total', data: sorted.map(e => +e.total) }
      ],
      chart: { ...this.baseChart('bar', Math.max(320, labels.length * 52)) },
      xaxis: {
        categories: labels,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 260 },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%', dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#6366f1', '#e2e8f0'],
      legend: { ...this.baseLegend, position: 'top' },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 3. Titulación – Dona
  private buildTitulacion(data: EstadisticasResponse): void {
    const k = data.kpis;
    this.chartTitulacion = {
      series: [+k.titulados, +k.en_tramite, +k.no_titulados],
      chart: { ...this.baseChart('donut', 280) },
      labels: ['Titulado', 'En trámite', 'No titulado'],
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      legend: { ...this.baseLegend, position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: { show: true, label: 'Total', fontSize: '12px', fontFamily: this.chartFontFamily, color: '#64748b', formatter: () => `${+k.titulados + +k.en_tramite + +k.no_titulados}` }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 4. Tendencia titulación – Área
  private buildTendTitulacion(data: EstadisticasResponse): void {
    const sorted = [...data.titulacionAnio].sort((a, b) => a.anio_egreso - b.anio_egreso);
    this.chartTendTitulacion = {
      series: [
        { name: '% Titulados', data: sorted.map(t => +t.pct_titulados) },
        { name: 'En trámite', data: sorted.map(t => +(+t.en_tramite * 100 / (+t.total || 1)).toFixed(1)) }
      ],
      chart: { ...this.baseChart('area', 260) },
      xaxis: { categories: sorted.map(t => t.anio_egreso.toString()), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      yaxis: { max: 100, labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#10b981', '#f59e0b'],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
      markers: { size: 4 }, grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v}%` } }
    };
  }

  // 5. Nivel de inglés – Pie
  private buildIngles(data: EstadisticasResponse): void {
    this.chartIngles = {
      series: data.nivelesIngles.map(n => +n.total),
      chart: { ...this.baseChart('pie', 260) },
      labels: data.nivelesIngles.map(n => n.nivel),
      colors: ['#ef4444', '#3b82f6', '#10b981', '#94a3b8'],
      legend: { ...this.baseLegend, position: 'bottom' },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' }, dropShadow: { enabled: false } },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 6. Inglés por carrera – Barras agrupadas
  private buildInglesCarrera(data: EstadisticasResponse): void {
    const carreras = [...new Set(data.inglesCarrera.map(i => i.nombre_carrera))];
    const niveles = [...new Set(data.inglesCarrera.map(i => i.nivel))];
    const coloresNivel: Record<string, string> = {
      'Básico (A1-A2)': '#ef4444', 'Intermedio (B1-B2)': '#3b82f6', 'Avanzado (C1-C2)': '#10b981',
    };
    const series = niveles.map(nivel => ({
      name: nivel,
      data: carreras.map(carrera => {
        const match = data.inglesCarrera.find(i => i.nombre_carrera === carrera && i.nivel === nivel);
        return match ? +match.total : 0;
      })
    }));

    this.chartInglesCarrera = {
      series,
      chart: { ...this.baseChart('bar', 260) },
      xaxis: { categories: carreras.map(c => this.abrevCarrera(c)), labels: { show: false } },
      colors: niveles.map(n => coloresNivel[n] || this.PALETTE[0]),
      plotOptions: { bar: { borderRadius: 4, columnWidth: '65%' } },
      dataLabels: { enabled: false }, legend: { ...this.baseLegend, position: 'top' }, grid: this.baseGrid
    };

    this.chartInglesCarreraModal = {
      series,
      chart: { ...this.baseChart('bar', 420) },
      xaxis: {
        categories: carreras.map(c => this.abrevCarrera(c)), tickAmount: carreras.length,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' }, rotate: -45, rotateAlways: true, hideOverlappingLabels: false, trim: false }
      },
      colors: niveles.map(n => coloresNivel[n] || this.PALETTE[0]),
      plotOptions: { bar: { borderRadius: 4, columnWidth: '65%' } },
      dataLabels: { enabled: false }, legend: { ...this.baseLegend, position: 'top' }, grid: this.baseGrid
    };
  }

  // 7. Satisfacción por carrera – Radar
  private buildRadar(data: EstadisticasResponse): void {
    this.chartRadar = {
      series: [{ name: 'Satisfacción promedio', data: data.satisfaccionCarrera.map(s => +s.promedio) }],
      chart: { ...this.baseChart('radar', 270) },
      xaxis: { categories: data.satisfaccionCarrera.map(s => this.abrevCarrera(s.nombre_carrera)) },
      colors: ['#6366f1'], fill: { opacity: 0.18 }, markers: { size: 4 },
      yaxis: { min: 0, max: 5, tickAmount: 5, labels: { formatter: (v: number) => v.toFixed(0) } }
    };
  }

  // 8. Top empresas – Barras horizontales
  private buildEmpresas(data: EstadisticasResponse): void {
    const top = data.topEmpresas.slice(0, 10);
    this.chartEmpresas = {
      series: [{ name: 'Egresados', data: top.map(e => +e.total) }],
      chart: { ...this.baseChart('bar', Math.max(280, top.length * 42)) },
      xaxis: {
        categories: top.map(e => e.empresa),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11.5px', colors: '#374151' }, maxWidth: 200 },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#6366f1'], legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` } }
    };
  }

  // 9. Evolución por generación – Líneas
  private buildEvolucion(data: EstadisticasResponse): void {
    const sorted = [...data.evolucionGeneracion].sort((a, b) => a.anio_egreso - b.anio_egreso);
    this.chartEvolucion = {
      series: [
        { name: 'Empleabilidad %', data: sorted.map(e => +e.pct_empleados) },
        { name: 'Titulación %', data: sorted.map(e => +e.pct_titulados) },
        { name: 'Satisfacción %', data: sorted.map(e => +e.satisfaccion_pct) }
      ],
      chart: { ...this.baseChart('line', 280) },
      xaxis: { categories: sorted.map(e => e.anio_egreso.toString()), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      colors: ['#6366f1', '#10b981', '#f59e0b'],
      stroke: { curve: 'smooth', width: [2.5, 2.5, 2], dashArray: [0, 0, 5] },
      fill: { type: 'solid', opacity: 1 }, markers: { size: 4 },
      legend: { ...this.baseLegend, position: 'top' }, grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v}%` } }
    };
  }

  // 10. Sector laboral – Pie
  private buildSector(data: EstadisticasResponse): void {
    this.chartSector = {
      series: data.sectorLaboral.map(s => +s.total),
      chart: { ...this.baseChart('pie', 280) },
      labels: data.sectorLaboral.map(s => s.sector),
      colors: ['#3b82f6', '#6366f1', '#10b981', '#a855f7', '#ef4444', '#f59e0b'],
      legend: { ...this.baseLegend, position: 'bottom' },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' }, dropShadow: { enabled: false } },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 11. Participación por carrera – Barras
  private buildParticipacion(data: EstadisticasResponse): void {
    const labels = data.participacionCarrera.map(p => this.abrevCarrera(p.nombre_carrera));
    const series = [
      { name: 'Autorizó contacto', data: data.participacionCarrera.map(p => +p.autorizo_contacto) },
      { name: 'Autorizó eventos', data: data.participacionCarrera.map(p => +p.autorizo_eventos) }
    ];
    this.chartParticipacion = {
      series,
      chart: { ...this.baseChart('bar', 280), stacked: false },
      xaxis: {
        categories: labels, tickAmount: labels.length,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' }, rotate: -45, rotateAlways: true, hideOverlappingLabels: false, trim: false }
      },
      colors: ['#6366f1', '#10b981'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false }, legend: { ...this.baseLegend, position: 'top' }, grid: this.baseGrid
    };
  }

  // 12. Fuera de Durango
  private buildFueraDurango(data: EstadisticasResponse): void {
    if (!data.fueraDurango.length) return;
    const mapa = new Map<string, number>();
    data.fueraDurango.forEach(f => mapa.set(f.ciudad_trabajo, (mapa.get(f.ciudad_trabajo) || 0) + +f.total));
    const sorted = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ciudades = sorted.map(([c]) => c);
    const totales = sorted.map(([, t]) => t);

    this.chartFueraDurango = {
      series: [{ name: 'Egresados', data: totales }],
      chart: { ...this.baseChart('bar', Math.max(220, ciudades.length * 44)) },
      xaxis: { categories: ciudades, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 150 }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#f59e0b'], legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` } }
    };
  }

  // 13. Fuera de México
  private buildFueraMexico(data: EstadisticasResponse): void {
    if (!data.fueraMexico.length) return;
    const mapa = new Map<string, number>();
    data.fueraMexico.forEach(f => mapa.set(f.ciudad_trabajo, (mapa.get(f.ciudad_trabajo) || 0) + +f.total));
    const sorted = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ciudades = sorted.map(([c]) => c);
    const totales = sorted.map(([, t]) => t);

    this.chartFueraMexico = {
      series: [{ name: 'Egresados', data: totales }],
      chart: { ...this.baseChart('bar', Math.max(220, ciudades.length * 44)) },
      xaxis: { categories: ciudades, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 160 }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#6366f1'], legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` } }
    };
  }

  // INSIGHTS

  private generarInsights(data: EstadisticasResponse): void {
    const insights: { icon: SafeHtml; iconColor: string; bg: string; titulo: string; descripcion: string }[] = [];
    const k = data.kpis;

    const iconos = {
      trofeo: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,

      diploma: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,

      globo: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,

      estrella: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

      avion: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>`,

      pin: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    };

    const masEmpleable = data.empleabilidadCarrera.reduce(
      (prev, curr) => (+curr.empleados / +curr.total) > (+prev.empleados / +prev.total) ? curr : prev,
      data.empleabilidadCarrera[0]
    );
    if (masEmpleable) {
      const pct = this.getPct(+masEmpleable.empleados, +masEmpleable.total);
      insights.push({
        icon: this.sanitizer.bypassSecurityTrustHtml(iconos.trofeo),
        iconColor: '#7c3aed', bg: '#ede9fe',
        titulo: 'Carrera más empleable',
        descripcion: `${this.abrevCarrera(masEmpleable.nombre_carrera)} tiene la tasa más alta de empleo: ${pct}% de sus egresados trabajan actualmente.`
      });
    }

    insights.push({
      icon: this.sanitizer.bypassSecurityTrustHtml(iconos.diploma),
      iconColor: '#059669', bg: '#dcfce7',
      titulo: 'Tasa de titulación',
      descripcion: `El ${this.getPct(+k.titulados, +k.total_egresados)}% de los egresados ya están titulados. ${k.en_tramite} tienen el proceso en trámite actualmente.`
    });

    const nivelDominante = data.nivelesIngles.reduce((a, b) => +b.total > +a.total ? b : a, data.nivelesIngles[0]);
    if (nivelDominante) {
      insights.push({
        icon: this.sanitizer.bypassSecurityTrustHtml(iconos.globo),
        iconColor: '#d97706', bg: '#fef3c7',
        titulo: 'Nivel de inglés dominante',
        descripcion: `El ${this.getPct(+nivelDominante.total, +k.total_egresados)}% de los egresados tienen nivel ${nivelDominante.nivel}. Considerar programas de mejora del idioma.`
      });
    }

    if (+k.satisfaccion_promedio >= 4) {
      insights.push({
        icon: this.sanitizer.bypassSecurityTrustHtml(iconos.estrella),
        iconColor: '#ca8a04', bg: '#fef9c3',
        titulo: 'Alta satisfacción académica',
        descripcion: `La satisfacción promedio es ${k.satisfaccion_promedio}/5, lo que indica una percepción positiva de la formación recibida.`
      });
    }

    if (data.fueraMexico.length > 0) {
      const totalExt = data.fueraMexico.reduce((s, f) => s + +f.total, 0);
      insights.push({
        icon: this.sanitizer.bypassSecurityTrustHtml(iconos.avion),
        iconColor: '#0284c7', bg: '#f0f9ff',
        titulo: 'Egresados en el extranjero',
        descripcion: `${totalExt} egresado${totalExt > 1 ? 's' : ''} trabaja${totalExt === 1 ? '' : 'n'} fuera de México, presencia internacional del ITD.`
      });
    }

    if (data.fueraDurango.length > 0) {
      const totalFD = data.fueraDurango.reduce((s, f) => s + +f.total, 0);
      insights.push({
        icon: this.sanitizer.bypassSecurityTrustHtml(iconos.pin),
        iconColor: '#9333ea', bg: '#fdf4ff',
        titulo: 'Movilidad nacional',
        descripcion: `${totalFD} egresado${totalFD > 1 ? 's' : ''} trabaja${totalFD === 1 ? '' : 'n'} en otras ciudades de México fuera de Durango.`
      });
    }

    this.insights = insights;
  }
}