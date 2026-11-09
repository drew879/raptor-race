# Free asset research: Raptor Race

Researched 2026-11-09. Scope: free assets that could raise visual quality above the current code-built low-poly look. Research only: nothing was downloaded.

## 0. How this was verified (read first)

- **The cloud box could not open source pages.** Direct fetches of `sketchfab.com`, `api.sketchfab.com` and `polyhaven.com` were refused (the environment's network allows package registries only). Licenses were read from **search-engine captures of each source page** (page title plus license, triangle and author fields). That is weaker than loading the page.
- **Status column**, used in every table:
  - **V**: the license text was seen in a capture of the asset's own page.
  - **V2**: seen only on a mirror or a second-hand listing.
  - **?**: not confirmed. Do not use until checked.
- The web-search quota ran out before every row could be double-checked. Gaps are marked.
- **Before importing any asset:** open the live page, confirm the license and version (CC-BY 3.0 and 4.0 differ), and save the page text with the asset. Sketchfab and Fab let authors change licenses later. The license in force at download time is the one that counts.
- **Fit (1-5)** means fit for Raptor Race (Art Bible, Gobi setting, mobile budget). It is not a judgment of general quality.

## 1. License rules as applied

| License seen | Verdict | What it means for us |
|---|---|---|
| CC0 1.0 | **OK** | No credit needed. Poly Haven's FAQ explicitly allows any use, including AI training. ambientCG's docs allow redistribution as files. |
| CC-BY 3.0 / 4.0 | **OK + credit** | Credits screen: `"Title" by Author (URL), CC BY 4.0, modified (decimated/retextured/rigged)`. Record the exact version. |
| CC-BY-SA | **Avoid** | Allowed commercially, but our modified mesh must be released BY-SA. Anyone could then extract it and reuse it. |
| CC-BY-NC, -ND, -NC-SA | **Reject** | Rules out commercial use or modification. |
| Sketchfab "Free Standard" / Standard | **OK, with care** | Commercial use allowed. No standalone redistribution. May carry a **NoAI** tag: no use "in datasets for, in the development of, or as inputs to generative AI programs". Treat that as a ban on running the model through AI tools (AI retopology, upscalers, image-to-3D, AI auto-riggers). |
| Sketchfab Editorial | **Reject** | Sketchfab's help pages say no commercial use. |
| Fab Standard License | **OK, with care** | Usable "with any compatible tools" (not just Unreal). Commercial distribution only when built into a project, "in object code", and we "must restrict [end users] from extracting" the content. No standalone redistribution. Personal tier (under $100k gross revenue in the last 12 months) and Professional tier give the same rights. NoAI listings exist. **Web build risk:** a WebGL page serves GLB files anyone can fetch, so "restrict extraction" needs at least packing or obfuscating the files. CC0/CC-BY assets carry no such duty, so prefer them. |
| Fab "UE-Only Content" / legacy Quixel Bridge downloads (Epic Content License) | **Reject** | Licensed only for Unreal Engine and Unreal-based products. Engine-locked. |
| Megascans | **Mostly no** | Free for all engines under the Fab Standard License only until 2024-12-31. Since 2025 they are paid, apart from a free subset (1,500+ assets) on Fab under the Standard License. Assets already claimed stay usable. |
| CGTrader "Royalty Free" (incl. free models), "Royalty Free (no AI)" | **OK, with care** | Allowed when built into a product and third parties cannot retrieve the model on its own. For games you must take "reasonable measures" to stop end users getting at the file. No AI training. Same web-build caveat as Fab. |
| Smithsonian "CC0" | **OK** | Commercial use with no fee or credit. Check the **media** usage field, not just "Metadata Usage: CC0". Smithsonian trademarks are excluded. |
| Smithsonian "Usage Conditions Apply" | **Reject** | Personal, educational and non-commercial use only. |
| Mixamo | **N/A** | Adobe's FAQ says the auto-rigger and animation library are for **bipedal humanoids only**, and tails or wings may fail. Useless for raptors or prey. Output is royalty-free for commercial projects. |
| Game rips re-uploaded as CC-BY (ARK, Jurassic World Alive/Evolution, Camp Cretaceous, Dino Crisis, The Isle, Dino Dan, Jurassic: The Hunted, unreleased Steam games) | **Reject** | The uploader does not own the rights, so the CC label is void. This is the biggest trap on Sketchfab's dinosaur listings. |
| Jurassic Park/World-styled designs (scaly, film head shape, "Blue" stripes) | **Reject** | IP risk even when the mesh is original. The Art Bible already requires distance from the film raptor. |

Platform status notes:
- **Sketchfab** was sold by Epic to KitBash (announced Aug 2026). New Terms of Use took effect 27 Oct 2026. Secondary sources report that free CC downloads and the download API still work. KitBash says no immediate changes, but free downloads were once slated to end, so **download and archive** anything we pick rather than relying on it staying up.
- **Fab** stayed with Epic. Its free CC assets are CC-BY only, since migrated listings map CC-BY to Fab's CC license. Epic's documentation lists no CC0 option on Fab.

## 2. Download hosts to allow

Hostnames come from vendor API docs or client code seen in search results. "Confirm" means: allow it, try one download, and add whatever host the proxy refusal names. File hosts often redirect.

| Source | Browse / API host | File host(s) | Login? | Confidence |
|---|---|---|---|---|
| Poly Haven | `polyhaven.com`, `api.polyhaven.com` | `dl.polyhaven.org` (files), `cdn.polyhaven.com` (thumbnails) | No | High (API spec + client code). The API asks for a "Powered by Poly Haven" credit if we build on the live API; the assets themselves need no credit. |
| ambientCG | `ambientcg.com`, `docs.ambientcg.com` | `ambientcg.com/get?file=<id>_1K-JPG.zip` redirects to a raw link on another host | No | Medium: allow `ambientcg.com`, then confirm the redirect host. API v2 is frozen; use v3. |
| Kenney | `kenney.nl` | `kenney.nl` (zip); mirror `kenney-assets.itch.io` | No | Medium |
| Quaternius | `quaternius.com` | Mirrors: `opengameart.org` (direct zips), `poly.pizza`, `quaternius.itch.io` | No (itch needs a click-through) | Medium |
| Poly Pizza | `poly.pizza`, `api.poly.pizza` (API key in `X-Auth-Token`) | API "Download" field gives .glb URLs; `static.poly.pizza` is seen serving images | No (key for API) | Medium |
| OpenGameArt | `opengameart.org` | `opengameart.org` (`/sites/default/files/...`) | No | High |
| Sketchfab | `sketchfab.com`, `api.sketchfab.com` | `sketchfab-prod-media.s3.amazonaws.com` (signed archive URLs, expire after 300 s) | **Yes** (account; OAuth token for the API). The API serves glTF/GLB/USDZ only, never source FBX. | High |
| Smithsonian 3D | `3d.si.edu`, `3d-api.si.edu` | `3d-api.si.edu` (Voyager content API, "alpha") | No | Medium |
| Gobkit | `gobkit.itch.io`, `gobkit.com` | `gobkit.com/api/free` (no-login manifest with direct .glb URLs) | No | Medium |
| 3dtextures.me | `3dtextures.me` | One-by-one downloads to an external file host (not confirmed) | No | Low: confirm the redirect |
| itch.io (KayKit, RG Poly, Gobkit, Quaternius) | `itch.io`, `<author>.itch.io` | Short-lived CDN URLs; itch.io publishes no hostname list | Click-through | Low |
| Fab | `fab.com` | Epic-account download | **Yes** | Manual only |
| CGTrader | `cgtrader.com` | Account download | **Yes** | Manual only |

Practical path for login-walled sources (Sketchfab, Fab, CGTrader, itch.io): the owner downloads on a device and adds the files to the repo or a private release. Then agents only need the open hosts (Poly Haven, ambientCG, Kenney, OpenGameArt, Smithsonian).

## 3. Need 1: hero raptor (feathered dromaeosaur)

| Asset | URL | Author | License (as stated) | St | Format | Tris / textures | Rig / anim | Style | Notes | Fit |
|---|---|---|---|---|---|---|---|---|---|---|
| Animated Dinosaur Pack: Velociraptor | https://quaternius.com/packs/animateddinosaurs.html (mirrors: https://quaternius.itch.io/animated-lowpoly-dinosaurs, https://poly.pizza/bundle/Animated-Dinosaur-Bundle-SmoLdBLO2K) | Quaternius | CC0 | V | FBX, OBJ, Blend (glTF via Poly Pizza) | Low-poly, flat colors (count not listed; zip about 10 MB for 6 dinos) | Rigged: idle, walk, run, jump, attack, death | Low-poly | Unfeathered, toy-like: the same "boxy" look the owner rejected. Useful as a proxy, a rig reference and for clip timing. | 2 |
| PBR Velociraptor (Animated) | https://sketchfab.com/3d-models/pbr-velociraptor-animated-8f1744af7b0847a2aabe3df90be802f0 (also https://www.fab.com/listings/5d5fa3d3-4459-4677-be46-c686f733908c) | Ferocious Industries | Sketchfab: CC Attribution. Fab: license field blank in capture, "Allows usage with AI: Yes" | V (Sketchfab) / ? (Fab) | glTF, GLB, FBX, USDZ | 15.1k tris, 8.3k verts; 2K albedo/normal/AO; 5 skins | Animated; about 26 clips per a three.js forum post (unverified). The same thread reports trouble playing the clips in three.js. | Game-ready semi-realistic | Best free *animated* raptor found. Scaly and unfeathered, so check the head and pattern against the film raptor. Would need feather cards and a reskin. Use the Sketchfab CC-BY copy, whose terms are cleaner than Fab's. | 3 |
| Velociraptor (with feathers) V2 | https://sketchfab.com/3d-models/velociraptor-with-feathers-v2-3166251a48854aea83e94910835f5a21 | Animal Maker (@ShinGoji729) | CC Attribution | V | Sketchfab glTF | 22.7k tris, 11.4k verts | No rig mentioned (assume static) | Hobbyist realistic | Only free model that is explicitly a feathered *V. mongoliensis*. Quality unknown (69 downloads). Needs a rig and every animation. | 3 |
| Velociraptor (with feathers) | https://sketchfab.com/3d-models/velociraptor-with-feathers-0c20992d59ce4df3862e021327922acf | Animal Maker | CC Attribution | V | glTF | 14k tris | Not mentioned | Hobbyist | Earlier version of V2. | 2 |
| Feathered Fury: Raptor Pack | https://sketchfab.com/3d-models/feathered-fury-raptor-pack-dbe4312ce6bf47aa9604fe78927ea928 | Ahmadiqbal | CC Attribution | V (one capture; another showed none) | glTF | 28k tris | "Hunting, running, interaction poses": likely static posed meshes | Feathered | Provenance unknown: check whether it is AI-generated or a re-upload. | 2 |
| Low Spec Velociraptor | https://opengameart.org/content/low-spec-velociraptor | pistachio | CC-BY 4.0 | V | Blend (assumed) | 694 tris (scaly), 861 tris (feathered); feather texture | Rigged and weighted: walk (24f), run (16f), attack 1/2 | PS1-era low-poly | Feathered, animated and permissive, but far below the premium bar. Good rig and clip study only. | 2 |
| Utahraptor Rigged (unfeathered) | https://sketchfab.com/3d-models/utahraptor-rigged-unfeathered-c3e13dfefee046808dd768c88f4f8389 | Nobilis the Palaeovespa | CC Attribution | V | glTF | about 10k tris | Rigged, no clips stated | Realistic | The uploader also posts rigs of another artist's ("Dinoraul") models and of film designs, so the provenance chain is unclear. | 2 |
| Utahraptor (feather effect in texture) | https://sketchfab.com/3d-models/utahraptor-2caf55b142a947d8860406a1872028ad | "Indominus Rex" (@lentoneulb) | CC Attribution | V | glTF | n/l | Not rigged | Hobbyist | The page says it tweaked an existing Velociraptor model, so provenance is unclear. | 1 |
| Velociraptor Rigged Low-Poly Dinosaur | https://sketchfab.com/3d-models/velociraptor-rigged-low-poly-dinosaur-5ffdc6cd74064917ace40e5b114cb54d (shop: https://fsaurshop.netlify.app/) | FSaur | Not a free download on Sketchfab; shop lists $6.99 | ? | FBX, GLB, Godot 4 demo | n/l | Rigged: idle, walk, run, jump/attack, drink, call | Low-poly | Cheap **paid** option with almost our exact clip list. Feathers not mentioned. | 3 (paid) |
| Animated lowpoly velociraptor | https://www.cgtrader.com/free-3d-models/animal/dinosaur/animated-lowpoly-velociraptor | n/l | Royalty Free (no AI) | V2 | FBX | n/l | Rigged, animated | Low-poly | RF terms require protecting the file in a web build. | 2 |

**Rejected or not available** (kept here so nobody re-evaluates them):

| Asset | Why |
|---|---|
| Velociraptor, SpiderBight (https://sketchfab.com/3d-models/velociraptor-2625c52cf35a4ab0a793efff2c0ac738) | CC BY-NC, and based on the Jurassic Park design |
| Velociraptor mongoliensis, DanielWalsh (https://sketchfab.com/3d-models/velociraptor-mongoliensis-906e0a2884d74cbd80c756de8484b1fe) | Described as the 1993 Jurassic Park raptor (IP) |
| Animated Velociraptor / remake / Animated JWR Velociraptor, Gisduyg (https://sketchfab.com/3d-models/animated-velociraptor-76d1789134ff4818a80de487e47f02aa, https://sketchfab.com/3d-models/animated-jwr-velociraptor-58f160a58bfc48bb95bcbfa1ece2a0b2) | Film or game designs (IP) |
| Camp Cretaceous Velociraptor; Blue Velociraptor Rig; "blue walking cycle"; Velociraptor blue skin | Jurassic World character (IP) |
| Dino Crisis 1 Velociraptor (https://sketchfab.com/3d-models/dino-crisis-1-velociraptor-3269938203544b079339ac889194b7e9) | Game rip |
| Jurassic: The Hunted Deinonychus Pack (https://sketchfab.com/3d-models/jurassic-the-hunted-deinonychus-pack-no-rig-d3cd6da5f20a4f999088ae44fb7c6d72) | Game rip |
| Dino Dan HD Dromaeosaurus (https://sketchfab.com/3d-models/dino-dan-dino-defence-hd-dromaeosaurus-cdb41650a721470c9da15b8143726937) | Page says the model belongs to Sinking Ship Interactive |
| Feathered raptor, Dyno_22 (https://sketchfab.com/3d-models/feathered-raptor-b27b0f7d2101490e81d1c49b0ccb4d08) | CC BY-SA, 297.7k tris |
| Feathered Raptor (Deinonychus, 361k tris, NoAI), Reignar | View-only, not downloadable |
| Low Poly Raptor - Animated and Microraptor gui (632k tris, fully feathered), Wobbly Works | View-only. The author is a freelance creature animator with anatomically accurate dromaeosaurs: **best commission lead found** |
| Raptor, 154 / 121 game animations, Kubold | Paid, unfeathered. Its animation sets could be retargeted if bought. |
| Mixamo | Humanoid bipeds only |

**Paid fallbacks** (not free; the cheapest route to the quality bar):
- Feathered Raptor - Rigged (Blender), $79-110 depending on store, Royalty Free: 10,982 tris base, 80,134 tris with feathers, Blender 4.1, rigged, normal maps. https://blendermarket.com/products/feathered-raptor---rigged-blender and https://www.cgtrader.com/3d-models/animals/dinosaur/feathered-raptor-rigged-blender
- Velociraptor Rigged Feathered (ArtStation): https://www.artstation.com/marketplace/p/ynow/3d-model-velociraptor-rigged-feathered (price and license not captured)
- Kubold raptor animation sets (Sketchfab/Fab): a large clip library to retarget onto a feathered mesh.

## 4. Need 2: prey and other fauna

### Protoceratops (Level 1 prey)

| Asset | URL | Author | License | St | Tris | Rig / anim | Style | Notes | Fit |
|---|---|---|---|---|---|---|---|---|---|
| protoceratops | https://sketchfab.com/3d-models/protoceratops-5f54a33de3e84c29a8566b8edb547c29 | seth the yutyrannus | CC Attribution | V | 48.1k | Listed in a third party's "Dinosaurs fully rigged" collection (rig likely, not confirmed) | Hobbyist realistic | Best free Protoceratops found. This uploader credits another artist ("Sammy The Citipati") on other models, so check this one's origin. Decimate to about 6-8k. | 3 |
| Fighting Dinosaurs (Velociraptor vs Protoceratops) | https://sketchfab.com/3d-models/fighting-dinosaurs-37dd633830cf4c58bc1ee74a6424ae5e | sekiri | CC Attribution | V (one capture) | about 116k | Static | Photogrammetry of a cast at a Japanese dinosaur center | A fossil prop or easter egg for Level 1. The cast or sculpt maker might hold rights in the object. | 3 |
| Protoceratops andrewsi (NHMW-GEO-2015/0404/0001) | https://sketchfab.com/3d-models/protoceratops-andrewsi-nhmw-geo-201504040001-ed6e419065af422eaaa07294f55b8be1 | Natural History Museum Vienna | Not captured. NHMW's other Sketchfab scans are CC BY-NC | ? | n/l | Static skeleton | Scan | Assume NC: anatomy reference only. | 1 |
| Protoceratops andrewsi - AMNH | https://sketchfab.com/3d-models/protoceratops-andrewsi-amnh-f405d7cf46444942aac276fe840b5553 | Paleogirl (individual) | Not captured | ? | 1.6M | Static | Photoscan | Not an official AMNH release. Reference only. | 1 |
| JWA Protoceratops | https://sketchfab.com/3d-models/jwa-protoceratops-b24ff6143e194be59236bfb12bf5bb84 | Jurassic Radassic | CC Attribution | V | about 10k | Rigged | Game rip | **Reject** (Jurassic World Alive) | 0 |
| Bix, Dinotopia Protoceratops | https://sketchfab.com/models/9b15204c41d84de39fed499d7073a507/embed | cafnir | n/l | ? | n/l | Rigged, tail quills | IP character | **Reject** | 0 |

### Oviraptorids, pterosaurs, small fauna

| Asset | URL | Author | License | St | Tris / tex | Rig / anim | Style | Notes | Fit |
|---|---|---|---|---|---|---|---|---|---|
| Gobkit Free Dinosaur Pack (10: Oviraptor, Pterodactylus, Ankylosaurus, Pachycephalosaurus, Triceratops, T-Rex, Stegosaurus, Spinosaurus, Carnotaurus, Plesiosaurus) | https://gobkit.itch.io/gobkit-free-dinosaur-pack | Gobkit (Alsomind Tech) | CC0 1.0 | V | GLB, one texture atlas; tris n/l | Shared skeleton: idle, attack, dead, walk @24 fps (no run) | Low-poly | Built for three.js. The company also sells an AI creature generator. It says the free packs are "hand-checked exports ... hand-built skeleton" but does not say how the meshes were made. Playing the first clip plays every action back to back. | 2 |
| Citipati | https://sketchfab.com/3d-models/citipati-d4085bc97780424fbec28e57e78728cf | Modbuff (@CGreature) | CC Attribution | V | 17.4k | Not stated | Realistic | Gobi oviraptorid, good species fit. Quality unknown. | 3 |
| Oviraptor - Quirky Series | https://sketchfab.com/3d-models/oviraptor-quirky-series-92a38d17753641da837303067e607a8d | Omabuarts Studio | Paid (about EUR 5.5 on Unity), NoAI | V2 | about 2.5k | Rigged, 19 clips | Cartoon | Cartoon-goofy, which the Art Bible forbids. | 1 |
| Citipati osmolskae | https://sketchfab.com/3d-models/citipati-osmolskae-d6d0736d2077475d84f617cc96e9f330 | Pomona Pictures | CC BY-NC | V | 1.3M | Static | Scan-based | **Reject** (reference only) | 0 |
| Oviraptor; Oviraptor (ark) | https://sketchfab.com/3d-models/oviraptor-d1805c91640c4c3aac7c56d1b6c3e64e, https://sketchfab.com/3d-models/oviraptor-ark-8a90c564d2a849dd8163bc42fa4fbd47 | various | CC Attribution | V | 12.2k | n/l | ARK rips | **Reject** | 0 |
| Oviraptor Run | https://sketchfab.com/3d-models/oviraptor-run-c3ab2cfbfdf24d79a12541d88f24a2e1 | Pikawut | n/l | ? | n/l | Run cycle | n/l | Model "done by someone else": provenance unknown | 1 |
| Pteranodon (Animated) | https://sketchfab.com/3d-models/pteranodon-animated-7d7683df41d1405283f160e81a5dff1b | Chistodrako._. | CC Attribution | V | 13.5k | Animated (rig not stated) | Realistic | Generic background flyer. Pteranodon is North American, not Gobi. | 3 |
| Anurognathus pterosaur | https://sketchfab.com/3d-models/anurognathus-pterosaur-bc7fe93b9c254bd2bd9f905e063ec86c | Robert_the_whale | CC Attribution | V | n/l | Not rigged | n/l | Small pterosaur | 2 |
| Low Spec Pterosaur | listed on pistachio's OpenGameArt profile | pistachio | not captured (their raptor is CC-BY 4.0) | ? | very low | n/l | PS1 | Style mismatch | 1 |
| Animated Mutadon (Free) | https://sketchfab.com/3d-models/animated-mutadon-free-d6f145e788a44550b96c72de54dbdfac | Anees Animates | CC Attribution | V | n/l | Rigged | Film creature | **Reject** (Jurassic World Rebirth design) | 0 |
| Rat Animated | https://sketchfab.com/3d-models/rat-animated-cba5c3b8a946499083b4adfbb6d568b8 | Shintokin | CC Attribution | V | 3.6k; 1024 PBR | Run cycle only | Game-ready | Stand-in for Gobi mammals (*Zalambdalestes*, multituberculates) after reshaping | 3 |
| Rat | https://sketchfab.com/3d-models/rat-847629266c0f442da74fb132f46f3baf | rhcreations | CC Attribution | V | n/l | Rigged, animated | Realistic | about 5.5k downloads | 2 |
| Rat Multi Animations (Textured) | https://sketchfab.com/3d-models/rat-multi-animations-textured-c344c6ea50aa49a1b0a2719eac8593a0 | Kim.David.Hauser | CC Attribution | V | n/l | Idle, jump, swim (no run) | Realistic | .blend + .fbx | 2 |
| Lizard | https://sketchfab.com/3d-models/lizard-2405fa5c4338474ebb646a21aaf81f2d | Froggreen | CC Attribution | V | n/l | Rig unclear | Realistic | about 4k downloads | 2 |
| Zack Lizard (Rigged) | https://sketchfab.com/3d-models/zack-lizard-rigged-ea85cd93efc04dbca29080287e964a38 | Poyo20 | CC Attribution | V | n/l | Rigged | Mobile-game rip | **Reject** | 0 |
| Ultimate Animated Animal Pack | https://quaternius.com/packs/ultimateanimatedanimals.html | Quaternius | CC0 | V | Low-poly | 12 animals, 12+ clips each; FBX/OBJ/glTF/Blend | Low-poly | Species list not captured (likely modern mammals) | 2 |
| Gobkit Free Animal Pack | https://gobkit.itch.io/gobkit-free-animal-pack | Gobkit | CC0 | V | GLB | Rigged | Low-poly | Bat, platypus, etc. No lizard. | 1 |

### Later levels (other Late Cretaceous dinosaurs)

| Asset | URL | Author | License | St | Tris | Notes | Fit |
|---|---|---|---|---|---|---|---|
| tarbosaurus | https://sketchfab.com/3d-models/tarbosaurus-c24593fd9338403ab563977e8c79cfd0 | seth the yutyrannus | CC Attribution | V | 64k | Gobi apex predator. Credits an earlier model by another artist: check the chain. | 3 |
| Therizinosaurus dinosaur | https://sketchfab.com/3d-models/therizinosaurus-dinosaur-de82fe0d9e3f468b95790c0ef517723e | Paleo Modelist (@victory_) | CC Attribution | V | 20k | Gobi species | 3 |
| Therizinosaurus | https://sketchfab.com/3d-models/therizinosaurus-5433dcaf083546c1a93f8b8121b5d997 | robertfabiani | CC Attribution | V | 35k | Animation by a third party | 3 |
| Ferocious Industries "Animated Creatures" (PBR Pachycephalosaurus, PBR Stegosaurus) | https://sketchfab.com/ferociousindustries.matthias/collections/animated-creatures-3500404251274934ad95b25bbf3cdd69 | Ferocious Industries | Check each (their raptor is CC-BY) | ? | n/l | Same pipeline as the raptor | 2 |
| Quaternius Animated Dinosaur Pack (T-Rex, Triceratops, Stegosaurus, Apatosaurus, Velociraptor + 1) | https://quaternius.com/packs/animateddinosaurs.html | Quaternius | CC0 | V | Low | Blockout and background herds | 2 |
| Tarbosaurus, kenchoo | https://sketchfab.com/3d-models/tarbosaurus-7b4454c5d7e549718d9d09e3f56eef10 | kenchoo | CC BY-NC-SA | V | 31k | **Reject** | 0 |
| Gallimimus, kenchoo | https://sketchfab.com/3d-models/gallimimus-537ae9bf271e4500a791e16ab7a66bda | kenchoo | CC Attribution | V | 9.3k | "Rebuild of a model from The Isle": **reject** | 0 |
| Accurate ankylosaurus rigged | https://sketchfab.com/3d-models/accurate-ankylosaurus-rigged-6c88bb1828034dbbb9ddab5ccc36e0a9 | Hhhhhh66 | CC Attribution | V | n/l | Taken from an upcoming game's Steam page: **reject** | 0 |
| Therizinosaurus (ARK, JW Dominion, Dino Crisis versions) | various | various | CC Attribution | V | 0.5-33k | Game or film rips: **reject** | 0 |

## 5. Need 3: desert environment

### Photoscanned (realistic, need decimation and baking)

Poly Haven **Namaqualand** collection (https://polyhaven.com/collections/namaqualand): CC0, scanned in Goegap Nature Reserve, South Africa (Sept 2023). It has 30+ scans of plants, rocks and ground, 10 HDRIs, and 5 materials. Formats: Blend, FBX, glTF, USD, textures up to 8K. The listed triangle counts are base meshes before subdivision, and some assets are tagged "LODs".

| Asset | URL | License | St | Tris / tex | Notes | Fit |
|---|---|---|---|---|---|---|
| Namaqualand Cliff 01 / 02 | https://polyhaven.com/a/namaqualand_cliff_01, https://polyhaven.com/a/namaqualand_cliff_02 | CC0 | V | Cliff 02: 364K; 8K | Weathered cliff, stacked boulders, cracked slabs. Decimate to 5-15k, bake a 1-2K normal map, recolor toward Art Bible cliff reds. | 4 |
| Rock Face 01 / 02 (models) | https://polyhaven.com/a/rock_face_01, https://polyhaven.com/a/rock_face_02 | CC0 | V | 8K | Layered sedimentary strata, which matches "layered horizontal strata" in the Art Bible | 4 |
| Namaqualand Boulder 02 / 03 / 04, Boulders 01 | https://polyhaven.com/a/namaqualand_boulder_02 (and _03, _04, https://polyhaven.com/a/namaqualand_boulders_01) | CC0 | V | Boulder 02: 184K; 8K; LODs tag | Karoo sandstone boulders, layered. Hazard rocks: decimate to 1-3k and instance. | 4 |
| Namaqualand Rocks 01 | https://polyhaven.com/a/namaqualand_rocks_01 | CC0 | V | 161K; 8K | Quartz-rich, paler | 3 |
| Boulder 01, Rock 07, Rock Boulder Dry | https://polyhaven.com/a/boulder_01, https://polyhaven.com/a/rock_07, https://polyhaven.com/a/rock_boulder_dry | CC0 | V | Rock Boulder Dry is 1.8 m tall | General boulders | 3 |
| Dead Quiver Trunk | https://polyhaven.com/a/dead_quiver_trunk | CC0 | V | 34K; 8K; 2 m | Dry decayed trunk with stump and debris: a dead-tree hazard | 4 |
| Dead Quiver Branch 01 | (in the collection) | CC0 | V2 | n/l | Ground debris | 3 |
| Dead Tree Trunk / 02 | https://polyhaven.com/a/dead_tree_trunk, https://polyhaven.com/a/dead_tree_trunk_02 | CC0 | V | 102K / 156K | Temperate, with lichen and moss: retexture | 2 |
| Quiver Tree 01 / 02 | https://polyhaven.com/a/quiver_tree_01, https://polyhaven.com/a/quiver_tree_02 | CC0 | V | n/l | Striking silhouette, but an African species | 2 |
| Searsia Lucida, Searsia Burchellii, Didelta Spinosa (shrubs) | https://polyhaven.com/a/searsia_lucida, https://polyhaven.com/a/searsia_burchellii | CC0 | V | Searsia Lucida: **842K**, 4.8 m wide | Far over budget. Usable only baked to impostor or billboard cards. | 2 |
| Toadstool Hoodoo, Grand Staircase | https://sketchfab.com/3d-models/toadstool-hoodoo-grand-staircase-fb93a28389594c46ba34e036d08d4427 | CC Attribution (geolavelle) | V | n/l (141-photo drone scan) | A real sandstone hoodoo (Dakota cap on Entrada). Hero landmark. | 4 |
| Desert Cliffs Terrain Scan | https://sketchfab.com/3d-models/desert-cliffs-terrain-scan-561a1628d0b446c7bd3424da48fe1150 | CC Attribution (Pers Scans) | V | 8K + 16K albedo in additional files | Drone scan near Granada, Spain. Backdrop cliff. | 3 |
| Rocky Desert - Terrain | https://sketchfab.com/3d-models/rocky-desert-terrain-0abbd5ee9c404913bc815b7d59a505e3 | CC Attribution (artfromheath), NoAI | V | 320k | NoAI tag: no AI tools on it | 3 |
| Valley Gray Cliff | https://sketchfab.com/3d-models/valley-gray-cliff-e6b9729834dc4fdf99a8c932bc3c6a24 | CC Attribution | V | 14.9k | Grey: recolor | 2 |
| Mesa Butte (1) | https://sketchfab.com/3d-models/mesa-butte-1-766ff3cf43454128a1a6986245c06d63 | CC BY-NC-SA | V | 305k | **Reject** | 0 |
| Rocks Photogrammetry scan (GSXNet) | https://sketchfab.com/3d-models/rocks-photogrammetry-scan-1407f5cdb288470dbdeb968b77a666a7 | CC BY-NC | V | n/l | **Reject** | 0 |
| Voxel Gobi Sand Rock / Dune | https://sketchfab.com/3d-models/voxel-gobi-sand-rock-dune-886afeeaef4d46649dc05b0941183c16 | CC Attribution | V | n/l | Voxel style: mismatch | 1 |

### Bones, skeletons, fossils

| Asset | URL | License | St | Notes | Fit |
|---|---|---|---|---|---|
| Smithsonian 3D, CC0 subset | https://3d.si.edu/cc0 (filter), FAQ https://dashboard.si.edu/openaccess/faq | CC0 for most items (about 3.4-3.6k CC0 vs about 360-410 "usage conditions") | V | CC0 examples: *Mammuthus primigenius* skeleton (https://3d.si.edu/object/3d/mammuthus-primigenius-blumbach:341c96cd-f967-4540-8ed1-d3fc56d31f12, metadata CC0; check media usage) and single dinosaur bones (Stegosaurus sacrum, Edmontosaurus pubis). | 3 |
| Smithsonian "Tyrannosaurus and Triceratops" mount | https://si.edu/object/3d/tyrannosaurus-and-triceratops%3Ad8c62d28-4ebc-11ea-b77f-2e728ce88125 | "Non-commercial, educational, and personal uses" only | V | **Reject.** The Triceratops in it is also a digital composite. | 0 |
| Animated triceratops skeleton (re-upload) | https://sketchfab.com/3d-models/animated-triceratops-skeleton-06cb55f941d94dc8b95ac46f92d89e7c | Uploader claims CC0 "from the Smithsonian" | V | The Smithsonian source above is non-commercial, so the claim is suspect. **Reject.** | 0 |
| University of Dundee Museum: Open Access CC0 | https://sketchfab.com/uod_museums/collections/open-access-cc0-public-domain-3b3ffee70cc04e01952dd6803b366074 | CC0 | V | Animal skulls, Archaeopteryx cast: half-buried skull props | 3 |
| Virtual Curation Lab: Smithsonian Paleobiology | https://sketchfab.com/virtualcurationlab/collections/smithsonian-institution-paleobiology-81a0409c8d9b4c5a9e1dc4b0f26f528f | Per item | ? | 52 fossil mammal skulls. Mirror only: check the 3d.si.edu record for each. | 2 |
| Deinonychus (Velociraptor) Claw | https://sketchfab.com/3d-models/deinonychus-velociraptor-claw-ba0ed7ec94e84af385cca0cb425fe5f1 | CC Attribution (Ian Sayers) | V | Sickle-claw collectible or power-up icon | 3 |

## 6. Need 4: PBR textures and HDRI skies

### Textures

| Asset | URL | License | St | Max res | Notes | Fit |
|---|---|---|---|---|---|---|
| Cliff Side | https://polyhaven.com/a/cliff_side | CC0 | V | 16K | Eroded orange sedimentary cliff with visible layering. **Best cliff texture found.** | 5 |
| Rock Face | https://polyhaven.com/a/rock_face | CC0 | V | 16K | Reddish-brown, cracked | 4 |
| Rock Pitted Mossy | https://polyhaven.com/a/rock_pitted_mossy | CC0 | V | 8K | Orange-red pitted sandstone (strip the moss) | 3 |
| Sandy Gravel 02 | https://polyhaven.com/a/sandy_gravel_02 | CC0 | V | 16K | Tagged "desert": dusty reddish-brown sand and pebbles. Track or ground. | 4 |
| Aerial Sand; Aerial Beach 01 | https://polyhaven.com/a/aerial_sand, https://polyhaven.com/a/aerial_beach_01 | CC0 | V | 8K | Ripples (Beach 01 is wind-sculpted). Coastal: tint and remove ruts. | 3 |
| Dirt Aerial 02 / 03 | https://polyhaven.com/a/dirt_aerial_02, https://polyhaven.com/a/dirt_aerial_03 | CC0 | V | n/l | Dry ground | 3 |
| Withered Grass | https://polyhaven.com/a/withered_grass | CC0 | V | 8K | Sun-bleached blades, for scrub cards | 3 |
| ambientCG Ground031 | https://ambientcg.com/view?id=Ground031 | CC0 | V | 8K | Desert sand plus cracked soil | 4 |
| ambientCG Ground054 / Ground055L | https://ambientcg.com/view?id=Ground054, https://ambientcg.com/view?id=Ground055L | CC0 | V | 16K / n/l | Fine sand (beach); 3-3.5 m tile | 3 |
| ambientCG Ground087 / Ground079S | https://ambientcg.com/view?id=Ground087, https://ambientcg.com/view?id=Ground079S | CC0 | V | n/l | Beige dirt with sand; gravel and rocks | 3 |
| ambientCG Rock003 | https://ambientcg.com/view?id=Rock003 | CC0 | V | 4K | Beige cliff rock | 3 |
| ambientCG Rock060 / Rock022 / Rock023 | https://ambientcg.com/view?id=Rock060 (and Rock022, Rock023) | CC0 | V | 8K | Cliff rock, mostly grey: tint in the shader | 3 |
| Namaqualand ground materials (5) | https://polyhaven.com/collections/namaqualand | CC0 | V2 | n/l | Names not captured: browse the collection | 3 |

Not found: a free CC0 *red sandstone cliff* texture from ambientCG, or a true *dune* texture from Poly Haven. The Poly Haven red-sandstone entries are man-made paving and walls.

### HDRIs (all CC0)

| Asset | URL | St | Notes | Fit |
|---|---|---|---|---|
| Klippad Sunrise 1 | https://polyhaven.com/a/klippad_sunrise_1 | V | 24K unclipped. Soft, low-contrast, warm rays through light clouds, over Namaqualand rocks. **Golden hour.** | 5 |
| Klippad Sunrise 2 | https://polyhaven.com/a/klippad_sunrise_2 | V | Medium contrast | 5 |
| Goegap Road | https://polyhaven.com/a/goegap_road | V | Sunrise over an arid road: high contrast, long shadows, partly cloudy | 5 |
| Klippad Dawn 1 / 2 | https://polyhaven.com/a/klippad_dawn_1, https://polyhaven.com/a/klippad_dawn_2 | V | Warm horizon glow, cool blue ambient: **dusk** or menu | 4 |
| Goegap | https://polyhaven.com/a/goegap | V | Midday desert, hard shadows | 3 |
| Zwartkops Straight Sunset; Noga; Victoria Sunset | https://polyhaven.com/a/zwartkops_straight_sunset, https://polyhaven.com/a/noga, https://polyhaven.com/a/victoria_sunset | V | Generic sunsets | 3 |
| ambientCG EveningSkyHDRI 010A / 010B | https://ambientcg.com/view?id=EveningSkyHDRI010A, https://ambientcg.com/view?id=EveningSkyHDRI010B | V | "Sunny sunset". The B variant has the horizon cleared, so it works as a sky dome behind our own terrain. 1K-16K. | 4 |
| ambientCG EveningSkyHDRI 007A, 005A, 017A, 001B, 012B, 030A | https://ambientcg.com/view?id=EveningSkyHDRI007A (and the others by ID) | V | Sunsets: clouds (017A), overcast (012B), stormy (030A, a possible later-level mood). 1K is about 3 MB; 16K is about 447 MB. | 3-4 |

Memory note: use a **1K HDR** only to build lighting (PMREM). Show the sky as a separate 2-4K LDR or KTX2 image, or keep the current gradient sky. Never ship 8K+.

## 7. Need 5: stylized packs (painterly or illustrated fit)

| Asset | URL | Author | License | St | Contents | Notes | Fit |
|---|---|---|---|---|---|---|---|
| Stylized Nature MegaKit | https://quaternius.com/packs/stylizednaturemegakit.html | Quaternius | CC0 | V | About 116 textured models: 40 trees, 35 plants/flowers, 27 rocks, grass, bushes. FBX/OBJ/glTF (Blend in paid Source tier). About 99 MB. | Ghibli-like, temperate. The rocks are the most reusable part. Dead trees not confirmed. | 3 |
| Desert Canyon - Stylized Environment | https://rg-poly.itch.io/desert-canyon-stylized-environment | RG Poly | One capture says "CC0 ... no attribution required"; another found no license; also sold on CGTrader and Fab | ? | 63 models: modular cliffs, boulders, cacti, dry bushes, props. FBX/Unity/Blend. | **Closest stylized desert kit found.** A comment says it was folded into a mega pack. Confirm the license and that it is still free. Cacti are not Gobi-accurate. | 4 if CC0 |
| Stylized Cliff Rock 003/005/006, Stylized Sand 001/002 | https://3dtextures.me/2024/11/28/stylized-cliff-rock-006/, https://3dtextures.me/category/stylized-textures/, https://3dtextures.me/category/sand/ | 3dtextures.me | CC0 (site FAQ: https://3dtextures.me/about; Cliff 006 and Sand 002 tagged cc0) | V | 1024 px, seamless, hand-painted look: color, normal, displacement, roughness, AO | Painterly surfaces at mobile-friendly sizes | 4 |
| Nature Kit | https://kenney.nl/assets/nature-kit | Kenney | CC0 | V | 330 models (trees, rocks, foliage) | Very simple. Below the bar. | 1 |
| KayKit Forest Nature Pack | https://kaylousberg.itch.io/kaykit-forest | Kay Lousberg | CC0 | V | 200+ unique (1,500+ with recolors) trees, rocks, grass. Free download about 6 MB. | Forest theme, clean flat style | 2 |
| Rocks Stylized (free pack) | https://sketchfab.com/3d-models/free-pack-rocks-stylized-7c60b4d1b8ab4187965f30c5e0212fc0 | PolyOne Studio (based on Sereda's minipack) | Sketchfab Free Standard | V | 3.1k tris total (100 to 1k per rock) | Small set | 2 |
| Stylized Rocks and Cliffs Pack - Game Ready | https://sketchfab.com/3d-models/stylized-rocks-and-cliffs-pack-game-ready-fd45191815c14261b873dcd8e32ed376 | 3dmarkus.art | not captured | ? | n/l | The full pack is on Fab | 2 |
| Free low poly desert rock pack | https://maplemill.itch.io/free-low-poly-desert-rock-pack | MapleMill | not captured | ? | n/l | Check | 2 |
| Quirky Series FREE Animals Pack | https://sketchfab.com/3d-models/quirky-series-free-animals-pack-19e91ef86cd0448f9cbb5d6c538dade2 | Omabuarts | CC Attribution | V | Rigged cartoon animals | Too goofy for the Art Bible | 1 |
| Fab limited-time free assets | https://www.fab.com | various | Fab Standard once claimed (kept forever) | V2 | New free assets every two weeks | Opportunistic. Avoid "UE-Only" listings; see the web-build extraction caveat in section 1. | 2 |

## 8. Recommended starter sets

### (a) High-quality stylized-realistic

| Slot | Pick | Budget target (tris) |
|---|---|---|
| Light + sky | Klippad Sunrise 1 or Goegap Road (1K HDR for PMREM) + EveningSkyHDRI010B (horizon cleared, 2-4K LDR) as the backdrop | n/a |
| Mesas / cliff walls | Namaqualand Cliff 01/02 + Rock Face 01/02, decimated and baked (1-2K albedo+normal), recolored to cliff reds, with Poly Haven **Cliff Side** as a tiling detail map | 40-60k visible |
| Hoodoo landmark | Toadstool Hoodoo (CC-BY), decimated | 5-8k |
| Hazard rocks | Namaqualand Boulder 02-04, decimated to 1-3k, InstancedMesh | 20-30k |
| Dead trees | Dead Quiver Trunk, 34K down to about 3k | 5-10k |
| Track / ground | Sandy Gravel 02 or ambientCG Ground031 at 1K, tinted to the palette | n/a |
| Scrub | Searsia shrubs baked to impostor cards (Withered Grass for blades) | 5-10k |
| Prey | seth the yutyrannus Protoceratops (after a provenance check) decimated to 6-8k; fallback Gobkit/Quaternius proxies | 20-30k for 3-4 on screen |
| Hero raptor | **No free asset meets the bar.** Interim: Ferocious Industries PBR Velociraptor (CC-BY) for rig, clips and proportions, plus our own feather cards and Gobi Streak reskin. Or Animal Maker V2 mesh plus a new rig. Recommended: buy or commission (section 9). | 15-25k |
| Total | | about 120-150k |

### (b) Painterly / illustrated

| Slot | Pick |
|---|---|
| Rocks / cliffs | RG Poly Desert Canyon (if CC0 is confirmed) or Quaternius MegaKit rocks. Alternatively, decimated Poly Haven scans with smoothed normals and a toon ramp. |
| Surfaces | 3dtextures.me Stylized Cliff Rock 005/006 and Stylized Sand 002 (1K, CC0), tinted to Art Bible swatches |
| Sky | Keep the code-built painterly gradient sky, with a 1K HDR only for ambient light |
| Props | Dead Quiver Trunk silhouette remodeled in low-poly, Dundee CC0 skulls simplified, Deinonychus claw (CC-BY) as the collectible |
| Creatures | Gobkit/Quaternius rigs as proxies. The hero raptor remains the gap. |
| Look | Toon ramp + rim light + vertex-color gradients (already in the Art Bible). Texture detail comes from the hand-painted maps, not geometry. |

## 9. Honest gaps (premium-mobile quality bar)

1. **No free feathered Velociraptor that is rigged, animated and polished.** The free feathered ones are static hobbyist meshes (14-28k tris, unknown topology). The free animated ones are scaly and film-like, or PS1/toy low-poly. A pounce or attack-leap clip for a feathered dromaeosaur does not exist for free. Expect to hand-animate in Blender (we already have headless Blender) or buy clips (Kubold raptor sets) and retarget them.
2. **Cheapest credible routes:** the Feathered Raptor - Rigged (Blender) asset at about $79-110 (10,982 tris base / 80,134 with feathers, Royalty Free; protect it in a web build), or commissioning a creature artist (Wobbly Works shows accurate feathered dromaeosaurs). Both beat any free option.
3. **Protoceratops:** only hobbyist meshes; nothing animated at quality. Same for Citipati, Tarbosaurus and Therizinosaurus.
4. **Gobi small mammals and lizards:** nothing species-accurate. Generic CC-BY rats and lizards need reshaping.
5. **Flaming Cliffs red sandstone:** no free scan of the Gobi locality. The Namaqualand, Utah and Spain scans need recoloring and decimating, and their geology reads Karoo or Colorado Plateau rather than Gobi.
6. **Plants:** free scanned shrubs are about 0.8M tris. Mobile needs impostor cards, and those need building.
7. **Skeleton props:** the Smithsonian dinosaur mounts are non-commercial. Expect to build skeleton props from CC0 bone scans plus our own modeling.
8. **Provenance is the main legal risk.** Many CC-BY dinosaurs are game rips or re-uploads of other artists' work. Keep a credits file with the source URL, license version, capture date and a provenance note for each asset.
9. **Pipeline cost:** every realistic pick needs decimation, baking, recoloring to the palette and texture downsizing (8-16K down to 1-2K, then KTX2). Budget that work per asset.
10. **Unverified here because the network was blocked:** live license pages, exact tris for most Sketchfab models, RG Poly's license, Gobkit mesh provenance, and the ambientCG/itch.io file-host names.

## 10. Key license sources consulted
- Poly Haven license and FAQ: https://polyhaven.com/license, https://docs.polyhaven.com/en/faq
- ambientCG license: https://docs.ambientcg.com/license
- Fab Standard License (EULA) and docs: https://www.fab.com/eula, https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab
- Epic Content License (UE-Only content): https://www.unrealengine.com/eula/content
- Megascans change: https://www.cgchannel.com/2024/10/epic-games-has-made-megascans-free-to-all-but-only-until-the-end-of-2024/
- Sketchfab licenses, NoAI policy, terms, sale to KitBash: https://sketchfab.com/licenses, https://sketchfab.com/blogs/community/restricting-generative-ai-use-of-free-models, https://sketchfab.com/terms, https://sketchfab.com/blogs/community/kitbash-acquires-sketchfab-and-artstation/
- Sketchfab download API: https://sketchfab.com/developers/download-api/downloading-models
- CGTrader free/RF use: https://help.cgtrader.com/hc/en-us/articles/360015122437-Can-I-commercially-use-a-free-model
- Smithsonian Open Access FAQ: https://dashboard.si.edu/openaccess/faq
- Mixamo FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
