import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// ── Firma en consola del navegador ──
console.log(
  '%cEgresados ITD · Admin',
  'background:#6b1538;color:#c8a96e;padding:6px 12px;border-radius:6px 6px 0 0;font-size:13px;font-weight:bold;font-family:sans-serif;',
);
console.log(
  '%cDesarrollado por Ricardo Martínez (richmtx) · 2026 · rich.mtx1205@gmail.com',
  'background:#6b1538;color:#fff;padding:6px 12px;border-radius:0 0 6px 6px;font-size:11px;font-family:sans-serif;',
);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));