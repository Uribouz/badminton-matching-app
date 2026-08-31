import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { MatchListComponent } from './match-list.component';
import { Player, NewPlayer } from '../../players/player';
import { Teammate } from '../match';
import { XorShift } from '../../shared/random/xorshift';

function makeRankedPlayer(name: string, rank: number): Player {
  const p = new Player(name);
  p.rank = rank;
  return p;
}

function makePlayerWithHistory(
  name: string,
  rank: number,
  totalRoundsPlayed: number,
  teamateHistory: string[],
  roundsWon = 0,
  actualTotalRoundsPlayed = 0
): Player {
  const p = new Player(name);
  p.rank = rank;
  p.totalRoundsPlayed = totalRoundsPlayed;
  p.teamateHistory = teamateHistory;
  p.roundsWon = roundsWon;
  p.actualTotalRoundsPlayed = actualTotalRoundsPlayed;
  return p;
}

describe('MatchListComponent', () => {
  let component: MatchListComponent;
  let fixture: ComponentFixture<MatchListComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchListComponent],
      providers: [provideHttpClient()]
    })
    .compileComponents();
    fixture = TestBed.createComponent(MatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  xit('should test calculateTeamates with expect teamate', () => {
    const input: Player[] = [
      NewPlayer('ball', 2, ['nice','win']),
      NewPlayer('nice', 2, ['ball','gato']),
      NewPlayer('win', 2, ['gato','ball']),
      NewPlayer('gato', 2, ['win','nice']),
    ]
    try {
      const rankingPlayersMap = (component as any)['calculateRankingPlayers'](input);
      const result = (component as any)['calculateTeamates'](input, rankingPlayersMap);
      console.log(result)

      let expectedTeamates: string[][] = [['nice', 'win'], ['ball','gato']];
      let isValidTeamates: boolean[] = [false, false];
      result.forEach((each: any) => {
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

  // Shared formQuadPairs-level constraints (nemesis, recency) apply identically to both
  // quad-construction strategies — run them against both. Partner rank distance is NOT
  // constrained: the quad is the skill bracket, and [0,3] pairs its best with its worst.
  (['shuffleTiered', 'shuffleSpread'] as const).forEach(methodName => {
    describe(`${methodName} — quad split preference`, () => {
      function partnerRankDiff(pair: Teammate): number {
        return Math.abs((pair.player1.rank ?? 5) - (pair.player2.rank ?? 5));
      }
      function shuffle(players: Player[]): Teammate[] | null {
        return component[methodName](players);
      }

      it('should return 2 pairs and use [0,3]+[1,2] (most balanced teams)', () => {
        // Sorted by effectiveRank: rank1, rank2, rank3, rank4 → [0,3]=A+D, [1,2]=B+C
        const players = [
          makeRankedPlayer('A', 1),
          makeRankedPlayer('B', 2),
          makeRankedPlayer('C', 3),
          makeRankedPlayer('D', 4),
        ];
        const result: Teammate[] | null = shuffle(players);
        expect(result).not.toBeNull();
        expect(result!.length).toBe(2);
        // [0,3] pairing should be chosen: A with D, B with C
        const names = (pair: Teammate) => [pair.player1.name, pair.player2.name].sort().join(',');
        expect(result!.map(names)).toContain('A,D');
        expect(result!.map(names)).toContain('B,C');
      });

      it('pairs the strongest with the weakest even when the gap is wide', () => {
        // [rank1, rank2, rank3, rank5]: [0,3]=A+D spans 4 tiers and is still the preferred
        // split — nothing caps how far apart two partners may be.
        const players = [
          makeRankedPlayer('A', 1),
          makeRankedPlayer('B', 2),
          makeRankedPlayer('C', 3),
          makeRankedPlayer('D', 5),
        ];
        const result: Teammate[] | null = shuffle(players);
        expect(result).not.toBeNull();
        const names = (pair: Teammate) => [pair.player1.name, pair.player2.name].sort().join(',');
        expect(result!.map(names)).toContain('A,D');
        expect(result!.map(names)).toContain('B,C');
      });

      it('still pairs a quad that spans the whole rank scale', () => {
        // [rank1, rank2, rank5, rank6]: a 5-tier gap on [0,3]. This quad used to have no legal
        // split and failed the entire mode; now it simply pairs best with worst.
        const players = [
          makeRankedPlayer('A', 1),
          makeRankedPlayer('B', 2),
          makeRankedPlayer('E', 5),
          makeRankedPlayer('F', 6),
        ];
        const result: Teammate[] | null = shuffle(players);
        expect(result).not.toBeNull();
        expect(result!.length).toBe(2);
        const names = (pair: Teammate) => [pair.player1.name, pair.player2.name].sort().join(',');
        expect(result!.map(names)).toContain('A,F');
        expect(result!.map(names)).toContain('B,E');
        expect(Math.max(...result!.map(partnerRankDiff))).toBe(5);
      });

      it('keeps [0,3]+[1,2] rather than evening out the gap with [0,2]+[1,3]', () => {
        // [rank1, rank2, rank4, rank5]: [0,2]+[1,3] would give two 3-tier pairs, but the most
        // balanced *teams* still come from best+worst against the two middles.
        const players = [
          makeRankedPlayer('A', 1),
          makeRankedPlayer('B', 2),
          makeRankedPlayer('C', 4),
          makeRankedPlayer('D', 5),
        ];
        const result: Teammate[] | null = shuffle(players);
        expect(result).not.toBeNull();
        const names = (pair: Teammate) => [pair.player1.name, pair.player2.name].sort().join(',');
        expect(result!.map(names)).toContain('A,D');
        expect(result!.map(names)).toContain('B,C');
      });

      it('should rotate partners when preferred [0,3] pairing was used too recently', () => {
        // rank1A+rank4D have paired repeatedly (recent), so pass 0 skips [0,3]+[1,2]
        // and should choose [0,2]+[1,3] = rank1A+rank3C, rank2B+rank4D  OR  [0,1]+[2,3]
        const players = [
          makePlayerWithHistory('rank1A', 1, 6, ['rank4D','rank2B','rank4D','rank4D','rank4D','rank2B']),
          makePlayerWithHistory('rank2B', 2, 6, ['rank3C','rank1A','rank3C','rank3C','rank1A','rank3C']),
          makePlayerWithHistory('rank3C', 3, 6, ['rank2B','rank4D','rank2B','rank2B','rank4D','rank2B']),
          makePlayerWithHistory('rank4D', 4, 6, ['rank1A','rank3C','rank1A','rank1A','rank3C','rank1A']),
        ];
        // effectiveRank sorts as: rank1A, rank2B, rank3C, rank4D (no win-rate adjustment needed)
        // [0,3] = rank1A+rank4D → lastIdx=4, elapsed=6-4=2, cooldown=max(1,4-1)=3, 2<3 → RECENT → skip
        // [0,2] = rank1A+rank3C, [1,3] = rank2B+rank4D → check recency for each:
        //   rank1A+rank3C: not in rank1A history → not recent ✓
        //   rank2B+rank4D: not in rank2B history → not recent ✓
        // → should use [0,2]+[1,3]
        const result = shuffle(players);
        expect(result).not.toBeNull();
        const pairNames = result!.map(p => [p.player1.name, p.player2.name].sort().join('+'));
        expect(pairNames).not.toContain('rank1A+rank4D');
      });

      it('should return null when nemesis constraints block all pairings in a quad', () => {
        // All 3 pairing options blocked by nemesis
        component['nemesisTeamate'] = [
          { player1: 'A', player2: 'D' },
          { player1: 'A', player2: 'C' },
          { player1: 'A', player2: 'B' },
        ];
        const players = [
          makeRankedPlayer('A', 1),
          makeRankedPlayer('B', 2),
          makeRankedPlayer('C', 3),
          makeRankedPlayer('D', 4),
        ];
        const result = shuffle(players);
        expect(result).toBeNull();
        component['nemesisTeamate'] = []; // cleanup
      });

      it('rescues an otherwise-deadlocked quad by swapping in a boundary-tied standby player', () => {
        // Same nemesis deadlock as above (A blocked from every partner in the quad),
        // but now a boundary-tied standby player E is available to swap in for D.
        component['nemesisTeamate'] = [
          { player1: 'A', player2: 'B' },
          { player1: 'A', player2: 'C' },
          { player1: 'A', player2: 'D' },
        ];
        const A = makeRankedPlayer('A', 1);
        const B = makeRankedPlayer('B', 2);
        const C = makeRankedPlayer('C', 3);
        const D = makeRankedPlayer('D', 4);
        const E = makeRankedPlayer('E', 2);

        const swapPool = { boundaryIn: [D], boundaryOut: [E] };
        const result = component[methodName]([A, B, C, D], swapPool);

        expect(result).not.toBeNull();
        const allNames = result!.flatMap(p => [p.player1.name, p.player2.name]);
        expect(allNames).toContain('E');
        expect(allNames).not.toContain('D');

        component['nemesisTeamate'] = []; // cleanup
      });
    });
  });

  describe('shuffleSpread — round-robin quad diversity', () => {
    it('does not create rank4+rank4 partnerships when 4 rank4 players are in an 8-player pool', () => {
      // Contiguous slicing would give Quad2=[rank4A,rank4B,rank4C,rank4D] → forced rank4+rank4.
      // Interleaved gives each quad one rank2, one rank3, two rank4 players → cross-rank pairings.
      const players = [
        makeRankedPlayer('rank2A', 2), makeRankedPlayer('rank2B', 2),
        makeRankedPlayer('rank3A', 3), makeRankedPlayer('rank3B', 3),
        makeRankedPlayer('rank4A', 4), makeRankedPlayer('rank4B', 4),
        makeRankedPlayer('rank4C', 4), makeRankedPlayer('rank4D', 4),
      ];
      const result = component['shuffleSpread'](players);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      for (const pair of result!) {
        const r1 = pair.player1.rank ?? 5;
        const r2 = pair.player2.rank ?? 5;
        expect(r1 === 4 && r2 === 4).toBeFalse();
      }
    });

    it('spreads top and bottom players across both quads for a 8-player pool', () => {
      // Interleaved: Quad0 = [rank1, rank3, rank4, rank4], Quad1 = [rank2, rank3, rank4, rank4]
      // Neither quad should be all same rank.
      const players = [
        makeRankedPlayer('A', 1), makeRankedPlayer('B', 2),
        makeRankedPlayer('C', 3), makeRankedPlayer('D', 3),
        makeRankedPlayer('E', 4), makeRankedPlayer('F', 4),
        makeRankedPlayer('G', 4), makeRankedPlayer('H', 4),
      ];
      const result = component['shuffleSpread'](players);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      const rank4Pairs = result!.filter(p => (p.player1.rank ?? 5) === 4 && (p.player2.rank ?? 5) === 4);
      expect(rank4Pairs.length).toBe(0);
    });

    it('does not force rank4+rank4 onto a recently-paired rank2A when a fresh cross-rank split exists', () => {
      // Quad: [rank2A, rank3B, rank4C, rank4D]
      // rank2A has been recently paired with both rank4C (pos2) and rank4D (pos3), but rank3B+rank4C
      // (the other pair in [0,3]+[1,2]) is fresh — only one pair needs to be fresh to pass.
      component['forceMatchTeamate'] = [];
      component['nemesisTeamate'] = [];
      const players = [
        // rank2A: recently paired with rank4C (idx=3) and rank4D (idx=4), total rounds=5
        makePlayerWithHistory('rank2A', 2, 5, ['rank4D','rank4C','rank4D','rank4C','rank4D']),
        makePlayerWithHistory('rank3B', 3, 5, []),
        makePlayerWithHistory('rank4C', 4, 5, []),
        makePlayerWithHistory('rank4D', 4, 5, []),
      ];
      const result = component['shuffleSpread'](players);
      expect(result).not.toBeNull();
      const rank4Pairs = result!.filter(p =>
        (p.player1.rank ?? 5) === 4 && (p.player2.rank ?? 5) === 4
      );
      expect(rank4Pairs.length).toBe(0);
    });

    it('pairs an interleaved quad that spans five tiers instead of failing the mode', () => {
      // Sorted: rank1,rank1,rank2,rank2, rank5,rank5,rank6,rank6
      // Interleaved quads = [rank1,rank2,rank5,rank6] each. Both splits span more than three
      // tiers, which used to fail every pass and propagate null for the whole shuffle; the
      // preferred [0,3] split now stands, pairing each quad's best with its worst.
      const players = [
        makeRankedPlayer('A', 1), makeRankedPlayer('B', 1),
        makeRankedPlayer('C', 2), makeRankedPlayer('D', 2),
        makeRankedPlayer('E', 5), makeRankedPlayer('F', 5),
        makeRankedPlayer('G', 6), makeRankedPlayer('H', 6),
      ];
      const result = component['shuffleSpread'](players);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      const names = result!.map(p => [p.player1.name, p.player2.name].sort().join(','));
      expect(names).toContain('A,G'); // quad 0 = A(1) C(2) E(5) G(6) → [0,3]
      expect(names).toContain('C,E');
      expect(names).toContain('B,H'); // quad 1 = B(1) D(2) F(5) H(6) → [0,3]
      expect(names).toContain('D,F');
    });
  });

  describe('shuffleTiered — same-rank grouping', () => {
    it('groups same-rank players into the same quad, creating a strong court and a weak court', () => {
      // Contiguous slicing: Quad0 = the 4 strongest (rank2,2,3,3), Quad1 = the 4 weakest (all rank4)
      // Quad1 has no cross-rank alternative — a rank4+rank4 pair is expected here.
      const players = [
        makeRankedPlayer('rank2A', 2), makeRankedPlayer('rank2B', 2),
        makeRankedPlayer('rank3A', 3), makeRankedPlayer('rank3B', 3),
        makeRankedPlayer('rank4A', 4), makeRankedPlayer('rank4B', 4),
        makeRankedPlayer('rank4C', 4), makeRankedPlayer('rank4D', 4),
      ];
      const result = component['shuffleTiered'](players);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      const rank4Pairs = result!.filter(p => (p.player1.rank ?? 5) === 4 && (p.player2.rank ?? 5) === 4);
      expect(rank4Pairs.length).toBeGreaterThan(0);
    });

    it('contiguous slicing keeps tightly-grouped quads rank-valid for an 8-player pool', () => {
      // Sorted: rank1,rank1,rank2,rank2, rank5,rank5,rank6,rank6
      // Contiguous quads = [rank1,rank1,rank2,rank2] and [rank5,rank5,rank6,rank6] — trivially ≤3.
      const players = [
        makeRankedPlayer('A', 1), makeRankedPlayer('B', 1),
        makeRankedPlayer('C', 2), makeRankedPlayer('D', 2),
        makeRankedPlayer('E', 5), makeRankedPlayer('F', 5),
        makeRankedPlayer('G', 6), makeRankedPlayer('H', 6),
      ];
      const result = component['shuffleTiered'](players);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      const rankDiff = (p: Teammate) => Math.abs((p.player1.rank ?? 5) - (p.player2.rank ?? 5));
      result!.forEach(pair => expect(rankDiff(pair)).toBeLessThanOrEqual(3));
    });
  });

  describe('isRecentTeammatePair', () => {
    it('returns false when players have never been paired', () => {
      const A = makePlayerWithHistory('A', 3, 10, []);
      const B = makePlayerWithHistory('B', 3, 10, []);
      expect(component['isRecentTeammatePair'](A, B, 8, 1)).toBeFalse();
    });

    it('returns true when last pairing is within cooldown (8 players, paired 2 rounds ago)', () => {
      // totalRoundsPlayed=10, lastIdx=8 → elapsed = 10-8 = 2 < cooldown(8-1=7) → true
      const A = makePlayerWithHistory('A', 3, 10, ['X','X','X','X','X','X','X','X','B','Y']);
      const B = makePlayerWithHistory('B', 3, 10, []);
      expect(component['isRecentTeammatePair'](A, B, 8, 1)).toBeTrue();
    });

    it('returns false when last pairing is outside cooldown (8 players, paired 8 rounds ago)', () => {
      // totalRoundsPlayed=10, lastIdx=2 → elapsed = 10-2 = 8 ≥ cooldown(8-1=7) → false
      const A = makePlayerWithHistory('A', 3, 10, ['X','X','B','X','X','X','X','X','X','X']);
      const B = makePlayerWithHistory('B', 3, 10, []);
      expect(component['isRecentTeammatePair'](A, B, 8, 1)).toBeFalse();
    });

    it('returns false at higher offset when same pairing was borderline recent', () => {
      // elapsed=2, totalPlayers=4, offset=1 → cooldown=max(1,4-1)=3 → 2 < 3 → true (recent)
      // same with offset=3 → cooldown=max(1,4-3)=1 → 2 ≥ 1 → false (acceptable)
      const A = makePlayerWithHistory('A', 3, 5, ['X','X','X','B','X']);
      const B = makePlayerWithHistory('B', 3, 5, []);
      expect(component['isRecentTeammatePair'](A, B, 4, 1)).toBeTrue();
      expect(component['isRecentTeammatePair'](A, B, 4, 3)).toBeFalse();
    });

    it('clamps cooldown to 1 so offset > totalPlayers never makes everything acceptable', () => {
      // offset=10 > totalPlayers=4 → cooldown=max(1,4-10)=1 → elapsed=1 < 1 is false → not recent
      const A = makePlayerWithHistory('A', 3, 5, ['X','X','X','X','B']);
      const B = makePlayerWithHistory('B', 3, 5, []);
      // lastIdx=4, elapsed=5-4=1, cooldown=1 → 1 < 1 is false → not recent
      expect(component['isRecentTeammatePair'](A, B, 4, 10)).toBeFalse();
    });
  });

  describe('noveltyScore (pool-size-aware)', () => {
    it('returns 0 for players who have never paired or faced each other', () => {
      const A = makePlayerWithHistory('A', 3, 5, []);
      const B = makePlayerWithHistory('B', 3, 5, []);
      expect(component['noveltyScore'](A, B, 8)).toBe(0);
    });

    it('gives higher penalty in larger pool for same recent pairing', () => {
      // A has B as last teammate, totalRoundsPlayed=5, lastIdx=4 → elapsed=1
      // 8-player pool: max(0, 8-1)*100 = 700
      // 4-player pool: max(0, 4-1)*100 = 300
      const A8 = makePlayerWithHistory('A', 3, 5, ['X','X','X','X','B']);
      const A4 = makePlayerWithHistory('A', 3, 5, ['X','X','X','X','B']);
      const B = makePlayerWithHistory('B', 3, 5, []);
      const score8 = component['noveltyScore'](A8, B, 8);
      const score4 = component['noveltyScore'](A4, B, 4);
      expect(score8).toBeGreaterThan(score4);
      expect(score8).toBe(700);
      expect(score4).toBe(300);
    });

    it('returns 0 teammate penalty when pairing is older than pool size', () => {
      // totalRoundsPlayed=10, lastIdx=1 → elapsed=9 ≥ 8 (pool) → max(0,8-9)*100 = 0
      const A = makePlayerWithHistory('A', 3, 10, ['X','B','X','X','X','X','X','X','X','X']);
      const B = makePlayerWithHistory('B', 3, 10, []);
      expect(component['noveltyScore'](A, B, 8)).toBe(0);
    });
  });

  describe('shuffleNovel — progressive relaxation', () => {
    it('avoids recently-paired partners when the pool has fresh alternatives', () => {
      // A and B just played together (last in history), C and D are fresh for A/B
      // With 4 players and fresh pairing history between A-C and B-D, novel should pair A with C (or D)
      const players = [
        makePlayerWithHistory('A', 3, 4, ['C','D','C','B']),  // last partner was B
        makePlayerWithHistory('B', 3, 4, ['D','C','D','A']),  // last partner was A
        makePlayerWithHistory('C', 3, 4, ['A','B','A','D']),  // last partner was D
        makePlayerWithHistory('D', 3, 4, ['B','A','B','C']),  // last partner was C
      ];
      // With progressive relaxation, early attempts hard-reject A+B (too recent), C+D (too recent)
      // → should resolve to A+C or A+D pairings
      const result = component['shuffleNovel'](players);
      expect(result.length).toBe(2);
      const pairNames = result.map(p => [p.player1.name, p.player2.name].sort().join(','));
      // A+B and C+D were the most recent pairings; good attempts should find A+C/B+D or A+D/B+C
      expect(pairNames).not.toContain('A,B');
      expect(pairNames).not.toContain('C,D');
    });

    it('produces valid pairs even when all candidates are saturated (small pool)', () => {
      // 4 players who have all played with each other many times
      const players = [
        makePlayerWithHistory('A', 3, 8, ['B','C','D','B','C','D','B','C']),
        makePlayerWithHistory('B', 3, 8, ['A','D','C','A','D','C','A','D']),
        makePlayerWithHistory('C', 3, 8, ['D','A','B','D','A','B','D','A']),
        makePlayerWithHistory('D', 3, 8, ['C','B','A','C','B','A','C','B']),
      ];
      const result = component['shuffleNovel'](players);
      expect(result.length).toBe(2);
      const allPlayerNames = result.flatMap(p => [p.player1.name, p.player2.name]).sort();
      expect(allPlayerNames).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('fisherYatesShuffle — uniform permutation', () => {
    it('returns a permutation of the input (same elements, same length)', () => {
      const items = ['A', 'B', 'C', 'D', 'E'];
      const result = component['fisherYatesShuffle'](items);
      expect(result.length).toBe(items.length);
      expect([...result].sort()).toEqual([...items].sort());
    });

    it('does not mutate the input array', () => {
      const items = ['A', 'B', 'C'];
      const original = [...items];
      component['fisherYatesShuffle'](items);
      expect(items).toEqual(original);
    });

    it('produces a roughly uniform distribution across all 6 permutations of 3 items', () => {
      // Seeded RNG for reproducibility. A correct Fisher–Yates gives each of the
      // 3! = 6 orderings equal probability; a biased shuffle (e.g. the old
      // sort(() => rng.random()) anti-pattern) would skew this distribution.
      component['rng'] = new XorShift(42);
      const counts = new Map<string, number>();
      const trials = 6000;
      for (let i = 0; i < trials; i++) {
        const key = component['fisherYatesShuffle'](['a', 'b', 'c']).join('');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(counts.size).toBe(6); // all 6 permutations must occur at least once
      const expected = trials / 6;
      counts.forEach((count) => {
        expect(count).toBeGreaterThan(expected * 0.7);
        expect(count).toBeLessThan(expected * 1.3);
      });
    });
  });

  describe('shuffleNovel — driven by real randomness, not a fixed order', () => {
    it('explores different pairings across different rng seeds on a fully symmetric pool', () => {
      const signatures = new Set<string>();
      for (let seed = 1; seed <= 30; seed++) {
        component['rng'] = new XorShift(seed);
        const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
          .map(name => makePlayerWithHistory(name, 3, 0, []));
        const result = component['shuffleNovel'](players);
        const signature = result
          .map((p: Teammate) => [p.player1.name, p.player2.name].sort().join('-'))
          .sort()
          .join('|');
        signatures.add(signature);
      }
      // With no teammate/opponent history, every pairing scores equally (0), so the
      // result is driven entirely by the rng-shuffled order. If the shuffle were
      // deterministic or badly biased, every seed would collapse onto one signature.
      expect(signatures.size).toBeGreaterThan(1);
    });

    it('still honors a force-teammate pair inside novel mode', () => {
      component['forceMatchTeamate'] = [{ player1: 'A', player2: 'B' }];
      const players = [
        makePlayerWithHistory('A', 3, 0, []),
        makePlayerWithHistory('B', 3, 0, []),
        makePlayerWithHistory('C', 3, 0, []),
        makePlayerWithHistory('D', 3, 0, []),
      ];
      const result = component['shuffleNovel'](players);
      const pairNames = result.map(p => [p.player1.name, p.player2.name].sort().join(','));
      expect(pairNames).toContain('A,B');
      component['forceMatchTeamate'] = []; // cleanup
    });

    it('never pairs a hard nemesis pair, regardless of rng seed', () => {
      component['nemesisTeamate'] = [{ player1: 'A', player2: 'B' }];
      for (let seed = 1; seed <= 10; seed++) {
        component['rng'] = new XorShift(seed);
        const players = [
          makePlayerWithHistory('A', 3, 0, []),
          makePlayerWithHistory('B', 3, 0, []),
          makePlayerWithHistory('C', 3, 0, []),
          makePlayerWithHistory('D', 3, 0, []),
        ];
        const result = component['shuffleNovel'](players);
        const pairNames = result.map(p => [p.player1.name, p.player2.name].sort().join(','));
        expect(pairNames).not.toContain('A,B');
      }
      component['nemesisTeamate'] = []; // cleanup
    });
  });

  describe('calculateMatchInCourtsRankBased — win-rate tiebreaker', () => {
    it('prefers opponent with closer win-rate when rank-sums are equal', () => {
      // currentTeam: both players have 0 wins, 4 games → ~25% win rate each → sumWR ≈ 0.5
      // teamLow: both 0 wins, 4 games each → sumWR ≈ 0.5 (similar)
      // teamHigh: both 4 wins, 4 games each → sumWR ≈ 0.83 each (dissimilar)
      // All rank-sums equal (rank 3+3=6 each); should prefer teamLow
      const currentTeam: Teammate = {
        player1: makePlayerWithHistory('A', 3, 4, [], 0, 4),
        player2: makePlayerWithHistory('B', 3, 4, [], 0, 4),
      };
      const teamLow: Teammate = {
        player1: makePlayerWithHistory('C', 3, 4, [], 0, 4),
        player2: makePlayerWithHistory('D', 3, 4, [], 0, 4),
      };
      const teamHigh: Teammate = {
        player1: makePlayerWithHistory('E', 3, 4, [], 4, 4),
        player2: makePlayerWithHistory('F', 3, 4, [], 4, 4),
      };
      const result = component['calculateMatchInCourtsRankBased']([currentTeam, teamLow, teamHigh]);
      expect(result.length).toBeGreaterThan(0);
      // currentTeam should be matched against teamLow (closer win-rate)
      const firstMatch = result[0];
      const opponentNames = [firstMatch.team2.player1.name, firstMatch.team2.player2.name];
      expect(opponentNames).toContain('C');
      expect(opponentNames).toContain('D');
    });

    it('does not use win-rate tiebreaker when rank-sum difference is > 1', () => {
      // currentTeam rank-sum = 2+2 = 4
      // teamClose rank-sum = 3+3 = 6 (diff=2 > 1 → no win-rate tiebreak)
      // teamFar rank-sum = 5+5 = 10 (diff=6)
      // Should pick teamClose purely by rank-sum proximity
      const currentTeam: Teammate = {
        player1: makePlayerWithHistory('A', 2, 4, [], 0, 4),
        player2: makePlayerWithHistory('B', 2, 4, [], 0, 4),
      };
      const teamClose: Teammate = {
        player1: makePlayerWithHistory('C', 3, 4, [], 4, 4), // high win-rate
        player2: makePlayerWithHistory('D', 3, 4, [], 4, 4),
      };
      const teamFar: Teammate = {
        player1: makePlayerWithHistory('E', 5, 4, [], 0, 4),
        player2: makePlayerWithHistory('F', 5, 4, [], 0, 4),
      };
      const result = component['calculateMatchInCourtsRankBased']([currentTeam, teamClose, teamFar]);
      expect(result.length).toBeGreaterThan(0);
      const opponentNames = [result[0].team2.player1.name, result[0].team2.player2.name];
      expect(opponentNames).toContain('C');
      expect(opponentNames).toContain('D');
    });
  });

  // Every mode must honour the hard constraint "these two are never teammates",
  // including Mixed — which is also the terminal fallthrough when Tiered/Spread fail.
  describe('nemesis pairs are never teammates — every shuffle mode', () => {
    const modes = ['shuffleTiered', 'shuffleSpread', 'shuffleMixed', 'shuffleNovel'] as const;

    modes.forEach(mode => {
      it(`${mode} never partners either player of a nemesis pair with the other`, () => {
        component['forceMatchTeamate'] = [];
        component['nemesisTeamate'] = [
          { player1: 'A', player2: 'B' },
          { player1: 'C', player2: 'D' },
        ];
        const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        try {
          // Rotate the input order + reseed the rng so quad construction, the
          // top<->bottom walk and the novel attempts all see different arrangements.
          for (let seed = 1; seed <= 10; seed++) {
            component['rng'] = new XorShift(seed);
            const offset = seed % names.length;
            const players = [...names.slice(offset), ...names.slice(0, offset)]
              .map(name => makeRankedPlayer(name, 3));
            const result: Teammate[] | null = (component as any)[mode](players);

            expect(result).not.toBeNull();
            expect(result!.length).toBe(4);
            const pairNames = result!.map(pair => [pair.player1.name, pair.player2.name].sort().join(','));
            expect(pairNames).not.toContain('A,B');
            expect(pairNames).not.toContain('C,D');
            // and nobody got dropped or duplicated while enforcing it
            expect(result!.flatMap(pair => [pair.player1.name, pair.player2.name]).sort()).toEqual([...names].sort());
          }
        } finally {
          component['nemesisTeamate'] = [];
        }
      });
    });
  });

  describe('getAvailablePlayers — force pair across the eligible cutoff', () => {
    // Priority-sorted pool: A plays least, F plays most.
    function pool(): Player[] {
      return ['A', 'B', 'C', 'D', 'E', 'F'].map((name, idx) => makePlayerWithHistory(name, 3, idx, []));
    }

    afterEach(() => { component['forceMatchTeamate'] = []; });

    it('pulls a force partner from outside the cutoff and evicts the lowest-priority member', () => {
      component['forceMatchTeamate'] = [{ player1: 'A', player2: 'E' }];
      const result = component['getAvailablePlayers'](pool(), 4);
      const names = result.map(p => p.name);
      expect(result.length).toBe(4);
      expect(names).toContain('A');
      expect(names).toContain('E');
      expect(names).not.toContain('D'); // D played the most inside the window, so D sits out
    });

    it('leaves the window untouched when the forced partner is not eligible at all', () => {
      component['forceMatchTeamate'] = [{ player1: 'A', player2: 'Z' }];
      const result = component['getAvailablePlayers'](pool(), 4);
      expect(result.map(p => p.name)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('leaves the window untouched when both force partners already made the cutoff', () => {
      component['forceMatchTeamate'] = [{ player1: 'A', player2: 'B' }];
      const result = component['getAvailablePlayers'](pool(), 4);
      expect(result.map(p => p.name)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('getBoundaryTieGroup — swap pool after a force pull-in', () => {
    afterEach(() => { component['forceMatchTeamate'] = []; });

    it('never offers a player who is already in the round as a swap candidate', () => {
      // Ann is forced with Ivy, who sits just below the 8-slot cutoff, so Ivy is pulled in
      // and Hal (also tied on 4 rounds) is evicted. Offering Ivy as a swap candidate would
      // put her on court twice; Hal is the one who is now actually free.
      component['forceMatchTeamate'] = [{ player1: 'Ann', player2: 'Ivy' }];
      const rounds: [string, number][] = [
        ['Ann', 2], ['Ben', 2], ['Cy', 2], ['Dee', 3],
        ['Eli', 3], ['Fay', 3], ['Gus', 4], ['Hal', 4],
        ['Ivy', 4], ['Jo', 5],
      ];
      const sorted = rounds.map(([name, played]) => makePlayerWithHistory(name, 3, played, []));
      const eligible = component['getAvailablePlayers'](sorted, 8);
      const pool = component['getBoundaryTieGroup'](sorted, eligible, 8);

      expect(eligible.map(p => p.name).sort()).toEqual(['Ann', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Ivy']);
      expect(pool.boundaryOut.map(p => p.name)).not.toContain('Ivy');
      expect(pool.boundaryOut.map(p => p.name)).toContain('Hal');
      // and nobody can be in both halves of the pool
      const inNames = pool.boundaryIn.map(p => p.name);
      pool.boundaryOut.forEach(p => expect(inNames).not.toContain(p.name));
    });

    it('still pools the players tied at the cutoff when no force pair is set', () => {
      const rounds: [string, number][] = [
        ['Ann', 1], ['Ben', 1], ['Cy', 1], ['Dee', 2],
        ['Eli', 2], ['Fay', 2], ['Gus', 2], ['Hal', 2],
      ];
      const sorted = rounds.map(([name, played]) => makePlayerWithHistory(name, 3, played, []));
      const eligible = component['getAvailablePlayers'](sorted, 4);
      const pool = component['getBoundaryTieGroup'](sorted, eligible, 4);

      // Cutoff sits on Dee (2 rounds), so every other 2-round player is a swap candidate.
      expect(pool.boundaryIn.map(p => p.name)).toEqual(['Dee']);
      expect(pool.boundaryOut.map(p => p.name).sort()).toEqual(['Eli', 'Fay', 'Gus', 'Hal']);
    });
  });

  describe('force pairs split across quads — Tiered & Spread', () => {
    // A is the strongest and H the weakest, so rank-based quad building puts them in
    // different quads under both strategies; the regroup pass must pull them together.
    function pool(): Player[] {
      return [
        makeRankedPlayer('A', 1), makeRankedPlayer('B', 2),
        makeRankedPlayer('C', 2), makeRankedPlayer('D', 2),
        makeRankedPlayer('E', 3), makeRankedPlayer('F', 3),
        makeRankedPlayer('G', 3), makeRankedPlayer('H', 4),
      ];
    }

    afterEach(() => { component['forceMatchTeamate'] = []; });

    (['shuffleTiered', 'shuffleSpread'] as const).forEach(mode => {
      it(`${mode} still pairs a force pair whose ranks land them in different quads`, () => {
        component['forceMatchTeamate'] = [{ player1: 'A', player2: 'H' }];
        const result = component[mode](pool());

        expect(result).not.toBeNull();
        expect(result!.length).toBe(4);
        const pairNames = result!.map(pair => [pair.player1.name, pair.player2.name].sort().join(','));
        expect(pairNames).toContain('A,H');
        // the displaced player must still be in the round exactly once
        expect(result!.flatMap(pair => [pair.player1.name, pair.player2.name]).sort())
          .toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
      });
    });
  });

  describe('shuffleMixed — nemesis repair', () => {
    afterEach(() => {
      component['forceMatchTeamate'] = [];
      component['nemesisTeamate'] = [];
    });

    it('breaks up the nemesis pair the top<->bottom walk would otherwise create', () => {
      // Equal ranks keep the sort stable, so the walk pairs [0,3] and [1,2]: A+B and C+D.
      component['nemesisTeamate'] = [{ player1: 'A', player2: 'B' }];
      const players = ['A', 'C', 'D', 'B'].map(name => makeRankedPlayer(name, 3));
      const result = component['shuffleMixed'](players);

      const pairNames = result.map(pair => [pair.player1.name, pair.player2.name].sort().join(','));
      expect(pairNames).not.toContain('A,B');
      expect(result.flatMap(pair => [pair.player1.name, pair.player2.name]).sort())
        .toEqual(['A', 'B', 'C', 'D']);
    });

    it('keeps a force pair intact while repairing a separate nemesis pair', () => {
      // E+F are locked first, leaving [A,C,D,B] → the walk pairs A+B (nemesis) and C+D.
      // The repair may only cross-swap with the non-forced pair, never with E+F.
      component['forceMatchTeamate'] = [{ player1: 'E', player2: 'F' }];
      component['nemesisTeamate'] = [{ player1: 'A', player2: 'B' }];
      const players = ['A', 'C', 'D', 'B', 'E', 'F'].map(name => makeRankedPlayer(name, 3));
      const result = component['shuffleMixed'](players);

      const pairNames = result.map(pair => [pair.player1.name, pair.player2.name].sort().join(','));
      expect(pairNames).toContain('E,F');
      expect(pairNames).not.toContain('A,B');
      expect(result.flatMap(pair => [pair.player1.name, pair.player2.name]).sort())
        .toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    });

    it('leaves an unsatisfiable pairing alone instead of dropping players', () => {
      // Force C+D in a 4-player pool leaves A and B with nobody else to pair with —
      // the nemesis constraint is impossible to honour, so keep a complete round.
      component['forceMatchTeamate'] = [{ player1: 'C', player2: 'D' }];
      component['nemesisTeamate'] = [{ player1: 'A', player2: 'B' }];
      const players = ['A', 'C', 'D', 'B'].map(name => makeRankedPlayer(name, 3));
      const result = component['shuffleMixed'](players);

      expect(result.length).toBe(2);
      expect(result.flatMap(pair => [pair.player1.name, pair.player2.name]).sort())
        .toEqual(['A', 'B', 'C', 'D']);
    });
  });

  xit('should test calculateTeamates with spy calculateTeamatesPoint', () => {
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
      spyOn(component as any, 'calculateTeamatesGetSortedPlayerLeastWin').and.returnValue(mockRemainingPlayers);

      const mockRandomValues = [1, 0, 1, 0];
      (component as any).calculateTeamatesPoint = jasmine.createSpy('calculateTeamatesPoint')
      .and.returnValues(...mockRandomValues);

      const rankingPlayersMap = (component as any)['calculateRankingPlayers'](input);
      const result = (component as any)['calculateTeamates'](input, rankingPlayersMap);
      console.log(result);

      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith(NewPlayer('ball', 1, ['nice']), NewPlayer('win', 1, ['gato']), jasmine.any(Map));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith(NewPlayer('ball', 1, ['nice']), NewPlayer('nice', 1, ['ball']), jasmine.any(Map));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith(NewPlayer('ball', 1, ['nice']), NewPlayer('gato', 1, ['win']), jasmine.any(Map));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledWith(NewPlayer('ball', 1, ['nice']), NewPlayer('win', 1, ['gato']), jasmine.any(Map));
      expect((component as any).calculateTeamatesPoint).toHaveBeenCalledTimes(4)
    
    
      // The sort function behavior with Math.random can be complex to predict
      // We're mainly checking the function doesn't crash with equal points
    } finally {
    }
  });

});
