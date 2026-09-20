import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import {
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexPlotOptions, ApexDataLabels,
  ApexTooltip, ApexLegend, ApexGrid,
} from 'ngx-apexcharts';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  InclusionService, Conteo, aConteo,
  DominioDiscapacidad, InclusionCarrera, InclusionAnio, InclusionResumenDatos,
} from './inclusion.service';

/** Vistas ya mapeadas: todos los conteos son number | null (null = oculto) */
interface ResumenVista {
  totalEgresados: Conteo;
  consintieron: Conteo;
  personasConDiscapacidad: Conteo;
  indigenas: Conteo;
  hablanLenguaIndigena: Conteo;
  afromexicanos: Conteo;
  nacidosFueraDeMexico: Conteo;
}

interface GradoVista {
  grado: string;
  descripcion: string;
  total: Conteo;
}

interface DominioVista {
  dominio: string;
  pregunta: string;
  grados: GradoVista[];
}

interface FilaInclusion {
  etiqueta: string;
  discapacidad: Conteo;
  indigenas: Conteo;
  afromexicanos: Conteo;
}

/** Misma nota que devuelven los endpoints; se usa mientras no ha llegado la respuesta */
const NOTA_POR_DEFECTO =
  'Los grupos con menos de 5 personas, o cuyo complemento dentro del grupo sea menor a 5, ' +
  'se muestran como oculto para proteger la identidad de los egresados.';

/** Paleta por gravedad, alineada a los semáforos de titulación */
const COLORES_GRADO: Record<string, string> = {
  sin_dificultad: '#639922',
  poca_dificultad: '#EF9F27',
  mucha_dificultad: '#F97316',
  no_puedo: '#E24B4A',
  no_declara: '#9CA3AF',
};
const COLOR_GRADO_DEFECTO = '#7F77DD';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

@Component({
  selector: 'app-inclusion',
  standalone: true,
  imports: [CommonModule, NgxApexchartsModule, SidebarComponent],
  templateUrl: './inclusion.component.html',
  styleUrl: './inclusion.component.css'
})
export class InclusionComponent implements OnInit {

  // Estado general
  cargando = true;
  error = false;

  // Umbral de privacidad y nota (vienen del backend)
  umbral = 5;
  nota = NOTA_POR_DEFECTO;

  // Datos mapeados
  resumen: ResumenVista | null = null;
  dominios: DominioVista[] = [];
  filasCarrera: FilaInclusion[] = [];
  filasAnio: FilaInclusion[] = [];

  /** Todas las celdas de la gráfica están ocultas: no hay nada que dibujar */
  graficaSinDatos = false;

  /** Grados (series) en orden, tomados del backend */
  gradosGrafica: { grado: string; descripcion: string; color: string }[] = [];

  /**
   * Matriz fuente [grado][dominio] con null intacto. Los formatters de la gráfica
   * consultan ESTA matriz y no los valores de Apex, para que un null jamás se pinte como 0.
   */
  private celdas: Conteo[][] = [];

  // Gráfica: barras apiladas por dominio de discapacidad
  dominioSeries: ApexAxisChartSeries = [];
  dominioChart: ApexChart = {
    type: 'bar',
    height: 400,
    stacked: true,
    toolbar: { show: false },
    fontFamily: 'inherit',
    animations: { enabled: true },
  };
  dominioXAxis: ApexXAxis = {
    categories: [],
    labels: { style: { fontSize: '11px' }, formatter: (v: string) => String(Math.round(Number(v))) },
  };
  dominioYAxis: ApexYAxis = { labels: { maxWidth: 230, style: { fontSize: '12px' } } };
  dominioColors: string[] = [];
  dominioPlotOptions: ApexPlotOptions = { bar: { horizontal: true, borderRadius: 2, barHeight: '62%' } };
  dominioGrid: ApexGrid = { borderColor: '#f3f4f6' };
  dominioLegend: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
    markers: { shape: 'circle' },
    labels: { colors: '#374151' },
    fontSize: '13px',
    fontFamily: 'inherit',
    itemMargin: { horizontal: 12 },
  };
  dominioDataLabels: ApexDataLabels = {
    enabled: true,
    style: { fontSize: '11px', fontWeight: 600 },
    // Solo se rotula lo que el backend entregó; null => sin etiqueta (nunca "0")
    formatter: (_v: any, opts: any) => {
      const real = this.celdas[opts.seriesIndex]?.[opts.dataPointIndex];
      return real === null || real === undefined ? '' : String(real);
    },
  };
  dominioTooltip: ApexTooltip = { shared: false };

  private destroyRef = inject(DestroyRef);

  constructor(private inclusionService: InclusionService) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.dominioChart = { ...this.dominioChart, animations: { enabled: false } };
    }
    this.cargarDatos();
  }

  // Carga y mapeo
  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    forkJoin({
      resumen: this.inclusionService.getResumen(),
      dominios: this.inclusionService.getDiscapacidadPorDominio(),
      carreras: this.inclusionService.getPorCarrera(),
      anios: this.inclusionService.getPorAnioEgreso(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ resumen, dominios, carreras, anios }) => {
        this.umbral = resumen.umbral ?? 5;
        this.nota = resumen.nota || NOTA_POR_DEFECTO;

        this.resumen = this.mapearResumen(resumen.datos);
        this.dominios = this.mapearDominios(dominios.datos ?? []);
        this.filasCarrera = this.mapearCarreras(carreras.datos ?? []);
        this.filasAnio = this.mapearAnios(anios.datos ?? []);

        this.construirGrafica();
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  private mapearResumen(d: InclusionResumenDatos): ResumenVista {
    return {
      totalEgresados: aConteo(d.total_egresados),
      consintieron: aConteo(d.consintieron),
      personasConDiscapacidad: aConteo(d.personas_con_discapacidad),
      indigenas: aConteo(d.se_consideran_indigenas),
      hablanLenguaIndigena: aConteo(d.hablan_lengua_indigena),
      afromexicanos: aConteo(d.se_consideran_afromexicanos),
      nacidosFueraDeMexico: aConteo(d.nacidos_fuera_de_mexico),
    };
  }

  private mapearDominios(datos: DominioDiscapacidad[]): DominioVista[] {
    return datos.map(d => ({
      dominio: d.dominio,
      pregunta: d.pregunta,
      grados: d.grados.map(g => ({
        grado: g.grado,
        descripcion: g.descripcion,
        total: aConteo(g.total),
      })),
    }));
  }

  private mapearCarreras(datos: InclusionCarrera[]): FilaInclusion[] {
    return datos
      .map(c => ({
        etiqueta: c.carrera,
        discapacidad: aConteo(c.personas_con_discapacidad),
        indigenas: aConteo(c.se_consideran_indigenas),
        afromexicanos: aConteo(c.se_consideran_afromexicanos),
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  }

  private mapearAnios(datos: InclusionAnio[]): FilaInclusion[] {
    // Año más reciente primero, igual que el detalle de titulación
    return [...datos]
      .sort((a, b) => b.anio_egreso - a.anio_egreso)
      .map(a => ({
        etiqueta: String(a.anio_egreso),
        discapacidad: aConteo(a.personas_con_discapacidad),
        indigenas: aConteo(a.se_consideran_indigenas),
        afromexicanos: aConteo(a.se_consideran_afromexicanos),
      }));
  }

  // Gráfica
  private construirGrafica(): void {
    // Series = grados, en el orden en que llegan del primer dominio (unión si difieren)
    const orden: { grado: string; descripcion: string }[] = [];
    for (const d of this.dominios) {
      for (const g of d.grados) {
        if (!orden.some(o => o.grado === g.grado)) {
          orden.push({ grado: g.grado, descripcion: g.descripcion });
        }
      }
    }

    this.gradosGrafica = orden.map(o => ({
      ...o,
      color: COLORES_GRADO[o.grado] ?? COLOR_GRADO_DEFECTO,
    }));

    // Celda ausente o null => null (ausente). Nunca 0.
    this.celdas = this.gradosGrafica.map(o =>
      this.dominios.map(d => d.grados.find(g => g.grado === o.grado)?.total ?? null)
    );

    this.graficaSinDatos = this.celdas.every(fila => fila.every(v => v === null));

    this.dominioColors = this.gradosGrafica.map(g => g.color);
    this.dominioSeries = this.gradosGrafica.map((g, i) => ({
      name: g.descripcion,
      data: this.celdas[i],
    }));
    this.dominioXAxis = {
      ...this.dominioXAxis,
      categories: this.dominios.map(d => d.pregunta),
    };

    this.dominioTooltip = {
      shared: false,
      custom: ({ dataPointIndex }: any) => this.tooltipDominio(dataPointIndex),
    };

    // Forzar re-render de ApexCharts al cambiar objeto
    this.dominioChart = { ...this.dominioChart };
  }

  /** Tooltip por dominio: lista los 5 grados y marca los ocultos, sin inventar valores */
  private tooltipDominio(idx: number): string {
    const dom = this.dominios[idx];
    if (!dom) return '';

    const filas = this.gradosGrafica.map((g, i) => {
      const v = this.celdas[i]?.[idx] ?? null;
      const valor = v === null
        ? `<span style="color:#9ca3af;">Oculto (&lt;${this.umbral})</span>`
        : `<strong style="color:#111827;">${v}</strong>`;
      return `
        <div style="display:flex; align-items:center; gap:7px; margin-bottom:4px;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%;
            background:${g.color}; flex-shrink:0;"></span>
          <span style="color:#6b7280; flex:1;">${esc(g.descripcion)}</span>
          ${valor}
        </div>`;
    }).join('');

    return `
      <div style="padding:10px 14px; font-family:inherit; font-size:13px; min-width:240px;
        background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,.12);">
        <div style="font-weight:600; margin-bottom:8px; color:#111827;">${esc(dom.pregunta)}</div>
        ${filas}
      </div>`;
  }

  /** Conteo de un grado dentro de un dominio; ausente u oculto => null (nunca 0) */
  totalGrado(d: DominioVista, grado: string): Conteo {
    return d.grados.find(g => g.grado === grado)?.total ?? null;
  }

  trackByDominio = (_: number, d: DominioVista) => d.dominio;
  trackByFila = (_: number, f: FilaInclusion) => f.etiqueta;
}
