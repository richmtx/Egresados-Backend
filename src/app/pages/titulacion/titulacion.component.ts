import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import {
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexPlotOptions, ApexDataLabels,
  ApexTooltip, ApexLegend, ApexStroke, ApexNonAxisChartSeries,
} from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  TitulacionService, TitulacionCarrera, TitulacionAnio,
  TitulacionCarreraAnio, PosgradoPorTipo,
} from './titulacion.service';
import { UsuariosService } from '../usuarios/usuarios.service';

@Component({
  selector: 'app-titulacion',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './titulacion.component.html',
  styleUrl: './titulacion.component.css'
})
export class TitulacionComponent implements OnInit {

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
  totalTitulados = 0;
  totalEnTramite = 0;
  totalNoTitulados = 0;
  pctTitulados = 0;
  pctEnTramite = 0;
  pctNoTitulados = 0;

  // Posgrado
  totalPosgrado = 0;
  totalMaestria = 0;
  totalDoctorado = 0;

  // Tabla de detalle
  tablaDetalle: TitulacionCarreraAnio[] = [];
  tablaFiltrada: TitulacionCarreraAnio[] = [];

  // Datos crudos
  private rawCarrera: TitulacionCarrera[] = [];
  private rawAnio: TitulacionAnio[] = [];
  private rawPosgrado: PosgradoPorTipo[] = [];

  // Configs completos para modal
  chartBarrasConfig: any = {};
  chartDonaConfig: any = {};
  chartLineaConfig: any = {};

  barrasSeries: ApexAxisChartSeries = [];
  barrasChart: ApexChart = {
    type: 'bar',
    height: 420,
    stacked: true,
    stackType: '100%',
    toolbar: { show: false },
    fontFamily: 'inherit',
  };

  barrasXAxis: ApexXAxis = {
    categories: [],
    labels: {
      style: { fontSize: '10px' },
      rotate: -45,
      rotateAlways: true,
      trim: false,        
      hideOverlappingLabels: false,
    },
  };

  barrasYAxis: ApexYAxis = { labels: { formatter: (v: number) => v + '%' } };
  barrasColors: string[] = ['#639922', '#EF9F27', '#E24B4A'];
  barrasDataLabels: ApexDataLabels = { enabled: false };
  barrasPlotOptions: ApexPlotOptions = { bar: { horizontal: false, borderRadius: 2 } };

  barrasLegend: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    markers: {
      shape: 'circle',
    },
    labels: {
      colors: ['#374151', '#374151', '#374151'],
    },
    fontSize: '13px',
    fontFamily: 'inherit',
    itemMargin: { horizontal: 12 },
  };

  barrasTooltip: ApexTooltip = { y: { formatter: (v: number) => v.toFixed(1) + '%' } };

  // Gráfica 2: Dona de posgrado
  donaSeries: ApexNonAxisChartSeries = [];
  donaChart: ApexChart = { type: 'donut', height: 200, toolbar: { show: false }, fontFamily: 'inherit' };
  donaLabels: string[] = [];
  donaColors: string[] = ['#7F77DD', '#1D9E75'];
  donaLegend: ApexLegend = { show: false };
  donaDataLabels: ApexDataLabels = { enabled: true, formatter: (v: number) => v.toFixed(1) + '%' };

  // Gráfica 3: Línea de tendencia por año
  lineaSeries: ApexAxisChartSeries = [];
  lineaChart: ApexChart = { type: 'line', height: 250, toolbar: { show: false }, fontFamily: 'inherit' };
  lineaXAxis: ApexXAxis = { categories: [], labels: { style: { fontSize: '12px' } } };
  lineaYAxis: ApexYAxis = { labels: { formatter: (v: number) => String(Math.round(v)) } };
  lineaColors: string[] = ['#639922', '#EF9F27', '#E24B4A'];
  lineaStroke: ApexStroke = { curve: 'smooth', width: 3 };
  lineaDataLabels: ApexDataLabels = { enabled: false };
  lineaLegend: ApexLegend = { show: false };
  lineaTooltip: ApexTooltip = { y: { formatter: (v: number) => String(Math.round(v)) + ' egresados' } };

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

  constructor(private titulacionService: TitulacionService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  exportarPDF(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.titulacionService.exportarPdf(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `titulacion_${new Date().toISOString().split('T')[0]}.pdf`);
        this.logAccion('exportar', 'Exportó Titulación en PDF', 'titulacion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  exportarExcel(): void {
    if (this.exportando || this.cargando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.titulacionService.exportarExcel(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `titulacion_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', 'Exportó Titulación en Excel', 'titulacion');
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
    this.usuariosService.registrarAccion(accion, descripcion, seccion).subscribe({ error: () => {} });
  }

  // Carga y mapeo
  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    this.titulacionService.getEstadisticas(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.mapearKpis(data.kpis);
        this.mapearPosgrado(data.posgradoPorTipo, data.totalPosgrado);
        this.rawCarrera = data.titulacionCarrera;
        this.rawAnio = data.titulacionAnio;
        this.rawPosgrado = data.posgradoPorTipo;
        this.tablaDetalle = data.titulacionCarreraAnio;
        this.tablaFiltrada = [...this.tablaDetalle];

        if (!this.filtroCarrera && !this.filtroAnio) {
          this.carrerasDisponibles = data.titulacionCarrera
            .map(c => c.nombre_carrera)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();
          this.aniosDisponibles = data.titulacionAnio
            .map(a => a.anio_egreso)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .sort((a, b) => a - b);
        } else if (!this.aniosDisponibles.length || !this.carrerasDisponibles.length) {
          this.carrerasDisponibles = data.titulacionCarrera
            .map(c => c.nombre_carrera)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();
          this.aniosDisponibles = data.titulacionAnio
            .map(a => a.anio_egreso)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .sort((a, b) => a - b);
        }

        this.construirGraficas();
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  private mapearKpis(kpis: any): void {
    this.totalEgresados = Number(kpis.total_egresados) || 0;
    this.totalTitulados = Number(kpis.titulados) || 0;
    this.totalEnTramite = Number(kpis.en_tramite) || 0;
    this.totalNoTitulados = Number(kpis.no_titulados) || 0;

    if (this.totalEgresados > 0) {
      this.pctTitulados = Math.round(this.totalTitulados / this.totalEgresados * 100);
      this.pctEnTramite = Math.round(this.totalEnTramite / this.totalEgresados * 100);
      this.pctNoTitulados = Math.round(this.totalNoTitulados / this.totalEgresados * 100);
    }
  }

  private mapearPosgrado(tipos: PosgradoPorTipo[], totalObj: any): void {
    this.totalPosgrado = Number(totalObj?.total) || 0;
    this.totalMaestria = Number(tipos.find(t => t.tipo_posgrado === 'Maestría')?.total) || 0;
    this.totalDoctorado = Number(tipos.find(t => t.tipo_posgrado === 'Posgrado')?.total) || 0;
  }

  private construirGraficas(): void {

    // Totales por carrera para mostrarlos en el tooltip
    const totalesPorCarrera = this.rawCarrera.map(c => Number((c as any).total ?? 0));

    this.barrasXAxis = {
      categories: this.rawCarrera.map(c => c.nombre_carrera),
      labels: {
        style: { fontSize: '10px' },
        rotate: -45,
        rotateAlways: true,
        trim: false,   
        hideOverlappingLabels: false,
      },
    };

    this.barrasSeries = [
      { name: 'Titulados', data: this.rawCarrera.map(c => Number(c.pct_titulados)) },
      { name: 'En trámite', data: this.rawCarrera.map(c => Number(c.pct_en_tramite)) },
      { name: 'No titulados', data: this.rawCarrera.map(c => Number(c.pct_no_titulados)) },
    ];

    this.barrasTooltip = {
      custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
        const carrera = w.globals.labels[dataPointIndex] as string;
        const pct = (series[seriesIndex][dataPointIndex] as number).toFixed(1);
        const total = totalesPorCarrera[dataPointIndex];
        const seriesName = w.globals.seriesNames[seriesIndex] as string;
        const colores = ['#639922', '#EF9F27', '#E24B4A'];
        const color = colores[seriesIndex] ?? '#6b7280';

        return `
          <div style="
            padding: 10px 14px;
            font-family: inherit;
            font-size: 13px;
            min-width: 190px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,.12);
          ">
            <div style="font-weight:600; margin-bottom:8px; color:#111827;">
              ${carrera}
            </div>
            <div style="display:flex; align-items:center; gap:7px; margin-bottom:5px;">
              <span style="
                display:inline-block; width:10px; height:10px;
                border-radius:50%; background:${color}; flex-shrink:0;
              "></span>
              <span style="color:#6b7280;">${seriesName}:</span>
              <strong style="color:#111827;">${pct}%</strong>
            </div>
            <div style="
              border-top:1px solid #f3f4f6;
              padding-top:6px;
              margin-top:2px;
              color:#6b7280;
              font-size:12px;
            ">
              Total egresados:
              <strong style="color:#111827;">${total}</strong>
            </div>
          </div>`;
      },
    };

    // Forzar re-render de ApexCharts al cambiar objeto
    this.barrasChart = { ...this.barrasChart };

    // Dona 
    this.donaLabels = [...this.rawPosgrado.map(p => p.tipo_posgrado)];
    this.donaSeries = [...this.rawPosgrado.map(p => Number(p.total))];
    this.donaChart = { ...this.donaChart };

    // Línea de tendencia
    this.lineaXAxis = {
      categories: [...this.rawAnio.map(a => String(a.anio_egreso))],
      labels: { style: { fontSize: '12px' } },
    };
    this.lineaSeries = [
      { name: 'Titulados', data: [...this.rawAnio.map(a => Number(a.titulados))] },
      { name: 'En trámite', data: [...this.rawAnio.map(a => Number(a.en_tramite))] },
      {
        name: 'No titulados',
        data: [...this.rawAnio.map(a =>
          Math.max(0, Number(a.total) - Number(a.titulados) - Number(a.en_tramite))
        )],
      },
    ];
    this.lineaChart = { ...this.lineaChart };

    // Configs completos para modal
    this.chartBarrasConfig = {
      series: this.barrasSeries,
      chart: this.barrasChart,
      xaxis: this.barrasXAxis,
      yaxis: this.barrasYAxis,
      colors: this.barrasColors,
      dataLabels: this.barrasDataLabels,
      plotOptions: this.barrasPlotOptions,
      legend: this.barrasLegend,
      tooltip: this.barrasTooltip,
    };

    this.chartDonaConfig = {
      series: this.donaSeries,
      chart: this.donaChart,
      labels: this.donaLabels,
      colors: this.donaColors,
      legend: this.donaLegend,
      dataLabels: this.donaDataLabels,
    };

    this.chartLineaConfig = {
      series: this.lineaSeries,
      chart: this.lineaChart,
      xaxis: this.lineaXAxis,
      yaxis: this.lineaYAxis,
      colors: this.lineaColors,
      stroke: this.lineaStroke,
      dataLabels: this.lineaDataLabels,
      legend: this.lineaLegend,
      tooltip: this.lineaTooltip,
    };
  }

  // Filtros
  onFiltroChange(): void { this.cargarDatos(); }

  aplicarFiltros(): void { this.cargarDatos(); }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarDatos();
  }

  filtrarTabla(event: Event): void {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.tablaFiltrada = this.tablaDetalle.filter(row =>
      row.nombre_carrera.toLowerCase().includes(texto)
    );
  }

  // Modal
  abrirModal(tipo: string, titulo: string, subtitulo: string, chart: any): void {
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalChart = { ...chart, chart: { ...chart.chart, height: 460 } };
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
}