import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchListComponent } from './match-list.component';
import { Player,NewPlayer } from '../../players/player';
import { Teammate } from '../match';

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

  it('should test calculateTeamates with expect teamate', () => {
    const input: Player[] = [
      NewPlayer('ball', 2, ['nice','win']),
      NewPlayer('nice', 2, ['ball','gato']),
      NewPlayer('win', 2, ['gato','ball']),
      NewPlayer('gato', 2, ['win','nice']),
    ]
    try {
      const result = component['calculateTeamates'](input);
      console.log(result)

      let expectedTeamates: string[][] = [['nice', 'win'], ['ball','gato']];
      let isValidTeamates: boolean[] = [false, false];
      result.forEach((each) => {
        let firstPlayerName = each.player1.name;
        let secondPlayerName = each.player2.name;
        expectedTeamates.forEach( (teamates: string[], index: number) => {
          if (teamates.includes(firstPlayerName) 
            && teamates.includes(secondPlayerName)) {
              isValidTeamates[index] = true;
          }
        })
      })
      isValidTeamates.forEach(each => expect(each).toBeTrue());

      //Expect input to still be the same (doesn't get mutated)
      expect(input).toEqual(
        [
          NewPlayer('ball', 2, ['nice','win']),
          NewPlayer('nice', 2, ['ball','gato']),
          NewPlayer('win', 2, ['gato','ball']),
          NewPlayer('gato', 2, ['win','nice']),
        ]
      )
    } finally {
    }
  });

  it('should test calculateTeamates with randomness', () => {
    const input: Player[] = [
      NewPlayer('ball', 1, ['nice']),
      NewPlayer('nice', 1, ['ball']),
      NewPlayer('win', 1, ['gato']),
      NewPlayer('gato', 1, ['win']),
    ]
    const originalRandom = Math.random;
    try {
      const mockRandomValues = [1, 0.9, 1, 0.8];
      let callCount = 0;
      Math.random = jasmine.createSpy().and.callFake(() => mockRandomValues[callCount++]);
      
      const result = component['calculateTeamates'](input);
      console.log(result)
      let expectedTeamates: string[][] = [['nice', 'win'], ['ball','gato']];
      let isValidTeamates: boolean[] = [false, false];
      result.forEach((each) => {
        let firstPlayerName = each.player1.name;
        let secondPlayerName = each.player2.name;
        expectedTeamates.forEach( (teamates: string[], index: number) => {
          if (teamates.includes(firstPlayerName) 
            && teamates.includes(secondPlayerName)) {
              isValidTeamates[index] = true;
          }
        })
      })
      isValidTeamates.forEach(each => expect(each).toBeTrue());
      expect(input).toEqual(
        [
          NewPlayer('ball', 1, ['nice']),
          NewPlayer('nice', 1, ['ball']),
          NewPlayer('win', 1, ['gato']),
          NewPlayer('gato', 1, ['win']),
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
