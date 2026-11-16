# Raptor Race, Level 1: a brief for a fresh build

I'd like you to build Level 1 of a mobile game called Raptor Race, from scratch. This brief covers what the game is, how Level 1 plays, what I learned from playtesting an earlier version, and how I like to work. It's deliberately loose about visuals: I want to see what you come up with.

## The short version
- A portrait 3D runner for iPhone where you play a real feathered dinosaur in the place and time it actually lived.
- Level 1: you're a Caudipteryx, and your egg is hatching. It tips out of the nest and rolls off down a wooded hillside trail in Early Cretaceous China, and you chase it to the bottom, catch it, and watch it hatch.
- I'm making this for Aidan, so it should be easy to pick up, fair, and delightful, and quietly teach some real paleontology along the way.
- Before you build anything, I'd like a plan from you, and then concept art we work out together.

## Where you're working
- You're running on my MacBook Pro. I'm happy to install software if it makes the game better: Blender, a game engine, audio tools, anything. You can use Ableton Live for the music. Recommend a toolchain (and why) before we start, and tell me exactly what to install.
- Tools and art sources are your call. If you'd use asset libraries, generated art, Blender or something else, say so in your plan.
- Repo: https://github.com/drew879/raptor-race-fable. GitHub Actions is turned on for GitHub Pages. Every push should deploy, so I can play the latest build at https://drew879.github.io/raptor-race-fable/.
- I play on an iPhone (a large current model, 440 by 956 points), both in Safari and as a Home Screen app. I follow along and reply from the Claude app on my phone, so I'll often see your messages away from the laptop.
- There's an earlier build of this game. I want your own take, so please work only from this brief and skip the earlier code and the earlier version.

## The game
Raptor Race is a tour of raptors and their relatives, each in its real habitat. Every level is a finite course (around a minute or so) with a story at the start and the end. The tone is warm, premium and natural, a little educational, and never goofy. It's scientifically grounded: feathered dinosaurs, real species, real plants and landscapes, and nothing that looks like a movie raptor.

Level 1 is the tutorial. More levels will follow (Level 2 is a Velociraptor hunt in the Gobi Desert), so build it in a way that lets more levels join later.

## Level 1: Jehol Forest

### Setting
- **Where and when:** the Yixian Formation in Liaoning, northeastern China, about 125 million years ago. Its fossils (the Jehol Biota) are famous for preserved feathers.
- **The hero:** Caudipteryx zoui, a peacock-sized feathered dinosaur with a short beak, long legs, and fans of banded feathers on its tail and short arms. It couldn't fly. The game introduces it as a cousin of Oviraptor. In the earlier version, its banded tail fan made a great signature from behind, and I liked its colors, but I'm open to your take.
- **The world:** a lush forest on a hillside with a dirt trail winding down it. Conifers, ginkgos, ferns, tree ferns and horsetails, mossy ground, clear mountain streams. No grass (it hadn't spread yet). Volcanoes were nearby: ash from eruptions is what preserved the Jehol fossils so well.

### Story
- **Opening:** at the top of the hill, an egg sits in the nest, about to hatch. The chick inside pecks and kicks, the egg rocks, tips out and rolls away down the trail. It has to be obvious that the hatching is why it rolls. Then the chase starts.
- **The egg** can't break. It's blue-green (oviraptorid eggs may really have been blue-green).
- **Ending:** at the bottom, in a mossy clearing, the egg slows down and you scoop it up. The parent curls around it, the egg hatches and the chick peeks out. A Field Journal moment closes the level: Oviraptor's family brooded their nests like birds.

### How it plays
- Portrait, a 3D view from behind the hero, three lanes.
- Swipe left or right to change lanes, swipe up to jump, swipe down to slide. At the end, a swipe up scoops the egg.
- The egg rolls ahead of you and stays in view. Clean running closes the gap, and stumbling lets it roll further ahead. If it gets too far ahead, you lose it (warn the player before that happens).
- **Obstacles** come in three kinds: go around, jump over, slide under or through. For this level, think trees standing in the trail to go around, fallen trees and creeks to jump, and arched cutouts at the base of big trunks to slide through. Every obstacle has to say what to do at a glance, at speed.
- **Amber** is the main collectible, and its placement shows good paths. There's a score, with a bonus for collecting cleanly.
- **Three hidden finds** per level, on riskier lines. Each one unlocks a Field Journal page with real science. In the earlier version they were amber inclusions (pieces of amber with something trapped inside).
- **A fork:** the trail splits around something big. One side is harder with more rewards, the other easier with fewer.
- **One power-up** (the earlier version had an amber magnet).
- **Checkpoints,** and a way to keep going after a crash.

### Course design rules
I'm curious how you lay out the course, so here are the rules to work within, and the layout is yours:
- It's the tutorial. About 70 seconds felt right. Easy for a kid, but never boring.
- Teach one thing at a time: lanes, then jumps, then slides, then the fork, then the power-up, then mix them. Each new move gets a short hint the first time it comes up.
- Leave enough time between decisions to react. The earlier tutorial kept at least about 1.4 seconds between them, and that worked.
- The trail winds and runs downhill the whole way, and the downhill has to read on a phone (see the lessons below).
- Hidden finds should be reachable for a kid who goes for them, and visible early enough to decide.
- Nothing hides behind a crest or a bend: you always see what's coming in time to react.

### Around the run
The game needs a title screen, pause (with music and sound on and off), a results screen, a Field Journal (pages for what you've found and learned), music and sound. The details are up to you.

## Look and feel
Here's what the current version was aiming for. Treat it as a mood to react to:
- **A naturalist's illustrated field journal come to life:** the feel of ink-and-watercolor sketches from an expedition notebook, on bold, simple shapes.
- **Warm, premium, natural:** a nature documentary filtered through a picture book. Never neon, never cartoon-goofy.
- **Amber is the signature:** the warmest glow on screen is amber, and the UI and rewards share it.
- **Level 1's mood:** early morning in a misty, lush hillside forest. Blue-green air, warm sun, an earthy trail, mossy greens, the blue-green egg, golden amber.
- **Readable at a glance** on a phone at speed: the hero, the egg, obstacles and collectibles always stand apart.

What I want from you is an opinionated style and a deliberate color palette that make the game unmistakably its own. Please weigh in: if you'd take it somewhere else, pitch it. Before building, let's work on concept art together. Show me two or three directions (the same moment of the game in each), tell me which you'd pick and why, and we'll settle it together. How you get the look is up to you.

## Music and sound
- **What I liked before:** driving orchestral strings in a minor key for the chase, building as you close in on the egg, and amber pickups that sound musical and land in time with the music.
- **The ending has to land:** no abrupt stop and nothing cheesy. It should resolve and ring out.
- **Sounds** should be warm and subtle: they confirm what you did and never nag.
- If you'd make the music in Ableton Live (or with something else), tell me how you'd do it.

## What I learned from playtesting the earlier version
These are problems I ran into, so you can avoid them. Solve them however you like.
1. **Speed and variety matter.** My first version felt slow and repetitive. The forest tutorial at a gentler pace felt just right for its job.
2. **Obstacles have to say what to do.** A trunk propped across the trail looked like a hurdle until it was clearly too tall to jump. Arches looked too narrow to fit through until the opening was clean and roomy. Trees standing in the trail looked like bare poles without branches.
3. **Downhill is hard to show in portrait.** A steady slope with a camera that follows it looks flat. It read better with steeper stretches where the trail visibly falls away ahead. The portrait view is narrow, so scenery off to the sides barely shows.
4. **The opening has to explain itself.** At first the egg seemed to hop out of the nest for no reason.
5. **Up close, quality shows.** The hero, the egg and the chick fill the screen at the start and end, and I notice when they look rough.
6. **Hints have to be quick to read while running,** never overlap each other, and come early enough to react. Only the pause button should pause the game.
7. **"Run again" has to reset everything.** The egg once came back already hatched.
8. **iPhone gotchas:**
   - Home Screen copies kept loading an old cached build. Show a build number somewhere, and make sure the app updates itself.
   - In the Home Screen app, a strip at the bottom of the screen wasn't covered by the game.
   - iOS blurs a band under the status bar, so keep the score and buttons out of it without wasting space.
   - The pause button once didn't respond on the phone.

## How I like to work
- **Plans first.** Before building anything new, tell me the plan and wait for my feedback. Ask clarifying questions before you start.
- **Check-ins:** at each milestone, send a link I can play on my phone and specific playtest questions.
- **Questions:** when a message has several, make the last message stand on its own. Restate everything that still needs an answer and end with a plain-text, copy-paste template of numbered items I can fill in.
- **Accuracy:** double-check facts, math and measurements before you show them to me.
- **Focus:** if I say I want to focus on one thing first, ask me when I'm ready to move on.
- **Writing:** direct and conversational, plain words, contractions, no em dashes, and no "it's not X, it's Y" phrasing.
- **Repo habits:** commit small and push often. Keep notes in the repo on decisions and progress so a new session can pick up where the last one left off. Don't put AI model names or IDs in commits, code or docs.

## Suggested first steps
Change these if you'd do it differently:
1. Read this, ask me what you need to know, and send a plan: your toolchain, milestones, and what you'll show me first.
2. Concept art: two or three directions, and we pick one.
3. A rough playable run on my phone to get the feel right (controls, speed, camera, the downhill).
4. The whole level, opening to ending.
5. Polish, music and sound, the menus and journal, and rounds of playtesting.

## Facts you can draw on
Use these or find your own (and check them):
- Caudipteryx zoui was described in 1998 from the Yixian Formation. It's an oviraptorosaur, in the same broad group as Oviraptor.
- Fossils of Oviraptor's relatives sitting on their nests, arms spread over the eggs like a brooding bird, have been found in the Gobi Desert.
- A 2017 study of pigments in oviraptorid eggshell suggested those eggs were blue-green.
- Amber can trap remarkable things: a feathered dinosaur tail and a baby bird have both turned up in roughly 99-million-year-old amber from Myanmar, and a spider web with its prey in roughly 110-million-year-old amber from Spain.
