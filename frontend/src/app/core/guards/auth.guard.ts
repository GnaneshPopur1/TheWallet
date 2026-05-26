import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return authService.checkAuthStatus().pipe(
    take(1),
    map(user => {
      // If user hasn't completed onboarding and trying to access dashboard/etc, force to onboarding
      if (!user.has_completed_onboarding && state.url !== '/onboarding') {
        return router.createUrlTree(['/onboarding']);
      }
      // If user HAS completed onboarding and trying to access onboarding, force to dashboard
      if (user.has_completed_onboarding && state.url === '/onboarding') {
        return router.createUrlTree(['/dashboard']);
      }
      return true;
    }),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
