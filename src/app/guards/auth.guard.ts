import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard para rutas que requieren login
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.estaAutenticado()) {
        router.navigate(['/']);
        return false;
    }
    return true;
};

// Guard exclusivo para admins — invitados redirigen al directorio
export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.estaAutenticado()) {
        router.navigate(['/']);
        return false;
    }

    const usuario = auth.getUsuario();
    if (usuario?.rol !== 'admin') {
        router.navigate(['/directorio']);
        return false;
    }

    return true;
};