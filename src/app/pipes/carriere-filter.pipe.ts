import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'carriereFilter',
  standalone: true,
})
export class CarriereFilterPipe implements PipeTransform {
  transform(
    items: { nombre_carrera: string; anios_promedio_para_emplearse: number }[],
    carrera: string
  ): { nombre_carrera: string; anios_promedio_para_emplearse: number } | undefined {
    return items?.find(i => i.nombre_carrera === carrera);
  }
}