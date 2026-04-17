import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EgresadosComponent } from './egresados.component';

describe('EgresadosComponent', () => {
  let component: EgresadosComponent;
  let fixture: ComponentFixture<EgresadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EgresadosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EgresadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
