import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';
import { DashboardService, DashboardResumen } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {

  private chartFontFamily = "'Plus Jakarta Sans', 'Segoe UI', sans-serif";

  // Estado
  datos: DashboardResumen | null = null;
  cargando = true;
  error = false;
  nombreUsuario = '';
  drawerAbierto = false;
  drawerTab: 'respuestas' | 'notificaciones' | 'recientes' = 'respuestas';

  // Charts
  chartBarras: any = {};
  chartPastel: any = {};
  chartLinea: any = {};

  // Modal
  modalAbierto = false;
  modalTitulo = '';
  modalSubtitulo = '';
  modalTipo = '';
  modalChart: any = {};

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    this.nombreUsuario = usuario?.nombre_completo?.split(' ')[0] ?? 'Administrador';
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.cerrarDrawer();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = false;
    this.dashboardService.getResumen().subscribe({
      next: (res) => {
        this.datos = res;
        this.cargando = false;
        this.construirCharts(res);
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  // Drawer
  abrirDrawer(tab: typeof this.drawerTab): void {
    this.drawerTab = tab;
    this.drawerAbierto = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  cerrarDrawer(): void {
    this.drawerAbierto = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  // Navegación
  irA(ruta: string): void {
    this.router.navigate([`/${ruta}`]);
  }

  // Helpers
  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  tiempoRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (min < 60) return `hace ${min} min`;
    if (hrs < 24) return `hace ${hrs} h`;
    return `hace ${dias} día${dias !== 1 ? 's' : ''}`;
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  colorAvatar(genero: string | null): string {
    const g = genero?.toLowerCase() ?? '';
    if (g === 'femenino' || g === 'f' || g === 'mujer') return '#611232';
    if (g === 'masculino' || g === 'm' || g === 'hombre') return '#003366';
    return '#64748b';
  }

  colorAvatarText(genero: string | null): string {
    return '#ffffff';
  }

  iconoNotificacion(tipo: string): string {
    const iconos: Record<string, string> = {
      nueva_encuesta: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2',
      nueva_encuesta_ubicacion: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
      contacto: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      eventos: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    };
    return iconos[tipo] ?? iconos['nueva_encuesta'];
  }

  colorNotificacion(tipo: string): { bg: string; color: string } {
    const map: Record<string, { bg: string; color: string }> = {
      nueva_encuesta: { bg: '#eff6ff', color: '#2563eb' },
      nueva_encuesta_ubicacion: { bg: '#f0fdf4', color: '#16a34a' },
      contacto: { bg: '#fef3c7', color: '#d97706' },
      eventos: { bg: '#ede9fe', color: '#7c3aed' },
    };
    return map[tipo] ?? map['nueva_encuesta'];
  }

  // Charts
  private construirCharts(d: DashboardResumen): void {

    // 1. Barras — top 5 carreras
    const maxTotal = Math.max(...d.graficas.porCarrera.map(c => +c.total));
    this.chartBarras = {
      series: [{ name: 'Egresados', data: d.graficas.porCarrera.map(c => +c.total) }],
      chart: {
        type: 'bar', height: 200, fontFamily: this.chartFontFamily,
        toolbar: { show: false }, animations: { enabled: true, speed: 600 },
      },
      xaxis: {
        categories: d.graficas.porCarrera.map(c =>
          c.nombre_carrera.replace('Ingeniería ', 'Ing. ').replace(' (Presencial / Virtual)', '').replace(' (Presencial / A distancia)', '')
        ),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' } },
      },
      colors: ['#003366'],
      plotOptions: {
        bar: {
          borderRadius: 4, columnWidth: '55%', distributed: false,
          dataLabels: { position: 'top' }
        },
      },
      dataLabels: {
        enabled: true, offsetY: -16,
        style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: ['#374151'] },
      },
      grid: { borderColor: 'rgba(100,116,139,.1)', strokeDashArray: 4 },
      yaxis: { show: false },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } },
    };

    // 2. Pastel — situación laboral
    const coloresPastel = ['#003366', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];
    this.chartPastel = {
      series: d.graficas.situacionLaboral.map(s => +s.total),
      chart: {
        type: 'donut', height: 200, fontFamily: this.chartFontFamily,
        toolbar: { show: false },
      },
      labels: d.graficas.situacionLaboral.map(s =>
        s.situacion.replace('Empleado en el sector ', '').replace('Empresario / Trabajo por cuenta propia (Freelance)', 'Freelance').replace('Dedicado al hogar u otras actividades', 'Otras actividades')
      ),
      colors: coloresPastel,
      plotOptions: {
        pie: {
          donut: {
            size: '65%', labels: {
              show: true, total: {
                show: true, label: 'Total',
                formatter: () => `${d.kpis.total_egresados}`,
                style: { fontFamily: this.chartFontFamily, fontSize: '18px', fontWeight: '600', color: '#111827' },
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom', fontFamily: this.chartFontFamily, fontSize: '11px',
        labels: { colors: '#64748b' }, markers: { width: 8, height: 8, radius: 2 },
      },
      tooltip: { y: { formatter: (v: number) => `${v} egresados` } },
    };

    // 3. Línea — respuestas por mes
    this.chartLinea = {
      series: [{ name: 'Respuestas', data: d.graficas.respuestasPorMes.map(m => +m.total) }],
      chart: {
        type: 'area', height: 200, fontFamily: this.chartFontFamily,
        toolbar: { show: false }, animations: { enabled: true, speed: 600 },
        sparkline: { enabled: false },
      },
      xaxis: {
        categories: d.graficas.respuestasPorMes.map(m => m.mes_label),
        labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' } },
      },
      colors: ['#003366'],
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } },
      stroke: { width: 2, curve: 'smooth' },
      markers: { size: 4, colors: ['#003366'], strokeColors: '#fff', strokeWidth: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(100,116,139,.1)', strokeDashArray: 4 },
      yaxis: { labels: { style: { fontFamily: this.chartFontFamily, fontSize: '10px', colors: '#64748b' } } },
      tooltip: { y: { formatter: (v: number) => `${v} respuestas` } },
    };
  }

  abrirModal(tipo: string, titulo: string, subtitulo: string, chart: any): void {
    this.modalChart = {
      ...chart,
      chart: {
        ...chart.chart,
        height: tipo === 'donut' ? 460 : 420,
      },
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
}