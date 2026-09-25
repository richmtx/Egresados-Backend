import { Component, OnInit, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { concat, forkJoin } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  DuplicadosService, DuplicadosResumen, DeteccionResultado, EgresadoDuplicado,
  GrupoDuplicado, CandidatoDuplicado, Fusion,
} from './duplicados.service';

type Pestana = 'pendientes' | 'descartados' | 'fusiones';

/** Una fila de la comparación lado a lado */
interface FilaComparacion {
  etiqueta: string;
  valores: (string | null)[];
  /** Algún valor difiere del resto (vacío vs. lleno también cuenta) */
  difiere: boolean;
}

interface CasoVista {
  grupo: GrupoDuplicado;
  filas: FilaComparacion[];
  /** Pares ya decididos (pestaña Descartados) */
  decisiones: CandidatoDuplicado[];
}

interface Aviso {
  tipo: 'exito' | 'error';
  texto: string;
}

const LIMIT_CASOS = 50;
const LIMIT_FUSIONES = 20;
const MAX_NOTAS = 500;
const DURACION_AVISO_MS = 7000;

/** Tablas hijas que mueve la fusión, en lenguaje legible */
const TABLAS_LEGIBLES: Record<string, [string, string]> = {
  autorizaciones: ['autorización de uso de datos', 'autorizaciones de uso de datos'],
  certificaciones: ['certificación', 'certificaciones'],
  colaboracion_otro: ['otra forma de colaboración', 'otras formas de colaboración'],
  egresado_colaboraciones: ['forma de colaboración', 'formas de colaboración'],
  egresado_discapacidad: ['respuesta de discapacidad', 'respuestas de discapacidad'],
  egresado_emprendimientos: ['emprendimiento', 'emprendimientos'],
  egresado_estudios: ['estudio adicional', 'estudios adicionales'],
  egresado_habilidades: ['habilidad', 'habilidades'],
  egresado_identidad: ['respuesta de identidad cultural', 'respuestas de identidad cultural'],
  egresado_proyectos_sociales: ['proyecto social', 'proyectos sociales'],
  habilidades_otro: ['otra habilidad', 'otras habilidades'],
  notificaciones: ['notificación', 'notificaciones'],
};

/** Campos que la fusión puede completar en el registro conservado */
const CAMPOS_LEGIBLES: Record<string, string> = {
  nombre_completo: 'Nombre',
  genero_id: 'Género',
  telefono: 'Teléfono',
  ciudad_residencia: 'Ciudad de residencia',
  pais_nacimiento: 'País de nacimiento',
  carrera_id: 'Carrera',
  anio_ingreso: 'Año de ingreso',
  periodo_ingreso: 'Periodo de ingreso',
  anio_egreso: 'Año de egreso',
  nivel_ingles_id: 'Nivel de inglés',
  situacion_laboral_id: 'Situación laboral',
  empresa: 'Empresa',
  antiguedad_empleo_id: 'Antigüedad en el empleo',
  ciudad_trabajo: 'Ciudad de trabajo',
  puesto_trabajo: 'Puesto de trabajo',
  tiempo_primer_empleo_id: 'Tiempo para el primer empleo',
  medio_primer_empleo_id: 'Medio del primer empleo',
  medio_primer_empleo_otro: 'Otro medio del primer empleo',
  primer_empleo_empresa: 'Empresa del primer empleo',
  primer_empleo_puesto: 'Puesto del primer empleo',
  numero_control: 'Número de control',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  coincidencia_laboral_id: 'Coincidencia laboral',
  estatus_titulacion: 'Estatus de titulación',
  satisfaccion_formacion: 'Satisfacción con la formación',
  foto_url: 'Foto',
  consintio_datos_sensibles: 'Consentimiento de datos sensibles',
  fecha_consentimiento_sensibles: 'Fecha del consentimiento de datos sensibles',
  registro_completo: 'Estado del registro',
  'autorizaciones.autorizo_estadisticas': 'Autoriza uso en estadísticas',
  'autorizaciones.autorizo_contacto': 'Autoriza que lo contacten',
  'autorizaciones.autorizo_eventos': 'Autoriza invitaciones a eventos',
};

// Fecha y hora van por separado: es-MX las une con "a las" y aquí se quiere "…de 2026, 12:30"
const FMT_HORA = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const vacio = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

@Component({
  selector: 'app-duplicados',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './duplicados.component.html',
  styleUrl: './duplicados.component.css'
})
export class DuplicadosComponent implements OnInit {

  readonly maxNotas = MAX_NOTAS;

  // Estado general (mismo patrón que Inclusión)
  cargando = true;
  error = false;

  resumen: DuplicadosResumen | null = null;
  totalFusiones = 0;

  // Pestañas
  readonly pestanas: { id: Pestana; etiqueta: string }[] = [
    { id: 'pendientes', etiqueta: 'Pendientes' },
    { id: 'descartados', etiqueta: 'Descartados' },
    { id: 'fusiones', etiqueta: 'Historial de fusiones' },
  ];
  pestana: Pestana = 'pendientes';

  // Casos pendientes
  pendientes: CasoVista[] = [];
  totalPendientes = 0;
  offsetPendientes = 0;
  cargandoPendientes = false;
  errorPendientes = false;

  // Casos descartados (se cargan al abrir la pestaña)
  descartados: CasoVista[] = [];
  totalDescartados = 0;
  offsetDescartados = 0;
  cargandoDescartados = false;
  errorDescartados = false;
  descartadosCargados = false;

  // Historial de fusiones
  fusiones: Fusion[] = [];
  offsetFusiones = 0;
  cargandoFusiones = false;
  errorFusiones = false;

  // Detección
  detectando = false;

  // Aviso temporal
  aviso: Aviso | null = null;
  private avisoTimer: ReturnType<typeof setTimeout> | null = null;

  // Modal de descartar
  casoDescartar: CasoVista | null = null;
  notasDescartar = '';
  descartando = false;
  errorDescartar = '';

  // Modal de fusionar
  casoFusionar: CasoVista | null = null;
  idConservar: number | null = null;
  idSugerido: number | null = null;
  motivoSugerido = '';
  notasFusionar = '';
  fusionando = false;
  errorFusionar = '';

  // Modal de detalle de fusión
  fusionDetalle: Fusion | null = null;
  cargandoDetalle = false;
  errorDetalle = false;
  private idDetalle: number | null = null;

  /** Elemento que abrió el modal; recibe el foco de vuelta al cerrarlo */
  private origenFoco: HTMLElement | null = null;

  @ViewChild('modalRef') modalRef?: ElementRef<HTMLElement>;

  private destroyRef = inject(DestroyRef);

  constructor(private duplicadosService: DuplicadosService) {
    this.destroyRef.onDestroy(() => { if (this.avisoTimer) clearTimeout(this.avisoTimer); });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Carga

  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    forkJoin({
      resumen: this.duplicadosService.getResumen(),
      pendientes: this.duplicadosService.listar('pendiente', LIMIT_CASOS, this.offsetPendientes),
      fusiones: this.duplicadosService.listarFusiones(LIMIT_FUSIONES, this.offsetFusiones),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ resumen, pendientes, fusiones }) => {
        this.resumen = resumen;
        this.pendientes = pendientes.grupos.map(g => this.mapearCaso(g));
        this.totalPendientes = pendientes.total;
        this.fusiones = fusiones.fusiones;
        this.totalFusiones = fusiones.total;
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });

    // Si ya se habían abierto, se refrescan también
    if (this.descartadosCargados) this.cargarDescartados();
  }

  /** Solo KPIs y conteos; se usa tras una acción para no parpadear toda la pantalla */
  private recargarResumen(): void {
    this.duplicadosService.getResumen().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => this.resumen = r,
      error: () => { },
    });
  }

  cargarPendientes(): void {
    this.cargandoPendientes = true;
    this.errorPendientes = false;
    this.duplicadosService.listar('pendiente', LIMIT_CASOS, this.offsetPendientes)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => {
          // Si la página quedó vacía (se resolvió su último caso), regresa una
          if (r.grupos.length === 0 && this.offsetPendientes > 0) {
            this.offsetPendientes = Math.max(0, this.offsetPendientes - LIMIT_CASOS);
            this.cargarPendientes();
            return;
          }
          this.pendientes = r.grupos.map(g => this.mapearCaso(g));
          this.totalPendientes = r.total;
          this.cargandoPendientes = false;
        },
        error: () => { this.errorPendientes = true; this.cargandoPendientes = false; },
      });
  }

  cargarDescartados(): void {
    this.cargandoDescartados = true;
    this.errorDescartados = false;
    this.duplicadosService.listar('descartado', LIMIT_CASOS, this.offsetDescartados)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => {
          this.descartados = r.grupos.map(g => this.mapearCaso(g));
          this.totalDescartados = r.total;
          this.descartadosCargados = true;
          this.cargandoDescartados = false;
        },
        error: () => { this.errorDescartados = true; this.cargandoDescartados = false; },
      });
  }

  cargarFusiones(): void {
    this.cargandoFusiones = true;
    this.errorFusiones = false;
    this.duplicadosService.listarFusiones(LIMIT_FUSIONES, this.offsetFusiones)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => {
          this.fusiones = r.fusiones;
          this.totalFusiones = r.total;
          this.cargandoFusiones = false;
        },
        error: () => { this.errorFusiones = true; this.cargandoFusiones = false; },
      });
  }

  // Mapeo de un grupo a la comparación lado a lado

  private mapearCaso(grupo: GrupoDuplicado): CasoVista {
    const eg = grupo.egresados;
    const fila = (etiqueta: string, valor: (e: EgresadoDuplicado) => string | null,
      normalizar: (v: string) => string = v => v.trim()): FilaComparacion => {
      const valores = eg.map(e => {
        const v = valor(e);
        return vacio(v) ? null : String(v).trim();
      });
      const claves = valores.map(v => (v === null ? '' : normalizar(v)));
      return { etiqueta, valores, difiere: claves.some(c => c !== claves[0]) };
    };
    const sinEspacios = (v: string) => v.replace(/[\s\-().]/g, '');
    const texto = (v: string) => v.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');

    return {
      grupo,
      filas: [
        fila('Nombre', e => e.nombre_completo, texto),
        fila('Correo', e => e.correo, texto),
        fila('Teléfono', e => e.telefono, sinEspacios),
        fila('Número de control', e => e.numero_control, v => sinEspacios(v).toUpperCase()),
        fila('Carrera', e => e.nombre_carrera, texto),
        fila('Generación (ingreso)', e => e.anio_ingreso === null ? null : String(e.anio_ingreso)),
        fila('Año de egreso', e => e.anio_egreso === null ? null : String(e.anio_egreso)),
        fila('Fecha de registro', e => this.fecha(e.fecha_registro)),
        fila('Estado del registro', e => e.registro_completo ? 'Completo' : 'Solo etapa 1'),
      ],
      decisiones: grupo.candidatos.filter(c => c.estado === 'descartado'),
    };
  }

  // Formato

  fecha(v: string | null): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : FMT_FECHA.format(d);
  }

  fechaHora(v: string | null): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : `${FMT_FECHA.format(d)}, ${FMT_HORA.format(d)}`;
  }

  claseScore(score: number): string {
    if (score >= 70) return 'score-alto';
    if (score >= 40) return 'score-medio';
    return 'score-bajo';
  }

  nivelScore(score: number): string {
    if (score >= 70) return 'coincidencia alta';
    if (score >= 40) return 'coincidencia media';
    return 'coincidencia baja';
  }

  /** Señales de todos los pares del caso, sin repetir y en orden de aparición */
  senalesCaso(caso: CasoVista): string[] {
    return [...new Set(caso.grupo.candidatos.flatMap(c => c.senales))];
  }

  // Pestañas (patrón WAI-ARIA: flechas, Inicio y Fin mueven y activan)

  seleccionarPestana(p: Pestana): void {
    this.pestana = p;
    if (p === 'descartados' && !this.descartadosCargados && !this.cargandoDescartados) {
      this.cargarDescartados();
    }
  }

  teclaPestana(event: KeyboardEvent, indice: number): void {
    const n = this.pestanas.length;
    let destino: number;
    switch (event.key) {
      case 'ArrowRight': destino = (indice + 1) % n; break;
      case 'ArrowLeft': destino = (indice - 1 + n) % n; break;
      case 'Home': destino = 0; break;
      case 'End': destino = n - 1; break;
      default: return;
    }
    event.preventDefault();
    this.seleccionarPestana(this.pestanas[destino].id);
    const lista = (event.currentTarget as HTMLElement).parentElement;
    (lista?.querySelectorAll<HTMLElement>('[role="tab"]')[destino])?.focus();
  }

  // Paginación

  paginaCasos(delta: number): void {
    if (this.pestana === 'pendientes') {
      this.offsetPendientes = Math.max(0, this.offsetPendientes + delta * LIMIT_CASOS);
      this.cargarPendientes();
    } else {
      this.offsetDescartados = Math.max(0, this.offsetDescartados + delta * LIMIT_CASOS);
      this.cargarDescartados();
    }
  }

  paginaFusiones(delta: number): void {
    this.offsetFusiones = Math.max(0, this.offsetFusiones + delta * LIMIT_FUSIONES);
    this.cargarFusiones();
  }

  get limiteCasos(): number { return LIMIT_CASOS; }
  get limiteFusiones(): number { return LIMIT_FUSIONES; }

  // Detección

  buscarDuplicados(): void {
    if (this.detectando) return;
    this.detectando = true;
    this.duplicadosService.detectar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.detectando = false;
        this.mostrarAviso('exito', this.mensajeDeteccion(r));
        this.recargarResumen();
        this.cargarPendientes();
      },
      error: (err: HttpErrorResponse) => {
        this.detectando = false;
        this.mostrarAviso('error', this.mensajeError(err, 'No se pudo completar la búsqueda de duplicados.'));
      },
    });
  }

  private mensajeDeteccion(r: DeteccionResultado): string {
    const partes = [`Se revisaron ${plural(r.total_egresados, 'egresado', 'egresados')}.`];
    const detalle: string[] = [];
    detalle.push(r.candidatos_nuevos === 0
      ? 'Ninguna coincidencia nueva'
      : plural(r.candidatos_nuevos, 'coincidencia nueva', 'coincidencias nuevas'));
    if (r.candidatos_respetados > 0) {
      detalle.push(`${plural(r.candidatos_respetados, 'ya revisada', 'ya revisadas')} que no se ${r.candidatos_respetados === 1 ? 'tocó' : 'tocaron'}`);
    }
    if (r.candidatos_eliminados > 0) {
      detalle.push(`${plural(r.candidatos_eliminados, 'ya no aplica y se quitó', 'ya no aplican y se quitaron')}`);
    }
    partes.push(detalle.join(', ') + '.');
    partes.push(r.total_pendientes === 0
      ? 'No quedan coincidencias por revisar.'
      : `Quedan ${plural(r.total_pendientes, 'coincidencia', 'coincidencias')} por revisar.`);
    return partes.join(' ');
  }

  // Aviso temporal (aria-live, no roba el foco)

  mostrarAviso(tipo: Aviso['tipo'], texto: string): void {
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.aviso = { tipo, texto };
    this.avisoTimer = setTimeout(() => this.aviso = null, DURACION_AVISO_MS);
  }

  cerrarAviso(): void {
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.aviso = null;
  }

  private mensajeError(err: HttpErrorResponse, porDefecto: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m) && m.length) return m.join(' ');
    if (typeof m === 'string' && m.trim()) return m;
    if (err?.status === 0) return 'No hay conexión con el servidor. Intenta de nuevo.';
    return porDefecto;
  }

  // Modal de descartar

  abrirDescartar(caso: CasoVista, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.casoDescartar = caso;
    this.notasDescartar = '';
    this.errorDescartar = '';
    this.enfocarModal();
  }

  cerrarDescartar(): void {
    if (this.descartando) return;
    this.casoDescartar = null;
    this.devolverFoco();
  }

  confirmarDescartar(): void {
    const caso = this.casoDescartar;
    if (!caso || this.descartando) return;
    const notas = this.notasDescartar.trim().slice(0, MAX_NOTAS) || undefined;
    // Un caso puede tener varios pares: se descartan todos los que sigan pendientes, uno tras otro
    const pares = caso.grupo.candidatos.filter(c => c.estado === 'pendiente');
    this.descartando = true;
    this.errorDescartar = '';

    concat(...pares.map(c => this.duplicadosService.descartar(c.id_candidato, notas)))
      .pipe(toArray(), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.descartando = false;
          this.casoDescartar = null;
          this.devolverFoco();
          this.mostrarAviso('exito', `Caso descartado: ${plural(caso.grupo.ids.length, 'registro quedó', 'registros quedaron')} como personas distintas.`);
          this.despuesDeDecidir();
        },
        error: (err: HttpErrorResponse) => {
          this.descartando = false;
          this.errorDescartar = this.mensajeError(err, 'No se pudo descartar el caso.');
          this.enfocarEnModal('.modal-footer .btn-primario');
          // Si alguno de los pares sí se alcanzó a descartar, la lista debe reflejarlo
          this.despuesDeDecidir();
        },
      });
  }

  // Modal de fusionar

  abrirFusionar(caso: CasoVista, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.casoFusionar = caso;
    this.notasFusionar = '';
    this.errorFusionar = '';
    const { id, motivo } = this.sugerirConservado(caso.grupo.egresados);
    this.idSugerido = id;
    this.motivoSugerido = motivo;
    this.idConservar = id;
    this.enfocarModal();
  }

  /**
   * Prefiere el único registro completo; si hay empate o ninguno lo está,
   * el de fecha_registro más antigua (y a igualdad, el id menor).
   */
  private sugerirConservado(egresados: EgresadoDuplicado[]): { id: number | null; motivo: string } {
    if (egresados.length === 0) return { id: null, motivo: '' };
    const completos = egresados.filter(e => e.registro_completo);
    if (completos.length === 1) {
      return { id: completos[0].id_egresado, motivo: 'Es el único con el registro completo.' };
    }
    const base = completos.length > 1 ? completos : egresados;
    const tiempo = (e: EgresadoDuplicado) => {
      const t = e.fecha_registro ? new Date(e.fecha_registro).getTime() : NaN;
      return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
    };
    const elegido = [...base].sort((a, b) => tiempo(a) - tiempo(b) || a.id_egresado - b.id_egresado)[0];
    const motivo = completos.length > 1
      ? 'Varios tienen el registro completo; este es el que se registró primero.'
      : 'Ninguno tiene el registro completo; este es el que se registró primero.';
    return { id: elegido.id_egresado, motivo };
  }

  get egresadoConservado(): EgresadoDuplicado | null {
    return this.casoFusionar?.grupo.egresados.find(e => e.id_egresado === this.idConservar) ?? null;
  }

  get egresadosEliminados(): EgresadoDuplicado[] {
    if (!this.casoFusionar || this.idConservar === null) return [];
    return this.casoFusionar.grupo.egresados.filter(e => e.id_egresado !== this.idConservar);
  }

  nombresEliminados(): string {
    return this.egresadosEliminados.map(e => e.nombre_completo || `Registro ${e.id_egresado}`).join(', ');
  }

  idsEliminadosTexto(): string {
    return this.egresadosEliminados.map(e => e.id_egresado).join(', ');
  }

  cerrarFusionar(): void {
    if (this.fusionando) return;
    this.casoFusionar = null;
    this.devolverFoco();
  }

  confirmarFusionar(): void {
    const conservado = this.egresadoConservado;
    const eliminados = this.egresadosEliminados;
    if (!conservado || eliminados.length === 0 || this.fusionando) return;

    const notas = this.notasFusionar.trim().slice(0, MAX_NOTAS);
    this.fusionando = true;
    this.errorFusionar = '';

    this.duplicadosService.fusionar({
      id_egresado_conservado: conservado.id_egresado,
      ids_eliminados: eliminados.map(e => e.id_egresado),
      ...(notas ? { notas } : {}),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fusionando = false;
        this.casoFusionar = null;
        this.devolverFoco();
        this.mostrarAviso('exito',
          `Fusión completada: se conservó a ${conservado.nombre_completo || 'el registro'} (id ${conservado.id_egresado}) y se ${eliminados.length === 1 ? 'borró 1 registro' : `borraron ${eliminados.length} registros`}.`);
        this.despuesDeDecidir();
        this.offsetFusiones = 0;
        this.cargarFusiones();
      },
      error: (err: HttpErrorResponse) => {
        // El modal sigue abierto con la selección intacta
        this.fusionando = false;
        this.errorFusionar = this.mensajeError(err, 'No se pudo completar la fusión. No se borró ningún registro.');
        this.enfocarEnModal('.btn-peligro');
      },
    });
  }

  private despuesDeDecidir(): void {
    this.recargarResumen();
    this.cargarPendientes();
    if (this.descartadosCargados) this.cargarDescartados();
  }

  // Detalle de una fusión

  abrirDetalle(f: Fusion, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.fusionDetalle = f;
    this.idDetalle = f.id_fusion;
    this.enfocarModal();
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    if (this.idDetalle === null) return;
    const id = this.idDetalle;
    this.cargandoDetalle = true;
    this.errorDetalle = false;
    this.duplicadosService.getFusion(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: f => {
        if (this.idDetalle !== id) return;
        this.fusionDetalle = f;
        this.cargandoDetalle = false;
      },
      error: () => { this.errorDetalle = true; this.cargandoDetalle = false; },
    });
  }

  cerrarDetalle(): void {
    this.fusionDetalle = null;
    this.idDetalle = null;
    this.devolverFoco();
  }

  /** "3 habilidades", "1 certificación"… solo lo que de verdad se movió */
  hijosLegibles(f: Fusion): string[] {
    return Object.entries(f.hijos_reasignados ?? {})
      .filter(([, n]) => Number(n) > 0)
      .map(([tabla, n]) => {
        const nombres = TABLAS_LEGIBLES[tabla] ?? [tabla.replace(/_/g, ' '), tabla.replace(/_/g, ' ')];
        return `${n} ${Number(n) === 1 ? nombres[0] : nombres[1]}`;
      });
  }

  camposLegibles(f: Fusion): { campo: string; valor: string }[] {
    return Object.entries(f.campos_completados ?? {}).map(([clave, v]) => ({
      campo: CAMPOS_LEGIBLES[clave] ?? clave.replace(/[._]/g, ' '),
      valor: this.valorCampo(clave, v),
    }));
  }

  private valorCampo(clave: string, v: unknown): string {
    if (clave === 'registro_completo') return 'Pasó a completo';
    if (clave === 'consintio_datos_sensibles') return 'Se trasladó junto con sus respuestas';
    if (clave.startsWith('autorizaciones.')) {
      // "1 -> 0": gana la respuesta más restrictiva de los dos registros
      const despues = String(v).split('->').pop()?.trim();
      const legible = despues === '1' ? 'Sí' : despues === '0' ? 'No' : 'Sin respuesta';
      return `Quedó en «${legible}» (se aplica la respuesta más restrictiva)`;
    }
    // Los catálogos llegan como id numérico: mostrarlo no le dice nada al administrador
    if (clave.endsWith('_id')) return 'Se completó con el dato del registro borrado';
    if (clave.startsWith('fecha')) return this.fecha(String(v)) ?? String(v);
    return vacio(v) ? '—' : String(v);
  }

  // Foco en modales: al abrir va al primer control, Tab queda atrapado, Escape cierra

  private enfocarModal(): void {
    setTimeout(() => {
      const modal = this.modalRef?.nativeElement;
      if (!modal) return;
      const preferido = modal.querySelector<HTMLElement>('[data-autofocus]:not([disabled])');
      (preferido ?? this.focusables(modal)[0] ?? modal).focus();
    });
  }

  /** Tras un error el botón enfocado se rehabilita, pero el foco ya se había ido a <body> */
  private enfocarEnModal(selector: string): void {
    setTimeout(() => this.modalRef?.nativeElement.querySelector<HTMLElement>(selector)?.focus());
  }

  private devolverFoco(): void {
    const origen = this.origenFoco;
    this.origenFoco = null;
    if (origen && document.contains(origen)) setTimeout(() => origen.focus());
  }

  private focusables(raiz: HTMLElement): HTMLElement[] {
    return Array.from(raiz.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null || el === document.activeElement)
      // En un grupo de radios solo el marcado recibe Tab
      .filter(el => !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked));
  }

  /**
   * Se escucha en el documento y no en el modal: al deshabilitarse el botón
   * enfocado durante una petición, el foco cae en <body> y el modal dejaría
   * de recibir Escape y Tab.
   */
  @HostListener('document:keydown', ['$event'])
  teclaModal(event: KeyboardEvent): void {
    const cerrar = this.casoFusionar ? this.cerrarFusionarFn
      : this.casoDescartar ? this.cerrarDescartarFn
        : this.fusionDetalle ? this.cerrarDetalleFn
          : null;
    if (!cerrar) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      cerrar();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = this.modalRef?.nativeElement;
    if (!modal) return;
    const els = this.focusables(modal);
    if (els.length === 0) { event.preventDefault(); return; }
    const primero = els[0];
    const ultimo = els[els.length - 1];
    const activo = document.activeElement;
    if (event.shiftKey && (activo === primero || !modal.contains(activo))) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && (activo === ultimo || !modal.contains(activo))) {
      event.preventDefault();
      primero.focus();
    }
  }

  // Cierres ligados a `this` para teclaModal
  readonly cerrarDescartarFn = () => this.cerrarDescartar();
  readonly cerrarFusionarFn = () => this.cerrarFusionar();
  readonly cerrarDetalleFn = () => this.cerrarDetalle();

  trackByCaso = (_: number, c: CasoVista) => c.grupo.ids.join('-');
  trackByEgresado = (_: number, e: EgresadoDuplicado) => e.id_egresado;
  trackByFusion = (_: number, f: Fusion) => f.id_fusion;
}
