# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (generates environment.ts from .env, then opens browser)
npm run start

# Production build (generates environment.prod.ts, builds, writes Netlify _redirects)
npm run build         # Unix/Mac
npm run build_window  # Windows

# Run all tests (Karma/Jasmine in Chrome)
npm test

# Run a single test file
npx ng test --include='src/app/matches/match.service.spec.ts'
```

## Environment Setup

Before running, create a `.env` file in the project root:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
API_URL=...
```

`scripts/set-env.js` reads this file and auto-generates `src/environments/environment.ts` (dev) or `src/environments/environment.prod.ts` (prod). Never edit `environment.ts` manually — it is overwritten on every start/build.

## Architecture

**Angular 17 standalone components** — no NgModules. All components use `standalone: true` and declare their own imports.

### Routes and Pages

| Route | Component | Auth |
|---|---|---|
| `/player-list` | `PlayerListComponent` | required |
| `/match-list` | `MatchListComponent` | required |
| `/settings` | `SettingComponent` | required |
| `/login` | `LoginComponent` | public |
| `/guest` | `GuestEventListComponent` | public |
| `/guest/event/:eventKey/matches` | `GuestMatchViewComponent` | public |

`authGuard` checks for a live Supabase session and redirects to `/login` if absent.

### State: localStorage + Supabase dual-write

All mutable state is stored in **localStorage** as the primary store and written through to Supabase as a secondary sync. Services read from localStorage on load and call Supabase upserts on save. There is no reactive stream — components hold local copies of Maps/arrays and re-assign them after service calls.

localStorage keys:
- `player-list` — `Map<string, Player>` (serialized as entries array)
- `previous-player-list` — players from past sessions for quick re-add
- `players-status` — `Status` (min/max rounds played)
- `match-list` — current active courts (`Match[]`)
- `match-history` — completed matches (`Match[]`)
- `force-teamates` — forced partner pairs (`{player1, player2}[]`)
- `nemesis-teamates` — pairs that must never be teammates
- `shuffle-mode` — `'balanced' | 'mixed' | 'novel' | 'auto'`, selected shuffle strategy
- `shuffle-mode-weights` — `{balanced, mixed, novel}` percentages used to roll a mode when `shuffle-mode = 'auto'` (default `{balanced: 60, mixed: 30, novel: 10}`)

Supabase tables: `events`, `players`, `matches`, `settings`. Events are keyed by `root-event:<locale date string>` (see `Constants.eventIdPrefix`).

### Core Data Models

**`Player`** (`src/app/players/player.ts`)
- `rank` — manually-set skill rank, `1` (strongest) – `10` (weakest), default `5`. Set on the player list, persisted to Supabase, and used by the shuffle algorithm's `effectiveRank`.
- `totalRoundsPlayed` — used by the priority sort (who has played least)
- `actualTotalRoundsPlayed` — used for bill splitting and win-rate calculation
- `teamateHistory: string[]` — ordered log of every teammate ever; recency matters (`lastIndexOf`)
- `roundsWaited` — incremented each round a non-break player sits out; reset on break
- `roundsWon` / `lastWonMatch` — win count and a `courtNo:timestamp` dedup guard for toggling match results
- `status` — `'ready' | 'break' | 'selected'`

**`Match`** (`src/app/matches/match.ts`) — represents one court with two teams of two (`teamA`/`teamB`, each a `Teammate` of `player1`/`player2`).
- `status` — `'available' | 'playing' | 'done'`
- `mode` — the shuffle mode (`'balanced' | 'mixed' | 'novel'`) that produced this court's pairing, shown in the UI

### Shuffle Algorithm (`MatchListComponent.shufflePlayersIntoCourt`)

This is the most complex piece. Pipeline:

1. **Filter eligible players** (`getAvailablePlayerList`): exclude players currently `playing` and those on `break`.
2. **Available slots** (`getTotalAvailableSlotsInCourts`): `PLAYERS_PER_COURT` (4) × number of `available` courts.
3. **Priority sort** (`getSortedPlayerList` / `calculatePlayerPriorityPoint`): sort by `totalRoundsPlayed` ascending (fewest games first); `status = 'selected'` players get priority `-1` (always first). Ties are broken by a pre-assigned random value (`sortByPoint`, stable per shuffle).
4. **Slot capping** (`recalculateTotalAvailableSlots`): cap to `floor(eligibleCount / 4) * 4`.
5. **Eligible window + force-pair injection** (`getAvailablePlayers`): take the top N players; if one half of a force-teammate pair falls outside the window, swap both into the window.
6. **Resolve mode** (`resolveMode`): reads `SettingService.loadShuffleMode()`. If `'auto'`, rolls `rng.random() * 100` against `loadShuffleModeWeights()` to pick `'balanced'`, `'mixed'`, or `'novel'`.
7. **Generate teammate pairs** — dispatches to one of three strategies (below), each returning `Teammate[]`. `'balanced'` falls back to `'novel'` if it can't form valid quads.
8. **Court pairing** (`calculateMatchInCourtsRankBased`): greedily pairs teammate-pairs into courts by closest combined `rank`; ties broken by win-rate similarity, then by opponent-history freshness (`calculateOppositePlayerPoint`).
9. **Write results** (`putPlayerIntoCourts`): fills `available` courts and stamps `match.mode` with the resolved mode.

Uses `XorShift` (`src/app/shared/random/xorshift.ts`) for reproducible random tiebreaking within a session.

#### Effective rank (`effectiveRank`)
Lower = stronger: `rank * 1000 - winRate * 2000`, where `winRate = (roundsWon + 1) / (actualTotalRoundsPlayed + 2)` (Laplace-smoothed). A high-win-rate player can shift up to 2 full rank tiers above their manually-set `rank`.

#### Mode A — Balanced (`shuffleBalanced` / `formQuadPairs`)
Sort all eligible players by `effectiveRank`, split into quads using interleaved positions (sorted index `i` → quad `i % numQuads`) so each quad spans the full skill range. Within each quad of 4:
- If a force pair exists inside the quad, pair them and the remaining two together (unless that violates nemesis — returns `null`, the whole shuffle then falls back to **Novel**).
- Otherwise try 3 split options (`[0,3]v[1,2]`, `[0,2]v[1,3]`, `[0,1]v[2,3]`, in descending balance) through 5 progressively-relaxed passes: rank-diff ≤3 + no nemesis + no recent repeat → ... → nemesis-only check.

#### Mode B — Mixed (`shuffleMixed`)
Lock force pairs first (`lockForcePairs`), sort the rest by `effectiveRank`, then pair strongest with weakest (`remaining[0]` with `remaining[last]`, working inward).

#### Mode C — Novel (`shuffleNovel`)
10 attempts, each greedily picking partners by lowest `noveltyScore` (penalizes recent teammate pairings scaled by pool size, plus recent-opponent overlap). The recency `offset` relaxes every 3 attempts (`ceil((attempt+1)/3)`, capped at 4). Keeps the attempt with the lowest total score. Force pairs are locked first; nemesis pairs are hard-excluded.

#### Constraint helpers
- `isRecentTeammatePair(a, b, totalPlayers, offset)` — true if `a.totalRoundsPlayed - lastTeammateIndex < max(1, totalPlayers - offset)`.
- `isNemesisPair` — checked via a `player1:player2` / `player2:player1` set; nemesis pairs are always excluded, never just penalized.
- Force-teammate pairs are honored whenever both players are in the eligible window.

### Settings (`SettingComponent` / `SettingService`)
- Shuffle mode picker (`balanced` / `mixed` / `novel` / `auto`) plus, when `auto`, sliders for `balanced`/`novel` weights (`mixed` is the remainder, always summing to 100).
- Force-teammate and nemesis-teammate pair management, picked from the current player list.
- "Clear all data" wipes players, matches, and force/nemesis settings from localStorage (and re-syncs the empty state to Supabase).

### Bill Component

`BillComponent` is a standalone component embedded inside `MatchListComponent`. It receives the player list as an `input()` signal and calculates each player's share as `totalCost × (player.actualTotalRoundsPlayed / totalGamesAcrossAllPlayers)`. `shareScreenshot()` renders the bill section to a PNG via `html2canvas` and shares it (with a text summary) through the Web Share API, falling back to clipboard-copy of the text summary.

### Guest Mode

`GuestService` queries Supabase directly (read-only, no auth required due to Supabase RLS policy). Guests see a list of past events (`GuestEventListComponent`) and, per event (`GuestMatchViewComponent`), the active courts, full match history, and a player list with win percentages — all without logging in.
