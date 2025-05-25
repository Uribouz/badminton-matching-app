# BadmintonMatchingApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.7.

## Objectives

Provide tools for a group of Badminton users, with fairness of use in mind.

## Doing

## Bugs:

## Backlogs:

19. Added MMR ranking players win/lose
20. Refactor it to be in its own Module, for readable and maintainability

21. Add API servers to be able to use this website multiple device at the same time while sharing data usage
22. Add shuffle logic when selecting players to play:
    see players match history and prepare a match with previously player's played matched in mind.

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
