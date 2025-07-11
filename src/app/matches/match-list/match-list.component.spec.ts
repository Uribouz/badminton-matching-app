import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchListComponent } from './match-list.component';
import { Player,NewPlayer } from '../../players/player';
import { Teammate } from '../match';
import { XorShift } from '../../shared/random/xorshift';

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

  it('should test calculateTeamates with spy calculateTeamatesPoint', () => {
    const input: Player[] = [
      NewPlayer('ball', 1, ['nice']),
      NewPlayer('nice', 1, ['ball']),
      NewPlayer('win', 1, ['gato']),
      NewPlayer('gato', 1, ['win']),
    ]
    try {
      const mockRemainingPlayers: Player[] = [
        NewPlayer('ball', 1, ['nice']),
        NewPlayer('nice', 1, ['ball']),
        NewPlayer('win', 1, ['gato']),
        NewPlayer('gato', 1, ['win']),
      ]
      spyOn(component as any, 'calculateTeamatesGetSortedPlayerMostRecentTeamateWithOther').and.returnValue(mockRemainingPlayers);

      const mockRandomValues = [1, 0, 1, 0];
      (component as any).calculateTeamatesPoint = jasmine.createSpy('calculateTeamatesPoint')
      .and.returnValues(...mockRandomValues);
      

      const result = component['calculateTeamates'](input);
      console.log(result);

      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith( NewPlayer('ball', 1, ['nice']), NewPlayer('win', 1, ['gato']));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith( NewPlayer('ball', 1, ['nice']), NewPlayer('nice', 1, ['ball']));

      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith( NewPlayer('ball', 1, ['nice']), NewPlayer('gato', 1, ['win']));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith( NewPlayer('ball', 1, ['nice']), NewPlayer('win', 1, ['gato']));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledTimes(4)
    
    
      // The sort function behavior with Math.random can be complex to predict
      // We're mainly checking the function doesn't crash with equal points
    } finally {
    }
  });

});
