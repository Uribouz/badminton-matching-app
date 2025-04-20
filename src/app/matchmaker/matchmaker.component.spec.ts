import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchmakerComponent } from './matchmaker.component';

describe('MatchmakerComponent', () => {
  let component: MatchmakerComponent;
  let fixture: ComponentFixture<MatchmakerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchmakerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MatchmakerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
