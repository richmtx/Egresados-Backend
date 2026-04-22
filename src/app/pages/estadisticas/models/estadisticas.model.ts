export interface EstadisticasKpis {
  total_egresados: number;
  autorizo_contacto: number;
  autorizo_eventos: number;
  satisfaccion_promedio: number;
  titulados: number;
  en_tramite: number;
  no_titulados: number;
  empleados: number;
  desempleados: number;
}

export interface SituacionLaboral {
  situacion: string;
  total: number;
}

export interface EmpleabilidadCarrera {
  nombre_carrera: string;
  total: number;
  empleados: number;
}

export interface TitulacionAnio {
  anio_egreso: number;
  total: number;
  titulados: number;
  en_tramite: number;
  pct_titulados: number;
}

export interface NivelIngles {
  nivel: string;
  total: number;
}

export interface InglesCarrera {
  nombre_carrera: string;
  nivel: string;
  total: number;
}

export interface SatisfaccionCarrera {
  nombre_carrera: string;
  promedio: number;
}

export interface TopEmpresa {
  empresa: string;
  total: number;
}

export interface EvolucionGeneracion {
  anio_egreso: number;
  total: number;
  pct_empleados: number;
  pct_titulados: number;
  satisfaccion_pct: number;
}

export interface SectorLaboral {
  sector: string;
  total: number;
}

export interface ParticipacionCarrera {
  nombre_carrera: string;
  autorizo_contacto: number;
  autorizo_eventos: number;
  total: number;
}

export interface UbicacionItem {
  ciudad_trabajo: string;
  nombre_carrera: string;
  total: number;
}

export interface EstadisticasResponse {
  kpis: EstadisticasKpis;
  situacionLaboral: SituacionLaboral[];
  empleabilidadCarrera: EmpleabilidadCarrera[];
  titulacionAnio: TitulacionAnio[];
  nivelesIngles: NivelIngles[];
  inglesCarrera: InglesCarrera[];
  satisfaccionCarrera: SatisfaccionCarrera[];
  topEmpresas: TopEmpresa[];
  evolucionGeneracion: EvolucionGeneracion[];
  sectorLaboral: SectorLaboral[];
  participacionCarrera: ParticipacionCarrera[];
  fueraMexico: UbicacionItem[];
  fueraDurango: UbicacionItem[];
}

export interface FiltrosEstadisticas {
  carrera?: string;
  anio?: number;
}