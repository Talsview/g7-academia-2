import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raiz: apenas hospeda o roteador (router-outlet).
 */
@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
export class AppComponent {}
