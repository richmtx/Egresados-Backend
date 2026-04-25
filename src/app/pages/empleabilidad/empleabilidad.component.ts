import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { EgresadosService, EstadisticasEmpleabilidad } from '../../services/egresados.service';

@Component({
  selector: 'app-empleabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, NgxApexchartsModule],
  templateUrl: './empleabilidad.component.html',
  styleUrl: './empleabilidad.component.css',
})
export class EmpleabilidadComponent implements OnInit {

  // Estado
  cargando = true;
  error = false;
  datos: EstadisticasEmpleabilidad | null = null;

  // Filtros
  filtroCarrera = '';
  filtroAnio: number | '' = '';
  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];
  private filtrosInicializados = false;

  // KPIs calculados
  tasaEmpleo = 0;
  tiempoPromedioGeneral = 0;
  coincidenciaGlobal = 0;

  // Charts
  chartEmpleabilidadCarrera: any = {};
  chartSectores: any = {};
  chartTiempoEmpleo: any = {};
  chartCoincidencia: any = {};
  chartTopEmpresas: any = {};

  // Modal
  modalAbierto = false;
  modalTipo = '';
  modalTitulo = '';
  modalSubtitulo = '';
  modalChart: any = {};

  constructor(private egresadosService: EgresadosService) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.error = false;

    this.egresadosService.getEstadisticas(
      this.filtroCarrera || undefined,
      this.filtroAnio || undefined,
    ).subscribe({
      next: (res) => {
        this.datos = res;
        this.procesarDatos(res);
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      },
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

  // Procesamiento
  private procesarDatos(res: EstadisticasEmpleabilidad): void {
    this.tasaEmpleo = res.kpis.total_egresados > 0
      ? Math.round((res.kpis.empleados / res.kpis.total_egresados) * 100)
      : 0;

    this.tiempoPromedioGeneral = Number(res.tiempoEmpleoGeneral?.anios_promedio_general ?? 0);

    const positivos = (res.coincidenciaCarrera ?? [])
      .filter(c =>
        c.coincidencia?.toLowerCase().includes('alta') ||
        c.coincidencia?.toLowerCase().includes('totalmente') ||
        c.coincidencia?.toLowerCase().includes('relacionad')
      )
      .reduce((acc, c) => acc + Number(c.total), 0);

    this.coincidenciaGlobal = res.kpis.total_egresados > 0
      ? Math.round((positivos / res.kpis.total_egresados) * 100)
      : 0;

    // Solo se llenan la primera vez (sin filtros activos)
    if (!this.filtrosInicializados) {
      this.carrerasDisponibles = [
        ...new Set(res.empleabilidadCarrera.map(e => e.nombre_carrera)),
      ];

      const aniosSet = new Set<number>();
      (res as any).titulacionAnio?.forEach((t: any) => aniosSet.add(Number(t.anio_egreso)));
      (res as any).evolucionGeneracion?.forEach((e: any) => aniosSet.add(Number(e.anio_egreso)));
      this.aniosDisponibles = [...aniosSet].sort((a, b) => a - b);

      this.filtrosInicializados = true;
    }

    this.buildChartEmpleabilidadCarrera(res);
    this.buildChartSectores(res);
    this.buildChartTiempoEmpleo(res);
    this.buildChartCoincidencia(res);
    this.buildChartTopEmpresas(res);
  }

  // Builders
  private buildChartEmpleabilidadCarrera(res: EstadisticasEmpleabilidad): void {
    const carreras = res.empleabilidadCarrera.map(e => e.nombre_carrera);
    const empleados = res.empleabilidadCarrera.map(e => Number(e.empleados));
    const sinEmpleo = res.empleabilidadCarrera.map(e => Number(e.total) - Number(e.empleados));

    this.chartEmpleabilidadCarrera = {
      series: [
        { name: 'Empleados', data: empleados },
        { name: 'Sin empleo', data: sinEmpleo },
      ],
      chart: {
        type: 'bar',
        height: 380,       
        stacked: true,
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: { bar: { borderRadius: 0, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: carreras,
        labels: {
          style: { fontSize: '10px', colors: Array(carreras.length).fill('#6b7280') },
          rotate: -35,   
          rotateAlways: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      colors: ['#003366', '#cbd5e1'],
      legend: {
        position: 'top',
        fontSize: '12px',
        labels: { colors: ['#374151', '#374151'] },
        markers: { size: 7 },
      },
      grid: {
        borderColor: '#f3f4f6',
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (val: number) => `${val} egresados` }
      },
      yaxis: { labels: { style: { fontSize: '11px', colors: ['#9ca3af'] } } },
    };
  }

  private buildChartSectores(res: EstadisticasEmpleabilidad): void {
    const sectores = res.sectorLaboral.map(s => s.sector || 'Sin dato');
    const totales = res.sectorLaboral.map(s => Number(s.total));

    this.chartSectores = {
      series: totales,
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: sectores,
      colors: ['#6366f1', '#22d3ee', '#f59e0b', '#f43f5e', '#10b981', '#a78bfa'],
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: Array(sectores.length).fill('#475569') },
        markers: { size: 6 },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { fontSize: '11px' },
      },
      plotOptions: { pie: { donut: { size: '60%' } } },
      tooltip: { y: { formatter: (val: number) => `${val} egresados` } },
      responsive: [{ breakpoint: 480, options: { chart: { width: 240 } } }],
    };
  }

  private buildChartTiempoEmpleo(res: EstadisticasEmpleabilidad): void {
    const sorted = [...(res.tiempoEmpleoCarrera ?? [])].sort(
      (a, b) => Number(a.anios_promedio_para_emplearse) - Number(b.anios_promedio_para_emplearse),
    );
    // Nombres completos en el eje Y
    const carreras = sorted.map(t => t.nombre_carrera);
    const anios = sorted.map(t => parseFloat(Number(t.anios_promedio_para_emplearse ?? 0).toFixed(1)));

    this.chartTiempoEmpleo = {
      series: [{ name: 'Años para emplearse', data: anios }],
      chart: {
        type: 'bar',
        height: 420,
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: carreras,
        labels: {
          style: { fontSize: '11px', colors: ['#94a3b8'] }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: ['#475569'] },
          maxWidth: 200,
        }
      },
      colors: ['#22d3ee'],
      grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      tooltip: { y: { formatter: (val: number) => `${val} años en promedio` } },
    };
  }

  private buildChartCoincidencia(res: EstadisticasEmpleabilidad): void {
    const mapa: Record<string, { pos: number; total: number }> = {};
    for (const item of res.coincidenciaCarrera ?? []) {
      if (!mapa[item.nombre_carrera]) mapa[item.nombre_carrera] = { pos: 0, total: 0 };
      mapa[item.nombre_carrera].total += Number(item.total);
      const esPos =
        item.coincidencia?.toLowerCase().includes('alta') ||
        item.coincidencia?.toLowerCase().includes('totalmente') ||
        item.coincidencia?.toLowerCase().includes('relacionad');
      if (esPos) mapa[item.nombre_carrera].pos += Number(item.total);
    }
    // Nombres completos en el eje X
    const carreras = Object.keys(mapa);
    const porcentajes = Object.values(mapa).map(v =>
      v.total > 0 ? Math.round((v.pos / v.total) * 100) : 0,
    );

    this.chartCoincidencia = {
      series: [{ name: 'Coincidencia laboral', data: porcentajes }],
      chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      dataLabels: { enabled: false }, 
      xaxis: {
        categories: carreras,
        labels: {
          style: { fontSize: '10px', colors: ['#94a3b8'] },
          rotate: -35,
          rotateAlways: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        max: 100,
        labels: { formatter: (val: number) => `${val}%`, style: { fontSize: '11px', colors: ['#94a3b8'] } },
      },
      colors: ['#10b981'],
      grid: { borderColor: '#f1f5f9', yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
      tooltip: { y: { formatter: (val: number) => `${val}% trabaja en su área` } },
    };
  }

  private buildChartTopEmpresas(res: EstadisticasEmpleabilidad): void {
    const top = (res.topEmpresas ?? []).slice(0, 8);

    this.chartTopEmpresas = {
      series: [{ name: 'Egresados', data: top.map(e => Number(e.total)) }],
      chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
      dataLabels: {
        enabled: true,
        offsetX: 20,
        style: { fontSize: '11px', colors: ['#64748b'] },
      },
      xaxis: {
        categories: top.map(e => e.empresa),
        labels: { style: { fontSize: '11px', colors: ['#94a3b8'] } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { fontSize: '12px', colors: ['#475569'] } } },
      colors: ['#f59e0b'],
      grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      tooltip: { y: { formatter: (val: number) => `${val} egresados` } },
      legend: { show: false },
    };
  }

  // Modal
  abrirModal(tipo: string, titulo: string, subtitulo: string, chart: any): void {
    this.modalTipo = tipo;
    this.modalTitulo = titulo;
    this.modalSubtitulo = subtitulo;
    this.modalChart = { ...chart, chart: { ...chart.chart, height: 420 } };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // Utilidades
  getPct(parte: number | string, total: number | string): number {
    const p = Number(parte);
    const t = Number(total);
    return t > 0 ? Math.round((p / t) * 100) : 0;
  }

  getTiempoCarrera(carrera: string): string {
    const item = (this.datos?.tiempoEmpleoCarrera ?? []).find(t => t.nombre_carrera === carrera);
    return item ? `${Number(item.anios_promedio_para_emplearse ?? 0).toFixed(1)} años` : '—';
  }
}