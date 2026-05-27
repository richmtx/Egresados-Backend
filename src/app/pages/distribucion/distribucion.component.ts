import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, AfterViewInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DistribucionService, DistribucionGeoResponse, KpisGeo, CiudadTrabajo, PaisTrabajo, MovilidadAnio,
  MovilidadCarrera,
} from './distribucion.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { UsuariosService } from '../usuarios/usuarios.service';

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
    // ──────────────────────────────────────────────
    //   CAPITALES DE ESTADO (32)
    // ──────────────────────────────────────────────
    'Aguascalientes': [21.8818, -102.2916],
    'Mexicali': [32.6245, -115.4523],
    'La Paz': [24.1426, -110.3128],
    'Campeche': [19.8301, -90.5349],
    'Tuxtla Gutiérrez': [16.7530, -93.1156],
    'Chihuahua': [28.6353, -106.0889],
    'Saltillo': [25.4232, -101.0053],
    'Colima': [19.2452, -103.7240],
    'Ciudad de México': [19.4326, -99.1332],
    'CDMX': [19.4326, -99.1332],
    'México': [19.4326, -99.1332],
    'Durango': [24.0277, -104.6532],
    'Guanajuato': [21.0190, -101.2574],
    'Chilpancingo': [17.5510, -99.5004],
    'Pachuca': [20.1011, -98.7591],
    'Guadalajara': [20.6597, -103.3496],
    'Toluca': [19.2826, -99.6557],
    'Morelia': [19.7008, -101.1844],
    'Cuernavaca': [18.9242, -99.2216],
    'Tepic': [21.5039, -104.8946],
    'Monterrey': [25.6866, -100.3161],
    'Oaxaca': [17.0732, -96.7266],
    'Oaxaca de Juárez': [17.0732, -96.7266],
    'Puebla': [19.0414, -98.2063],
    'Querétaro': [20.5888, -100.3899],
    'Chetumal': [18.5036, -88.3050],
    'San Luis Potosí': [22.1565, -100.9855],
    'Culiacán': [24.8091, -107.3940],
    'Hermosillo': [29.0729, -110.9559],
    'Villahermosa': [17.9892, -92.9475],
    'Ciudad Victoria': [23.7369, -99.1411],
    'Tlaxcala': [19.3139, -98.2403],
    'Xalapa': [19.5438, -96.9102],
    'Mérida': [20.9674, -89.5926],
    'Zacatecas': [22.7709, -102.5832],

    // ──────────────────────────────────────────────
    //   ZONA METROPOLITANA DEL VALLE DE MÉXICO
    // ──────────────────────────────────────────────
    'Ecatepec': [19.6014, -99.0506],
    'Nezahualcóyotl': [19.4006, -99.0148],
    'Naucalpan': [19.4750, -99.2378],
    'Tlalnepantla': [19.5407, -99.1953],
    'Chimalhuacán': [19.4225, -98.9544],
    'Cuautitlán Izcalli': [19.6463, -99.2078],
    'Atizapán': [19.5570, -99.2773],
    'Tultitlán': [19.6453, -99.1697],
    'Coacalco': [19.6296, -99.0989],
    'Ixtapaluca': [19.3175, -98.8825],
    'Valle de Chalco': [19.2906, -98.9436],
    'Chalco': [19.2647, -98.8956],
    'Texcoco': [19.5052, -98.8830],

    // ──────────────────────────────────────────────
    //   ZONA METROPOLITANA DE GUADALAJARA
    // ──────────────────────────────────────────────
    'Zapopan': [20.7236, -103.3848],
    'Tlaquepaque': [20.6406, -103.3120],
    'Tonalá': [20.6242, -103.2335],
    'Tlajomulco': [20.4736, -103.4439],
    'El Salto': [20.5212, -103.1844],

    // ──────────────────────────────────────────────
    //   ZONA METROPOLITANA DE MONTERREY
    // ──────────────────────────────────────────────
    'San Pedro Garza García': [25.6605, -100.4022],
    'San Nicolás': [25.7417, -100.3025],
    'Guadalupe': [25.6775, -100.2597],
    'Apodaca': [25.7817, -100.1894],
    'General Escobedo': [25.7942, -100.3158],
    'Santa Catarina': [25.6731, -100.4581],
    'García': [25.8136, -100.5867],
    'Juárez NL': [25.6486, -100.0939],

    // ──────────────────────────────────────────────
    //   ZONA METROPOLITANA DE LA LAGUNA
    // ──────────────────────────────────────────────
    'Torreón': [25.5428, -103.4068],
    'Gómez Palacio': [25.5674, -103.4971],
    'Lerdo': [25.5368, -103.5254],
    'Matamoros': [25.5292, -103.2278],
    'Francisco I. Madero': [25.7747, -103.2747],
    'San Pedro': [25.7589, -102.9836],

    // ──────────────────────────────────────────────
    //   ZONA METROPOLITANA DE PUEBLA-TLAXCALA
    // ──────────────────────────────────────────────
    'San Andrés Cholula': [19.0530, -98.2867],
    'San Pedro Cholula': [19.0625, -98.3008],
    'Cholula': [19.0625, -98.3008],
    'Atlixco': [18.9067, -98.4372],
    'Tehuacán': [18.4644, -97.3925],

    // ──────────────────────────────────────────────
    //   BAJA CALIFORNIA Y BAJA CALIFORNIA SUR
    // ──────────────────────────────────────────────
    'Tijuana': [32.5149, -117.0382],
    'Ensenada': [31.8669, -116.5964],
    'Tecate': [32.5675, -116.6253],
    'Rosarito': [32.3614, -117.0556],
    'Cabo San Lucas': [22.8905, -109.9167],
    'San José del Cabo': [23.0614, -109.7081],
    'Los Cabos': [22.8905, -109.9167],
    'Loreto': [26.0124, -111.3461],

    // ──────────────────────────────────────────────
    //   NORTE (Sonora, Chihuahua, Coahuila)
    // ──────────────────────────────────────────────
    'Ciudad Obregón': [27.4828, -109.9303],
    'Nogales': [31.3092, -110.9425],
    'Navojoa': [27.0717, -109.4439],
    'Guaymas': [27.9226, -110.8989],
    'San Luis Río Colorado': [32.4544, -114.7722],
    'Ciudad Juárez': [31.6904, -106.4245],
    'Delicias': [28.1922, -105.4708],
    'Cuauhtémoc': [28.4053, -106.8669],
    'Hidalgo del Parral': [26.9333, -105.6667],
    'Parral': [26.9333, -105.6667],
    'Monclova': [26.9101, -101.4226],
    'Piedras Negras': [28.7000, -100.5231],
    'Acuña': [29.3239, -100.9508],
    'Ciudad Acuña': [29.3239, -100.9508],
    'Sabinas': [27.8500, -101.1167],

    // ──────────────────────────────────────────────
    //   SINALOA Y NAYARIT
    // ──────────────────────────────────────────────
    'Mazatlán': [23.2494, -106.4111],
    'Los Mochis': [25.7833, -108.9833],
    'Guasave': [25.5708, -108.4703],
    'Guamúchil': [25.4628, -108.0883],
    'El Fuerte': [26.4239, -108.6225],
    'Bahía de Banderas': [20.7833, -105.3667],

    // ──────────────────────────────────────────────
    //   ZACATECAS Y SAN LUIS POTOSÍ
    // ──────────────────────────────────────────────
    'Fresnillo': [23.1736, -102.8669],
    'Guadalupe ZAC': [22.7460, -102.5170],
    'Jerez': [22.6500, -102.9833],
    'Sombrerete': [23.6361, -103.6433],
    'Río Grande': [23.8333, -103.0333],
    'Loreto ZAC': [22.2728, -101.9892],
    'Calera': [22.9000, -102.6667],
    'Matehuala': [23.6500, -100.6403],
    'Ciudad Valles': [21.9956, -99.0136],
    'Rioverde': [21.9286, -99.9858],
    'Soledad de Graciano Sánchez': [22.1833, -100.9333],

    // ──────────────────────────────────────────────
    //   BAJÍO Y CENTRO-OCCIDENTE
    // ──────────────────────────────────────────────
    'León': [21.1221, -101.6824],
    'Irapuato': [20.6767, -101.3556],
    'Celaya': [20.5232, -100.8156],
    'Salamanca': [20.5734, -101.1959],
    'Silao': [20.9486, -101.4283],
    'San Miguel de Allende': [20.9153, -100.7439],
    'Dolores Hidalgo': [21.1567, -100.9325],
    'Acámbaro': [20.0314, -100.7261],
    'Valle de Santiago': [20.3886, -101.1869],
    'San Juan del Río': [20.3884, -99.9961],
    'El Marqués': [20.6133, -100.3186],
    'Corregidora': [20.5443, -100.4444],
    'Tequisquiapan': [20.5208, -99.8911],

    // ──────────────────────────────────────────────
    //   MICHOACÁN Y JALISCO (más)
    // ──────────────────────────────────────────────
    'Uruapan': [19.4203, -102.0586],
    'Zamora': [19.9819, -102.2825],
    'Lázaro Cárdenas': [17.9583, -102.2000],
    'La Piedad': [20.3439, -102.0408],
    'Apatzingán': [19.0833, -102.3500],
    'Pátzcuaro': [19.5167, -101.6093],
    'Puerto Vallarta': [20.6534, -105.2253],
    'Tepatitlán': [20.8175, -102.7625],
    'Lagos de Moreno': [21.3567, -101.9356],
    'Ciudad Guzmán': [19.7058, -103.4614],
    'Ocotlán': [20.3503, -102.7728],
    'Chapala': [20.2944, -103.1936],

    // ──────────────────────────────────────────────
    //   ESTADO DE MÉXICO Y MORELOS (resto)
    // ──────────────────────────────────────────────
    'Metepec': [19.2547, -99.6047],
    'Lerma': [19.2856, -99.5106],
    'Atlacomulco': [19.7986, -99.8753],
    'Tenancingo': [18.9608, -99.5908],
    'Valle de Bravo': [19.1953, -100.1336],
    'Jiutepec': [18.8821, -99.1791],
    'Cuautla': [18.8167, -98.9500],
    'Temixco': [18.8517, -99.2256],

    // ──────────────────────────────────────────────
    //   VERACRUZ Y GOLFO
    // ──────────────────────────────────────────────
    'Veracruz': [19.1738, -96.1342],
    'Coatzacoalcos': [18.1342, -94.4583],
    'Córdoba': [18.8833, -96.9333],
    'Orizaba': [18.8511, -97.0989],
    'Poza Rica': [20.5333, -97.4592],
    'Minatitlán': [17.9889, -94.5494],
    'Tuxpan': [20.9583, -97.4083],
    'Boca del Río': [19.1056, -96.1067],
    'Papantla': [20.4500, -97.3197],
    'Cosamaloapan': [18.3667, -95.8000],

    // ──────────────────────────────────────────────
    //   SURESTE Y PENÍNSULA DE YUCATÁN
    // ──────────────────────────────────────────────
    'Cancún': [21.1619, -86.8515],
    'Playa del Carmen': [20.6296, -87.0739],
    'Tulum': [20.2114, -87.4654],
    'Cozumel': [20.4230, -86.9223],
    'Isla Mujeres': [21.2333, -86.7311],
    'Bacalar': [18.6772, -88.3947],
    'Valladolid': [20.6892, -88.2014],
    'Progreso': [21.2833, -89.6664],
    'Tizimín': [21.1428, -88.1517],
    'Ciudad del Carmen': [18.6500, -91.8167],

    // ──────────────────────────────────────────────
    //   CHIAPAS, TABASCO, OAXACA
    // ──────────────────────────────────────────────
    'San Cristóbal de las Casas': [16.7370, -92.6376],
    'Tapachula': [14.9094, -92.2611],
    'Comitán': [16.2447, -92.1339],
    'Palenque': [17.5092, -91.9817],
    'Cárdenas': [17.9925, -93.3781],
    'Comalcalco': [18.2667, -93.2167],
    'Salina Cruz': [16.1667, -95.2000],
    'Juchitán': [16.4333, -95.0167],
    'Tehuantepec': [16.3333, -95.2333],
    'Puerto Escondido': [15.8720, -97.0767],
    'Huatulco': [15.7639, -96.1361],

    // ──────────────────────────────────────────────
    //   GUERRERO
    // ──────────────────────────────────────────────
    'Acapulco': [16.8531, -99.8237],
    'Iguala': [18.3458, -99.5403],
    'Ixtapa': [17.6411, -101.5497],
    'Zihuatanejo': [17.6406, -101.5519],
    'Taxco': [18.5550, -99.6042],

    // ──────────────────────────────────────────────
    //   TAMAULIPAS
    // ──────────────────────────────────────────────
    'Tampico': [22.2553, -97.8686],
    'Reynosa': [26.0922, -98.2778],
    'Nuevo Laredo': [27.4861, -99.5069],
    'Matamoros TAM': [25.8694, -97.5028],
    'Madero': [22.2747, -97.8311],
    'Ciudad Madero': [22.2747, -97.8311],
    'Altamira': [22.3961, -97.9389],

    // ──────────────────────────────────────────────
    //   HIDALGO Y TLAXCALA (resto)
    // ──────────────────────────────────────────────
    'Tulancingo': [20.0833, -98.3667],
    'Tula': [20.0533, -99.3417],
    'Tizayuca': [19.8333, -98.9833],
    'Huejutla': [21.1417, -98.4197],
    'Apizaco': [19.4111, -98.1372],
    'Huamantla': [19.3133, -97.9219],

    // ── Extiende aquí si detectas ciudades faltantes en los logs ──
  };

  private readonly coordsInternacionales: Record<string, [number, number]> = {

    //   EUROPA
    // Reino Unido e Irlanda
    'Londres': [51.5074, -0.1278],
    'Manchester': [53.4808, -2.2426],
    'Birmingham': [52.4862, -1.8904],
    'Liverpool': [53.4084, -2.9916],
    'Edimburgo': [55.9533, -3.1883],
    'Glasgow': [55.8642, -4.2518],
    'Cambridge': [52.2053, 0.1218],
    'Oxford': [51.7520, -1.2577],
    'Bristol': [51.4545, -2.5879],
    'Leeds': [53.8008, -1.5491],
    'Derby': [52.9225, -1.4746],
    'Newcastle': [54.9783, -1.6178],
    'Dublín': [53.3498, -6.2603],
    'Belfast': [54.5973, -5.9301],

    // España
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3851, 2.1734],
    'Valencia': [39.4699, -0.3763],
    'Sevilla': [37.3891, -5.9845],
    'Bilbao': [43.2630, -2.9350],
    'Málaga': [36.7213, -4.4214],
    'Zaragoza': [41.6488, -0.8891],

    // Francia
    'París': [48.8566, 2.3522],
    'Marsella': [43.2965, 5.3698],
    'Lyon': [45.7640, 4.8357],
    'Toulouse': [43.6047, 1.4442],
    'Niza': [43.7102, 7.2620],
    'Burdeos': [44.8378, -0.5792],
    'Estrasburgo': [48.5734, 7.7521],

    // Alemania
    'Berlín': [52.5200, 13.4050],
    'Múnich': [48.1351, 11.5820],
    'Hamburgo': [53.5511, 9.9937],
    'Frankfurt': [50.1109, 8.6821],
    'Colonia': [50.9375, 6.9603],
    'Stuttgart': [48.7758, 9.1829],
    'Düsseldorf': [51.2277, 6.7735],
    'Dresde': [51.0504, 13.7373],
    'Leipzig': [51.3397, 12.3731],
    'Hannover': [52.3759, 9.7320],
    'Núremberg': [49.4521, 11.0767],
    'Bonn': [50.7374, 7.0982],
    'Augsburgo': [48.3705, 10.8978],
    'Erlangen': [49.5897, 11.0040],
    'Walldorf': [49.3050, 8.6450],
    'Ludwigshafen': [49.4774, 8.4452],
    'Karlsruhe': [49.0069, 8.4037],
    'Heidelberg': [49.3988, 8.6724],

    // Italia
    'Roma': [41.9028, 12.4964],
    'Milán': [45.4642, 9.1900],
    'Nápoles': [40.8518, 14.2681],
    'Turín': [45.0703, 7.6869],
    'Florencia': [43.7696, 11.2558],
    'Bolonia': [44.4949, 11.3426],
    'Venecia': [45.4408, 12.3155],

    // Países Bajos
    'Ámsterdam': [52.3676, 4.9041],
    'Róterdam': [51.9244, 4.4777],
    'Rotterdam': [51.9244, 4.4777],
    'La Haya': [52.0705, 4.3007],
    'Utrecht': [52.0907, 5.1214],
    'Eindhoven': [51.4416, 5.4697],

    // Bélgica
    'Bruselas': [50.8503, 4.3517],
    'Amberes': [51.2194, 4.4025],
    'Gante': [51.0543, 3.7174],

    // Países nórdicos
    'Estocolmo': [59.3293, 18.0686],
    'Gotemburgo': [57.7089, 11.9746],
    'Malmö': [55.6049, 13.0038],
    'Copenhague': [55.6761, 12.5683],
    'Aarhus': [56.1629, 10.2039],
    'Oslo': [59.9139, 10.7522],
    'Bergen': [60.3913, 5.3221],
    'Helsinki': [60.1699, 24.9384],
    'Reikiavik': [64.1466, -21.9426],

    // Suiza y Austria
    'Zúrich': [47.3769, 8.5417],
    'Ginebra': [46.2044, 6.1432],
    'Berna': [46.9480, 7.4474],
    'Basilea': [47.5596, 7.5886],
    'Lausana': [46.5197, 6.6323],
    'Viena': [48.2082, 16.3738],
    'Salzburgo': [47.8095, 13.0550],

    // Europa del Este
    'Varsovia': [52.2297, 21.0122],
    'Cracovia': [50.0647, 19.9450],
    'Praga': [50.0755, 14.4378],
    'Brno': [49.1951, 16.6068],
    'Budapest': [47.4979, 19.0402],
    'Bucarest': [44.4268, 26.1025],
    'Sofía': [42.6977, 23.3219],
    'Belgrado': [44.7866, 20.4489],
    'Zagreb': [45.8150, 15.9819],
    'Atenas': [37.9838, 23.7275],
    'Tesalónica': [40.6401, 22.9444],
    'Lisboa': [38.7223, -9.1393],
    'Oporto': [41.1579, -8.6291],

    // Rusia y ex URSS
    'Moscú': [55.7558, 37.6173],
    'San Petersburgo': [59.9311, 30.3609],
    'Kiev': [50.4501, 30.5234],
    'Minsk': [53.9006, 27.5590],

    // Turquía
    'Estambul': [41.0082, 28.9784],
    'Ankara': [39.9334, 32.8597],

    //   NORTEAMÉRICA
    // Estados Unidos
    'Nueva York': [40.7128, -74.0060],
    'Los Ángeles': [34.0522, -118.2437],
    'Chicago': [41.8781, -87.6298],
    'Houston': [29.7604, -95.3698],
    'Filadelfia': [39.9526, -75.1652],
    'Phoenix': [33.4484, -112.0740],
    'San Antonio': [29.4241, -98.4936],
    'San Diego': [32.7157, -117.1611],
    'Dallas': [32.7767, -96.7970],
    'Austin': [30.2672, -97.7431],
    'Fort Worth': [32.7555, -97.3308],
    'Jacksonville': [30.3322, -81.6557],
    'Columbus': [39.9612, -82.9988],
    'Charlotte': [35.2271, -80.8431],
    'Indianápolis': [39.7684, -86.1581],
    'San Francisco': [37.7749, -122.4194],
    'San José': [37.3382, -121.8863],
    'Santa Clara': [37.3541, -121.9552],
    'Mountain View': [37.3861, -122.0839],
    'Palo Alto': [37.4419, -122.1430],
    'Sunnyvale': [37.3688, -122.0363],
    'Cupertino': [37.3230, -122.0322],
    'Berkeley': [37.8715, -122.2730],
    'Oakland': [37.8044, -122.2712],
    'Sacramento': [38.5816, -121.4944],
    'Seattle': [47.6062, -122.3321],
    'Redmond': [47.6740, -122.1215],
    'Bellevue': [47.6101, -122.2015],
    'Portland': [45.5152, -122.6784],
    'Denver': [39.7392, -104.9903],
    'Boulder': [40.0150, -105.2705],
    'Boston': [42.3601, -71.0589],
    'Cambridge MA': [42.3736, -71.1097],
    'Washington': [38.9072, -77.0369],
    'Atlanta': [33.7490, -84.3880],
    'Miami': [25.7617, -80.1918],
    'Orlando': [28.5384, -81.3789],
    'Tampa': [27.9506, -82.4572],
    'Nashville': [36.1627, -86.7816],
    'Memphis': [35.1495, -90.0490],
    'Las Vegas': [36.1699, -115.1398],
    'Detroit': [42.3314, -83.0458],
    'Minneapolis': [44.9778, -93.2650],
    'Pittsburgh': [40.4406, -79.9959],
    'Cincinnati': [39.1031, -84.5120],
    'Cleveland': [41.4993, -81.6944],
    'Saint Louis': [38.6270, -90.1994],
    'Kansas City': [39.0997, -94.5786],
    'Salt Lake City': [40.7608, -111.8910],
    'New Orleans': [29.9511, -90.0715],
    'Baltimore': [39.2904, -76.6122],
    'Milwaukee': [43.0389, -87.9065],
    'Albuquerque': [35.0844, -106.6504],
    'Tucson': [32.2226, -110.9747],
    'Honolulú': [21.3099, -157.8581],
    'Anchorage': [61.2181, -149.9003],
    'Raleigh': [35.7796, -78.6382],
    'Peoria': [40.6936, -89.5890],
    'East Aurora': [42.7689, -78.6128],
    'Ann Arbor': [42.2808, -83.7430],
    'Princeton': [40.3573, -74.6672],
    'New Haven': [41.3083, -72.9279],
    'Buffalo': [42.8864, -78.8784],
    'Rochester': [43.1566, -77.6088],

    // Canadá
    'Toronto': [43.6532, -79.3832],
    'Montreal': [45.5017, -73.5673],
    'Vancouver': [49.2827, -123.1207],
    'Calgary': [51.0447, -114.0719],
    'Edmonton': [53.5461, -113.4938],
    'Ottawa': [45.4215, -75.6972],
    'Quebec': [46.8139, -71.2080],
    'Winnipeg': [49.8951, -97.1384],
    'Halifax': [44.6488, -63.5752],
    'Waterloo': [43.4643, -80.5204],
    'Mississauga': [43.5890, -79.6441],

    // Centroamérica y Caribe
    'Ciudad de Guatemala': [14.6349, -90.5069],
    'Guatemala': [14.6349, -90.5069],
    'Tegucigalpa': [14.0723, -87.1921],
    'San Salvador': [13.6929, -89.2182],
    'Managua': [12.1364, -86.2514],
    'San José CR': [9.9281, -84.0907],
    'Ciudad de Panamá': [8.9824, -79.5199],
    'Panamá': [8.9824, -79.5199],
    'La Habana': [23.1136, -82.3666],
    'Santo Domingo': [18.4861, -69.9312],
    'San Juan': [18.4655, -66.1057],
    'Kingston': [17.9712, -76.7928],
    'Puerto Príncipe': [18.5944, -72.3074],

    //   SUDAMÉRICA
    // Brasil
    'São Paulo': [-23.5505, -46.6333],
    'Río de Janeiro': [-22.9068, -43.1729],
    'Brasilia': [-15.8267, -47.9218],
    'Salvador': [-12.9714, -38.5014],
    'Fortaleza': [-3.7172, -38.5433],
    'Belo Horizonte': [-19.9167, -43.9345],
    'Curitiba': [-25.4284, -49.2733],
    'Porto Alegre': [-30.0346, -51.2177],
    'Recife': [-8.0476, -34.8770],

    // Argentina
    'Buenos Aires': [-34.6037, -58.3816],
    'Córdoba AR': [-31.4201, -64.1888],
    'Rosario': [-32.9442, -60.6505],
    'Mendoza': [-32.8895, -68.8458],
    'La Plata': [-34.9215, -57.9545],

    // Chile
    'Santiago': [-33.4489, -70.6693],
    'Valparaíso': [-33.0472, -71.6127],
    'Concepción': [-36.8201, -73.0444],

    // Colombia
    'Bogotá': [4.7110, -74.0721],
    'Medellín': [6.2442, -75.5812],
    'Cali': [3.4516, -76.5320],
    'Barranquilla': [10.9685, -74.7813],
    'Cartagena': [10.3910, -75.4794],

    // Perú
    'Lima': [-12.0464, -77.0428],
    'Arequipa': [-16.4090, -71.5375],
    'Cusco': [-13.5319, -71.9675],

    // Otros
    'Quito': [-0.1807, -78.4678],
    'Guayaquil': [-2.1709, -79.9224],
    'Caracas': [10.4806, -66.9036],
    'Maracaibo': [10.6666, -71.6124],
    'La Paz': [-16.4897, -68.1193],
    'Santa Cruz de la Sierra': [-17.7833, -63.1821],
    'Asunción': [-25.2637, -57.5759],
    'Montevideo': [-34.9011, -56.1645],
    'Georgetown': [6.8013, -58.1551],
    'Paramaribo': [5.8520, -55.2038],

    //   ASIA
    // Asia Oriental
    'Tokio': [35.6762, 139.6503],
    'Osaka': [34.6937, 135.5023],
    'Kioto': [35.0116, 135.7681],
    'Yokohama': [35.4437, 139.6380],
    'Nagoya': [35.1815, 136.9066],
    'Sapporo': [43.0618, 141.3545],
    'Fukuoka': [33.5904, 130.4017],
    'Seúl': [37.5665, 126.9780],
    'Busan': [35.1796, 129.0756],
    'Incheon': [37.4563, 126.7052],
    'Pekín': [39.9042, 116.4074],
    'Pequín': [39.9042, 116.4074],
    'Beijing': [39.9042, 116.4074],
    'Shanghái': [31.2304, 121.4737],
    'Shenzhen': [22.5431, 114.0579],
    'Cantón': [23.1291, 113.2644],
    'Guangzhou': [23.1291, 113.2644],
    'Chengdú': [30.5728, 104.0668],
    'Hangzhou': [30.2741, 120.1551],
    'Wuhan': [30.5928, 114.3055],
    'Xi\'an': [34.3416, 108.9398],
    'Tianjin': [39.3434, 117.3616],
    'Hong Kong': [22.3193, 114.1694],
    'Macao': [22.1987, 113.5439],
    'Taipéi': [25.0330, 121.5654],
    'Kaohsiung': [22.6273, 120.3014],

    // Sudeste asiático
    'Singapur': [1.3521, 103.8198],
    'Kuala Lumpur': [3.1390, 101.6869],
    'Yakarta': [-6.2088, 106.8456],
    'Bangkok': [13.7563, 100.5018],
    'Chiang Mai': [18.7883, 98.9853],
    'Hanói': [21.0285, 105.8542],
    'Ciudad Ho Chi Minh': [10.8231, 106.6297],
    'Manila': [14.5995, 120.9842],
    'Cebú': [10.3157, 123.8854],
    'Phnom Penh': [11.5564, 104.9282],
    'Vientián': [17.9757, 102.6331],
    'Rangún': [16.8409, 96.1735],
    'Yangón': [16.8409, 96.1735],
    'Bandar Seri Begawan': [4.9031, 114.9398],

    // Asia del Sur
    'Nueva Delhi': [28.6139, 77.2090],
    'Delhi': [28.6139, 77.2090],
    'Bombay': [19.0760, 72.8777],
    'Mumbai': [19.0760, 72.8777],
    'Bangalore': [12.9716, 77.5946],
    'Bengaluru': [12.9716, 77.5946],
    'Hyderabad': [17.3850, 78.4867],
    'Chennai': [13.0827, 80.2707],
    'Calcuta': [22.5726, 88.3639],
    'Pune': [18.5204, 73.8567],
    'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873],
    'Islamabad': [33.6844, 73.0479],
    'Karachi': [24.8607, 67.0011],
    'Lahore': [31.5204, 74.3587],
    'Daca': [23.8103, 90.4125],
    'Colombo': [6.9271, 79.8612],
    'Katmandú': [27.7172, 85.3240],
    'Timbu': [27.4728, 89.6390],
    'Malé': [4.1755, 73.5093],

    // Asia Central
    'Almatý': [43.2220, 76.8512],
    'Astaná': [51.1694, 71.4491],
    'Taskent': [41.2995, 69.2401],
    'Biskek': [42.8746, 74.5698],
    'Asjabad': [37.9601, 58.3261],
    'Dusambé': [38.5598, 68.7870],

    //   MEDIO ORIENTE
    'Abu Dabi': [24.4539, 54.3773],
    'Dubái': [25.2048, 55.2708],
    'Doha': [25.2854, 51.5310],
    'Riad': [24.7136, 46.6753],
    'Yeda': [21.4858, 39.1925],
    'La Meca': [21.3891, 39.8579],
    'Manama': [26.2285, 50.5860],
    'Kuwait': [29.3759, 47.9774],
    'Mascate': [23.5859, 58.4059],
    'Saná': [15.3694, 44.1910],
    'Bagdad': [33.3152, 44.3661],
    'Teherán': [35.6892, 51.3890],
    'Isfahán': [32.6546, 51.6680],
    'Damasco': [33.5138, 36.2765],
    'Beirut': [33.8938, 35.5018],
    'Amán': [31.9454, 35.9284],
    'Jerusalén': [31.7683, 35.2137],
    'Tel Aviv': [32.0853, 34.7818],
    'Nicosia': [35.1856, 33.3823],

    //   ÁFRICA
    // Norte de África
    'El Cairo': [30.0444, 31.2357],
    'Alejandría': [31.2001, 29.9187],
    'Casablanca': [33.5731, -7.5898],
    'Rabat': [34.0209, -6.8416],
    'Marrakech': [31.6295, -7.9811],
    'Túnez': [36.8065, 10.1815],
    'Argel': [36.7538, 3.0588],
    'Trípoli': [32.8872, 13.1913],
    'Jartum': [15.5007, 32.5599],

    // África Occidental
    'Lagos': [6.5244, 3.3792],
    'Abuya': [9.0765, 7.3986],
    'Accra': [5.6037, -0.1870],
    'Dakar': [14.7167, -17.4677],
    'Abiyán': [5.3600, -4.0083],
    'Yamusukro': [6.8276, -5.2893],
    'Bamako': [12.6392, -8.0029],
    'Conakry': [9.6412, -13.5784],
    'Uagadugú': [12.3714, -1.5197],
    'Niamey': [13.5117, 2.1251],
    'Lomé': [6.1725, 1.2314],
    'Cotonú': [6.3703, 2.3912],
    'Monrovia': [6.3009, -10.7969],
    'Freetown': [8.4657, -13.2317],

    // África Central y Oriental
    'Kinshasa': [-4.4419, 15.2663],
    'Luanda': [-8.8390, 13.2894],
    'Yaundé': [3.8480, 11.5021],
    'Duala': [4.0511, 9.7679],
    'Bangui': [4.3947, 18.5582],
    'Nairobi': [-1.2921, 36.8219],
    'Mombasa': [-4.0435, 39.6682],
    'Adís Abeba': [9.0320, 38.7423],
    'Dar es Salaam': [-6.7924, 39.2083],
    'Dodoma': [-6.1630, 35.7516],
    'Kampala': [0.3476, 32.5825],
    'Kigali': [-1.9706, 30.1044],
    'Buyumbura': [-3.3614, 29.3599],
    'Mogadiscio': [2.0469, 45.3182],
    'Yibuti': [11.5721, 43.1456],
    'Asmara': [15.3229, 38.9251],

    // África Austral
    'Ciudad del Cabo': [-33.9249, 18.4241],
    'Johannesburgo': [-26.2041, 28.0473],
    'Pretoria': [-25.7479, 28.2293],
    'Durban': [-29.8587, 31.0218],
    'Harare': [-17.8252, 31.0335],
    'Lusaka': [-15.3875, 28.3228],
    'Maputo': [-25.9692, 32.5732],
    'Antananarivo': [-18.8792, 47.5079],
    'Port Louis': [-20.1609, 57.5012],
    'Windhoek': [-22.5609, 17.0658],
    'Gaborone': [-24.6282, 25.9231],

    //   OCEANÍA
    'Sídney': [-33.8688, 151.2093],
    'Melbourne': [-37.8136, 144.9631],
    'Brisbane': [-27.4698, 153.0251],
    'Perth': [-31.9505, 115.8605],
    'Adelaida': [-34.9285, 138.6007],
    'Canberra': [-35.2809, 149.1300],
    'Hobart': [-42.8821, 147.3272],
    'Darwin': [-12.4634, 130.8456],
    'Auckland': [-36.8485, 174.7633],
    'Wellington': [-41.2865, 174.7762],
    'Christchurch': [-43.5321, 172.6362],
    'Suva': [-18.1248, 178.4501],
    'Port Moresby': [-9.4438, 147.1803],

    // ── Extiende aquí si detectas ciudades faltantes en los logs ──
  };

  // Export
  exportMenuVisible = false;
  exportando = false;

  private destroyRef = inject(DestroyRef);
  private usuariosService = inject(UsuariosService);

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

    const leafletModule: any = await import('leaflet');
    // Maneja tanto export default como namespace import
    const L = leafletModule.default ?? leafletModule;
    this.L = L;

    if (!L || !L.Icon || !L.Icon.Default) {
      console.error('[Leaflet] No se pudo cargar el módulo correctamente', leafletModule);
      return;
    }

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
    if (!this.datos || this.exportando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.svc.exportarPdf(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `distribucion_geografica_${new Date().toISOString().split('T')[0]}.pdf`);
        this.logAccion('exportar', 'Exportó Distribución Geográfica en PDF', 'distribucion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  exportarExcel(): void {
    if (!this.datos || this.exportando) return;
    this.exportMenuVisible = false;
    this.exportando = true;
    this.svc.exportarExcel(
      this.filtroCarrera || undefined,
      this.filtroAnio ? Number(this.filtroAnio) : undefined,
    ).subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `distribucion_geografica_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.logAccion('exportar', 'Exportó Distribución Geográfica en Excel', 'distribucion');
        this.exportando = false;
      },
      error: () => { this.exportando = false; }
    });
  }

  private descargarArchivo(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
  }

  private logAccion(accion: string, descripcion: string, seccion: string): void {
    this.usuariosService.registrarAccion(accion, descripcion, seccion).subscribe({ error: () => { } });
  }
}