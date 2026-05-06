import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComparativasComponent } from './comparativas.component';

describe('ComparativasComponent', () => {
  let component: ComparativasComponent;
  let fixture: ComponentFixture<ComparativasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparativasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparativasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
