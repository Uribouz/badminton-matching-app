# BadmintonMatchingApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.7.

Objective

## Done:

### 1. Can add players

### 2. Can See list of players

## Bug:

## Backlog:

### 3. Can create a randomly match with another 3 player, 1 on the same team, 2 on the opposite team

##### 3.1 need to know how many players and divided by 4 to get total number of fields to play

##### 3.2 logic should be balanced, every person should play equal amount of games

#### 4. Have partner history, you can see which players one already played with.

#### 5. Have matched history, you can see which matched you already play with which players.

##### 5.1 ถ้ามีคนพัก: "Some one take a break": Can edit matched history

    -> ยังนับรอบคนที่พักว่าเล่นเหมือนเดิม

##### 5.2 ถ้า match ผิดจริงๆ

    Can delete matched history

##### 5.3 สร้าง match เองได้

    Can new matched history

## Refernce:

    https://www.svgrepo.com/svg/522086/cross

--ChatGPT Logic
[Link](https://chatgpt.com/)

Sure! Let's dive deeper into **Mixed Shuffle with Constraints**, where we ensure that players are shuffled based on certain rules or conditions (e.g., preventing players from the same team being paired together, ensuring players don't play against the same opponent twice in a row, or incorporating match history to balance the shuffle).

Here’s how we can structure the solution to ensure fairness while also handling constraints related to player history.

### **1. Problem Definition & Constraints:**

- **Players**: Each player has some attributes (name, team, past opponents, etc.).
- **Constraints**:
  - Players from the same team should not be paired together.
  - Players should not play against the same opponent multiple times in a row.
  - Match history should be considered to create more varied matchups.

### **2. Data Structure:**

We'll represent players and match history in an object or array. Each player will have attributes like:

- `name`: Player's name.
- `team`: The team the player is in.
- `matchHistory`: A list of players they’ve already faced in previous matches.
- **Additional fields**: `lastPlayedAgainst` (to track the last opponent), `matchesPlayed` (for tracking number of matches played).

#### Example Player Data:

```javascript
let players = [
  { name: "Player A", team: "Red", matchHistory: ["Player B", "Player C"], lastPlayedAgainst: "Player C" },
  { name: "Player B", team: "Red", matchHistory: ["Player A", "Player D"], lastPlayedAgainst: "Player D" },
  { name: "Player C", team: "Blue", matchHistory: ["Player A", "Player D"], lastPlayedAgainst: "Player D" },
  { name: "Player D", team: "Blue", matchHistory: ["Player B", "Player C"], lastPlayedAgainst: "Player B" },
];
```

### **3. Mixed Shuffle with Constraints Logic**

To implement the mixed shuffle with constraints, we will:

1. **Shuffle players randomly**.
2. **Check constraints**:
   - Ensure that players from the same team are not paired.
   - Ensure that players haven’t played against each other recently (using the match history).

### **Step-by-Step Approach:**

#### **Step 1: Random Shuffle**

We'll start by shuffling the player list randomly using the **Fisher-Yates Shuffle**.

```javascript
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
  }
  return arr;
}
```

#### **Step 2: Check Constraints**

We need to make sure that when pairing players:

1. Players from the same team should not be paired.
2. Players who recently played against each other (as per `matchHistory`) should not be paired again.

We'll implement a **constraint check function** that verifies if a pairing is valid or not.

```javascript
function isValidPair(player1, player2) {
  // Check if players are from the same team
  if (player1.team === player2.team) {
    return false; // Invalid pair, same team
  }

  // Check if players have already played each other recently
  if (player1.matchHistory.includes(player2.name) || player2.matchHistory.includes(player1.name)) {
    return false; // Invalid pair, they've already played
  }

  return true; // Pair is valid
}
```

#### **Step 3: Pair Players with Constraints**

After shuffling, we can attempt to pair the players in a way that respects the constraints. We’ll loop through the shuffled players and check each potential pair.

```javascript
function constrainedShuffle(players) {
  let shuffledPlayers = shuffleArray(players);
  let pairs = [];

  // Try to pair players
  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    let player1 = shuffledPlayers[i];
    let player2 = shuffledPlayers[i + 1];

    // If pairing is invalid, we need to re-shuffle or try another pair
    if (i + 1 < shuffledPlayers.length && !isValidPair(player1, player2)) {
      // If invalid, attempt to find another player to pair with
      let swapped = false;
      for (let j = i + 2; j < shuffledPlayers.length; j++) {
        let candidate = shuffledPlayers[j];
        if (isValidPair(player1, candidate)) {
          // Swap and recheck validity
          [shuffledPlayers[i + 1], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i + 1]];
          swapped = true;
          break;
        }
      }

      // If no valid swap is found, we may need to shuffle again or force pair
      if (!swapped) {
        // You can choose to shuffle again if this situation occurs too often.
        console.log("Unable to find valid pair for:", player1.name, "and", player2.name);
        return constrainedShuffle(players); // Recursively try again
      }
    }

    // Once a valid pair is found, add them to the pairs array
    pairs.push([player1, player2]);

    // Record their match history
    player1.matchHistory.push(player2.name);
    player2.matchHistory.push(player1.name);
    player1.lastPlayedAgainst = player2.name;
    player2.lastPlayedAgainst = player1.name;
  }

  return pairs;
}
```

#### **Step 4: Example Run**

Let's see how this would work with our example data:

```javascript
let players = [
  { name: "Player A", team: "Red", matchHistory: ["Player B", "Player C"], lastPlayedAgainst: "Player C" },
  { name: "Player B", team: "Red", matchHistory: ["Player A", "Player D"], lastPlayedAgainst: "Player D" },
  { name: "Player C", team: "Blue", matchHistory: ["Player A", "Player D"], lastPlayedAgainst: "Player D" },
  { name: "Player D", team: "Blue", matchHistory: ["Player B", "Player C"], lastPlayedAgainst: "Player B" },
];

let matchPairs = constrainedShuffle(players);
console.log(matchPairs);
```

Example Output:

```javascript
[
  [
    { name: "Player A", team: "Red", matchHistory: [Array], lastPlayedAgainst: "Player C" },
    { name: "Player D", team: "Blue", matchHistory: [Array], lastPlayedAgainst: "Player B" },
  ],
  [
    { name: "Player B", team: "Red", matchHistory: [Array], lastPlayedAgainst: "Player D" },
    { name: "Player C", team: "Blue", matchHistory: [Array], lastPlayedAgainst: "Player D" },
  ],
];
```

- The players are paired randomly but respecting the **team constraint** and **match history**.
- Player A isn't paired with Player B (same team), and Player B isn't paired with Player C because they’ve already played against each other.

---

### **4. Possible Improvements:**

1. **Re-Shuffling Limit**: You can add a limit on how many times to attempt a re-shuffle, to avoid infinite loops in case players can't be paired due to too many constraints.
2. **Dynamic History Consideration**: If you have a lot of players and a long match history, you might want to weight constraints based on how recently they played against each other (e.g., don’t prevent pairing players who last played 10 matches ago).
3. **Balance based on Player Skill**: You can add more rules for pairing based on player skill or experience level (e.g., don’t pair an advanced player with a beginner unless needed).

### **5. Conclusion**

This approach combines **randomization** with **history-based constraints** to ensure that the matches are varied, fair, and engaging. By enforcing constraints (like no same-team pairings and no repeated opponents), we enhance the experience for players and avoid repetitiveness.

Let me know if you need further clarifications or want additional features!
#   b a d m i n t o n - m a t c h i n g - a p p  
 