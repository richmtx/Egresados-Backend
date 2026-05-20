import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { ReportesService, ReporteHistorial, DatosReporte } from './reportes.service';

type Organismo = 'TecNM' | 'ITD';
type Formato = 'PDF' | 'Excel';

interface TarjetaReporte {
  organismo: Organismo;
  subtipo: string;
  titulo: string;
  institucion: string;
  descripcion: string;
  badges: string[];
  colorClass: string;
  iconPath: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent implements OnInit {

  cargandoHistorial = true;
  historial: ReporteHistorial[] = [];

  filtroOrganismo: string = 'Todos';
  anioSeleccionado: number | null = null;
  aniosDisponibles: number[] = [];

  organismoActivo: Organismo | null = null;
  subtipoActivo: string = '';
  formatoSeleccionado: Formato = 'PDF';
  cargandoPrevia = false;
  datosPrevia: DatosReporte | null = null;
  errorPrevia = false;

  generando = false;
  mensajeGenerado = '';

  tarjetas: TarjetaReporte[] = [
    {
      organismo: 'TecNM',
      subtipo: 'Reporte Anual de Seguimiento de Egresados',
      titulo: 'Reporte TecNM',
      institucion: 'Tecnológico Nacional de México',
      descripcion: 'Documento oficial consolidado con datos de seguimiento de egresados conforme a los lineamientos del Tecnológico Nacional de México.',
      badges: ['Seguimiento general', 'Empleabilidad', 'Titulación', 'Género'],
      colorClass: 'card-blue',
      iconPath: '',
    },
    {
      organismo: 'ITD',
      subtipo: 'Reporte Institucional de Seguimiento de Egresados',
      titulo: 'Reporte ITD',
      institucion: 'Instituto Tecnológico de Durango',
      descripcion: 'Documento interno consolidado para uso de dirección, departamentos y coordinaciones del Instituto Tecnológico de Durango.',
      badges: ['Uso interno', 'Dirección', 'Departamentos', 'Vinculación'],
      colorClass: 'card-guinda',
      iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    },
  ];

  constructor(private reportesService: ReportesService) { }

  ngOnInit(): void {
    this.generarAnios();
    this.cargarHistorial();
  }

  private generarAnios(): void {
    const anioActual = new Date().getFullYear();
    for (let a = anioActual; a >= anioActual - 8; a--) {
      this.aniosDisponibles.push(a);
    }
  }

  cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.reportesService.getHistorial().subscribe({
      next: (h) => { this.historial = h; this.cargandoHistorial = false; },
      error: () => { this.cargandoHistorial = false; },
    });
  }

  get historialFiltrado(): ReporteHistorial[] {
    return this.historial.filter(r =>
      this.filtroOrganismo === 'Todos' || r.organismo === this.filtroOrganismo
    );
  }

  abrirConfigurador(tarjeta: TarjetaReporte): void {
    this.organismoActivo = tarjeta.organismo;
    this.subtipoActivo = tarjeta.subtipo;
    this.datosPrevia = null;
    this.errorPrevia = false;
    this.mensajeGenerado = '';
  }

  cerrarConfigurador(): void {
    this.organismoActivo = null;
    this.subtipoActivo = '';
    this.datosPrevia = null;
    this.generando = false;
    this.mensajeGenerado = '';
  }

  cargarVistaPrevia(): void {
    if (!this.organismoActivo) return;
    this.cargandoPrevia = true;
    this.errorPrevia = false;
    this.datosPrevia = null;

    const anio = this.anioSeleccionado ?? undefined;
    const obs$ = this.organismoActivo === 'TecNM'
      ? this.reportesService.getDatosTecNM(anio)
      : this.reportesService.getDatosITD(anio);

    obs$.subscribe({
      next: (d) => { this.datosPrevia = d; this.cargandoPrevia = false; },
      error: () => { this.errorPrevia = true; this.cargandoPrevia = false; },
    });
  }

  generarReporte(): void {
    if (!this.organismoActivo || !this.datosPrevia) return;
    this.generando = true;

    this.reportesService.registrarEnHistorial({
      tipo_reporte: this.subtipoActivo,
      organismo: this.organismoActivo,
      anio: this.anioSeleccionado ?? undefined,
      formato: this.formatoSeleccionado,
      generado_por: 'Administrador',
    }).subscribe({
      next: () => {
        this.generando = false;
        this.mensajeGenerado = `Reporte "${this.subtipoActivo}" registrado en el historial.`;
        this.cargarHistorial();
      },
      error: () => {
        this.generando = false;
        this.mensajeGenerado = 'Error al registrar el reporte.';
      },
    });
  }

  eliminarDelHistorial(id: number): void {
    if (!confirm('¿Eliminar este registro del historial?')) return;
    this.reportesService.eliminarDelHistorial(id).subscribe({
      next: () => this.cargarHistorial(),
    });
  }

  colorOrganismo(organismo: string): string {
    const map: Record<string, string> = {
      TecNM: 'badge-blue',
      ITD: 'badge-guinda',
    };
    return map[organismo] ?? 'badge-gray';
  }

  iconoFormato(formato: string): string {
    return formato === 'PDF'
      ? 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
      : 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h2v4H8z M12 13h2v4h-2z M16 13h2v4h-2z M8 9h8';
  }

  seccionesPrevia(): { etiqueta: string; valor: any }[] {
    if (!this.datosPrevia) return [];
    const s = this.datosPrevia.secciones;
    const re = s.resumenEjecutivo ?? s.insercionLaboral ?? s.studentOutcomes;
    return [
      { etiqueta: 'Total egresados', valor: re?.totalEgresados ?? '—' },
      { etiqueta: 'Tasa de empleo', valor: re?.tasaEmpleabilidad != null ? `${re.tasaEmpleabilidad}%` : '—' },
      { etiqueta: 'Tasa de titulación', valor: re?.tasaTitulacion != null ? `${re.tasaTitulacion}%` : '—' },
      { etiqueta: 'Satisfacción prom.', valor: re?.satisfaccionPromedio ?? '—' },
    ];
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
}