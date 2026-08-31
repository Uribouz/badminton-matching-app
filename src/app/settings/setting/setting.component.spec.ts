import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingComponent } from './setting.component';

describe('SettingComponent', () => {
  let component: SettingComponent;
  let fixture: ComponentFixture<SettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Auto rolls tiered/spread/mixed only, so the panel offers no novel weight and the
  // three percentages on screen are the ones the shuffle actually rolls.
  describe('auto mix weights — novel excluded', () => {
    function createWith(weights: {tiered: number, spread: number, mixed: number, novel: number}) {
      localStorage.setItem('shuffle-mode-weights', JSON.stringify(weights));
      const created = TestBed.createComponent(SettingComponent);
      created.detectChanges();
      return created.componentInstance;
    }
    function stored() {
      return JSON.parse(localStorage.getItem('shuffle-mode-weights')!);
    }

    afterEach(() => localStorage.removeItem('shuffle-mode-weights'));

    it('derives mixed from tiered and spread alone', () => {
      const setting = createWith({ tiered: 40, spread: 20, mixed: 40, novel: 0 });
      expect(setting.mixedPct).toBe(40);

      setting.tieredPct = 50;
      setting.spreadPct = 10;
      expect(setting.mixedPct).toBe(40);
    });

    it('persists a zero novel weight, with the three modes totalling 100', () => {
      const setting = createWith({ tiered: 40, spread: 20, mixed: 40, novel: 0 });
      setting.tieredPct = 50;
      setting.onTieredPctChange();

      expect(stored().novel).toBe(0);
      expect(stored().tiered + stored().spread + stored().mixed).toBe(100);
    });

    it('folds a legacy novel weight into mixed on load', () => {
      // Saved before novel left the auto roll: mixed was 30 with 10 held back for novel.
      const setting = createWith({ tiered: 40, spread: 20, mixed: 30, novel: 10 });

      expect(setting.mixedPct).toBe(40);
      expect(stored().novel).toBe(0);
      expect(stored().mixed).toBe(40);
    });

    it('never lets tiered and spread exceed 100 between them', () => {
      const setting = createWith({ tiered: 40, spread: 20, mixed: 40, novel: 0 });
      setting.tieredPct = 90;
      setting.onTieredPctChange();

      expect(setting.spreadPct).toBe(10);
      expect(setting.mixedPct).toBe(0);
    });
  });
});
