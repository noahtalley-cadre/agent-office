# The Clubhouse

A shared place to do good work and take a playful break. This fork keeps Agent Office's Three.js world and persistent Node server, then adds a warmer interior, a real coffee corner, a shared dishwasher, and Desk Hop parkour.

## In this build

- **Coffee corner:** a glass coffee pot with coffee, handle, spout and measuring marks; steam, ceramic mugs, sage cabinets and a retro fridge. Press E for the existing caffeine boost.
- **Dishwasher:** open it, load mugs, run an 18-second wash, open the clean rack and unload. Everyone sees the same cycle. The door, rack, bubbles and clean dishes animate.
- **Desk Hop:** six office crate platforms with a checkpoint, countdown, timed finishes, retry penalties and per-floor best times. [Controls and rules](parkour.md).
- **A warmer office:** timber slats, suspended acoustic panels, under-panel lighting, hanging plants and colored desk mats. Original procedural geometry keeps the download small and avoids external asset licensing.
- **Private agent views:** your account owns its Claude terminals and their controls. Other teammates see that the desk is occupied without receiving the terminal stream. [Privacy and hosting limits](personal-hosting.md#resource-limits-and-privacy).
- **Existing social features:** multiplayer avatars, friendly punching, chat, voice, screen sharing, a shared whiteboard, basketball, arcade cabinet, rooftop darts and axe throwing, and garage cars.

## Good candidates for the next round

| Idea | The social moment | Build approach |
| --- | --- | --- |
| Office prop museum | Recognize our actual coffee machine, couch and meeting rooms | Start from a few reference photos and dimensions; model lightweight props rather than photogrammetry everything |
| Mug personalities | Everyone has a favorite mug that follows them to their desk | Account-owned cosmetic + shared dishwasher racks |
| Paper-airplane league | Toss a note or challenge someone to a distance contest | Server-scored throws with client-side flight animation |
| Printer boss fight | A jammed printer becomes a 30-second cooperative repair | Shared timed switches, a paper confetti reward |
| Rubber-duck debugging pond | Sit with a teammate while an agent runs | Quiet social area, optional private note pad |
| Lunch bell + snack quests | A tiny shared ritual between meetings | Opt-in daily objective, no productivity tracking |
| Chair racing | Short races around desks without disrupting work | Explicit race mode and separate collision rules |
| Build celebration | Ring a bell and briefly light up a team's corner | Opt-in repository event; keep private agent text private |

Priority after the POC: test with teammates, tune camera and movement from real laptops, gather office-reference photos, then choose one shared mini-game to deepen. Avoid making the office noisy while someone focuses: activities should be opt-in and effects short.
