import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { GenerosService, EstadisticasGeneroResponse } from './generos.service';

@Component({
  selector: 'app-generos',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './generos.component.html',
  styleUrl: './generos.component.css'
})
export class GenerosComponent implements OnInit, OnDestroy {

  // Estado
  datos: EstadisticasGeneroResponse | null = null;
  cargando = true;
  error = false;

  // Filtros
  filtroCarrera = '';
  filtroAnio = '';
  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];

  // KPIs calculados
  totalEgresados = 0;
  totalHombres = 0;
  totalMujeres = 0;
  pctHombres = 0;
  pctMujeres = 0;
  ratioHM = '0';
  carreraMasFemenina: { nombre: string; pct: number } | null = null;
  carreraMasMasculina: { nombre: string; pct: number } | null = null;

  // Resúmenes para secciones sin gráfica
  rankingCarreras: { nombre: string; pctMujeres: number; pctHombres: number }[] = [];
  coincidenciaResumen: { genero: string; pct: number }[] = [];
  tiempoEmpleoResumen: { genero: string; tiempo: number }[] = [];
  maxTiempoEmpleo = 1;
  geografiaResumen: { genero: string; pctDurango: number; pctFueraMx: number; pctExtranjero: number }[] = [];
  posgradoResumen: { genero: string; total: number; pct: number }[] = [];
  inglesResumen: { genero: string; nivelPromedio: string; niveles: { nivel: string; porcentaje: number }[] }[] = [];
  satisfaccionResumen: { genero: string; promedio: number; niveles: { label: string; total: number; pct: number }[] }[] = [];

  // Insights
  insights: { emoji: string; bg: string; titulo: string; descripcion: string }[] = [];

  // Modal
  modalAbierto = false;
  modalTitulo = '';
  modalSubtitulo = '';
  modalTipo = '';
  modalChart: any = {};

  // Chart configs (any — igual que estadisticas)
  chartEgresoAnio: any = {};
  chartTendenciaGenero: any = {};
  chartComposicionCarrera: any = {};
  chartEmpleabilidadGenero: any = {};
  chartSectorGenero: any = {};
  chartCiudadesGenero: any = {};
  chartTitulacionGenero: any = {};
  chartTitulacionAnioGenero: any = {};
  chartPosgradoGenero: any = {};
  chartInglesGenero: any = {};
  chartHabilidadesGenero: any = {};

  // Paleta y helpers (igual que estadisticas)
  private COLOR_H = '#3b82f6';
  private COLOR_M = '#f43f5e';

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
    fontFamily: this.chartFontFamily,
    fontSize: '12px',
    labels: { colors: '#64748b' },
    markers: { width: 8, height: 8, radius: 2 }
  };

  constructor(
    private generosService: GenerosService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void { this.cargarDatos(); }
  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = '';
  }

  // MODAL  (mismo patrón que estadisticas)
  abrirModal(tipo: string, titulo: string, subtitulo: string, chartConfig: any): void {
    this.modalChart = {
      ...chartConfig,
      chart: {
        ...chartConfig.chart,
        height: tipo === 'bar'
          ? Math.max(420, (chartConfig.chart?.height || 300) + 160)
          : 460
      }
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

  exportarPDF(): void { window.print(); }

  // CARGA DE DATOS
  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? +this.filtroAnio : undefined;

    this.generosService.getEstadisticasGenero(carrera, anio).subscribe({
      next: (res) => {
        this.datos = res;
        this.cargando = false;
        this.procesarDatos(res);
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  onFiltroChange(): void { this.cargarDatos(); }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarDatos();
  }

  // PROCESAMIENTO CENTRAL
  private procesarDatos(res: EstadisticasGeneroResponse): void {
    this.calcularKPIs(res);
    this.calcularRankingCarreras(res);
    this.calcularCoincidencia(res);
    this.calcularTiempoEmpleo(res);
    this.calcularGeografia(res);
    this.calcularPosgrado(res);
    this.calcularIngles(res);
    this.calcularSatisfaccion(res);
    this.generarFiltros(res);
    this.construirCharts(res);
    this.generarInsights(res);
  }

  // KPIs
  private calcularKPIs(res: EstadisticasGeneroResponse): void {
    const hombre = res.kpisGenero.find(k => k.genero === 'Hombre');
    const mujer = res.kpisGenero.find(k => k.genero === 'Mujer');

    this.totalHombres = +(hombre?.total ?? 0);
    this.totalMujeres = +(mujer?.total ?? 0);
    this.totalEgresados = this.totalHombres + this.totalMujeres;
    this.pctHombres = +(hombre?.porcentaje ?? 0);
    this.pctMujeres = +(mujer?.porcentaje ?? 0);
    this.ratioHM = this.totalMujeres > 0
      ? (this.totalHombres / this.totalMujeres).toFixed(2)
      : '—';

    const porCarrera = this.agruparPorCarrera(res.composicionCarreraGenero);
    let maxF = 0, maxM = 0, nombreF = '—', nombreM = '—';

    Object.entries(porCarrera).forEach(([carrera, datos]) => {
      const pctM = datos['Mujer'] ?? 0;
      const pctH = datos['Hombre'] ?? 0;
      if (pctM > maxF) { maxF = pctM; nombreF = carrera; }
      if (pctH > maxM) { maxM = pctH; nombreM = carrera; }
    });

    this.carreraMasFemenina = { nombre: nombreF, pct: maxF };
    this.carreraMasMasculina = { nombre: nombreM, pct: maxM };
  }

  // RANKING CARRERAS
  private calcularRankingCarreras(res: EstadisticasGeneroResponse): void {
    const map = this.agruparPorCarrera(res.composicionCarreraGenero);
    this.rankingCarreras = Object.entries(map)
      .map(([nombre, datos]) => ({
        nombre,
        pctMujeres: +(datos['Mujer'] ?? 0),
        pctHombres: +(datos['Hombre'] ?? 0),
      }))
      .sort((a, b) => b.pctMujeres - a.pctMujeres);
  }

  // COINCIDENCIA LABORAL
  private calcularCoincidencia(res: EstadisticasGeneroResponse): void {
    const niveles = [...new Set(res.coincidenciaLaboralGenero.map(c => c.coincidencia))];
    const nivelPositivo = niveles.find(n =>
      n.toLowerCase().includes('sí') ||
      n.toLowerCase().includes('si') ||
      n.toLowerCase().includes('total')
    ) ?? niveles[0] ?? '';

    this.coincidenciaResumen = ['Hombre', 'Mujer'].map(genero => {
      const row = res.coincidenciaLaboralGenero.find(
        c => c.genero === genero && c.coincidencia === nivelPositivo
      );
      return { genero, pct: +(row?.porcentaje ?? 0) };
    });
  }

  // TIEMPO DE EMPLEO
  private calcularTiempoEmpleo(res: EstadisticasGeneroResponse): void {
    this.tiempoEmpleoResumen = res.tiempoEmpleoGenero.map(t => ({
      genero: t.genero,
      tiempo: +(t.tiempo_promedio_anios ?? 0),
    }));
    this.maxTiempoEmpleo = Math.max(1, ...this.tiempoEmpleoResumen.map(t => t.tiempo));
  }

  // GEOGRAFÍA
  private calcularGeografia(res: EstadisticasGeneroResponse): void {
    this.geografiaResumen = res.geografiaGenero.map(g => {
      const total = +(g.total ?? 1);
      return {
        genero: g.genero,
        pctDurango: Math.round((+(g.en_durango ?? 0) / total) * 100),
        pctFueraMx: Math.round((+(g.fuera_durango_mexico ?? 0) / total) * 100),
        pctExtranjero: Math.round((+(g.en_extranjero ?? 0) / total) * 100),
      };
    });
  }

  // POSGRADO
  private calcularPosgrado(res: EstadisticasGeneroResponse): void {
    const totalH = this.totalHombres || 1;
    const totalM = this.totalMujeres || 1;
    this.posgradoResumen = res.posgradoGenero.map(p => ({
      genero: p.genero,
      total: +(p.total ?? 0),
      pct: p.genero === 'Hombre'
        ? Math.round((+(p.total ?? 0) / totalH) * 100)
        : Math.round((+(p.total ?? 0) / totalM) * 100),
    }));
  }

  // INGLÉS
  private calcularIngles(res: EstadisticasGeneroResponse): void {
    const ordenNiveles = ['Básico', 'Intermedio', 'Avanzado'];
    this.inglesResumen = ['Hombre', 'Mujer'].map(genero => {
      const filas = res.inglesGenero.filter(i => i.genero === genero);
      const niveles = ordenNiveles.map(nivel => {
        const fila = filas.find(f => f.nivel === nivel);
        return { nivel, porcentaje: +(fila?.porcentaje ?? 0) };
      });
      const mayor = [...filas].sort((a, b) => b.total - a.total)[0];
      return { genero, nivelPromedio: mayor?.nivel ?? '—', niveles };
    });
  }

  // SATISFACCIÓN
  private calcularSatisfaccion(res: EstadisticasGeneroResponse): void {
    this.satisfaccionResumen = res.satisfaccionGenero.map(s => {
      const total = +(s.total ?? 1);
      return {
        genero: s.genero,
        promedio: +(s.promedio ?? 0),
        niveles: [
          { label: 'Muy satisfecho', total: +(s.muy_satisfecho ?? 0), pct: Math.round((+(s.muy_satisfecho ?? 0) / total) * 100) },
          { label: 'Satisfecho', total: +(s.satisfecho ?? 0), pct: Math.round((+(s.satisfecho ?? 0) / total) * 100) },
          { label: 'Neutral', total: +(s.neutral ?? 0), pct: Math.round((+(s.neutral ?? 0) / total) * 100) },
          { label: 'Insatisfecho', total: +(s.insatisfecho ?? 0), pct: Math.round((+(s.insatisfecho ?? 0) / total) * 100) },
          { label: 'Muy insatisf.', total: +(s.muy_insatisfecho ?? 0), pct: Math.round((+(s.muy_insatisfecho ?? 0) / total) * 100) },
        ],
      };
    });
  }

  // FILTROS
  private generarFiltros(res: EstadisticasGeneroResponse): void {
    const carreras = [...new Set(res.composicionCarreraGenero.map(c => c.nombre_carrera))].sort();
    const anios = [...new Set(res.egresoAnioGenero.map(e => e.anio_egreso))].sort();
    if (!this.filtroCarrera) this.carrerasDisponibles = carreras;
    if (!this.filtroAnio) this.aniosDisponibles = anios;
  }

  // CONSTRUCCIÓN DE CHARTS
  private construirCharts(res: EstadisticasGeneroResponse): void {
    this.buildChartEgresoAnio(res);
    this.buildChartTendenciaGenero(res);
    this.buildChartComposicionCarrera(res);
    this.buildChartEmpleabilidadGenero(res);
    this.buildChartSectorGenero(res);
    this.buildChartCiudadesGenero(res);
    this.buildChartTitulacionGenero(res);
    this.buildChartTitulacionAnioGenero(res);
    this.buildChartPosgradoGenero(res);
    this.buildChartInglesGenero(res);
    this.buildChartHabilidadesGenero(res);
  }

  // 1. Egreso por año (barras agrupadas)
  private buildChartEgresoAnio(res: EstadisticasGeneroResponse): void {
    const anios = [...new Set(res.egresoAnioGenero.map(e => e.anio_egreso))].sort();
    const datosH = anios.map(a => +(res.egresoAnioGenero.find(e => e.anio_egreso === a && e.genero === 'Hombre')?.total ?? 0));
    const datosM = anios.map(a => +(res.egresoAnioGenero.find(e => e.anio_egreso === a && e.genero === 'Mujer')?.total ?? 0));

    this.chartEgresoAnio = {
      series: [{ name: 'Hombres', data: datosH }, { name: 'Mujeres', data: datosM }],
      chart: this.baseChart('bar', 260),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories: anios.map(String), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
    };
  }

  // 2. Tendencia % género por año (líneas)
  private buildChartTendenciaGenero(res: EstadisticasGeneroResponse): void {
    const anios = [...new Set(res.egresoAnioGenero.map(e => e.anio_egreso))].sort();
    const pctH = anios.map(a => +(res.egresoAnioGenero.find(e => e.anio_egreso === a && e.genero === 'Hombre')?.porcentaje_en_anio ?? 0));
    const pctM = anios.map(a => +(res.egresoAnioGenero.find(e => e.anio_egreso === a && e.genero === 'Mujer')?.porcentaje_en_anio ?? 0));

    this.chartTendenciaGenero = {
      series: [{ name: 'Hombres %', data: pctH }, { name: 'Mujeres %', data: pctM }],
      chart: this.baseChart('area', 260),
      colors: [this.COLOR_H, this.COLOR_M],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      markers: { size: 4 },
      xaxis: { categories: anios.map(String), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      yaxis: { max: 100, labels: { formatter: (v: number) => v.toFixed(0) + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      grid: this.baseGrid,
      legend: { ...this.baseLegend, position: 'top' },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // 3. Composición por carrera (100% apiladas)
  private buildChartComposicionCarrera(res: EstadisticasGeneroResponse): void {
    const carreras = [...new Set(res.composicionCarreraGenero.map(c => c.nombre_carrera))];
    const datosH = carreras.map(c => +(res.composicionCarreraGenero.find(d => d.nombre_carrera === c && d.genero === 'Hombre')?.porcentaje ?? 0));
    const datosM = carreras.map(c => +(res.composicionCarreraGenero.find(d => d.nombre_carrera === c && d.genero === 'Mujer')?.porcentaje ?? 0));
    const abreviar = (s: string) => s.replace('Ingeniería ', 'Ing. ').replace('Sistemas Computacionales (Presencial / Virtual)', 'Sistemas Comp.').replace('Sistemas Computacionales', 'Sistemas Comp.');

    this.chartComposicionCarrera = {
      series: [{ name: 'Hombres', data: datosH }, { name: 'Mujeres', data: datosM }],
      chart: { ...this.baseChart('bar', 300), stacked: true, stackType: '100%' },
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { borderRadius: 3 } },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(0) + '%', style: { fontFamily: this.chartFontFamily, fontSize: '10px', fontWeight: '600' } },
      xaxis: { categories: carreras.map(abreviar), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' }, rotate: -20 } },
      yaxis: { labels: { formatter: (v: number) => v + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // 4. Tasa de empleo H/M
  private buildChartEmpleabilidadGenero(res: EstadisticasGeneroResponse): void {
    const pctH = +(res.empleabilidadGenero.find(e => e.genero === 'Hombre')?.pct_empleados ?? 0);
    const pctM = +(res.empleabilidadGenero.find(e => e.genero === 'Mujer')?.pct_empleados ?? 0);

    this.chartEmpleabilidadGenero = {
      series: [{ name: '% Empleados', data: [pctH, pctM] }],
      chart: this.baseChart('bar', 230),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { distributed: true, columnWidth: '50%', borderRadius: 5 } },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1) + '%', style: { fontFamily: this.chartFontFamily, fontSize: '13px', fontWeight: '600' } },
      xaxis: { categories: ['Hombres', 'Mujeres'], labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#64748b' } } },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { show: false },
      grid: this.baseGrid,
    };
  }

  // 5. Sector laboral H/M (barras apiladas)
  private buildChartSectorGenero(res: EstadisticasGeneroResponse): void {
    const sectores = [...new Set(res.sectorLaboralGenero.map(s => s.sector))];
    const series = ['Hombre', 'Mujer'].map(genero => ({
      name: genero === 'Hombre' ? 'Hombres' : 'Mujeres',
      data: sectores.map(sector => +(res.sectorLaboralGenero.find(s => s.genero === genero && s.sector === sector)?.porcentaje ?? 0)),
    }));

    this.chartSectorGenero = {
      series,
      chart: { ...this.baseChart('bar', 230), stacked: true },
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      xaxis: { categories: sectores, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' }, rotate: -20 } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // 6. Top ciudades H/M (barras horizontales)
  private buildChartCiudadesGenero(res: EstadisticasGeneroResponse): void {
    const ciudadesMap: Record<string, { h: number; m: number }> = {};
    res.topCiudadesGenero.forEach(c => {
      if (!ciudadesMap[c.ciudad_trabajo]) ciudadesMap[c.ciudad_trabajo] = { h: 0, m: 0 };
      if (c.genero === 'Hombre') ciudadesMap[c.ciudad_trabajo].h += +(c.total ?? 0);
      else ciudadesMap[c.ciudad_trabajo].m += +(c.total ?? 0);
    });

    const top6 = Object.entries(ciudadesMap)
      .map(([ciudad, v]) => ({ ciudad, total: v.h + v.m, h: v.h, m: v.m }))
      .sort((a, b) => b.total - a.total).slice(0, 6);

    this.chartCiudadesGenero = {
      series: [{ name: 'Hombres', data: top6.map(c => c.h) }, { name: 'Mujeres', data: top6.map(c => c.m) }],
      chart: this.baseChart('bar', Math.max(260, top6.length * 48)),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%', dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600', colors: ['#fff'] }, formatter: (v: number) => v > 0 ? `${v}` : '' },
      xaxis: { categories: top6.map(c => c.ciudad), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#374151' }, maxWidth: 180 }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { shared: true, intersect: false },
    };
  }

  // 7. Titulación H/M (barras apiladas 100%)
  private buildChartTitulacionGenero(res: EstadisticasGeneroResponse): void {
    const etiquetas = res.titulacionGenero.map(t => t.genero === 'Hombre' ? 'Hombres' : 'Mujeres');
    this.chartTitulacionGenero = {
      series: [
        { name: 'Titulado', data: res.titulacionGenero.map(t => +(t.pct_titulados ?? 0)) },
        { name: 'En trámite', data: res.titulacionGenero.map(t => +(t.pct_en_tramite ?? 0)) },
        { name: 'No titulado', data: res.titulacionGenero.map(t => +(t.pct_no_titulados ?? 0)) },
      ],
      chart: { ...this.baseChart('bar', 260), stacked: true, stackType: '100%' },
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(0) + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', fontWeight: '600' } },
      xaxis: { categories: etiquetas, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#64748b' } } },
      yaxis: { labels: { formatter: (v: number) => v + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // 8. Titulación por año × género (líneas)
  private buildChartTitulacionAnioGenero(res: EstadisticasGeneroResponse): void {
    const anios = [...new Set(res.titulacionAnioGenero.map(t => t.anio_egreso))].sort();
    const datH = anios.map(a => +(res.titulacionAnioGenero.find(t => t.anio_egreso === a && t.genero === 'Hombre')?.pct_titulados ?? 0));
    const datM = anios.map(a => +(res.titulacionAnioGenero.find(t => t.anio_egreso === a && t.genero === 'Mujer')?.pct_titulados ?? 0));

    this.chartTitulacionAnioGenero = {
      series: [{ name: 'Hombres %', data: datH }, { name: 'Mujeres %', data: datM }],
      chart: this.baseChart('area', 260),
      colors: [this.COLOR_H, this.COLOR_M],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      markers: { size: 4 },
      xaxis: { categories: anios.map(String), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => v + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      grid: this.baseGrid,
      legend: { ...this.baseLegend, position: 'top' },
      tooltip: { y: { formatter: (v: number) => v.toFixed(1) + '%' } },
    };
  }

  // 9. Tipo de posgrado H/M (barras agrupadas)
  private buildChartPosgradoGenero(res: EstadisticasGeneroResponse): void {
    const tipos = [...new Set(res.posgradoTipoGenero.map(p => p.tipo_posgrado))];
    const series = ['Hombre', 'Mujer'].map(genero => ({
      name: genero === 'Hombre' ? 'Hombres' : 'Mujeres',
      data: tipos.map(tipo => +(res.posgradoTipoGenero.find(p => p.genero === genero && p.tipo_posgrado === tipo)?.total ?? 0)),
    }));

    this.chartPosgradoGenero = {
      series,
      chart: this.baseChart('bar', 240),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: { categories: tipos, labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
    };
  }

  // 10. Inglés por género (barras agrupadas)
  private buildChartInglesGenero(res: EstadisticasGeneroResponse): void {
    const orden = ['Básico', 'Intermedio', 'Avanzado'];
    const niveles = orden.filter(n => res.inglesGenero.some(i => i.nivel === n || i.nivel.startsWith(n)));
    const series = ['Hombre', 'Mujer'].map(genero => ({
      name: genero === 'Hombre' ? 'Hombres' : 'Mujeres',
      data: niveles.map(nivel => {
        const row = res.inglesGenero.find(i => i.genero === genero && (i.nivel === nivel || i.nivel.startsWith(nivel)));
        return +(row?.porcentaje ?? 0);
      }),
    }));

    this.chartInglesGenero = {
      series,
      chart: this.baseChart('bar', 320),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
      dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(0) + '%', style: { fontFamily: this.chartFontFamily, fontSize: '10px', fontWeight: '600' } },
      xaxis: {
        categories: niveles.map(n =>
          n === 'Básico' ? 'Básico (A1-A2)' :
            n === 'Intermedio' ? 'Intermedio (B1-B2)' :
              n === 'Avanzado' ? 'Avanzado (C1-C2)' : n
        ),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '12px', colors: '#64748b' } }
      },
      yaxis: { labels: { formatter: (v: number) => v + '%', style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#64748b' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: this.baseGrid,
    };
  }

  // 11. Habilidades H/M (barras horizontales)
  private buildChartHabilidadesGenero(res: EstadisticasGeneroResponse): void {
    const habMap: Record<string, { h: number; m: number }> = {};
    res.habilidadesGenero.forEach(h => {
      if (!habMap[h.habilidad]) habMap[h.habilidad] = { h: 0, m: 0 };
      if (h.genero === 'Hombre') habMap[h.habilidad].h += +(h.total ?? 0);
      else habMap[h.habilidad].m += +(h.total ?? 0);
    });

    const top6 = Object.entries(habMap)
      .map(([habilidad, v]) => ({ habilidad, total: v.h + v.m, h: v.h, m: v.m }))
      .sort((a, b) => b.total - a.total).slice(0, 6);

    this.chartHabilidadesGenero = {
      series: [{ name: 'Hombres', data: top6.map(h => h.h) }, { name: 'Mujeres', data: top6.map(h => h.m) }],
      chart: this.baseChart('bar', Math.max(260, top6.length * 48)),
      colors: [this.COLOR_H, this.COLOR_M],
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%', dataLabels: { position: 'center' } } },
      dataLabels: { enabled: false },
      xaxis: { categories: top6.map(h => h.habilidad), labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#374151' }, maxWidth: 200 }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '11px', colors: '#6b7280' } } },
      legend: { ...this.baseLegend, position: 'top' },
      grid: { borderColor: 'rgba(100,116,139,.08)', xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
      tooltip: { shared: true, intersect: false },
    };
  }

  // INSIGHTS AUTOMÁTICOS
  private generarInsights(res: EstadisticasGeneroResponse): void {
    this.insights = [];

    const empH = res.empleabilidadGenero.find(e => e.genero === 'Hombre');
    const empM = res.empleabilidadGenero.find(e => e.genero === 'Mujer');
    if (empH && empM) {
      const dif = Math.abs(+(empH.pct_empleados ?? 0) - +(empM.pct_empleados ?? 0)).toFixed(1);
      const masAlto = +(empH.pct_empleados ?? 0) >= +(empM.pct_empleados ?? 0) ? 'los hombres' : 'las mujeres';
      this.insights.push({ emoji: '💼', bg: '#eff6ff', titulo: 'Brecha de empleo', descripcion: `La tasa de empleo de ${masAlto} es ${dif}% mayor. H: ${(+(empH.pct_empleados ?? 0)).toFixed(1)}% · M: ${(+(empM.pct_empleados ?? 0)).toFixed(1)}%` });
    }

    const titH = res.titulacionGenero.find(t => t.genero === 'Hombre');
    const titM = res.titulacionGenero.find(t => t.genero === 'Mujer');
    if (titH && titM) {
      const masAlto = +(titH.pct_titulados ?? 0) >= +(titM.pct_titulados ?? 0) ? 'Los hombres' : 'Las mujeres';
      this.insights.push({ emoji: '🎓', bg: '#dcfce7', titulo: 'Titulación', descripcion: `${masAlto} tienen mayor porcentaje de titulación. H: ${(+(titH.pct_titulados ?? 0)).toFixed(1)}% · M: ${(+(titM.pct_titulados ?? 0)).toFixed(1)}%` });
    }

    if (this.posgradoResumen.length >= 2) {
      const mayor = this.posgradoResumen[0].pct >= this.posgradoResumen[1].pct ? this.posgradoResumen[0] : this.posgradoResumen[1];
      this.insights.push({ emoji: '📚', bg: '#fef3c7', titulo: 'Posgrado', descripcion: `${mayor.genero === 'Hombre' ? 'Los hombres tienen' : 'Las mujeres tienen'} mayor continuidad en posgrado: ${mayor.pct}%.` });
    }

    const geoH = this.geografiaResumen.find(g => g.genero === 'Hombre');
    const geoM = this.geografiaResumen.find(g => g.genero === 'Mujer');
    if (geoH && geoM) {
      const masMovil = geoH.pctFueraMx >= geoM.pctFueraMx ? 'Los hombres' : 'Las mujeres';
      this.insights.push({ emoji: '🗺️', bg: '#fdf2f8', titulo: 'Movilidad geográfica', descripcion: `${masMovil} tienen mayor movilidad fuera de Durango. H: ${geoH.pctFueraMx}% · M: ${geoM.pctFueraMx}%` });
    }

    const satH = this.satisfaccionResumen.find(s => s.genero === 'Hombre');
    const satM = this.satisfaccionResumen.find(s => s.genero === 'Mujer');
    if (satH && satM) {
      const masAlto = satH.promedio >= satM.promedio ? 'Hombres' : 'Mujeres';
      this.insights.push({ emoji: '⭐', bg: '#ecfeff', titulo: 'Satisfacción académica', descripcion: `${masAlto} reportan mayor satisfacción. H: ${satH.promedio}/5 · M: ${satM.promedio}/5` });
    }

    if (this.carreraMasFemenina) {
      this.insights.push({ emoji: '🏫', bg: '#fff1f2', titulo: 'Carrera más femenina', descripcion: `${this.carreraMasFemenina.nombre} tiene el mayor % de mujeres: ${this.carreraMasFemenina.pct}%.` });
    }
  }

  // UTILIDADES
  private agruparPorCarrera(
    datos: { nombre_carrera: string; genero: string; porcentaje: number }[]
  ): Record<string, Record<string, number>> {
    const map: Record<string, Record<string, number>> = {};
    datos.forEach(d => {
      if (!map[d.nombre_carrera]) map[d.nombre_carrera] = {};
      map[d.nombre_carrera][d.genero] = +(d.porcentaje ?? 0);
    });
    return map;
  }

  abrirModalRanking(): void {
    this.modalTipo = 'ranking';
    this.modalTitulo = 'Ranking por feminización';
    this.modalSubtitulo = 'De más femenina a más masculina · todas las carreras';
    this.modalAbierto = true;
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
  }

  abrirModalCoincidencia(): void {
    this.modalTipo = 'coincidencia';
    this.modalTitulo = 'Coincidencia y tiempo';
    this.modalSubtitulo = 'Relación carrera-trabajo y tiempo promedio en emplearse por género';
    this.modalAbierto = true;
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
  }

  abrirModalMovilidad() {
    this.modalTipo = 'movilidad';
    this.modalTitulo = '¿Quién emigra más?';
    this.modalSubtitulo = 'Distribución geográfica por género';
    this.modalAbierto = true;
  }

  abrirModalPosgradoResumen() {
    this.modalTipo = 'posgradoResumen';
    this.modalTitulo = '¿Quién continúa estudiando?';
    this.modalSubtitulo = 'Egresados con posgrado por género';
    this.modalAbierto = true;
  }

  abrirModalSatisfaccion(): void {
    this.modalTipo = 'satisfaccion';
    this.modalTitulo = 'Satisfacción promedio';
    this.modalSubtitulo = 'Calificación de formación por género (1–5)';
    this.modalAbierto = true;
    if (isPlatformBrowser(this.platformId)) document.body.style.overflow = 'hidden';
  }
}