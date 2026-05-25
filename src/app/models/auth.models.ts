export interface LoginResponse {
  access_token: string;
}

export interface UsuarioToken {
  id_usuario: number;
  usuario: string;
  nombre_completo?: string;
  rol: string;
}
