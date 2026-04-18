import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { EgresadosService, EgresadoDetalle } from './egresados.service';

@Component({
  selector: 'app-egresados',
  imports: [SidebarComponent, CommonModule],
  templateUrl: './egresados.component.html',
  styleUrl: './egresados.component.css'
})
export class EgresadosComponent implements OnInit {

  egresados: EgresadoDetalle[] = [];
  egresadosFiltrados: EgresadoDetalle[] = [];
  cargando = true;
  error = '';

  // Filtros
  busqueda = '';
  filtroCarrera = '';
  filtroAnio = '';
  filtroSituacion = '';
  filtroChip = 'todos';

  // Listas para los selects
  carreras: string[] = [];
  anios: number[] = [];
  situaciones: string[] = [];

  constructor(private egresadosService: EgresadosService) { }

  ngOnInit(): void {
    this.egresadosService.getEgresadosDetalle().subscribe({
      next: (data) => {
        this.egresados = data;
        this.egresadosFiltrados = data;
        this.cargarOpciones(data);
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'No se pudo conectar con el servidor';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  cargarOpciones(data: EgresadoDetalle[]): void {
    this.carreras = [...new Set(data.map(e => e.nombre_carrera))].sort();
    this.anios = [...new Set(data.map(e => e.anio_egreso))].sort((a, b) => b - a);
    this.situaciones = [...new Set(data.map(e => e.situacion_laboral))].sort();
  }

  aplicarFiltros(): void {
    this.egresadosFiltrados = this.egresados.filter(e => {

      const q = this.busqueda.toLowerCase();
      if (q && !e.nombre_completo.toLowerCase().includes(q) &&
        !e.nombre_carrera.toLowerCase().includes(q) &&
        !e.empresa.toLowerCase().includes(q)) return false;

      if (this.filtroCarrera && e.nombre_carrera !== this.filtroCarrera) return false;
      if (this.filtroAnio && e.anio_egreso !== +this.filtroAnio) return false;
      if (this.filtroSituacion && e.situacion_laboral !== this.filtroSituacion) return false;

      if (this.filtroChip === 'sin-encuesta') return false;
      if (this.filtroChip === 'contacto' && !e.autorizo_contacto) return false;
      if (this.filtroChip === 'titulado' && e.estatus_titulacion !== 'Titulado') return false;

      return true;
    });
  }

  onBusqueda(event: Event): void {
    this.busqueda = (event.target as HTMLInputElement).value;
    this.aplicarFiltros();
  }

  onFiltroCarrera(event: Event): void {
    this.filtroCarrera = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroAnio(event: Event): void {
    this.filtroAnio = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroSituacion(event: Event): void {
    this.filtroSituacion = (event.target as HTMLSelectElement).value;
    this.aplicarFiltros();
  }

  onFiltroChip(chip: string): void {
    this.filtroChip = chip;
    this.aplicarFiltros();
  }

  get satisfaccionPromedio(): string {
    if (!this.egresados.length) return '0.0';
    const suma = this.egresados.reduce((a, e) => a + e.satisfaccion_formacion, 0);
    return (suma / this.egresados.length).toFixed(1);
  }

  getIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return partes[0][0].toUpperCase();
  }

  getTotalEmpleados(): number {
    return this.egresados.filter(e =>
      e.situacion_laboral?.toLowerCase().includes('empleado') ||
      e.situacion_laboral?.toLowerCase().includes('empresa')
    ).length;
  }

  getTotalContacto(): number {
    return this.egresados.filter(e => e.autorizo_contacto).length;
  }

  eliminarEgresado(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este egresado?')) return;
    this.egresadosService.deleteEgresado(id).subscribe({
      next: () => {
        this.egresados = this.egresados.filter(e => e.id_egresado !== id);
        this.aplicarFiltros();
      },
      error: (err) => console.error(err)
    });
  }

  getSituacionClass(situacion: string): string {
    if (!situacion) return 'chip-gray';
    const s = situacion.toLowerCase();
    if (s.includes('empleado') || s.includes('empresa') || s.includes('freelance')) return 'chip-green';
    if (s.includes('desempleado') || s.includes('buscando')) return 'chip-red';
    if (s.includes('estudi')) return 'chip-purple';
    return 'chip-gray';
  }

  getTitulacionClass(estatus: string): string {
    const map: Record<string, string> = {
      '1': 'chip-teal',
      '2': 'chip-amber',
      '3': 'chip-gray',
      'Titulado': 'chip-teal',
      'En trámite': 'chip-amber',
      'No titulado': 'chip-gray',
    };
    return map[estatus] ?? 'chip-gray';
  }

  getTitulacionLabel(estatus: string): string {
    const map: Record<string, string> = {
      '1': 'Titulado',
      '2': 'En trámite',
      '3': 'No titulado',
    };
    return map[estatus] ?? estatus;
  }

}