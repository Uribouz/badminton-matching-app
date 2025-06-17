# BadmintonMatchingApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.7.

## Objectives

Provide tools for a group of Badminton users, with fairness of use in mind.

## Doing

## Bugs:

## Backlogs:

21. Add API servers to be able to use this website multiple device at the same time while sharing data usage

    - Refactor it to be in its own Module, for readable and maintainability

22. Add shuffle logic when selecting players to play:
    see player's match history and prepare a match with previously player's played matched in mind.

23. Added MMR ranking players win/lose

24. Have a calculator, that can calculate how much player needed to play
    25.2) Phase 2: Each person pays depends on actually how many games they have been played - UI of how many player have been played need to be rethink - Model of the player.ts need to be update to hold field `priorityPoint` and `totalRoundsPlayed`
    (to prevent misunderstood the logic when new player added,
    they will automatically use the `least totalRoundsPlayed` from all the players as their own `totalRoundsPlayed`) - TODO: pending calculation logic !!

25. Modify UI to better represent player's status
    26.1) Actual games play
    26.2) Point that use in shuffle logic
    27.1) Actual game waited (may be also count 'forced waited players')
    maybe rethink about Ui to show forced player's wait and player who left early.

## Reference:

    ### App structure
    https://v17.angular.io/guide/styleguide#application-structure-and-ngmodules

    ### Theme picker
    https://www.schemecolor.com/roaming-on-the-campus.php

    ### Free SVG Icon
    https://www.svgrepo.com/svg/522086/cross

    ### SVG Icon HTML to CSS
    https://yoksel.github.io/url-encoder/

    ### SVG Icon set (Helium Dashed Icons)
    https://www.svgrepo.com/collection/helium-dashed-icons/

## Done:

1. Can add players
2. Can See list of players
   x. Bugs fixed https://dev.to/kapi1/how-to-fix-page-not-found-on-netlify-a4i
3. Can create a randomly match with another 3 player, 1 on the same team, 2 on the opposite team
   3.1 logic should be balanced, every person should play equal amount of games (Acceptable need feedback from friends)
4. Have partner history, you can see which players one already played with.
5. show "console.log" somewhere, or let user can export log for debugging purpose...
6. can move players around, as box
   or swap players around in court
7. Have matched history, you can see which matched you already play with which players.
   y. Bugs fixed: Many players experience playing against same person
8. Make it a true random (Done ?)
9. calling calculateFirstPriorityPlayer too many times ( not efficient).
10. Improve UI
11. Improve add function to set only selected players into a match
12. can add courts depends on how many players
13. In match-list view, when adding new player, new players should use least players played rounds as initial.
    z. Last match history depends on the match changes
14. Maybe rethink about how wait players affected shuffle decisions
    --> Removed wait players affected the decision in shuffle
    Z. Bugs fixed: First click in stand-by list is ignored
15. Fix wait counter increased when player is in status 'break'
    #dasd
16. number of 'selected' players doesn't need to be Divisible by 4
    to be ablue to shuffle into the court

24. Have a calculator, that can calculate how much player needed to play
    the calculation logic begin with
    25.1) Phase 1: Every person pay equally ... - calculate the price of the court: price of the court per hour multiply by how many courts and how many hours we played - calculate the price of the shuttle: price of the shuttle multiply by the amount of the shuttle we used - setting: default prices that can be adjustable
