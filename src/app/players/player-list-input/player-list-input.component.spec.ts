import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerListInputComponent } from './player-list-input.component';

describe('PlayerListInputComponent', () => {
  let component: PlayerListInputComponent;
  let fixture: ComponentFixture<PlayerListInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerListInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlayerListInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
