export interface ChartImages {
  situacionLaboral?: string;
  empleabilidadCarrera?: string;
  estadoTitulacion?: string;
  tendenciaTitulacion?: string;
  nivelesIngles?: string;
  inglesCarrera?: string;
  satisfaccionCarrera?: string;
  topEmpresas?: string;
  autorizacionesCarrera?: string;
  fueraDurango?: string;
  fueraMexico?: string;
}

export interface ExportEstadisticasRequest {
  carrera?: string;
  anio?: number;
  chartImages?: ChartImages;
}