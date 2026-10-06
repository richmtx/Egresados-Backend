import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './panel-layout.component.html',
  styleUrl: './panel-layout.component.css',
  // Sin encapsulación: el host de la página lo inserta el router-outlet y no
  // recibe el atributo de alcance del layout, así que un selector encapsulado
  // no lo alcanzaría. Todos los selectores van prefijados con .panel-layout.
  encapsulation: ViewEncapsulation.None
})
export class PanelLayoutComponent { }
