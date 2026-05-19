import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { DirectorioService, EgresadoDirectorio } from './directorio.service';

@Component({
  selector: 'app-directorio',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './directorio.component.html',
  styleUrl: './directorio.component.css',
})
export class DirectorioComponent implements OnInit {

  // Estado general
  egresados: EgresadoDirectorio[] = [];
  egresadosFiltrados: EgresadoDirectorio[] = [];
  cargando = true;
  error = false;

  // Filtros
  busqueda = '';
  filtroCarrera = '';
  filtroTitulacion = '';
  filtroAnio = '';
  carrerasDisponibles: string[] = [];
  aniosDisponibles: number[] = [];

  // Modal
  egresadoSeleccionado: EgresadoDirectorio | null = null;
  modalAbierto = false;

  // Base URL para fotos
  baseUrl = 'http://localhost:3000';
  Math = Math;

  // Paginación
  paginaActual = 1;
  porPagina = 24;

  private directorioService = inject(DirectorioService);

  constructor() { }

  ngOnInit(): void {
    this.cargarDirectorio();
  }

  // Carga de datos
  cargarDirectorio(): void {
    this.cargando = true;
    this.error = false;

    this.directorioService.getDirectorio().subscribe({
      next: (data) => {
        this.egresados = data;
        this.construirFiltros(data);
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      },
    });
  }

  private construirFiltros(data: EgresadoDirectorio[]): void {
    this.carrerasDisponibles = [...new Set(data.map(e => e.nombre_carrera))].sort();
    this.aniosDisponibles = [...new Set(data.map(e => e.anio_egreso))].sort((a, b) => b - a);
  }

  // Filtrado reactivo
  aplicarFiltros(): void {
    const busq = this.busqueda.toLowerCase().trim();

    this.egresadosFiltrados = this.egresados.filter(e => {
      const matchBusq = !busq || e.nombre_completo.toLowerCase().includes(busq)
        || (e.puesto_trabajo ?? '').toLowerCase().includes(busq);
      const matchCarrera = !this.filtroCarrera || e.nombre_carrera === this.filtroCarrera;
      const matchTitulacion = !this.filtroTitulacion || e.estatus_titulacion === this.filtroTitulacion;
      const matchAnio = !this.filtroAnio || e.anio_egreso === +this.filtroAnio;
      return matchBusq && matchCarrera && matchTitulacion && matchAnio;
    });

    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroCarrera = '';
    this.filtroTitulacion = '';
    this.filtroAnio = '';
    this.aplicarFiltros();
  }

  get hayFiltrosActivos(): boolean {
    return !!(this.busqueda || this.filtroCarrera || this.filtroTitulacion || this.filtroAnio);
  }

  // Paginación
  get totalPaginas(): number {
    return Math.ceil(this.egresadosFiltrados.length / this.porPagina);
  }

  get egresadosPagina(): EgresadoDirectorio[] {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    return this.egresadosFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (actual <= 4) return [1, 2, 3, 4, 5, -1, total];
    if (actual >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    return [1, -1, actual - 1, actual, actual + 1, -1, total];
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaActual = p;
    document.querySelector('.comp-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Modal
  abrirModal(egresado: EgresadoDirectorio): void {
    this.egresadoSeleccionado = egresado;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.egresadoSeleccionado = null;
    document.body.style.overflow = '';
  }

  cerrarModalOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  // Helpers de UI
  getIniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getFotoUrl(fotoUrl: string | null): string | null {
    if (!fotoUrl) return null;
    return fotoUrl.startsWith('http') ? fotoUrl : `${this.baseUrl}/${fotoUrl}`;
  }

  getAvatarColor(eg: EgresadoDirectorio): string {
    const g = (eg.genero ?? '').toLowerCase();
    if (g === 'femenino') return '#611232';
    if (g === 'masculino') return '#003366';
    return '#4b5563';
  }

  getAvatarTextColor(_eg: EgresadoDirectorio): string {
    return '#ffffff';
  }

  getTagClass(estatus: string): string {
    switch (estatus) {
      case 'Titulado': return 'tag-tit';
      case 'No titulado': return 'tag-notit';
      case 'En trámite': return 'tag-tramite';
      default: return 'tag-tramite';
    }
  }

  getCoincidenciaPct(nivel: string | null): number {
    switch (nivel) {
      case 'Totalmente': return 100;
      case 'En gran medida': return 85;
      case 'Parcialmente': return 60;
      case 'Poco': return 35;
      case 'Nada': return 10;
      case 'No aplica / Actualmente no estoy laborando': return 0;
      default: return 0;
    }
  }

  getCoincidenciaColor(nivel: string | null): string {
    switch (nivel) {
      case 'Totalmente': return '#16a34a';
      case 'En gran medida': return '#65a30d';
      case 'Parcialmente': return '#ca8a04';
      case 'Poco': return '#ea580c';
      case 'Nada': return '#dc2626';
      case 'No aplica / Actualmente no estoy laborando': return '#9ca3af';
      default: return '#9ca3af';
    }
  }

  abrirLinkedin(url: string): void {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(fullUrl, '_blank', 'noopener');
  }
}