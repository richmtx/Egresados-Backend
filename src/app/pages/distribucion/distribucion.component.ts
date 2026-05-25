import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, AfterViewInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DistribucionService, DistribucionGeoResponse, KpisGeo, CiudadTrabajo, PaisTrabajo, MovilidadAnio,
  MovilidadCarrera, } from './distribucion.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-distribucion',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './distribucion.component.html',
  styleUrls: ['./distribucion.component.css'],
})
export class DistribucionComponent implements OnInit, OnDestroy, AfterViewInit {

  // Estado general
  datos: DistribucionGeoResponse | null = null;
  cargando = true;
  error = false;

  // Filtros
  filtroCarrera = '';
  filtroAnio = '';
  carrerasDisponibles: string[] = [];
  todasLasCarreras: string[] = [];
  aniosDisponibles: number[] = [];
  todosLosAnios: number[] = [];

  // Mapas Leaflet
  private mapaMexico: any = null;
  private mapaMundial: any = null;
  private L: any = null;

  readonly idMapaMexico = 'mapa-mexico';
  readonly idMapaMundial = 'mapa-mundial';

  // ── Diccionario de coordenadas (fallback mientras el backend no las entrega) ──
  // NOTA: Si en el futuro el backend devuelve lat/lng en CiudadTrabajo y
  // ExtranjerDetalle, estos diccionarios dejan de ser necesarios y se pueden
  // eliminar. Actualmente actúan como fallback estático.
  private readonly coordsMexico: Record<string, [number, number]> = {
    'Durango': [24.0277, -104.6532],
    'Ciudad de México': [19.4326, -99.1332],
    'Guadalajara': [20.6597, -103.3496],
    'Monterrey': [25.6866, -100.3161],
    'Culiacán': [24.8091, -107.3940],
    'Chihuahua': [28.6353, -106.0889],
    'Zacatecas': [22.7709, -102.5832],
    'Torreón': [25.5428, -103.4068],
    'Hermosillo': [29.0729, -110.9559],
    'Mazatlán': [23.2494, -106.4111],
    'San Luis Potosí': [22.1565, -100.9855],
    'Saltillo': [25.4232, -101.0053],
    'Aguascalientes': [21.8818, -102.2916],
    'Mexicali': [32.6245, -115.4523],
    'Tijuana': [32.5149, -117.0382],
    'León': [21.1221, -101.6824],
    'Puebla': [19.0414, -98.2063],
    'Querétaro': [20.5888, -100.3899],
    'Mérida': [20.9674, -89.5926],
    'Cancún': [21.1619, -86.8515],
    'Gómez Palacio': [25.5674, -103.4971],
    'Lerdo': [25.5368, -103.5254],
    // ── Extiende aquí si detectas ciudades faltantes en los logs ──
  };

  private readonly coordsInternacionales: Record<string, [number, number]> = {
    'Londres': [51.5074, -0.1278],
    'Abu Dabi': [24.4539, 54.3773],
    'Dubái': [25.2048, 55.2708],
    'Nueva York': [40.7128, -74.0060],
    'Chicago': [41.8781, -87.6298],
    'Houston': [29.7604, -95.3698],
    'Los Ángeles': [34.0522, -118.2437],
    'Dallas': [32.7767, -96.7970],
    'San Francisco': [37.7749, -122.4194],
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3851, 2.1734],
    'Berlín': [52.5200, 13.4050],
    'Múnich': [48.1351, 11.5820],
    'Toronto': [43.6532, -79.3832],
    'Vancouver': [49.2827, -123.1207],
    'Montreal': [45.5017, -73.5673],
    'Copenhague': [55.6761, 12.5683],
    'Ámsterdam': [52.3676, 4.9041],
    'París': [48.8566, 2.3522],
    'Roma': [41.9028, 12.4964],
    'Tokio': [35.6762, 139.6503],
    'Sídney': [-33.8688, 151.2093],
    'São Paulo': [-23.5505, -46.6333],
    'Buenos Aires': [-34.6037, -58.3816],
    // ── Extiende aquí si detectas ciudades faltantes en los logs ──
  };

  private destroyRef = inject(DestroyRef);

  constructor(
    private svc: DistribucionService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destruirMapas();
  }

  // Carga principal
  cargarDatos(): void {
    this.cargando = true;
    this.error = false;
    this.destruirMapas();

    const carrera = this.filtroCarrera || undefined;
    const anio = this.filtroAnio ? Number(this.filtroAnio) : undefined;

    this.svc.getDistribucion(carrera, anio).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resp) => {
        this.datos = resp;
        this.cargando = false;

        // Carreras
        const carrerasEnRespuesta = resp.movilidadPorCarrera
          .map((m) => m.nombre_carrera)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .sort();

        if (!this.filtroCarrera && !this.filtroAnio) {
          this.todasLasCarreras = carrerasEnRespuesta;
        } else if (this.todasLasCarreras.length === 0) {
          this.todasLasCarreras = carrerasEnRespuesta;
        }
        this.carrerasDisponibles = this.todasLasCarreras;

        // Años
        const aniosEnRespuesta = resp.movilidadPorAnio
          .map((a) => a.anio_egreso)
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .sort((a, b) => b - a);

        if (!this.filtroCarrera && !this.filtroAnio) {
          this.todosLosAnios = aniosEnRespuesta;
        } else if (this.todosLosAnios.length === 0) {
          this.todosLosAnios = aniosEnRespuesta;
        }
        this.aniosDisponibles = this.todosLosAnios;

        this.cdr.detectChanges();

        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.inicializarMapas(), 100);
        }
      },
      error: () => {
        this.cargando = false;
        this.error = true;
      },
    });
  }

  // Filtros
  onFiltroChange(): void {
    this.cargarDatos();
  }

  limpiarFiltros(): void {
    this.filtroCarrera = '';
    this.filtroAnio = '';
    this.cargarDatos();
  }

  // Helpers de vista
  getPct(parte: number, total: number): string {
    if (!total) return '0';
    return Math.round((parte / total) * 100).toString();
  }

  getBarWidth(valor: number, maximo: number): string {
    if (!maximo) return '0%';
    return Math.round((valor / maximo) * 100) + '%';
  }

  getMaxCiudad(): number {
    if (!this.datos?.topCiudadesTrabajo?.length) return 1;
    return Math.max(...this.datos.topCiudadesTrabajo.map((c) => c.total));
  }

  getMaxAnio(): number {
    if (!this.datos?.movilidadPorAnio?.length) return 1;
    return Math.max(...this.datos.movilidadPorAnio.map((a) => a.total));
  }

  getMaxCarrera(): number {
    if (!this.datos?.movilidadPorCarrera?.length) return 1;
    return Math.max(...this.datos.movilidadPorCarrera.map((c) => c.total));
  }

  getCiudadCorta(ciudad: string): string {
    return ciudad.split(',')[0].trim();
  }

  getPais(ciudad: string): string {
    const partes = ciudad.split(',');
    return partes[partes.length - 1].trim();
  }

  // Resolución de coordenadas
  /**
   * Resuelve las coordenadas de una ciudad con la siguiente prioridad:
   *   1. lat/lng que ya venga en el objeto (cuando el backend las provea).
   *   2. Diccionario estático de fallback.
   *   3. null → el punto se omite y se registra un warning en consola.
   *
   * Para activar la opción 1 solo hay que agregar lat/lng a los interfaces
   * CiudadTrabajo y ExtranjerDetalle en distribucion.service.ts y el backend
   * deberá devolverlos; sin cambios adicionales en este componente.
   */
  private resolverCoords(
    ciudad: string,
    lat?: number,
    lng?: number,
    diccionario?: Record<string, [number, number]>,
  ): [number, number] | null {
    // Prioridad 1: coordenadas del backend
    if (lat != null && lng != null) {
      return [lat, lng];
    }

    // Prioridad 2: diccionario estático
    const nombre = this.getCiudadCorta(ciudad);
    const coords = diccionario?.[nombre];
    if (coords) return coords;

    // Prioridad 3: no encontrado → log para diagnóstico
    console.warn(`[Mapa] Sin coordenadas para: "${nombre}" (ciudad completa: "${ciudad}")`);
    return null;
  }

  // Inicialización de mapas Leaflet
  private async inicializarMapas(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.L = await import('leaflet');
    const L = this.L;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    this.inicializarMapaMexico(L);
    this.inicializarMapaMundial(L);
  }

  // Mapa México
  private inicializarMapaMexico(L: any): void {
    const el = document.getElementById(this.idMapaMexico);
    if (!el || this.mapaMexico) return;

    this.mapaMexico = L.map(this.idMapaMexico, {
      center: [23.6345, -102.5528],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(this.mapaMexico);

    if (!this.datos?.topCiudadesTrabajo?.length) return;

    const maxTotal = this.getMaxCiudad();
    let sinCoordsCount = 0;

    this.datos.topCiudadesTrabajo.forEach((ciudad) => {
      const pais = this.getPais(ciudad.ciudad_trabajo);
      if (pais !== 'México') return;

      // Soporta lat/lng del backend (cuando el servicio los agregue)
      const coords = this.resolverCoords(
        ciudad.ciudad_trabajo,
        (ciudad as any).lat,
        (ciudad as any).lng,
        this.coordsMexico,
      );

      if (!coords) {
        sinCoordsCount++;
        return;
      }

      const radio = Math.max(8, Math.round((ciudad.total / maxTotal) * 40));

      L.circleMarker(coords, {
        radius: radio,
        fillColor: '#003366',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.75,
      })
        .addTo(this.mapaMexico)
        .bindPopup(`
          <div style="font-family:inherit;min-width:140px">
            <strong style="font-size:13px;color:#003366">
              ${this.getCiudadCorta(ciudad.ciudad_trabajo)}
            </strong><br>
            <span style="font-size:12px;color:#6b7280">
              ${ciudad.total} egresado${ciudad.total !== 1 ? 's' : ''}
            </span>
          </div>
        `);
    });

    if (sinCoordsCount > 0) {
      console.warn(
        `[MapaMéxico] ${sinCoordsCount} ciudad(es) omitidas por falta de coordenadas. ` +
        `Revisa los logs anteriores o agrega lat/lng en el backend.`,
      );
    }
  }

  // Mapa Mundial
  private inicializarMapaMundial(L: any): void {
    const el = document.getElementById(this.idMapaMundial);
    if (!el || this.mapaMundial) return;

    if (!this.datos?.extranjerosDetalle?.length) return;

    this.mapaMundial = L.map(this.idMapaMundial, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      },
    ).addTo(this.mapaMundial);

    const maxTotal = Math.max(
      ...this.datos.extranjerosDetalle.map((e) => e.total),
    );
    let sinCoordsCount = 0;

    this.datos.extranjerosDetalle.forEach((item) => {
      // Soporta lat/lng del backend (cuando el servicio los agregue)
      const coords = this.resolverCoords(
        item.ciudad_trabajo,
        (item as any).lat,
        (item as any).lng,
        this.coordsInternacionales,
      );

      if (!coords) {
        sinCoordsCount++;
        return;
      }

      const radio = Math.max(8, Math.round((item.total / maxTotal) * 35));

      L.circleMarker(coords, {
        radius: radio,
        fillColor: '#7c3aed',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.78,
      })
        .addTo(this.mapaMundial)
        .bindPopup(`
          <div style="font-family:inherit;min-width:140px">
            <strong style="font-size:13px;color:#7c3aed">
              ${this.getCiudadCorta(item.ciudad_trabajo)}
            </strong><br>
            <span style="font-size:11px;color:#9ca3af">${item.pais}</span><br>
            <span style="font-size:12px;color:#6b7280">
              ${item.total} egresado${item.total !== 1 ? 's' : ''}
            </span>
          </div>
        `);
    });

    if (sinCoordsCount > 0) {
      console.warn(
        `[MapaMundial] ${sinCoordsCount} ciudad(es) omitidas por falta de coordenadas. ` +
        `Revisa los logs anteriores o agrega lat/lng en el backend.`,
      );
    }
  }

  // Destruye los mapas para evitar errores al recargar con filtros
  private destruirMapas(): void {
    if (this.mapaMexico) {
      this.mapaMexico.remove();
      this.mapaMexico = null;
    }
    if (this.mapaMundial) {
      this.mapaMundial.remove();
      this.mapaMundial = null;
    }
  }

  exportarPDF(): void {
    window.print();
  }
}