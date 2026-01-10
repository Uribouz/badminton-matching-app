# Match List Component Documentation

> **Component**: `MatchListComponent`
> **File**: `src/app/matches/match-list/match-list.component.ts`
> **Type**: Angular Standalone Component
> **Purpose**: Core component for managing badminton court assignments, player shuffling, match tracking, and game history

---

## Table of Contents

- [Overview](#overview)
- [Constants & Enumerations](#constants--enumerations)
- [Component Properties](#component-properties)
- [Constructor](#constructor)
- [Public Methods](#public-methods)
- [Private Methods](#private-methods)
- [Algorithm Details](#algorithm-details)

---

## Overview

The `MatchListComponent` is the central orchestrator for a badminton matching application. It handles:

- **Court Management**: Adding, removing, and managing multiple badminton courts
- **Player Assignment**: Intelligent shuffling algorithm to fairly distribute players to courts
- **Match Tracking**: Recording match history, opponent tracking, and win/loss statistics
- **Status Management**: Tracking player availability (ready, break, selected)
- **Team Formation**: Advanced teammate pairing algorithm based on match history and skill ranking
- **Win Tracking**: Recording winning teams and updating player statistics
- **Logging**: Comprehensive debug logging with downloadable log files

---

## Constants & Enumerations

### `COURT_STATUS` Enum

Defines the possible states of a badminton court.

| Value | Description |
|-------|-------------|
| `AVAILABLE` | Court is free and ready for player assignment |
| `PLAYING` | Court has an active match in progress |

### `PLAYER_STATUS` Enum

Defines the possible states of a player.

| Value | Description |
|-------|-------------|
| `READY` | Player is available and ready to play |
| `BREAK` | Player is taking a break and won't be assigned |
| `SELECTED` | Player is manually selected for priority assignment |

### Constants

```typescript
PLAYERS_PER_COURT = 4      // Number of players needed for one court (2v2)
TEAMS_PER_COURT = 2        // Number of teams per court
DEFAULT_TOTAL_COURT = 2    // Default number of courts to initialize
DEFAULT_PLAYER_POINT = 0.5 // Default ranking point for new players
```

---

## Component Properties

### Core Data Structures

| Property | Type | Description |
|----------|------|-------------|
| `status` | `Status` | Global status object for player state tracking |
| `matchList` | `Match[]` | Array of all courts and their current matches |
| `matchHistory` | `Match[]` | Historical record of all completed matches |
| `standbyList` | `Player[]` | Players currently waiting (not on a court) |
| `playersMap` | `Map<string, Player>` | Master registry of all players indexed by name |
| `playersOpponents` | `Map<string, string[]>` | Tracks opponent history for each player |
| `logData` | `String[]` | Array of log messages for debugging |

### Services & Utilities

| Property | Type | Description |
|----------|------|-------------|
| `playerService` | `PlayerService` | Service for player data persistence |
| `matchService` | `MatchService` | Service for match data persistence |
| `settingService` | `SettingService` | Service for loading application settings |
| `rng` | `XorShift` | Pseudo-random number generator for shuffling |

### Configuration

| Property | Type | Description |
|----------|------|-------------|
| `totalCourt` | `number` | Total number of courts available |
| `forceMatchTeamate` | `{player1:string, player2:string}[]` | Pairs of players who should be prioritized as teammates |
| `nemesisTeamate` | `{player1:string, player2:string}[]` | Pairs of players who should never be teammates |

---

## Constructor

### `constructor(playerService: PlayerService, matchService: MatchService)`

**Purpose**: Initializes the component by loading all persisted data and setting up initial state.

**Location**: `src/app/matches/match-list/match-list.component.ts:48`

**Parameters**:
- `playerService`: Service for player data operations
- `matchService`: Service for match data operations

**Initialization Flow**:
1. Loads player list from storage into `playersMap`
2. Loads match history from storage
3. Loads player opponent history
4. Loads current match list (courts)
5. If no courts exist, creates default number of courts
6. Reloads standby list to reflect current court assignments
7. Loads player status information
8. Initializes random number generator
9. Loads force teammate and nemesis teammate settings
10. Logs all initialization data for debugging

---

## Public Methods

### Player List Management

#### `addPlayerList(newPlayers: string): void`

**Purpose**: Adds new players to the game session.

**Location**: `src/app/matches/match-list/match-list.component.ts:77`

**Parameters**:
- `newPlayers`: String containing player names to add

**Flow**:
1. Gets the current least played count from status
2. Calls `playerService.addPlayerList()` to process and add new players
3. Updates the `playersMap` with new players
4. Reloads standby list to include new players

**Usage**: Called from template when user adds players via input field.

---

### UI Helper Methods

#### `getPlayerList(): Player[]`

**Purpose**: Converts the players Map to an array for template iteration.

**Location**: `src/app/matches/match-list/match-list.component.ts:88`

**Returns**: Array of all `Player` objects

**Usage**: Used in template with `*ngFor` to display player list.

---

#### `getMatchTime(match: Match): String`

**Purpose**: Formats a match's timestamp as a readable time string.

**Location**: `src/app/matches/match-list/match-list.component.ts:91`

**Parameters**:
- `match`: Match object containing timestamp

**Returns**: Localized time string (e.g., "2:30:45 PM")

**Implementation**: Converts `match.matchTime` Date object to locale-specific time format.

---

#### `getOpponentHistory(): {name: string, opponents: string[]}[]`

**Purpose**: Transforms the opponents Map into an array structure for template display.

**Location**: `src/app/matches/match-list/match-list.component.ts:94`

**Returns**: Array of objects containing player name and their opponent history

**Usage**: Displays who each player has faced in previous matches.

---

### Court Management

#### `addCourt(): void`

**Purpose**: Creates a new badminton court and adds it to the match list.

**Location**: `src/app/matches/match-list/match-list.component.ts:99`

**Flow**:
1. Creates new `Match` object
2. Sets court number based on current match list length + 1
3. Clears/initializes the court with empty players
4. Adds court to `matchList`
5. Persists updated match list to storage

**Usage**: Called when user clicks "Add Court" button.

---

#### `deleteCourt(matchIdx: number): void`

**Purpose**: Removes a court from the match list.

**Location**: `src/app/matches/match-list/match-list.component.ts:106`

**Parameters**:
- `matchIdx`: Index of the court to delete in `matchList` array

**Flow**:
1. Removes court from `matchList` using `splice()`
2. Logs the deleted court for debugging
3. Saves updated match list
4. Reloads standby list (removed court's players return to standby)

**Usage**: Called when user clicks delete button on a court.

---

#### `confirmCourts(): void`

**Purpose**: Confirms all courts, starting matches and updating player statistics.

**Location**: `src/app/matches/match-list/match-list.component.ts:112`

**Flow**:
1. Logs start of confirmation process
2. Iterates through each court calling `confirmCourt()`
3. Updates waiting players' wait counters via `confirmPlayersWait()`
4. Revalidates player status to ensure consistency
5. Saves updated match list
6. Logs completion

**Usage**: Called when user clicks "Confirm Courts" button to lock in all matches.

**Side Effects**:
- Changes court status from AVAILABLE to PLAYING
- Increments player `totalRoundsPlayed` counters
- Updates player `roundsWaited` counters
- Records match to history
- Updates opponent tracking

---

#### `freeCourt(currentCourt: Match): void`

**Purpose**: Frees a court after a match is complete, making it available for new players.

**Location**: `src/app/matches/match-list/match-list.component.ts:126`

**Parameters**:
- `currentCourt`: The court to be freed

**Flow**:
1. Validates that a winning team has been selected (prevents freeing without result)
2. If no winner selected, logs error and returns
3. Sets court status to AVAILABLE
4. Clears all players from the court
5. Saves updated match list
6. Reloads standby list (freed players return to waiting)

**Validation**: Cannot free a court unless `whoWon` is set (a team must be selected as winner first).

**Usage**: Called after match completion and winner selection.

---

#### `swapTeamates(match: Match): void`

**Purpose**: Swaps players between teams on a court.

**Location**: `src/app/matches/match-list/match-list.component.ts:140`

**Parameters**:
- `match`: The court/match to modify

**Flow**:
1. Checks if court is already playing (cannot swap during active match)
2. Performs rotation: TeamA.player2 ↔ TeamB.player1, TeamB.player2 → TeamA.player2
3. Visual effect: Reorganizes the teams while keeping player1 positions stable

**Pattern**:
```
Before: [A1, A2] vs [B1, B2]
After:  [A1, B2] vs [B1, A2]
```

**Usage**: Allows manual adjustment of team composition before confirming.

---

### Player Management

#### `changePlayerStatus(name: string): void`

**Purpose**: Cycles a player through the three status states (ready → break → selected → ready).

**Location**: `src/app/matches/match-list/match-list.component.ts:149`

**Parameters**:
- `name`: Name of the player whose status should change

**Flow**:
1. Retrieves player from `playersMap`
2. If not found, logs error and returns
3. Cycles status:
   - READY → BREAK (player taking a break)
   - BREAK → SELECTED (manually prioritize player)
   - SELECTED → READY (return to normal status)
4. Updates player in map and persists to storage
5. Logs status change

**Usage**: Called when user clicks on a player to toggle their status.

**Status Meanings**:
- **READY**: Normal state, eligible for assignment
- **BREAK**: Player won't be assigned to courts
- **SELECTED**: Player gets priority in next shuffle

---

### Shuffle Logic

#### `shufflePlayersIntoCourt(): void`

**Purpose**: Intelligently assigns available players to courts using a sophisticated matching algorithm.

**Location**: `src/app/matches/match-list/match-list.component.ts:172`

**Algorithm Overview**:
This is the most complex method in the component. It uses a multi-retry system with validation to ensure fair and optimal player assignments.

**Flow**:

1. **Initialization**
   - Sets max retries to 10
   - Gets list of available players (not in break, not currently playing)
   - Calculates total available slots in courts

2. **Retry Loop** (up to 10 attempts)
   - **Step 1**: Sort players by priority
     - Priority based on `totalRoundsPlayed` (players who played less get priority)
     - Players with SELECTED status get highest priority (-1)

   - **Step 2**: Recalculate available slots
     - Ensures we don't try to assign more players than can fit
     - Rounds down to multiples of 4 (PLAYERS_PER_COURT)

   - **Step 3**: Get available players
     - Handles force teammate rules (if both are available, prioritize them)

   - **Step 4**: Calculate player rankings
     - Ranks players by win percentage (roundsWon / actualTotalRoundsPlayed)

   - **Step 5**: Calculate teammate pairings
     - Uses `calculateTeamates()` algorithm (see detailed explanation below)

   - **Step 6**: Validate teammate pairings
     - Uses `isAllTeamatesValid()` to check if pairings are acceptable
     - If valid, break retry loop
     - If invalid, retry with different randomization

3. **Match Creation**
   - Pairs teams against each other using `calculateMatchInCourts()`
   - Considers opponent history to avoid repetitive matchups

4. **Court Assignment**
   - Places matched teams into available courts
   - Reloads standby list
   - Logs results

**Validation Criteria** (why a shuffle might retry):
- Nemesis teammates were paired together (forbidden pairs)
- Players were paired too recently relative to total available players
- Force teammates weren't paired when both available

**Usage**: Called when user clicks "Shuffle" button.

---

### Win Tracking

#### `onClickConfirmWinningTeam(match: Match, whichTeam: string): void`

**Purpose**: Records the winning team of a match and updates player win statistics.

**Location**: `src/app/matches/match-list/match-list.component.ts:217`

**Parameters**:
- `match`: The match where a team won
- `whichTeam`: Either "teamA" or "teamB"

**Flow**:

1. **Validation**
   - Checks if match is in PLAYING status
   - Returns if not playing (prevents duplicate confirmations)

2. **Match Identification**
   - Creates unique match ID: `courtNo:timestamp`
   - Sets `whoWon` field on match

3. **Winner Processing**
   - Retrieves both winning team players from `playersMap`
   - Validates both players exist
   - For each winner:
     - Checks if they haven't already been credited for this match (via `lastWonMatch`)
     - Increments `roundsWon` counter
     - Updates `lastWonMatch` to current match ID
     - Saves to `playersMap`

4. **Loser Processing**
   - Retrieves both losing team players
   - For each loser:
     - If they were previously marked as winner of this match (user changed mind)
     - Decrements their `roundsWon` counter
     - Clears their `lastWonMatch` field

5. **Persistence**
   - Saves updated player list
   - Saves updated match list

**Idempotency**: Uses `lastWonMatch` field to prevent double-counting if method called multiple times.

**Usage**: Called when user clicks on a team to mark them as winner.

---

### Utility Methods

#### `downloadLog(): void`

**Purpose**: Downloads all debug logs as a text file for troubleshooting.

**Location**: `src/app/matches/match-list/match-list.component.ts:279`

**Flow**:
1. Joins all log entries with newlines
2. Creates a Blob object with text/plain MIME type
3. Generates a temporary URL for the blob
4. Creates a hidden anchor element with download attribute
5. Programmatically clicks the link to trigger download
6. Cleans up the temporary URL

**File Name**: `badminton-debug.log`

**Usage**: Called when user wants to export logs for debugging or reporting issues.

---

## Private Methods

### Standby List Management

#### `private reloadStandbyList(): void`

**Purpose**: Recalculates which players are currently waiting (not assigned to any court).

**Location**: `src/app/matches/match-list/match-list.component.ts:296`

**Flow**:
1. Extracts all player names currently on courts (all teams, all courts)
2. Filters `playersMap` to exclude those players
3. Updates `standbyList` property with filtered results
4. Logs the updated standby list

**Called By**:
- `constructor()` (initialization)
- `addPlayerList()` (after adding new players)
- `deleteCourt()` (after removing a court)
- `freeCourt()` (after freeing a court)
- `shufflePlayersIntoCourt()` (after shuffling)

---

### Court Operations

#### `private clearCourt(currentCourt: Match): void`

**Purpose**: Resets a court to its empty, available state.

**Location**: `src/app/matches/match-list/match-list.component.ts:312`

**Parameters**:
- `currentCourt`: Court object to clear

**Actions**:
- Sets status to "available"
- Replaces all player slots with empty `Player('')` objects
- Clears `whoWon` field

**Usage**: Called by `addCourt()` and `freeCourt()`.

---

### Confirm Court Operations

#### `private confirmCourt(court: Match): void`

**Purpose**: Finalizes a court assignment, starting the match and recording statistics.

**Location**: `src/app/matches/match-list/match-list.component.ts:322`

**Parameters**:
- `court`: The court to confirm

**Flow**:

1. **Status Check**
   - If already PLAYING, return (already confirmed)

2. **Validation**
   - Checks all 4 player slots are filled
   - If any empty, logs error and returns

3. **Match Start**
   - Sets `matchTime` to current timestamp
   - Changes status to PLAYING

4. **Player Updates**
   - Collects all 4 player names
   - Calls `confirmPlayersPlay()` to update play counters
   - Calls `confirmPlayersInCourt()` to update teammate history

5. **History Recording**
   - Adds match to `matchHistory`
   - Updates `playersOpponents` tracking

**Side Effects**: Updates multiple player statistics and persists match data.

---

#### `private confirmPlayersWait(): void`

**Purpose**: Increments wait counters for players not currently playing.

**Location**: `src/app/matches/match-list/match-list.component.ts:354`

**Flow**:

1. **Identify Playing Players**
   - Extracts names from all courts with PLAYING status

2. **Identify Standby Players**
   - Filters all players to exclude those currently playing

3. **Update Wait Counters**
   - For each standby player:
     - If status is BREAK, reset `roundsWaited` to 0
     - Otherwise, increment `roundsWaited` by 1

4. **Persistence**
   - Saves updated player list
   - Logs wait statistics

**Purpose of Wait Tracking**: Could be used for priority calculation or display purposes (showing how long players have been waiting).

---

#### `private confirmPlayersPlay(playerMap: Map<string, Player>, names: string[]): Map<string, Player>`

**Purpose**: Updates play counters for players who are starting a match.

**Location**: `src/app/matches/match-list/match-list.component.ts:383`

**Parameters**:
- `playerMap`: The players map to update
- `names`: Array of player names starting a match

**Returns**: Updated players map

**Actions for Each Player**:
- Increments `totalRoundsPlayed`
- Increments `actualTotalRoundsPlayed`
- Sets status to READY
- Persists to storage

**Note**: Both counters are incremented, suggesting they track different things (possibly resets vs. lifetime stats).

---

#### `private confirmPlayersInCourt(playerMap: Map<string, Player>, court: Match): Map<string, Player>`

**Purpose**: Records teammate pairings for both teams in a court.

**Location**: `src/app/matches/match-list/match-list.component.ts:401`

**Parameters**:
- `playerMap`: Players map to update
- `court`: The court with team assignments

**Returns**: Updated players map

**Flow**:
1. Calls `confirmPlayersTeamate()` for Team A
2. Calls `confirmPlayersTeamate()` for Team B
3. Saves and returns updated map

---

#### `private confirmPlayersTeamate(playerMap: Map<string, Player>, team: Teammate): Map<string, Player>`

**Purpose**: Records a teammate pairing for both players.

**Location**: `src/app/matches/match-list/match-list.component.ts:410`

**Parameters**:
- `playerMap`: Players map to update
- `team`: The teammate pair to record

**Returns**: Updated players map

**Flow**:
1. Records player2 in player1's `teamateHistory`
2. Records player1 in player2's `teamateHistory`
3. Uses `confirmEachPlayerTeamate()` for bidirectional recording

---

#### `private confirmEachPlayerTeamate(playerMap: Map<string, Player>, playerName1: string, playerName2: string): Map<string, Player>`

**Purpose**: Appends a teammate to a player's history array.

**Location**: `src/app/matches/match-list/match-list.component.ts:427`

**Parameters**:
- `playerMap`: Players map to update
- `playerName1`: Player whose history to update
- `playerName2`: Teammate to add to history

**Returns**: Updated players map

**Implementation**: Pushes `playerName2` onto `player1.teamateHistory` array.

---

### Shuffle Algorithm - Helper Methods

#### `private getAvailablePlayerList(): Player[]`

**Purpose**: Gets all players eligible for shuffling (not playing, not on break).

**Location**: `src/app/matches/match-list/match-list.component.ts:443`

**Returns**: Array of available `Player` objects

**Filter Criteria**:
1. **Not Currently Playing**: Excludes players on courts with PLAYING status
2. **Not On Break**: Excludes players with status === PLAYER_STATUS.BREAK

**Logs**: Initial player list with names and statuses

---

#### `private getTotalAvailableSlotsInCourts(): number`

**Purpose**: Calculates how many player positions are open across all courts.

**Location**: `src/app/matches/match-list/match-list.component.ts:463`

**Returns**: Total number of available slots (multiple of 4)

**Logic**: Counts all courts with status === AVAILABLE and multiplies by PLAYERS_PER_COURT (4).

---

#### `private getSortedPlayerList(availablePlayerList: Player[]): Player[]`

**Purpose**: Sorts players by priority for court assignment.

**Location**: `src/app/matches/match-list/match-list.component.ts:473`

**Parameters**:
- `availablePlayerList`: Players to sort

**Returns**: Sorted array (lowest priority first)

**Sorting Logic**:
1. Calculates priority point for each player via `calculatePlayerPriorityPoint()`
2. If points are equal, uses random tie-breaker
3. Sorts ascending (lowest points = highest priority)

**Logs**: Each player's name, priority point, and total rounds played

---

#### `private calculatePlayerPriorityPoint(player: Player): number`

**Purpose**: Calculates a numerical priority score for player assignment.

**Location**: `src/app/matches/match-list/match-list.component.ts:492`

**Parameters**:
- `player`: Player to evaluate

**Returns**: Priority score (lower = higher priority)

**Logic**:
- SELECTED status: Returns -1 (highest priority)
- Otherwise: Returns `totalRoundsPlayed * 1` (players with fewer rounds get priority)

**Constants Used**:
- `multiplier_rounds_played = 1`: Could be adjusted to change priority weighting

---

#### `private recalculateTotalAvailableSlots(currentTotalAvailableSlot: number, sortedPlayerListLength: number): number`

**Purpose**: Ensures we don't try to assign more players than available (must be multiple of 4).

**Location**: `src/app/matches/match-list/match-list.component.ts:499`

**Parameters**:
- `currentTotalAvailableSlot`: Current calculated slots
- `sortedPlayerListLength`: Number of available players

**Returns**: Adjusted slot count

**Logic**:
- Calculates max players that can be assigned: `floor(playerCount / 4) * 4`
- If current slots exceed this, reduces to max possible
- Ensures we can form complete 4-player court assignments

---

#### `private getAvailablePlayers(players: Player[], totalAvailableSlots: number): Player[]`

**Purpose**: Selects which players will be assigned, handling force teammate rules.

**Location**: `src/app/matches/match-list/match-list.component.ts:507`

**Parameters**:
- `players`: Sorted player list
- `totalAvailableSlots`: How many slots to fill

**Returns**: Final list of players to assign (length = totalAvailableSlots)

**Force Teammate Logic**:
1. Checks each force teammate pair
2. If one is in top slots but other isn't:
   - Removes both from list
   - Adds both to front of list
   - This ensures both get assigned together
3. Returns slice of first `totalAvailableSlots` players

**Edge Cases**:
- Handles cases where one force teammate would be assigned but not the other
- Only applies if at least one is in range

---

#### `private calculateTeamates(players: Player[], rankingPlayersMap: Map<string, number>): Teammate[]`

**Purpose**: Pairs up players into teams of 2 based on ranking and history.

**Location**: `src/app/matches/match-list/match-list.component.ts:529`

**Parameters**:
- `players`: List of players to pair
- `rankingPlayersMap`: Map of player names to their skill ranking

**Returns**: Array of `Teammate` pairs

**Algorithm**:

1. **Sort by Win Rate**
   - Uses `calculateTeamatesGetSortedPlayerLeastWin()` to sort players
   - Considers force teammates (priority -1)
   - Considers nemesis teammates (priority 0.5)
   - Otherwise uses win percentage

2. **Pairing Loop**
   - Takes first player (lowest win rate)
   - Sorts remaining players by compatibility using `calculateTeamatesPoint()`
   - Pairs with most compatible player
   - Removes both from remaining players
   - Repeats until all paired

3. **Compatibility Factors** (see `calculateTeamatesPoint()`)

**Goal**: Pairs weak with strong players while avoiding recent repeats.

---

#### `private calculateRankingPlayers(playerList: Player[]): Map<string, number>`

**Purpose**: Creates a ranking index for all players based on win percentage.

**Location**: `src/app/matches/match-list/match-list.component.ts:559`

**Parameters**:
- `playerList`: Players to rank

**Returns**: Map of player name → ranking index (0 = best player)

**Ranking Logic**:
1. Calculates win percentage: `roundsWon / actualTotalRoundsPlayed`
2. Sorts ascending (lowest win percentage first)
3. Maps to index positions (0 = worst player, n-1 = best player)

**Usage**: Used in teammate calculation to balance teams.

---

#### `private calculateRankingPlayerPoints(roundsWon: number, actualTotalRoundsPlayed: number): number`

**Purpose**: Calculates win percentage for a player.

**Location**: `src/app/matches/match-list/match-list.component.ts:570`

**Parameters**:
- `roundsWon`: Number of games won
- `actualTotalRoundsPlayed`: Total games played

**Returns**: Win percentage (0.0 to 1.0), or DEFAULT_PLAYER_POINT (0.5) if no games played

**Formula**: `roundsWon / actualTotalRoundsPlayed`

**Edge Case**: Returns 0.5 if never played (assumed average)

---

#### `private calculateTeamatesGetSortedPlayerLeastWin(playerList: Player[]): Player[]`

**Purpose**: Sorts players for teammate pairing with special handling for force/nemesis rules.

**Location**: `src/app/matches/match-list/match-list.component.ts:574`

**Parameters**:
- `playerList`: Players to sort

**Returns**: Sorted player array

**Sorting Logic**:

1. **Build Maps**
   - `mapNemesisPlayers`: Players who shouldn't be paired together
   - `mapForceMatchPlayers`: Players who should be paired together

2. **Assign Priorities**
   - **Nemesis players** (if their nemesis is in list): Priority = 0.5
   - **Force match players** (if their partner is in list): Priority = -1 (highest)
   - **Normal players**: Priority = win percentage

3. **Sort**
   - Sorts by priority ascending
   - Random tie-breaker for equal priorities

**Result**: Force match players first, then by win rate, then nemesis players.

---

#### `private getMapPlayers(playerTeamates: {player1:string, player2: string}[]): Map<string, string[]>`

**Purpose**: Converts array of player pairs into bidirectional lookup map.

**Location**: `src/app/matches/match-list/match-list.component.ts:609`

**Parameters**:
- `playerTeamates`: Array of player pair objects

**Returns**: Map where each player maps to array of their partners

**Example**:
```
Input:  [{player1: "Alice", player2: "Bob"}]
Output: Map {
  "Alice" => ["Bob"],
  "Bob" => ["Alice"]
}
```

**Usage**: Used for quick lookup of force teammates and nemesis teammates.

---

#### `private calculateTeamatesPoint(playerA: Player, playerB: Player, rankingPlayersMap: Map<string,number>): number`

**Purpose**: Calculates compatibility score between two potential teammates.

**Location**: `src/app/matches/match-list/match-list.component.ts:627`

**Parameters**:
- `playerA`: First player
- `playerB`: Second player
- `rankingPlayersMap`: Skill ranking map

**Returns**: Compatibility score (lower = better match)

**Scoring Logic** (in priority order):

1. **Nemesis Pair**: Return 9999 (worst possible score, avoid pairing)

2. **Force Pair**: Return -1 (best possible score, prioritize pairing)

3. **Skill Balancing**:
   - If playerA is in bottom 25% of rankings:
     - Score = `(size-1) - playerARanking - playerBRanking`
     - Effect: Pairs weak players with strong players

4. **History Check**:
   - If never paired before: Return 0 (good match)
   - If paired before: Return `lastIndexOf(playerB) + 1`
     - More recent pairings have higher scores (worse match)
     - Older pairings have lower scores (better match)

**Goal**: Balance skill levels and avoid repetitive pairings.

---

#### `private isAllTeamatesValid(retries: number, totalPlayersAvailable: number, teamatesList: Teammate[], rankingPlayersMap: Map<string, number>): boolean`

**Purpose**: Validates whether the generated teammate pairings are acceptable.

**Location**: `src/app/matches/match-list/match-list.component.ts:657`

**Parameters**:
- `retries`: Current retry attempt (affects tolerance)
- `totalPlayersAvailable`: Total players available for matching
- `teamatesList`: Proposed teammate pairings
- `rankingPlayersMap`: Skill ranking map

**Returns**: `true` if pairings are valid, `false` to trigger retry

**Validation Rules**:

1. **Nemesis Check**:
   - If any pair is in nemesis list: INVALID

2. **Skip Validations For**:
   - Pairs containing nemesis players (already checked)
   - Force match pairs (always valid)
   - Players with no teammate history (new players)

3. **Recency Check** (for normal pairs):
   - Skips top 25% ranked players (they can repeat more often)
   - For others, checks: `totalRoundsPlayed - lastPairingIndex < totalAvailable - offset`
   - `offset = ceil((retries + 1) / 3)` (tolerance increases with retries)
   - If condition true: INVALID (paired too recently)

**Effect of Retries**:
- Retry 0: offset = 1 (strict)
- Retry 3: offset = 2 (more lenient)
- Retry 6: offset = 3 (even more lenient)
- Retry 9: offset = 4 (most lenient)

**Purpose**: Ensures variety in pairings while allowing retries to relax constraints.

---

#### `private calculateMatchInCourts(teamateList: Teammate[]): {team1:Teammate, team2:Teammate}[]`

**Purpose**: Pairs up teams to play against each other.

**Location**: `src/app/matches/match-list/match-list.component.ts:699`

**Parameters**:
- `teamateList`: Array of 2-player teams

**Returns**: Array of court assignments (team vs team)

**Algorithm**:

1. **Iteration**:
   - Takes first team as current team
   - Considers all other teams as potential opponents

2. **Opponent Selection**:
   - Calculates combined opponent history score for each potential matchup
   - Score = sum of 4 opponent relationships (each player vs each opponent)
   - Uses `calculateOppositePlayerPoint()` for each relationship
   - Selects opponent with lowest score (least recent matchup)

3. **Pairing**:
   - Pairs current team with best opponent
   - Removes both from remaining teams
   - Repeats until all teams paired

**Goal**: Avoid repetitive opponent matchups.

---

#### `private calculateOppositePlayerPoint(playerA: string, playerB: string): number`

**Purpose**: Calculates recency score for two players as opponents.

**Location**: `src/app/matches/match-list/match-list.component.ts:717`

**Parameters**:
- `playerA`: First player name
- `playerB`: Second player name

**Returns**: Recency score (0 = never faced, higher = more recent)

**Logic**:
- If never faced: Return 0
- If faced before: Return `lastIndexOf(playerB) + 1`
  - More recent opponent = higher score
  - Older opponent = lower score

**Usage**: Used by `calculateMatchInCourts()` to minimize repeat matchups.

---

#### `private putPlayerIntoCourts(teamateList: {team1: Teammate; team2: Teammate;}[]): void`

**Purpose**: Assigns paired teams to actual court objects.

**Location**: `src/app/matches/match-list/match-list.component.ts:724`

**Parameters**:
- `teamateList`: Array of team matchups

**Flow**:
1. Iterates through `matchList` (courts)
2. Skips courts with PLAYING status
3. For each AVAILABLE court:
   - Assigns first team matchup from list
   - Sets teamA.player1 and teamA.player2
   - Sets teamB.player1 and teamB.player2
   - Removes matchup from list
4. Saves updated match list

**Termination**: Stops when either all courts filled or team matchups exhausted.

---

### Utility Methods

#### `private log(...args: any[]): void`

**Purpose**: Centralized logging with console output and in-memory storage.

**Location**: `src/app/matches/match-list/match-list.component.ts:740`

**Parameters**:
- `...args`: Variable number of arguments to log

**Actions**:
1. Outputs to console with timestamp
2. Converts objects to JSON strings
3. Appends formatted message to `logData` array

**Usage**: Called throughout component for debugging and audit trail.

---

## Algorithm Details

### Shuffle Algorithm Deep Dive

The `shufflePlayersIntoCourt()` method implements a sophisticated multi-constraint optimization algorithm:

**Constraints**:
1. Equal playing time (players with fewer rounds get priority)
2. Skill balancing (weak players paired with strong players)
3. Teammate variety (avoid recent repeats)
4. Opponent variety (avoid recent matchups)
5. Force teammates (specific pairs always together)
6. Nemesis teammates (specific pairs never together)
7. Manual selection (SELECTED status players get priority)

**Algorithm Phases**:

**Phase 1: Player Selection**
- Sort by rounds played (fairness)
- Handle force teammates (ensure both get selected together)
- Limit to available court capacity

**Phase 2: Ranking**
- Calculate win percentage for each player
- Create skill ranking (0 = weakest, n-1 = strongest)

**Phase 3: Teammate Pairing**
- Sort by priority (force teammates first, then by win rate, then nemesis)
- For weakest players: Pair with strongest available
- For others: Avoid recent teammates
- Respect force/nemesis rules

**Phase 4: Opponent Matching**
- Pair teams together
- Minimize recent opponent matchups
- Calculate combined recency score for all 4 players

**Phase 5: Validation**
- Check no nemesis pairs
- Check pairing recency constraints
- If invalid: Retry with different randomization
- Tolerance increases with retries

**Phase 6: Court Assignment**
- Place matched teams on available courts
- Update standby list

**Retry Mechanism**:
- Up to 10 attempts
- Each retry uses different random tie-breakers
- Constraints relax slightly with each retry
- Ensures algorithm can always find a solution

---

## Usage Example

```typescript
// User flow example:

// 1. Add players
component.addPlayerList("Alice, Bob, Carol, Dave, Eve, Frank");

// 2. Shuffle players into courts
component.shufflePlayersIntoCourt();
// → Players automatically assigned to courts based on algorithm

// 3. Manually adjust if needed
component.swapTeamates(component.matchList[0]);
// → Swaps team composition on court 0

// 4. Confirm all courts to start playing
component.confirmCourts();
// → All courts locked, matches start, timers recorded

// 5. Select winning team
component.onClickConfirmWinningTeam(component.matchList[0], 'teamA');
// → Team A marked as winner, stats updated

// 6. Free the court
component.freeCourt(component.matchList[0]);
// → Court becomes available, players return to standby

// 7. Download logs for debugging
component.downloadLog();
// → badminton-debug.log file downloads
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Initialization                 │
│  Constructor → Load Data → Create Courts → Reload Standby   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Player Management                        │
│  Add Players → Change Status → Update Maps → Persist         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Shuffle Algorithm                          │
│  Get Available → Rank Players → Pair Teammates →             │
│  Match Opponents → Validate → Assign to Courts               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Match Lifecycle                          │
│  Confirm Court → Play Match → Select Winner → Free Court     │
│  (Updates: rounds played, rounds won, teammate/opponent       │
│   history, rounds waited)                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

- **Map Lookups**: O(1) for player retrieval via `playersMap`
- **Shuffle Complexity**: O(n log n) sorting + O(n²) pairing validation
- **Retry Limit**: Maximum 10 retries prevents infinite loops
- **Memory**: Stores full match and opponent history (grows over time)

---

## Persistence Strategy

All data is persisted through services:
- `PlayerService`: Manages player list and status
- `MatchService`: Manages match history and opponent tracking
- `SettingService`: Manages force/nemesis teammate configurations

Each modification triggers immediate persistence through service methods.

---

## Future Improvements

Potential enhancements based on code analysis:

1. **Configurable Retry Count**: Make `maxRetries` a setting instead of hardcoded
2. **Performance Metrics**: Track algorithm efficiency (average retries needed)
3. **Undo Functionality**: Ability to revert court confirmations
4. **Advanced Balancing**: Consider player skill ratings beyond win percentage
5. **History Pruning**: Archive old matches to prevent unbounded memory growth
6. **Wait Time Display**: Show how long each player has been waiting
7. **Match Statistics**: Win/loss ratio, favorite teammates, nemesis opponents

---

## Troubleshooting

### Common Issues

**Players not being assigned**:
- Check player status (must be READY, not BREAK)
- Verify court availability (must have AVAILABLE courts)
- Check force teammate settings (both players must be available)

**Shuffle taking many retries**:
- Too many nemesis teammate restrictions
- Not enough players for variety
- Constraints too strict for player pool

**Court cannot be freed**:
- Must select a winning team first (`whoWon` must be set)
- Check console logs for error messages

---

*Documentation generated on 2026-01-10*
*For issues or questions, refer to the debug logs via `downloadLog()`*
