import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Routes protégées : rendu côté client uniquement (token auth requis, pas de SSR)
  { path: 'home-freelance', renderMode: RenderMode.Client },
  { path: 'client-dashboard', renderMode: RenderMode.Client },
  { path: 'home-employee', renderMode: RenderMode.Client },
  { path: 'freelance-dashboard', renderMode: RenderMode.Client },
  { path: 'candidatures', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'offres-manager', renderMode: RenderMode.Client },
  { path: 'portfolio', renderMode: RenderMode.Client },
  { path: 'opportunites-emploi', renderMode: RenderMode.Client },

  // Routes publiques : Server (rendu à la demande, backend disponible)
  { path: '**', renderMode: RenderMode.Server }
];
