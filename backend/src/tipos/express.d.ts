export {};

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id_usuario: number;
        id_rol: number;
        nombre_usuario: string;
        correo: string;
        nombre_rol: string;
      };
    }
  }
}
