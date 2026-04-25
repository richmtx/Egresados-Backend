import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasResponse, FiltrosEstadisticas } from './models/estadisticas.model';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent implements OnInit, OnDestroy {

  // Estado
  datos: EstadisticasResponse | null = null;
  cargando = true;
  error = false;

  // Filtros
  filtroCarrera = '';
  filtroAnio = '';

  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];

  // Modal
  modalAbierto = false;
  modalTitulo = '';
  modalSubtitulo = '';
  modalTipo = '';
  modalChart: any = {};

  abrirModal(tipo: string, titulo: string, subtitulo: string, chartConfig: any): void {

    // ── Caso especial: Radar con muchas carreras → barras horizontales
    if (tipo === 'radar' && chartConfig.xaxis?.categories?.length > 5) {
      const categorias: string[] = chartConfig.xaxis.categories;
      const valores: number[] = chartConfig.series[0]?.data ?? [];

      const pares = categorias
        .map((cat: string, i: number) => ({ cat, val: valores[i] ?? 0 }))
        .sort((a: any, b: any) => b.val - a.val);

      this.modalChart = {
        series: [{ name: 'Satisfacción promedio', data: pares.map((p: any) => p.val) }],
        chart: {
          ...this.baseChart('bar', Math.max(420, pares.length * 44)),
          height: Math.max(420, pares.length * 44)
        },
        xaxis: {
          categories: pares.map((p: any) => p.cat),
          labels: {
            style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' },
            maxWidth: 260
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
          min: 0, max: 5
        },
        yaxis: {
          labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } }
        },
        plotOptions: {
          bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } }
        },
        dataLabels: {
          enabled: true,
          style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] },
          formatter: (val: number) => val > 0 ? val.toFixed(1) : ''
        },
        colors: ['#6366f1'],
        legend: { show: false },
        grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)} / 5` } }
      };

      this.modalTipo = 'bar';
      this.modalTitulo = titulo;
      this.modalSubtitulo = subtitulo + ' · ordenado por satisfacción';
      this.modalAbierto = true;

      // Protegido con isPlatformBrowser
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    // Comportamiento normal
    this.modalChart = {
      ...chartConfig,
      chart: {
        ...chartConfig.chart,
        height: tipo === 'bar' ? Math.max(420, (chartConfig.chart?.height || 300) + 160) : 460
      }
    };
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalAbierto = true;

    // Protegido con isPlatformBrowser
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    // Protegido con isPlatformBrowser
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  ngOnDestroy(): void {
    // Protegido con isPlatformBrowser
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  // Paleta de colores
  private PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#0ea5e9'];

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

  // Definición de gráficas (se inicializan vacías)
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

  // Insights dinámicos
  insights: { emoji: string; bg: string; titulo: string; descripcion: string }[] = [];

  constructor(
    private estadisticasService: EstadisticasService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  // CARGA DE DATOS
  cargarEstadisticas(): void {
    this.cargando = true;
    this.error = false;

    const filtros: FiltrosEstadisticas = {};
    if (this.filtroCarrera) filtros.carrera = this.filtroCarrera;
    if (this.filtroAnio) filtros.anio = parseInt(this.filtroAnio);

    this.estadisticasService.getEstadisticas(filtros).subscribe({
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

  onFiltroChange(): void {
    this.cargarEstadisticas();
  }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarEstadisticas();
  }

  exportarPDF(): void {
    window.print();
  }

  // HELPERS
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

  // CONSTRUCCIÓN DE GRÁFICAS
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

  // 1. Situación laboral – Pie 
  private buildSituacionLaboral(data: EstadisticasResponse): void {
    this.chartSituacion = {
      series: data.situacionLaboral.map(s => +s.total),
      chart: this.baseChart('pie', 280),
      labels: data.situacionLaboral.map(s => s.situacion),
      colors: this.PALETTE,
      legend: { ...this.baseLegend, position: 'bottom' },
      dataLabels: {
        enabled: true,
        style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' },
        dropShadow: { enabled: false }
      },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } },
      responsive: [{ breakpoint: 600, options: { chart: { height: 240 }, legend: { position: 'bottom' } } }]
    };
  }

  // 2. Empleabilidad por carrera – Barras
  private buildEmpCarrera(data: EstadisticasResponse): void {
    const labels = data.empleabilidadCarrera.map(e => this.abrevCarrera(e.nombre_carrera));
    const empleados = data.empleabilidadCarrera.map(e => +e.empleados);
    const total = data.empleabilidadCarrera.map(e => +e.total);

    this.chartEmpCarrera = {
      series: [
        { name: 'Empleados', data: empleados },
        { name: 'Total', data: total }
      ],
      chart: this.baseChart('bar', 280),
      xaxis: {
        categories: labels,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' }, rotate: -20 }
      },
      colors: ['#6366f1', '#e2e8f0'],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid
    };
  }

  // 3. Titulación – Dona 
  private buildTitulacion(data: EstadisticasResponse): void {
    const k = data.kpis;
    this.chartTitulacion = {
      series: [+k.titulados, +k.en_tramite, +k.no_titulados],
      chart: this.baseChart('donut', 280),
      labels: ['Titulado', 'En trámite', 'No titulado'],
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      legend: { ...this.baseLegend, position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '12px',
                fontFamily: this.chartFontFamily,
                color: '#64748b',
                formatter: () => `${+k.titulados + +k.en_tramite + +k.no_titulados}`
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 4. Tendencia titulación por año – Línea
  private buildTendTitulacion(data: EstadisticasResponse): void {
    const sorted = [...data.titulacionAnio].sort((a, b) => a.anio_egreso - b.anio_egreso);
    this.chartTendTitulacion = {
      series: [
        { name: '% Titulados', data: sorted.map(t => +t.pct_titulados) },
        { name: 'En trámite', data: sorted.map(t => +(+t.en_tramite * 100 / (+t.total || 1)).toFixed(1)) }
      ],
      chart: this.baseChart('area', 260),
      xaxis: {
        categories: sorted.map(t => t.anio_egreso.toString()),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } }
      },
      yaxis: {
        max: 100,
        labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } }
      },
      colors: ['#10b981', '#f59e0b'],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
      markers: { size: 4 },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v}%` } }
    };
  }

  // 5. Nivel de inglés – Pie
  private buildIngles(data: EstadisticasResponse): void {
    this.chartIngles = {
      series: data.nivelesIngles.map(n => +n.total),
      chart: this.baseChart('pie', 260),
      labels: data.nivelesIngles.map(n => n.nivel),
      colors: ['#ef4444', '#3b82f6', '#10b981', '#94a3b8'],
      legend: { ...this.baseLegend, position: 'bottom' },
      dataLabels: {
        enabled: true,
        style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' },
        dropShadow: { enabled: false }
      },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 6. Inglés por carrera – Barras agrupadas
  private buildInglesCarrera(data: EstadisticasResponse): void {
    const carreras = [...new Set(data.inglesCarrera.map(i => i.nombre_carrera))];
    const niveles = [...new Set(data.inglesCarrera.map(i => i.nivel))];
    const coloresNivel: Record<string, string> = {
      'Básico (A1-A2)': '#ef4444',
      'Intermedio (B1-B2)': '#3b82f6',
      'Avanzado (C1-C2)': '#10b981',
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
      chart: this.baseChart('bar', 260),
      xaxis: {
        categories: carreras.map(c => this.abrevCarrera(c)),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' }, rotate: -20 }
      },
      colors: niveles.map(n => coloresNivel[n] || this.PALETTE[0]),
      plotOptions: { bar: { borderRadius: 4, columnWidth: '65%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid
    };
  }

  // 7. Satisfacción por carrera – Radar
  private buildRadar(data: EstadisticasResponse): void {
    this.chartRadar = {
      series: [{ name: 'Satisfacción promedio', data: data.satisfaccionCarrera.map(s => +s.promedio) }],
      chart: this.baseChart('radar', 270),
      xaxis: { categories: data.satisfaccionCarrera.map(s => this.abrevCarrera(s.nombre_carrera)) },
      colors: ['#6366f1'],
      fill: { opacity: 0.18 },
      markers: { size: 4 },
      yaxis: { min: 0, max: 5, tickAmount: 5, labels: { formatter: (v: number) => v.toFixed(0) } }
    };
  }

  // 8. Top empresas – Barras horizontales
  private buildEmpresas(data: EstadisticasResponse): void {
    const top = data.topEmpresas.slice(0, 10);
    const empresas = top.map(e => e.empresa);
    const totales = top.map(e => +e.total);

    this.chartEmpresas = {
      series: [{ name: 'Egresados', data: totales }],
      chart: {
        ...this.baseChart('bar', Math.max(280, empresas.length * 42)),
      },
      // Categorías en xaxis (nombres de empresas en el eje Y visual)
      xaxis: {
        categories: empresas,
        labels: {
          style: { fontFamily: this.chartFontFamily, fontSize: '11.5px', colors: '#374151' },
          maxWidth: 200
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' }
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: '52%',
          distributed: false,     
          dataLabels: { position: 'center' }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontFamily: this.chartFontFamily,
          fontSize: '12px',
          fontWeight: '600',
          colors: ['#fff']
        },
        formatter: (val: number) => val > 0 ? `${val}` : ''
      },
      colors: ['#6366f1'],
      legend: { show: false },
      grid: {
        borderColor: 'rgba(100,116,139,.08)',
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` }
      }
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
      chart: this.baseChart('line', 280),
      xaxis: {
        categories: sorted.map(e => e.anio_egreso.toString()),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } }
      },
      yaxis: {
        min: 0, max: 100,
        labels: { formatter: (v: number) => `${v}%`, style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } }
      },
      colors: ['#6366f1', '#10b981', '#f59e0b'],
      stroke: { curve: 'smooth', width: [2.5, 2.5, 2], dashArray: [0, 0, 5] },
      fill: { type: 'solid', opacity: 1 },
      markers: { size: 4 },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => `${v}%` } }
    };
  }

  // 10. Sector laboral – Pie
  private buildSector(data: EstadisticasResponse): void {
    this.chartSector = {
      series: data.sectorLaboral.map(s => +s.total),
      chart: this.baseChart('pie', 280),
      labels: data.sectorLaboral.map(s => s.sector),
      colors: ['#3b82f6', '#6366f1', '#10b981', '#a855f7', '#ef4444', '#f59e0b'],
      legend: { ...this.baseLegend, position: 'bottom' },
      dataLabels: {
        enabled: true,
        style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' },
        dropShadow: { enabled: false }
      },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } }
    };
  }

  // 11. Participación por carrera – Barras apiladas
  private buildParticipacion(data: EstadisticasResponse): void {
    const labels = data.participacionCarrera.map(p => this.abrevCarrera(p.nombre_carrera));
    this.chartParticipacion = {
      series: [
        { name: 'Autorizó contacto', data: data.participacionCarrera.map(p => +p.autorizo_contacto) },
        { name: 'Autorizó eventos', data: data.participacionCarrera.map(p => +p.autorizo_eventos) }
      ],
      chart: { ...this.baseChart('bar', 280), stacked: false },
      xaxis: {
        categories: labels,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' }, rotate: -20 }
      },
      colors: ['#6366f1', '#10b981'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid
    };
  }

  // 12. Fuera de Durango
  private buildFueraDurango(data: EstadisticasResponse): void {
    if (!data.fueraDurango.length) return;

    const mapa = new Map<string, number>();
    data.fueraDurango.forEach(f => {
      mapa.set(f.ciudad_trabajo, (mapa.get(f.ciudad_trabajo) || 0) + +f.total);
    });

    const sorted = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ciudades = sorted.map(([ciudad]) => ciudad);
    const totales = sorted.map(([, total]) => total);

    this.chartFueraDurango = {
      series: [{ name: 'Egresados', data: totales }],
      chart: { ...this.baseChart('bar', Math.max(220, ciudades.length * 44)) },
      xaxis: {
        categories: ciudades,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 150 },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#f59e0b'],
      legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` } }
    };
  }

  // 13. Fuera de México
  private buildFueraMexico(data: EstadisticasResponse): void {
    if (!data.fueraMexico.length) return;

    const mapa = new Map<string, number>();
    data.fueraMexico.forEach(f => {
      mapa.set(f.ciudad_trabajo, (mapa.get(f.ciudad_trabajo) || 0) + +f.total);
    });

    const sorted = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ciudades = sorted.map(([ciudad]) => ciudad);
    const totales = sorted.map(([, total]) => total);

    this.chartFueraMexico = {
      series: [{ name: 'Egresados', data: totales }],
      chart: { ...this.baseChart('bar', Math.max(220, ciudades.length * 44)) },
      xaxis: {
        categories: ciudades,
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#374151' }, maxWidth: 160 },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '52%', distributed: false, dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '12px', fontWeight: '600', colors: ['#fff'] }, formatter: (val: number) => val > 0 ? `${val}` : '' },
      colors: ['#6366f1'],
      legend: { show: false },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { y: { formatter: (v: number) => `${v} egresado${v !== 1 ? 's' : ''}` } }
    };
  }
  
  // INSIGHTS AUTOMÁTICOS
  private generarInsights(data: EstadisticasResponse): void {
    const insights = [];
    const k = data.kpis;

    // Carrera más empleable
    const masEmpleable = data.empleabilidadCarrera.reduce(
      (prev, curr) => (+curr.empleados / +curr.total) > (+prev.empleados / +prev.total) ? curr : prev,
      data.empleabilidadCarrera[0]
    );
    if (masEmpleable) {
      const pct = this.getPct(+masEmpleable.empleados, +masEmpleable.total);
      insights.push({
        emoji: '🏆', bg: '#ede9fe',
        titulo: 'Carrera más empleable',
        descripcion: `${this.abrevCarrera(masEmpleable.nombre_carrera)} tiene la tasa más alta de empleo: ${pct}% de sus egresados trabajan actualmente.`
      });
    }

    // Tasa de titulación
    const pctTitulados = this.getPct(+k.titulados, +k.total_egresados);
    insights.push({
      emoji: '📜', bg: '#dcfce7',
      titulo: 'Tasa de titulación',
      descripcion: `El ${pctTitulados}% de los egresados ya están titulados. ${k.en_tramite} tienen el proceso en trámite actualmente.`
    });

    // Nivel inglés dominante
    const nivelDominante = data.nivelesIngles.reduce((a, b) => +b.total > +a.total ? b : a, data.nivelesIngles[0]);
    if (nivelDominante) {
      const pctIng = this.getPct(+nivelDominante.total, +k.total_egresados);
      insights.push({
        emoji: '🌐', bg: '#fef3c7',
        titulo: 'Nivel de inglés dominante',
        descripcion: `El ${pctIng}% de los egresados tienen nivel ${nivelDominante.nivel}. Considerar programas de mejora del idioma.`
      });
    }

    // Satisfacción
    if (+k.satisfaccion_promedio >= 4) {
      insights.push({
        emoji: '⭐', bg: '#fef9c3',
        titulo: 'Alta satisfacción académica',
        descripcion: `La satisfacción promedio es ${k.satisfaccion_promedio}/5, lo que indica una percepción positiva de la formación recibida.`
      });
    }

    // Fuera de México
    if (data.fueraMexico.length > 0) {
      const totalExt = data.fueraMexico.reduce((s, f) => s + +f.total, 0);
      insights.push({
        emoji: '✈️', bg: '#f0f9ff',
        titulo: 'Egresados en el extranjero',
        descripcion: `${totalExt} egresado${totalExt > 1 ? 's' : ''} trabaja${totalExt === 1 ? '' : 'n'} fuera de México, presencia internacional del ITD.`
      });
    }

    // Fuera de Durango
    if (data.fueraDurango.length > 0) {
      const totalFD = data.fueraDurango.reduce((s, f) => s + +f.total, 0);
      insights.push({
        emoji: '📍', bg: '#fdf4ff',
        titulo: 'Movilidad nacional',
        descripcion: `${totalFD} egresado${totalFD > 1 ? 's' : ''} trabaja${totalFD === 1 ? '' : 'n'} en otras ciudades de México fuera de Durango.`
      });
    }

    this.insights = insights;
  }
}