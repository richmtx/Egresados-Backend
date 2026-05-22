import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Notificacion {
  id_notificacion: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  leida: boolean;
  fecha_creacion: string;
  id_egresado: number | null;
}

type ModalModoEliminar = 'una' | 'leidas' | 'todas';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css'],
})
export class NotificacionesComponent implements OnInit {

  readonly API = environment.apiUrl;

  todas: Notificacion[] = [];
  filtradas: Notificacion[] = [];
  tabActiva: 'recientes' | 'encuestas' | 'sistema' = 'recientes';
  conteos = { recientes: 0, encuestas: 0, sistema: 0 };

  // Modal unificado para eliminar (una / leídas / todas)
  modalEliminar: { visible: boolean; modo: ModalModoEliminar; id: number | null } = {
    visible: false,
    modo: 'una',
    id: null
  };

  // Dropdown "Eliminar..."
  dropdownVisible = false;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.cargarNotificaciones();
  }

  cargarNotificaciones() {
    this.http.get<Notificacion[]>(`${this.API}/notificaciones`).subscribe(data => {
      this.todas = data;
      this.calcularConteos();
      this.cambiarTab(this.tabActiva);
    });
  }

  calcularConteos() {
    const noLeidas = this.todas.filter(n => !n.leida);
    this.conteos.recientes = noLeidas.length;
    this.conteos.encuestas = noLeidas.filter(n =>
      ['nueva_encuesta', 'nueva_encuesta_ubicacion'].includes(n.tipo)
    ).length;
    this.conteos.sistema = noLeidas.filter(n =>
      ['contacto', 'eventos', 'exportacion', 'actualizacion'].includes(n.tipo)
    ).length;
  }

  cambiarTab(tab: 'recientes' | 'encuestas' | 'sistema') {
    this.tabActiva = tab;
    if (tab === 'recientes') {
      this.filtradas = this.todas;
    } else if (tab === 'encuestas') {
      this.filtradas = this.todas.filter(n =>
        ['nueva_encuesta', 'nueva_encuesta_ubicacion'].includes(n.tipo)
      );
    } else {
      this.filtradas = this.todas.filter(n =>
        ['contacto', 'eventos', 'exportacion', 'actualizacion'].includes(n.tipo)
      );
    }
  }

  marcarLeida(notif: Notificacion) {
    if (notif.leida) return;
    this.http.patch(`${this.API}/notificaciones/${notif.id_notificacion}/leer`, {})
      .subscribe(() => {
        notif.leida = true;
        this.calcularConteos();
      });
  }

  marcarTodasLeidas() {
    this.http.patch(`${this.API}/notificaciones/marcar-todas`, {})
      .subscribe(() => {
        this.todas.forEach(n => n.leida = true);
        this.calcularConteos();
      });
  }

  // ── Eliminar una ──────────────────────────────────────────
  eliminar(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.modalEliminar = { visible: true, modo: 'una', id };
  }

  // ── Eliminar leídas / todas (desde dropdown) ──────────────
  abrirModalMasivo(modo: 'leidas' | 'todas') {
    this.dropdownVisible = false;
    this.modalEliminar = { visible: true, modo, id: null };
  }

  // ── Confirmar según modo ──────────────────────────────────
  confirmarEliminar() {
    const { modo, id } = this.modalEliminar;

    if (modo === 'una' && id !== null) {
      this.http.delete(`${this.API}/notificaciones/${id}`).subscribe(() => {
        this.todas = this.todas.filter(n => n.id_notificacion !== id);
        this.cambiarTab(this.tabActiva);
        this.calcularConteos();
      });

    } else if (modo === 'leidas') {
      this.http.delete(`${this.API}/notificaciones/leidas`).subscribe(() => {
        this.todas = this.todas.filter(n => !n.leida);
        this.cambiarTab(this.tabActiva);
        this.calcularConteos();
      });

    } else if (modo === 'todas') {
      this.http.delete(`${this.API}/notificaciones/todas`).subscribe(() => {
        this.todas = [];
        this.filtradas = [];
        this.calcularConteos();
      });
    }

    this.cerrarModal();
  }

  cerrarModal() {
    this.modalEliminar = { visible: false, modo: 'una', id: null };
  }

  // ── Dropdown ──────────────────────────────────────────────
  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.dropdownVisible = !this.dropdownVisible;
  }

  cerrarDropdown() {
    this.dropdownVisible = false;
  }

  // ── Texto dinámico del modal según modo ───────────────────
  getModalTitulo(): string {
    if (this.modalEliminar.modo === 'una') return '¿Eliminar notificación?';
    if (this.modalEliminar.modo === 'leidas') return '¿Eliminar notificaciones leídas?';
    return '¿Eliminar todas las notificaciones?';
  }

  getModalDesc(): string {
    if (this.modalEliminar.modo === 'una')
      return 'Esta notificación será eliminada permanentemente.';
    if (this.modalEliminar.modo === 'leidas')
      return 'Se eliminarán todas las notificaciones que ya marcaste como leídas.';
    return 'Se eliminarán todas las notificaciones sin excepción. Esta acción no se puede deshacer.';
  }

  // ── Helpers ───────────────────────────────────────────────
  tieneLeidas(): boolean {
    return this.todas.some(n => n.leida);
  }

  tieneNoLeidas(): boolean {
    return this.todas.some(n => !n.leida);
  }

  tieneNotificaciones(): boolean {
    return this.todas.length > 0;
  }

  getIconClass(tipo: string): string {
    const map: Record<string, string> = {
      nueva_encuesta: 'icon-blue',
      nueva_encuesta_ubicacion: 'icon-red',
      contacto: 'icon-green',
      eventos: 'icon-purple',
      exportacion: 'icon-green',
      actualizacion: 'icon-amber',
    };
    return map[tipo] ?? 'icon-gray';
  }

  getTagClass(tipo: string): string {
    const map: Record<string, string> = {
      nueva_encuesta: 'tag-blue',
      nueva_encuesta_ubicacion: 'tag-red',
      contacto: 'tag-green',
      eventos: 'tag-purple',
      exportacion: 'tag-green',
      actualizacion: 'tag-amber',
    };
    return map[tipo] ?? 'tag-gray';
  }

  getTagLabel(tipo: string): string {
    const map: Record<string, string> = {
      nueva_encuesta: 'Sin revisar',
      nueva_encuesta_ubicacion: 'Ubicación',
      contacto: 'Contacto autorizado',
      eventos: 'Eventos autorizado',
      exportacion: 'Exportación',
      actualizacion: 'Actualización',
    };
    return map[tipo] ?? tipo;
  }

  getFechaRelativa(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (min < 1) return 'Justo ahora';
    if (min < 60) return `Hace ${min} min`;
    if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
    if (dias === 1) return 'Ayer';
    return `Hace ${dias} días`;
  }

  getGrupos(): { label: string; items: Notificacion[] }[] {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);

    const grupos: Record<string, Notificacion[]> = {
      'Hoy': [], 'Ayer': [], 'Anteriores': []
    };

    for (const n of this.filtradas) {
      const d = new Date(n.fecha_creacion); d.setHours(0, 0, 0, 0);
      if (d.getTime() === hoy.getTime()) grupos['Hoy'].push(n);
      else if (d.getTime() === ayer.getTime()) grupos['Ayer'].push(n);
      else grupos['Anteriores'].push(n);
    }

    return Object.entries(grupos)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }
}