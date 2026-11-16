import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillComponent } from './bill.component';
import * as defaults from './constant';
import { AuthService } from '../auth/auth.service';

const KEY = 'bill-settings';

describe('BillComponent', () => {
  let component: BillComponent;
  let fixture: ComponentFixture<BillComponent>;

  function create() {
    fixture = TestBed.createComponent(BillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function cached() {
    return JSON.parse(localStorage.getItem(KEY)!);
  }

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({
      imports: [BillComponent],
      providers: [{ provide: AuthService, useValue: {} }],
    })
    .compileComponents();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    create();
    expect(component).toBeTruthy();
  });

  describe('settings cache', () => {
    it('uses constants when nothing is cached', () => {
      create();
      expect(component.totalCourts()).toBe(defaults.DEFAULT_TOTAL_COURTS);
      expect(component.courtPrice()).toBe(defaults.DEFAULT_COURT_PRICE);
      expect(component.totalShuttleUsed()).toBe(defaults.DEFAULT_TOTAL_SHUTTLE_USED);
      expect(component.shuttlePrice()).toBe(defaults.DEFAULT_SHUTTLE_PRICE);
    });

    it('loads values from cache', () => {
      localStorage.setItem(KEY, JSON.stringify({
        totalCourts: 6, courtPrice: 300, totalShuttleUsed: 12, shuttlePrice: 85.5,
      }));
      create();
      expect(component.totalCourts()).toBe(6);
      expect(component.courtPrice()).toBe(300);
      expect(component.totalShuttleUsed()).toBe(12);
      expect(component.shuttlePrice()).toBe(85.5);
    });

    it('coerces string values from cache to numbers', () => {
      localStorage.setItem(KEY, JSON.stringify({
        totalCourts: '5', courtPrice: '250', totalShuttleUsed: '3', shuttlePrice: '70.5',
      }));
      create();
      expect(component.totalCourts()).toBe(5);
      expect(component.shuttlePrice()).toBe(70.5);
    });

    it('falls back per-field for missing or invalid cached values', () => {
      localStorage.setItem(KEY, JSON.stringify({
        totalCourts: 7, courtPrice: 'abc', shuttlePrice: '',
      }));
      create();
      expect(component.totalCourts()).toBe(7);
      expect(component.courtPrice()).toBe(defaults.DEFAULT_COURT_PRICE);
      expect(component.totalShuttleUsed()).toBe(defaults.DEFAULT_TOTAL_SHUTTLE_USED);
      expect(component.shuttlePrice()).toBe(defaults.DEFAULT_SHUTTLE_PRICE);
    });

    it('falls back to constants on corrupt JSON', () => {
      localStorage.setItem(KEY, '{not json');
      create();
      expect(component.totalCourts()).toBe(defaults.DEFAULT_TOTAL_COURTS);
      expect(component.courtPrice()).toBe(defaults.DEFAULT_COURT_PRICE);
    });

    it('saves to cache when values change', () => {
      create();
      component.updateCourts(3);
      component.updateCourtPrice(199);
      component.updateShuttleUsed(8);
      component.updateShuttlePrice(65);
      fixture.detectChanges();
      expect(cached()).toEqual({
        totalCourts: 3, courtPrice: 199, totalShuttleUsed: 8, shuttlePrice: 65,
      });
    });

    it('persists across component instances', () => {
      create();
      component.updateCourtPrice(321);
      fixture.detectChanges();
      fixture.destroy();

      create();
      expect(component.courtPrice()).toBe(321);
    });
  });
});
