import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import {
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexPlotOptions, ApexDataLabels,
  ApexTooltip, ApexLegend, ApexNonAxisChartSeries,
} from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  TrayectoriaService, TrayectoriaKpis, EstudiosPorNivel, EstudiosPorEstado, TopInstitucion,
  EstudiosPorCarrera, EmprendimientoPorRango, TopGiro, EmprendimientoPorCarrera,
  ProyectosPorTipo, ProyectosPorCarrera, TopOrganizacion, TopEmpresaPrimerEmpleo,
  TopPuestoPrimerEmpleo,
} from './trayectoria.service';
import { UsuariosService } from '../usuarios/usuarios.service';

interface RankingItem {
  label: string;
  total: number;
}

interface CarreraPct {
  nombre_carrera: string;
  total_egresados: number;
  con: number;
  pct: number;
}

@Component({
  selector: 'app-trayectoria',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './trayectoria.component.html',
  styleUrl: './trayectoria.component.css'
})
export class TrayectoriaComponent implements OnInit {

  // Estado general
  cargando = true;
  error = false;

  // Filtros
  filtroCarrera = '';
  filtroAnio: any = '';
  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];

  // KPIs
  totalEgresados = 0;
  totalConEstudios = 0;
  pctConEstudios = 0;
  totalConEmprendimiento = 0;
  pctConEmprendimiento = 0;
  totalEmprendimientosActivos = 0;
  totalConProyecto = 0;
  pctConProyecto = 0;
  totalConCertificaciones = 0;
  pctConCertificaciones = 0;

  // Datos crudos (para checks de "sin datos")
  rawNivel: EstudiosPorNivel[] = [];
  rawEstado: EstudiosPorEstado[] = [];
  rawInstituciones: TopInstitucion[] = [];
  rawRango: EmprendimientoPorRango[] = [];
  rawGiros: TopGiro[] = [];
  rawTipo: ProyectosPorTipo[] = [];
  rawOrganizaciones: TopOrganizacion[] = [];
  rawEmpresas: TopEmpresaPrimerEmpleo[] = [];
  rawPuestos: TopPuestoPrimerEmpleo[] = [];

  // Rankings mapeados
  rankingInstituciones: RankingItem[] = [];
  rankingGiros: RankingItem[] = [];
  rankingOrganizaciones: RankingItem[] = [];
  rankingEmpresas: RankingItem[] = [];
  rankingPuestos: RankingItem[] = [];

  // Tablas por carrera
  tablaEstudios: CarreraPct[] = [];
  tablaEmprendimiento: CarreraPct[] = [];
  tablaProyectos: CarreraPct[] = [];

  // Gráfica 1: Dona — estudios por nivel
  donaNivelSeries: ApexNonAxisChartSeries = [];
  donaNivelChart: ApexChart = { type: 'donut', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  donaNivelLabels: string[] = [];
  donaNivelColors: string[] = ['#4f46e5', '#16a34a', '#d97706', '#7c3aed'];
  donaNivelLegend: ApexLegend = { show: true, position: 'bottom', fontSize: '12px', fontFamily: 'inherit' };
  donaNivelDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' };
  chartDonaNivelConfig: any = {};

  // Gráfica 2: Barras — estudios por estado
  barEstadoSeries: ApexAxisChartSeries = [];
  barEstadoChart: ApexChart = { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  barEstadoXAxis: ApexXAxis = { categories: [], labels: { style: { fontSize: '11px' } } };
  barEstadoYAxis: ApexYAxis = { labels: { formatter: (v: number) => String(Math.round(v)) } };
  barEstadoColors: string[] = ['#4f46e5', '#16a34a', '#d97706'];
  barEstadoDataLabels: ApexDataLabels = { enabled: true };
  barEstadoPlotOptions: ApexPlotOptions = { bar: { horizontal: false, borderRadius: 4, distributed: true, columnWidth: '45%' } };
  barEstadoLegend: ApexLegend = { show: false };
  barEstadoTooltip: ApexTooltip = { y: { formatter: (v: number) => v + ' egresados' } };
  chartBarEstadoConfig: any = {};

  // Gráfica 3: Barras — emprendimiento por rango (tamaño del negocio)
  barRangoSeries: ApexAxisChartSeries = [];
  barRangoChart: ApexChart = { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'inherit' };
  barRangoXAxis: ApexXAxis = { categories: [], labels: { style: { fontSize: '11px' } } };
  barRangoYAxis: ApexYAxis = { labels: { formatter: (v: number) => String(Math.round(v)) } };
  barRangoColors: string[] = ['#003366'];
  barRangoDataLabels: ApexDataLabels = { enabled: true };
  barRangoPlotOptions: ApexPlotOptions = { bar: { horizontal: false, borderRadius: 4, columnWidth: '45%' } };
  barRangoLegend: ApexLegend = { show: false };
  barRangoTooltip: ApexTooltip = { y: { formatter: (v: number) => v + ' egresados' } };
  chartBarRangoConfig: any = {};

  // Gráfica 4: Barras horizontales — proyectos por tipo
  barTipoSeries: ApexAxisChartSeries = [];
  barTipoChart: ApexChart = { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'inherit' };
  barTipoXAxis: ApexXAxis = { categories: [], labels: { style: { fontSize: '11px' } } };
  barTipoYAxis: ApexYAxis = { labels: { style: { fontSize: '11px' } } };
  barTipoColors: string[] = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777'];
  barTipoDataLabels: ApexDataLabels = { enabled: true };
  barTipoPlotOptions: ApexPlotOptions = { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: '55%' } };
  barTipoLegend: ApexLegend = { show: false };
  barTipoTooltip: ApexTooltip = { y: { formatter: (v: number) => v + ' egresados' } };
  chartBarTipoConfig: any = {};

  // Modal
  modalAbierto = false;
  modalTipo = '';
  modalTitulo = '';
  modalSubtitulo = '';
  modalChart: any = {};

  // Export
  exportMenuVisible = false;
  exportando = false;

  private destroyRef = inject(DestroyRef);
  private usuariosService = inject(UsuariosService);

  constructor(private trayectoriaService: TrayectoriaService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  exportarPDF(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.trayectoriaService.exportarPdf(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `trayectoria_${new Date().toISOString().split('T')[0]}.pdf`);
        this.logAccion('exportar', 'Exportó Trayectoria en PDF', 'trayectoria');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  exportarExcel(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.trayectoriaService.exportarExcel(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `trayectoria_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', 'Exportó Trayectoria en Excel', 'trayectoria');
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

  // Carga y mapeo
  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    this.trayectoriaService.getTrayectoria(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.mapearKpis(data.kpis);

        this.rawNivel = data.estudiosPorNivel ?? [];
        this.rawEstado = data.estudiosPorEstado ?? [];
        this.rawInstituciones = data.topInstituciones ?? [];
        this.rawRango = data.emprendimientoPorRango ?? [];
        this.rawGiros = data.topGiros ?? [];
        this.rawTipo = data.proyectosPorTipo ?? [];
        this.rawOrganizaciones = data.topOrganizaciones ?? [];
        this.rawEmpresas = data.topEmpresasPrimerEmpleo ?? [];
        this.rawPuestos = data.topPuestosPrimerEmpleo ?? [];

        this.rankingInstituciones = this.mapearRanking(this.rawInstituciones, 'institucion');
        this.rankingGiros = this.mapearRanking(this.rawGiros, 'giro');
        this.rankingOrganizaciones = this.mapearRanking(this.rawOrganizaciones, 'organizacion');
        this.rankingEmpresas = this.mapearRanking(this.rawEmpresas, 'empresa');
        this.rankingPuestos = this.mapearRanking(this.rawPuestos, 'puesto');

        this.tablaEstudios = this.mapearTabla(data.estudiosPorCarrera, 'con_estudios');
        this.tablaEmprendimiento = this.mapearTabla(data.emprendimientoPorCarrera, 'con_emprendimiento');
        this.tablaProyectos = this.mapearTabla(data.proyectosPorCarrera, 'con_proyecto');

        this.carrerasDisponibles = data.carrerasDisponibles ?? [];
        this.aniosDisponibles = data.aniosDisponibles ?? [];

        this.construirGraficas();
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  private mapearKpis(kpis: TrayectoriaKpis): void {
    this.totalEgresados = Number(kpis?.total_egresados) || 0;
    this.totalConEstudios = Number(kpis?.con_estudios_posteriores) || 0;
    this.totalConEmprendimiento = Number(kpis?.con_emprendimiento) || 0;
    this.totalEmprendimientosActivos = Number(kpis?.emprendimientos_activos) || 0;
    this.totalConProyecto = Number(kpis?.con_proyecto_social) || 0;
    this.totalConCertificaciones = Number(kpis?.con_certificaciones) || 0;

    if (this.totalEgresados > 0) {
      this.pctConEstudios = Math.round(this.totalConEstudios / this.totalEgresados * 100);
      this.pctConEmprendimiento = Math.round(this.totalConEmprendimiento / this.totalEgresados * 100);
      this.pctConProyecto = Math.round(this.totalConProyecto / this.totalEgresados * 100);
      this.pctConCertificaciones = Math.round(this.totalConCertificaciones / this.totalEgresados * 100);
    } else {
      this.pctConEstudios = 0;
      this.pctConEmprendimiento = 0;
      this.pctConProyecto = 0;
      this.pctConCertificaciones = 0;
    }
  }

  private mapearRanking(arr: any[], campo: string): RankingItem[] {
    return (arr ?? []).map(r => ({
      label: r[campo] ?? '',
      total: Number(r.total) || 0,
    }));
  }

  private mapearTabla(arr: any[], campoCon: string): CarreraPct[] {
    return (arr ?? [])
      .map(r => ({
        nombre_carrera: r.nombre_carrera,
        total_egresados: Number(r.total_egresados) || 0,
        con: Number(r[campoCon]) || 0,
        pct: Number(r.pct) || 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }

  private construirGraficas(): void {

    // Dona: estudios por nivel
    this.donaNivelLabels = this.rawNivel.map(n => n.nivel);
    this.donaNivelSeries = this.rawNivel.map(n => Number(n.total) || 0);
    this.donaNivelChart = { ...this.donaNivelChart };
    this.chartDonaNivelConfig = {
      series: this.donaNivelSeries,
      chart: this.donaNivelChart,
      labels: this.donaNivelLabels,
      colors: this.donaNivelColors,
      legend: this.donaNivelLegend,
      dataLabels: this.donaNivelDataLabels,
    };

    // Barras: estudios por estado
    this.barEstadoXAxis = {
      categories: this.rawEstado.map(e => e.estado),
      labels: { style: { fontSize: '11px' } },
    };
    this.barEstadoSeries = [{ name: 'Egresados', data: this.rawEstado.map(e => Number(e.total) || 0) }];
    this.barEstadoChart = { ...this.barEstadoChart };
    this.chartBarEstadoConfig = {
      series: this.barEstadoSeries,
      chart: this.barEstadoChart,
      xaxis: this.barEstadoXAxis,
      yaxis: this.barEstadoYAxis,
      colors: this.barEstadoColors,
      dataLabels: this.barEstadoDataLabels,
      plotOptions: this.barEstadoPlotOptions,
      legend: this.barEstadoLegend,
      tooltip: this.barEstadoTooltip,
    };

    // Barras: emprendimiento por rango
    this.barRangoXAxis = {
      categories: this.rawRango.map(r => r.rango),
      labels: { style: { fontSize: '11px' } },
    };
    this.barRangoSeries = [{ name: 'Egresados', data: this.rawRango.map(r => Number(r.total) || 0) }];
    this.barRangoChart = { ...this.barRangoChart };
    this.chartBarRangoConfig = {
      series: this.barRangoSeries,
      chart: this.barRangoChart,
      xaxis: this.barRangoXAxis,
      yaxis: this.barRangoYAxis,
      colors: this.barRangoColors,
      dataLabels: this.barRangoDataLabels,
      plotOptions: this.barRangoPlotOptions,
      legend: this.barRangoLegend,
      tooltip: this.barRangoTooltip,
    };

    // Barras horizontales: proyectos por tipo
    this.barTipoXAxis = {
      categories: this.rawTipo.map(t => t.tipo),
      labels: { style: { fontSize: '11px' } },
    };
    this.barTipoSeries = [{ name: 'Egresados', data: this.rawTipo.map(t => Number(t.total) || 0) }];
    this.barTipoChart = { ...this.barTipoChart };
    this.chartBarTipoConfig = {
      series: this.barTipoSeries,
      chart: this.barTipoChart,
      xaxis: this.barTipoXAxis,
      yaxis: this.barTipoYAxis,
      colors: this.barTipoColors,
      dataLabels: this.barTipoDataLabels,
      plotOptions: this.barTipoPlotOptions,
      legend: this.barTipoLegend,
      tooltip: this.barTipoTooltip,
    };
  }

  // Filtros
  onFiltroChange(): void { this.cargarDatos(); }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarDatos();
  }

  /** Etiqueta de la carrera filtrada, o "Todas las carreras" si no hay filtro */
  get etiquetaCarrera(): string {
    return this.filtroCarrera || 'Todas las carreras';
  }

  // Modal
  abrirModal(tipo: string, titulo: string, subtitulo: string, chart: any): void {
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalChart = { ...chart, chart: { ...chart.chart, height: 440 } };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // Badge semáforo
  getBadge(pct: number): string {
    if (pct >= 70) return 'badge-alto';
    if (pct >= 50) return 'badge-medio';
    return 'badge-bajo';
  }

  getBadgeTexto(pct: number): string {
    if (pct >= 70) return 'Alto';
    if (pct >= 50) return 'Medio';
    return 'Bajo';
  }

  // Rankings: barras proporcionales
  getBarWidth(valor: number, maximo: number): string {
    if (!maximo) return '0%';
    return Math.round((valor / maximo) * 100) + '%';
  }

  getMaxRanking(items: RankingItem[]): number {
    if (!items?.length) return 1;
    return Math.max(...items.map(i => i.total)) || 1;
  }

  trackByLabel = (_: number, r: RankingItem) => r.label;
  trackByCarrera = (_: number, r: CarreraPct) => r.nombre_carrera;
}
