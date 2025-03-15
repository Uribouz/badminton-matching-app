import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchListComponent } from './match-list.component';
import { Player,NewPlayer } from '../player/player';

describe('MatchListComponent', () => {
  let component: MatchListComponent;
  let fixture: ComponentFixture<MatchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('should test calculateTeamates', () => {
    const data: Player[] = [
      NewPlayer('ball', 1, ['nice']),
      NewPlayer('nice', 1, ['ball']),
      NewPlayer('win', 1, ['gato']),
      NewPlayer('gato', 1, ['win']),
    ]
    const originalRandom = Math.random;
    try {
      // First call will return 0.3, second call 0.7
      const mockRandomValues = [0.3, 0.7, 0.4, 0.6];
      let callCount = 0;
      Math.random = jasmine.createSpy().and.callFake(() => mockRandomValues[callCount++]);
      
      const result = component.calculateTeamates(data)
      console.log(result)
      expect(result).toEqual(
      [
        {player1:data[0], player2:data[2]},
        {player1:data[1], player2:data[3]},
      ]
      )
      // The sort function behavior with Math.random can be complex to predict
      // We're mainly checking the function doesn't crash with equal points
    } finally {
      // Restore original Math.random
      Math.random = originalRandom;
    }
  });

});
