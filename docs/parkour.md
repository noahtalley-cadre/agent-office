# Desk Hop parkour

Back to the [README](../README.md).

Desk Hop is a short shared race across the colored storage trunks in the office's southern aisle, between the desks and the balcony. The green start and its freestanding sign are west of the balcony, at roughly `x = -9, z = 8`. The finish is beside the loft stairs. The kitchen, balcony doors, stairway, and walking routes remain accessible around it.

Walk up to the **Desk Hop** sign and press **E** for instructions and this floor's leaderboard. Choose **Let’s race** to step onto the start platform. After a three-second countdown, follow the floor arrows and land on every numbered platform in order.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Look and line up a jump |
| Space | Jump |
| Shift | Sprint; normal walking jumps also reach every platform |
| R | Return to the last saved checkpoint, adding two seconds |
| X | End the current run |
| E at the sign | Instructions, a fresh run, and shared scores |

The blue **SAVE** platform is the halfway checkpoint. Falling returns you to the start until you reach it, then to the blue platform. Every retry adds two seconds while the race clock continues. A marker shows your next landing, cleared pads glow, and the overlay shows time, progress, retries, and other people currently racing. Other players remain visible as their normal office avatars; everyone can race at once.

The finish shows your time and whether it is a personal best. Return to the start sign to race again. Closing the start/score window with its top-right **✕** or **Esc** returns to normal mouse-look through the office's shared modal handling.

Scores are scoped to a project floor and held for the running server session. Each account keeps its fastest time; shared-password guests are identified by display name. The board shows the fastest ten. Restarting the server clears it. Changing floors, leaving the office map, disconnecting, or starting another activity cancels your current run. Runs expire after ten minutes.

The server measures time, checks each landing against the player's synchronized position in sequence, rejects instantaneous checkpoint submissions, and applies retry penalties. Like the rest of the office's movement, this is a casual team game: positions come from the player, so it is not a tamper-proof competitive physics server. Coffee's normal movement effects still apply.

The feature is isolated in `src/client/features/parkour/`, `src/shared/parkour.ts`, `src/shared/protocol/parkour.ts`, `src/server/parkour.ts`, and its WebSocket handler. It adds no paid service, background timer, or new runtime dependency.
