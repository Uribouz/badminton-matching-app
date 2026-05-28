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

Supabase tables: `events`, `players`, `matches`, `settings`. Events are keyed by `root-event:<locale date string>` (see `Constants.eventIdPrefix`).

### Core Data Models

**`Player`** (`src/app/players/player.ts`)
- `totalRoundsPlayed` — used by the priority sort (who has played least)
- `actualTotalRoundsPlayed` — used for bill splitting and win-rate calculation
- `teamateHistory: string[]` — ordered log of every teammate ever; recency matters (`lastIndexOf`)
- `roundsWaited` — incremented each round a non-break player sits out; reset on break
- `status` — `'ready' | 'break' | 'selected'`

**`Match`** (`src/app/matches/match.ts`) — represents one court with two teams of two.

### Shuffle Algorithm (`MatchListComponent.shufflePlayersIntoCourt`)

This is the most complex piece. At a high level:

1. **Filter eligible players**: exclude those currently playing and those on `break`.
2. **Priority sort**: sort by `totalRoundsPlayed` ascending (fewest games first). Players with `status = 'selected'` get priority point `-1` (always first).
3. **Slot capping**: limit selected players to fill only available court slots (multiples of 4).
4. **Force-teammate injection**: if a forced pair spans the slot boundary, pull both into the eligible window.
5. **Retry loop** (up to 30 retries): generate teammate pairs, validate them, retry with loosening tolerance (`offsetValidatePlayers = ceil((retry+1)/3)`) until valid.
   - **Teammate pairing** (`calculateTeamates`): sorts players by win-rate ascending (weakest first), then greedily picks the best partner using `calculateTeamatesPoint`.
   - **Teammate point** (`calculateTeamatesPoint`): nemesis pairs → `9999` (forbidden); force pairs → `-1` (preferred); otherwise `historyPenalty * rankingSize` (prefer partners not played with recently). For bottom-25% ranked players, ranking balance takes precedence over history.
   - **Validity check** (`isAllTeamatesValid`): rejects if any pair has played together too recently relative to total players available.
6. **Court assignment** (`calculateMatchInCourts`): pairs teammate-pairs into opposing teams by minimising win-rate differential; breaks ties by opponent history (prefer facing new opponents).
7. Uses `XorShift` (`src/app/shared/random/xorshift.ts`) for reproducible random tiebreaking within a session.

### Bill Component

`BillComponent` is a standalone component embedded inside `MatchListComponent`. It receives the player list as an `input()` signal and calculates each player's share as `totalCost × (player.actualTotalRoundsPlayed / totalGamesAcrossAllPlayers)`.

### Guest Mode

`GuestService` queries Supabase directly (read-only, no auth required due to Supabase RLS policy). Guests see a list of past events and can browse match history and active courts for any event without logging in.
