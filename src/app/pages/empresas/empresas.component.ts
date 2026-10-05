import { Component, OnInit, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import {
  EmpresasService, DeteccionEmpresas, EstadoVariante, GrupoEmpresa, VarianteEmpresa,
  FusionEmpresasResultado, EmpresaCatalogo, TextoEmpresa,
} from './empresas.service';

type Pestana = 'variantes' | 'manual' | 'catalogo';

/** Tramo de un texto crudo; `espacio` marca los espacios que HTML colapsaría */
interface Segmento {
  texto: string;
  espacio: boolean;
}

/** Texto de empresa listo para mostrarse sin perder sus espacios */
interface TextoCrudo {
  segmentos: Segmento[];
  /** "2 espacios al inicio, 2 al final"; vacío si no tiene nada que marcar */
  nota: string;
}

interface VarianteVista {
  v: VarianteEmpresa;
  crudo: TextoCrudo;
  incluida: boolean;
}

interface GrupoVista {
  grupo: GrupoEmpresa;
  titulo: string;
  variantes: VarianteVista[];
  totalEmpresa: number;
  totalPrimer: number;
  expandido: boolean;
  /** id de la variante elegida como nombre canónico, o 'otro' si se escribe a mano */
  canonico: number | 'otro';
  canonicoOtro: string;
}

interface TextoVista {
  t: TextoEmpresa;
  crudo: TextoCrudo;
}

interface TextoFusion {
  texto: string;
  crudo: TextoCrudo;
  empresa: number;
  primer: number;
}

/** Lo que el modal de confirmación le explica al administrador */
interface PlanFusion {
  canonico: string;
  canonicoCrudo: TextoCrudo;
  textos: TextoFusion[];
  totalEmpresa: number;
  totalPrimer: number;
  origen: 'grupo' | 'manual';
}

interface ResumenDeteccion {
  r: DeteccionEmpresas;
  /** null si no se pudo comparar contra la lista anterior */
  gruposNuevos: number | null;
}

interface Aviso {
  tipo: 'exito' | 'error';
  texto: string;
}

const MAX_NOMBRE = 255;
const MAX_VARIANTES = 50;
const MAX_TEXTOS_VISIBLES = 100;
const DURACION_AVISO_MS = 7000;
const MARCA_ESPACIO = '·';

const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const plural = (n: number, uno: string, varios: string): string => `${n} ${n === 1 ? uno : varios}`;

// Dos o más espacios seguidos, o cualquier blanco que no sea un espacio normal (tabulador, salto)
const ESPACIOS_INTERNOS = /(\s{2,}|[^\S ])/;

/**
 * Parte el texto para que los espacios de los extremos y los repetidos en
 * medio se dibujen con un marcador: en HTML normal el navegador los colapsa y
 * "  John Deere  " se vería idéntico a "John Deere".
 */
function analizarTexto(texto: string): TextoCrudo {
  const inicio = texto.length - texto.trimStart().length;
  const fin = inicio === texto.length ? 0 : texto.length - texto.trimEnd().length;
  const medio = texto.slice(inicio, texto.length - fin);

  const segmentos: Segmento[] = [];
  let internos = 0;
  if (inicio) segmentos.push({ texto: MARCA_ESPACIO.repeat(inicio), espacio: true });
  for (const parte of medio.split(ESPACIOS_INTERNOS)) {
    if (!parte) continue;
    const espacio = parte.trim() === '';
    // Un espacio suelto entre palabras es texto normal; solo se marcan los que se pierden
    if (espacio && parte !== ' ') {
      internos++;
      segmentos.push({ texto: MARCA_ESPACIO.repeat(parte.length), espacio: true });
    } else {
      segmentos.push({ texto: parte, espacio: false });
    }
  }
  if (fin) segmentos.push({ texto: MARCA_ESPACIO.repeat(fin), espacio: true });

  const nota: string[] = [];
  if (inicio) nota.push(`${plural(inicio, 'espacio', 'espacios')} al inicio`);
  if (fin) nota.push(`${plural(fin, 'espacio', 'espacios')} al final`);
  if (internos) nota.push(internos === 1 ? 'espacios seguidos en medio' : `${internos} tramos de espacios seguidos en medio`);
  return { segmentos, nota: nota.join(', ') };
}

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './empresas.component.html',
  styleUrl: './empresas.component.css'
})
export class EmpresasComponent implements OnInit {

  readonly maxNombre = MAX_NOMBRE;
  readonly maxVariantes = MAX_VARIANTES;
  readonly tooltipEspacio = 'Cada punto es un espacio que la persona escribió. Se marca porque el navegador no lo mostraría y es lo que distingue a esta variante.';

  // Estado general (mismo patrón que Duplicados)
  cargando = true;
  error = false;

  // Pestañas
  readonly pestanas: { id: Pestana; etiqueta: string }[] = [
    { id: 'variantes', etiqueta: 'Variantes detectadas' },
    { id: 'manual', etiqueta: 'Fusión manual' },
    { id: 'catalogo', etiqueta: 'Catálogo' },
  ];
  pestana: Pestana = 'variantes';

  // Variantes detectadas
  readonly estados: { id: EstadoVariante; etiqueta: string }[] = [
    { id: 'pendiente', etiqueta: 'Pendientes' },
    { id: 'fusionado', etiqueta: 'Fusionadas' },
    { id: 'descartado', etiqueta: 'Descartadas' },
  ];
  filtro: EstadoVariante = 'pendiente';
  grupos: GrupoVista[] = [];
  cargandoGrupos = false;
  errorGrupos = false;

  /** Conteos de lo pendiente, sin importar qué filtro esté a la vista */
  pendientes = { grupos: 0, variantes: 0, menciones: 0 };

  // Detección
  detectando = false;
  deteccion: ResumenDeteccion | null = null;

  // Fusión manual (se carga al abrir la pestaña; la búsqueda la resuelve el servidor)
  textos: TextoVista[] = [];
  /** Textos que coinciden con la búsqueda aplicada; `textos` trae a lo más MAX_TEXTOS_VISIBLES */
  totalCoinciden = 0;
  /** Textos que existen sin filtrar: distingue "no hay ninguno" de "nada coincide" */
  totalTextos = 0;
  busquedaManual = '';
  /** Búsqueda con la que se pidió la lista que está a la vista */
  busquedaManualAplicada = '';
  cargandoTextos = false;
  errorTextos = false;
  textosCargados = false;
  private busquedaManual$ = new Subject<string>();
  private pedidoTextos = 0;
  seleccion: TextoVista[] = [];
  canonicoManual: TextoVista | 'otro' = 'otro';
  canonicoManualOtro = '';

  // Catálogo
  catalogo: EmpresaCatalogo[] = [];
  totalCatalogo = 0;
  busquedaCatalogo = '';
  /** Búsqueda con la que se pidió la lista que está a la vista */
  busquedaCatalogoAplicada = '';
  cargandoCatalogo = false;
  errorCatalogo = false;
  private busquedaCatalogo$ = new Subject<string>();
  private pedidoCatalogo = 0;

  // Aviso temporal
  aviso: Aviso | null = null;
  private avisoTimer: ReturnType<typeof setTimeout> | null = null;

  // Modal de fusionar (lo comparten Variantes detectadas y Fusión manual)
  planFusion: PlanFusion | null = null;
  fusionando = false;
  errorFusion = '';
  /** Lo que de verdad devolvió la API; mientras sea null el modal muestra el estimado */
  resultadoFusion: FusionEmpresasResultado | null = null;

  // Modal de descartar una variante
  varianteDescartar: VarianteVista | null = null;
  descartando = false;
  errorDescartar = '';

  // Modal de regresar a pendientes una variante descartada
  varianteReactivar: VarianteVista | null = null;
  reactivando = false;
  errorReactivar = '';

  // Modal de eliminar del catálogo
  empresaEliminar: EmpresaCatalogo | null = null;
  eliminando = false;
  errorEliminar = '';

  /** Elemento que abrió el modal; recibe el foco de vuelta al cerrarlo */
  private origenFoco: HTMLElement | null = null;

  @ViewChild('modalRef') modalRef?: ElementRef<HTMLElement>;

  private destroyRef = inject(DestroyRef);

  constructor(private empresasService: EmpresasService) {
    this.destroyRef.onDestroy(() => { if (this.avisoTimer) clearTimeout(this.avisoTimer); });
    this.busquedaCatalogo$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.cargarCatalogo());
    this.busquedaManual$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.cargarTextos());
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Carga

  cargarDatos(): void {
    this.cargando = true;
    this.error = false;

    forkJoin({
      grupos: this.empresasService.listarCandidatos('pendiente'),
      catalogo: this.empresasService.listarCatalogo(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ grupos, catalogo }) => {
        this.filtro = 'pendiente';
        this.aplicarGrupos('pendiente', grupos);
        this.busquedaCatalogo = '';
        this.busquedaCatalogoAplicada = '';
        this.catalogo = catalogo;
        this.totalCatalogo = catalogo.length;
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  /** Sin argumento recarga el filtro a la vista; con 'pendiente' refresca además los KPIs */
  cargarGrupos(estado: EstadoVariante = this.filtro): void {
    const aLaVista = estado === this.filtro;
    if (aLaVista) {
      this.cargandoGrupos = true;
      this.errorGrupos = false;
    }
    this.empresasService.listarCandidatos(estado).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: grupos => {
        this.aplicarGrupos(estado, grupos);
        if (estado === this.filtro) this.cargandoGrupos = false;
      },
      error: () => {
        if (estado === this.filtro) {
          this.errorGrupos = true;
          this.cargandoGrupos = false;
        }
      },
    });
  }

  private aplicarGrupos(estado: EstadoVariante, grupos: GrupoEmpresa[]): void {
    if (estado === 'pendiente') {
      const variantes = grupos.flatMap(g => g.variantes);
      this.pendientes = {
        grupos: grupos.length,
        variantes: variantes.length,
        menciones: variantes.reduce((s, v) => s + v.ocurrencias_empresa + v.ocurrencias_primer_empleo, 0),
      };
    }
    if (estado === this.filtro) this.grupos = this.mapearGrupos(grupos);
  }

  /** Conserva lo que el administrador ya tenía abierto, desmarcado o escrito en cada grupo */
  private mapearGrupos(grupos: GrupoEmpresa[]): GrupoVista[] {
    const previos = new Map(this.grupos.map(g => [g.grupo.nombre_clave, g]));
    return grupos.map(grupo => {
      const previo = previos.get(grupo.nombre_clave);
      const excluidas = new Set(previo?.variantes.filter(x => !x.incluida).map(x => x.v.id_empresa_candidato));
      const variantes: VarianteVista[] = grupo.variantes.map(v => ({
        v,
        crudo: analizarTexto(v.nombre_variante),
        incluida: !excluidas.has(v.id_empresa_candidato),
      }));

      // El sugerido es una de las variantes; si ya no está en la lista, va como texto libre
      const sugerida = grupo.variantes.find(v => v.nombre_variante === grupo.nombre_sugerido);
      let canonico: number | 'otro' = sugerida ? sugerida.id_empresa_candidato : 'otro';
      let canonicoOtro = sugerida ? '' : (grupo.nombre_sugerido ?? '').trim();
      if (previo && (previo.canonico === 'otro'
        || grupo.variantes.some(v => v.id_empresa_candidato === previo.canonico))) {
        canonico = previo.canonico;
        canonicoOtro = previo.canonicoOtro;
      }

      return {
        grupo,
        titulo: (grupo.nombre_sugerido ?? '').trim() || grupo.nombre_clave,
        variantes,
        totalEmpresa: grupo.variantes.reduce((s, v) => s + v.ocurrencias_empresa, 0),
        totalPrimer: grupo.variantes.reduce((s, v) => s + v.ocurrencias_primer_empleo, 0),
        expandido: previo?.expandido ?? false,
        canonico,
        canonicoOtro,
      };
    });
  }

  cambiarFiltro(estado: EstadoVariante): void {
    if (estado === this.filtro) return;
    this.filtro = estado;
    this.grupos = [];
    this.cargarGrupos();
  }

  cargarTextos(): void {
    const busqueda = this.busquedaManual.trim();
    const pedido = ++this.pedidoTextos;
    this.cargandoTextos = true;
    this.errorTextos = false;
    this.empresasService.listarTextos(busqueda || undefined, MAX_TEXTOS_VISIBLES)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: r => {
          // Llegó una respuesta de una búsqueda que ya no es la actual
          if (pedido !== this.pedidoTextos) return;
          this.textos = r.textos.map(t => ({ t, crudo: analizarTexto(t.texto) }));
          // Los elegidos conservan su objeto (el radio del canónico apunta a él); solo se les refrescan los datos
          const porTexto = new Map(r.textos.map(t => [t.texto, t]));
          for (const s of this.seleccion) s.t = porTexto.get(s.t.texto) ?? s.t;
          this.totalCoinciden = r.total;
          this.busquedaManualAplicada = busqueda;
          if (!busqueda) this.totalTextos = r.total;
          this.textosCargados = true;
          this.cargandoTextos = false;
        },
        error: () => {
          if (pedido !== this.pedidoTextos) return;
          this.errorTextos = true;
          this.cargandoTextos = false;
        },
      });
  }

  buscarTextos(): void {
    this.busquedaManual$.next(this.busquedaManual.trim());
  }

  cargarCatalogo(): void {
    const busqueda = this.busquedaCatalogo.trim();
    const pedido = ++this.pedidoCatalogo;
    this.cargandoCatalogo = true;
    this.errorCatalogo = false;
    this.empresasService.listarCatalogo(busqueda || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: empresas => {
          // Llegó una respuesta de una búsqueda que ya no es la actual
          if (pedido !== this.pedidoCatalogo) return;
          this.catalogo = empresas;
          this.busquedaCatalogoAplicada = busqueda;
          if (!busqueda) this.totalCatalogo = empresas.length;
          this.cargandoCatalogo = false;
        },
        error: () => {
          if (pedido !== this.pedidoCatalogo) return;
          this.errorCatalogo = true;
          this.cargandoCatalogo = false;
        },
      });
  }

  buscarEnCatalogo(): void {
    this.busquedaCatalogo$.next(this.busquedaCatalogo.trim());
  }

  // Formato

  fecha(v: string | null | undefined): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : FMT_FECHA.format(d);
  }

  /** Con memoria: la plantilla lo llama en cada ciclo y debe recibir siempre el mismo objeto */
  crudoDe(texto: string): TextoCrudo {
    let c = this.crudos.get(texto);
    if (!c) {
      if (this.crudos.size > 500) this.crudos.clear();
      c = analizarTexto(texto);
      this.crudos.set(texto, c);
    }
    return c;
  }
  private crudos = new Map<string, TextoCrudo>();

  // Pestañas (patrón WAI-ARIA: flechas, Inicio y Fin mueven y activan)

  seleccionarPestana(p: Pestana): void {
    this.pestana = p;
    if (p === 'manual' && !this.textosCargados && !this.cargandoTextos) this.cargarTextos();
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

  // Detección

  detectarVariantes(): void {
    if (this.detectando) return;
    this.detectando = true;
    // La API no dice cuántos GRUPOS son nuevos: se compara la lista de pendientes de antes y después
    const pendientes = () => this.empresasService.listarCandidatos('pendiente').pipe(catchError(() => of(null)));
    pendientes().pipe(
      switchMap(antes => this.empresasService.detectar().pipe(
        switchMap(r => pendientes().pipe(map(despues => ({ antes, r, despues })))),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ antes, r, despues }) => {
        this.detectando = false;
        let gruposNuevos: number | null = null;
        if (antes && despues) {
          const clavesAntes = new Set(antes.map(g => g.nombre_clave));
          gruposNuevos = despues.filter(g => !clavesAntes.has(g.nombre_clave)).length;
        }
        this.deteccion = { r, gruposNuevos };
        this.pestana = 'variantes';
        this.filtro = 'pendiente';
        if (despues) {
          this.errorGrupos = false;
          this.aplicarGrupos('pendiente', despues);
        } else {
          this.cargarGrupos();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.detectando = false;
        this.mostrarAviso('error', this.mensajeError(err, 'No se pudo completar la detección de variantes.'));
      },
    });
  }

  cerrarDeteccion(): void {
    this.deteccion = null;
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

  /** El mensaje de la API va tal cual: en los 409 trae el detalle que el administrador necesita */
  private mensajeError(err: HttpErrorResponse, porDefecto: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m) && m.length) return m.join(' ');
    if (typeof m === 'string' && m.trim()) return m;
    if (err?.status === 0) return 'No hay conexión con el servidor. Intenta de nuevo.';
    return porDefecto;
  }

  // Grupo: nombre canónico y variantes incluidas

  canonicoDe(g: GrupoVista): string {
    if (g.canonico === 'otro') return g.canonicoOtro.trim();
    return g.variantes.find(x => x.v.id_empresa_candidato === g.canonico)?.v.nombre_variante.trim() ?? '';
  }

  incluidas(g: GrupoVista): VarianteVista[] {
    return g.variantes.filter(x => x.incluida);
  }

  puedeFusionar(g: GrupoVista): boolean {
    const n = this.incluidas(g).length;
    return n > 0 && n <= MAX_VARIANTES && this.canonicoDe(g) !== '';
  }

  /** Por qué el botón Fusionar está apagado */
  faltaParaFusionar(g: GrupoVista): string {
    const n = this.incluidas(g).length;
    if (n === 0) return 'Marca al menos una variante para fusionar.';
    if (n > MAX_VARIANTES) return `Se pueden fusionar hasta ${MAX_VARIANTES} variantes a la vez.`;
    if (this.canonicoDe(g) === '') return 'Escribe el nombre canónico.';
    return '';
  }

  abrirFusionGrupo(g: GrupoVista, event: Event): void {
    if (!this.puedeFusionar(g)) return;
    this.abrirFusion(this.canonicoDe(g), this.incluidas(g).map(x => ({
      texto: x.v.nombre_variante,
      crudo: x.crudo,
      empresa: x.v.ocurrencias_empresa,
      primer: x.v.ocurrencias_primer_empleo,
    })), 'grupo', event);
  }

  // Fusión manual: selección y nombre canónico

  /** Por texto y no por objeto: cada búsqueda trae del servidor una lista nueva */
  private elegido(x: TextoVista): TextoVista | undefined {
    return this.seleccion.find(s => s.t.texto === x.t.texto);
  }

  estaSeleccionado(x: TextoVista): boolean {
    return !!this.elegido(x);
  }

  alternarTexto(x: TextoVista): void {
    const ya = this.elegido(x);
    if (ya) {
      this.quitarTexto(ya);
      return;
    }
    if (this.seleccion.length >= MAX_VARIANTES) {
      this.mostrarAviso('error', `Se pueden fusionar hasta ${MAX_VARIANTES} textos a la vez.`);
      return;
    }
    this.seleccion = [...this.seleccion, x];
    // El primero que se elige propone el nombre, mientras no se haya escrito otro
    if (this.seleccion.length === 1 && this.canonicoManualOtro.trim() === '') this.canonicoManual = x;
  }

  quitarTexto(x: TextoVista): void {
    this.seleccion = this.seleccion.filter(s => s !== x);
    if (this.canonicoManual === x) this.canonicoManual = this.seleccion[0] ?? 'otro';
  }

  limpiarSeleccion(): void {
    this.seleccion = [];
    this.canonicoManual = 'otro';
    this.canonicoManualOtro = '';
  }

  get canonicoManualTexto(): string {
    return this.canonicoManual === 'otro' ? this.canonicoManualOtro.trim() : this.canonicoManual.t.texto.trim();
  }

  get puedeFusionarManual(): boolean {
    return this.seleccion.length > 0 && this.canonicoManualTexto !== '';
  }

  get faltaParaFusionarManual(): string {
    if (this.seleccion.length === 0) return 'Selecciona al menos un texto de la lista.';
    if (this.canonicoManualTexto === '') return 'Elige o escribe el nombre canónico.';
    return '';
  }

  abrirFusionManual(event: Event): void {
    if (!this.puedeFusionarManual) return;
    this.abrirFusion(this.canonicoManualTexto, this.seleccion.map(x => ({
      texto: x.t.texto,
      crudo: x.crudo,
      empresa: x.t.ocurrencias_empresa,
      primer: x.t.ocurrencias_primer_empleo,
    })), 'manual', event);
  }

  // Modal de fusionar

  private abrirFusion(canonico: string, textos: TextoFusion[], origen: PlanFusion['origen'], event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.planFusion = {
      canonico,
      canonicoCrudo: analizarTexto(canonico),
      textos,
      totalEmpresa: textos.reduce((s, t) => s + t.empresa, 0),
      totalPrimer: textos.reduce((s, t) => s + t.primer, 0),
      origen,
    };
    this.resultadoFusion = null;
    this.errorFusion = '';
    this.enfocarModal();
  }

  cerrarFusion(): void {
    if (this.fusionando) return;
    this.planFusion = null;
    this.resultadoFusion = null;
    this.devolverFoco();
  }

  confirmarFusion(): void {
    const plan = this.planFusion;
    if (!plan || this.fusionando || this.resultadoFusion) return;
    this.fusionando = true;
    this.errorFusion = '';

    this.empresasService.fusionar({
      nombre_canonico: plan.canonico,
      variantes: plan.textos.map(t => t.texto),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => {
        this.fusionando = false;
        // El modal sigue abierto y ahora muestra lo que devolvió la API, no el estimado
        this.resultadoFusion = r;
        this.enfocarEnModal('[data-autofocus]');
        if (plan.origen === 'manual') this.limpiarSeleccion();
        this.despuesDeCambiar();
      },
      error: (err: HttpErrorResponse) => {
        this.fusionando = false;
        this.errorFusion = this.mensajeError(err, 'No se pudo completar la fusión. No se vinculó ningún egresado.');
        this.enfocarEnModal('.modal-footer .btn-primario');
      },
    });
  }

  /** El resultado real no coincide con lo que se estimó antes de confirmar */
  get fusionDifiereDelEstimado(): boolean {
    const p = this.planFusion;
    const r = this.resultadoFusion;
    return !!p && !!r
      && (r.egresados_ligados.empresa !== p.totalEmpresa || r.egresados_ligados.primer_empleo !== p.totalPrimer);
  }

  /** Tras fusionar, descartar, reactivar o eliminar: refresca todo lo que pudo cambiar */
  private despuesDeCambiar(): void {
    this.cargarGrupos('pendiente');
    if (this.filtro !== 'pendiente') this.cargarGrupos();
    this.cargarCatalogo();
    if (this.textosCargados) this.cargarTextos();
  }

  // Modal de descartar

  abrirDescartar(x: VarianteVista, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.varianteDescartar = x;
    this.errorDescartar = '';
    this.enfocarModal();
  }

  cerrarDescartar(): void {
    if (this.descartando) return;
    this.varianteDescartar = null;
    this.devolverFoco();
  }

  confirmarDescartar(): void {
    const x = this.varianteDescartar;
    if (!x || this.descartando) return;
    this.descartando = true;
    this.errorDescartar = '';
    this.empresasService.descartar(x.v.id_empresa_candidato)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.descartando = false;
          this.varianteDescartar = null;
          this.devolverFoco();
          this.mostrarAviso('exito', `Se descartó «${x.v.nombre_variante.trim()}». El texto del egresado no cambió.`);
          this.despuesDeCambiar();
        },
        error: (err: HttpErrorResponse) => {
          this.descartando = false;
          this.errorDescartar = this.mensajeError(err, 'No se pudo descartar la variante.');
          this.enfocarEnModal('.modal-footer .btn-primario');
          // 409 o 404: alguien más ya la resolvió y la lista quedó vieja
          if (err?.status === 409 || err?.status === 404) this.cargarGrupos();
        },
      });
  }

  // Modal de regresar a pendientes

  abrirReactivar(x: VarianteVista, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.varianteReactivar = x;
    this.errorReactivar = '';
    this.enfocarModal();
  }

  cerrarReactivar(): void {
    if (this.reactivando) return;
    this.varianteReactivar = null;
    this.devolverFoco();
  }

  confirmarReactivar(): void {
    const x = this.varianteReactivar;
    if (!x || this.reactivando) return;
    this.reactivando = true;
    this.errorReactivar = '';
    this.empresasService.reactivar(x.v.id_empresa_candidato)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.reactivando = false;
          this.varianteReactivar = null;
          this.devolverFoco();
          this.mostrarAviso('exito', `«${x.v.nombre_variante.trim()}» regresó a pendientes.`);
          this.despuesDeCambiar();
        },
        error: (err: HttpErrorResponse) => {
          this.reactivando = false;
          this.errorReactivar = this.mensajeError(err, 'No se pudo regresar la variante a pendientes.');
          this.enfocarEnModal('.modal-footer .btn-secundario');
          // 409 o 404: ya está fusionada o ya no existe, y la lista quedó vieja
          if (err?.status === 409 || err?.status === 404) this.cargarGrupos();
        },
      });
  }

  // Modal de eliminar del catálogo

  abrirEliminar(e: EmpresaCatalogo, event: Event): void {
    this.origenFoco = event.currentTarget as HTMLElement;
    this.empresaEliminar = e;
    this.errorEliminar = '';
    this.enfocarModal();
  }

  cerrarEliminar(): void {
    if (this.eliminando) return;
    this.empresaEliminar = null;
    this.devolverFoco();
  }

  confirmarEliminar(): void {
    const e = this.empresaEliminar;
    if (!e || this.eliminando) return;
    this.eliminando = true;
    this.errorEliminar = '';
    this.empresasService.eliminar(e.id_empresa).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.eliminando = false;
        this.empresaEliminar = null;
        this.devolverFoco();
        this.mostrarAviso('exito', `Se eliminó «${e.nombre}» del catálogo.`);
        this.despuesDeCambiar();
      },
      error: (err: HttpErrorResponse) => {
        this.eliminando = false;
        this.errorEliminar = this.mensajeError(err, 'No se pudo eliminar la empresa.');
        this.enfocarEnModal('.modal-footer .btn-secundario');
        // Los conteos de la fila estaban viejos: se refrescan para que coincidan con el mensaje
        if (err?.status === 409 || err?.status === 404) this.cargarCatalogo();
      },
    });
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
    )).filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  /**
   * Se escucha en el documento y no en el modal: al deshabilitarse el botón
   * enfocado durante una petición, el foco cae en <body> y el modal dejaría
   * de recibir Escape y Tab.
   */
  @HostListener('document:keydown', ['$event'])
  teclaModal(event: KeyboardEvent): void {
    const cerrar = this.planFusion ? () => this.cerrarFusion()
      : this.varianteDescartar ? () => this.cerrarDescartar()
        : this.varianteReactivar ? () => this.cerrarReactivar()
        : this.empresaEliminar ? () => this.cerrarEliminar()
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

  // Reintentos ligados a `this` para la plantilla de carga/error
  readonly recargarGrupos = () => this.cargarGrupos();
  readonly recargarTextos = () => this.cargarTextos();
  readonly recargarCatalogo = () => this.cargarCatalogo();

  trackByGrupo = (_: number, g: GrupoVista) => g.grupo.nombre_clave;
  trackByVariante = (_: number, x: VarianteVista) => x.v.id_empresa_candidato;
  trackByTexto = (_: number, x: TextoVista) => x.t.texto;
  trackByEmpresa = (_: number, e: EmpresaCatalogo) => e.id_empresa;
}
