# Art direction references

Four candidate looks for Raptor Race, with examples to open on a phone, public-domain paleo-art we can legally show, and an art director's scorecard. Research date: 2026-11-09.

**How to use this on iPhone:** App Store links open the App Store app (free to view, no purchase needed). Steam, museum and studio pages open in Safari without login. Where a full film or episode needs a subscription, the link goes to a free official trailer, clip or article instead.

**Verification note:** every link was confirmed to exist through web search results on the research date. The research sandbox could not open Wikimedia, the App Store or YouTube directly, so (a) no video timestamps are given (the videos could not be played; each entry says which part to look for instead), and (b) the Wikimedia direct-image URLs were built from the exact file names using MediaWiki's standard hashed path. Spot-check one before shipping.

---

## At a glance

| Direction | Readability | Fits raptor + desert | Distinct from TR / SS | Build cost (5 = cheapest) | IP safety (5 = safest) | Total /25 |
|---|---|---|---|---|---|---|
| 1. Living field journal | 4 | 5 | 5 | 4 | 4 | **22** |
| 2. Paleo-art mural | 2 | 4 | 4 | 2 | 4 | 16 |
| 3. Amber-lit cinematic | 3 | 4 | 2 | 3 | 3 | 15 |
| 4. Bold graphic | 5 | 4 | 5 | 5 | 3 | **22** |

TR / SS = Temple Run / Subway Surfers.

**Recommendation:** combine 1 and 4. Use the field journal as the identity (ink contours, watercolor wash, paper) and build it on bold graphic structure (three value bands, flat sky bands, a tight palette for each level). Use amber glow only on collectibles and the sun. Keep the painterly mural look for still images (title, loading cards, Field Journal plates, the pounce freeze-frame, store art). Details are in [Recommendation](#recommendation).

Tags used below: `mobile` = shipped mobile game, `paleo` = dinosaur or paleo subject, `PD` = public domain or CC0.

---

## 1. Living field journal
*Ink linework and watercolor washes on paper, like a naturalist's sketchbook come to life.*

**In Raptor Race:** dark ink contours on the raptor, prey and hazards; sand and cliffs as loose warm washes that fade toward unpainted paper near the horizon; amber gems are the only saturated color. The world matches the menus.

1. **Inked: A Tale of Love**, Somnium Games (PC 2018, iOS 2021) · `mobile`
   [App Store](https://apps.apple.com/app/id1537777979)
   Borrow: ballpoint-ink contours and hatching on white paper, rendered live in 3D. Paper is the negative space, so dark-on-light silhouettes read instantly.
2. **GRIS**, Nomada Studio / Devolver Digital · `mobile`
   [App Store](https://apps.apple.com/us/app/gris/id1445379072)
   Borrow: watercolor washes with soft bleeding edges, and a palette that adds color as you progress (a natural way to add color per level).
3. **Okami HD**, Clover Studio / Capcom
   [Steam](https://store.steampowered.com/app/587620/Okami_HD/)
   Borrow: thick-to-thin brush outlines and a paper-texture overlay on a 3D world that stays readable in fast action. Don't borrow its sumi-e and ukiyo-e motifs; those belong to Okami.
4. **Dordogne**, Un Je Ne Sais Quoi / Focus Entertainment
   [Publisher page](https://focus-entmt.com/games/dordogne)
   Borrow: 3D characters and environments that hold up as watercolor (pigment pooling, darker wash edges, paper showing through). This is the closest technical match to what we would build.
5. **Dinotopia** (book series), James Gurney · `paleo`
   [Gurney on designing the explorer's journal](https://gurneyjourney.blogspot.com/2011/12/part-11-origins-of-dinotopia-putting-it.html)
   Borrow: the "found expedition sketchbook" framing with dinosaurs: margin notes, specimen callouts, and a lighter, transparent paint handling. This is the model for the Field Journal plates and the pounce freeze-frame.
6. **Ernest & Celestine** (2012 film), Benjamin Renner, Stéphane Aubier, Vincent Patar
   [GKIDS film page and trailer](https://gkids.com/films/ernest-celestine/)
   Borrow: restraint. Backgrounds are watercolor that stops before the edges, pencil lines appear only where form needs them, and large areas of paper are left bare. Watch the trailer's outdoor scenes.

Also worth a look:
- [Gorogoa](https://apps.apple.com/us/app/gorogoa/id1269225754) (`mobile`): hand-inked panels with muted washes.
- [Old Man's Journey](https://apps.apple.com/us/app/old-mans-journey/id1204902987) (`mobile`): illustrated, layered landscapes.
- The real motif source: a [1923 Central Asiatic Expedition field diary page](https://lbry-web-007.amnh.org/digital/items/show/40337) (AMNH Research Library). This is the Gobi expedition behind the Flaming Cliffs finds. Use it for reference only (AMNH rights).

**Build notes (Three.js):**
- [Susurrus: a watercolor world in Three.js](https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/) (Codrops, 2026) is a mobile-targeted web example.
- [MNPR](https://github.com/Monastery/MNPR) (MIT) documents the watercolor techniques: edge darkening, pigment granulation, paper distortion.
- [Moebius-style post-processing](https://blog.maximeheckel.com/posts/moebius-style-post-processing) shows depth and normal outline passes in vanilla Three.js.

---

## 2. Paleo-art mural
*Painterly, dramatic lighting, like classic natural-history museum murals.*

**In Raptor Race:** a low raking sun, deep warm shadows in the cliff strata, a brushy painted sky and a composed, panoramic sense of a whole ecosystem.

1. **The Age of Reptiles** (1947), Rudolph Zallinger, Yale Peabody Museum · `paleo`
   [Yale News: close-up view during renovation](https://news.yale.edu/2021/02/22/peabody-renovation-offers-unique-view-iconic-dinosaur-mural) · [Burke Hall](https://peabody.yale.edu/explore/exhibitions/burke-hall-dinosaurs)
   Borrow: one continuous panorama that steps from warm to cool as it recedes; vegetation silhouettes frame the animals. Good model for the far backdrop band.
2. **Field Museum murals** (1926-1930), Charles R. Knight · `paleo` (Knight's earlier works are `PD`, see below)
   [Field Museum Photo Archives: Knight gallery](https://www.fieldmuseum.org/blog/photo-archives-charles-knight-paintings-gallery)
   Borrow: big simple tonal masses, atmospheric haze between foreground and distance, and animals posed mid-action. The archive includes Knight's Gobi *Protoceratops* with eggs.
3. **Julius Csotonyi**, museum muralist (Royal Tyrrell, NHM Los Angeles, Smithsonian Deep Time) · `paleo`
   [Portfolio](https://www.csotonyi.com/)
   Borrow: modern, correctly feathered theropods in mural lighting, with bright key light, clear rim edges and a believable habitat. The best "mural, but up to date" reference.
4. **Thomas Moran**, Grand Canyon and Yellowstone paintings · `PD` (CC0 at Smithsonian)
   [SAAM: The Grand Canyon of the Yellowstone](https://americanart.si.edu/artwork/grand-canyon-yellowstone-17831) · [Artist page](https://americanart.si.edu/artist/thomas-moran-3406)
   Borrow: sunlit red and gold canyon walls with layered strata dissolving into haze. The closest painted analog to the Flaming Cliffs.
5. **Fantasia, "The Rite of Spring"** (1940), Walt Disney Productions · `paleo`
   [Walt Disney Family Museum on the segment](https://www.waltdisney.org/blog/fantasia-eight-parts-rite-spring)
   Borrow: theatrical lighting in animation, with one strong light source, glowing volcanic accents and dinosaurs as dark shapes against bright skies.
6. **Hades**, Supergiant Games (Netflix mobile edition) · `mobile`
   [App Store](https://apps.apple.com/app/id6450063142) (playing needs a Netflix membership)
   Borrow: proof that painted textures and dramatic light can stay readable at action speed. Characters keep strong rim light and value separation from busy painted floors.

Also worth a look:
- [Jay Matternes](https://www.smithsonianmag.com/smithsonian-institution/Meet-master-muralist-inspired-generation-paleoartists-180972282/), the Smithsonian's mid-century fossil-hall murals: layered ecosystems with credible anatomy.
- [Albert Bierstadt, Among the Sierra Nevada](https://americanart.si.edu/artwork/among-sierra-nevada-california-2059) (`PD`, CC0): luminous backlit haze.

**Build notes (Three.js):**
- [On Crafting Painterly Shaders](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders) explains the Kuwahara filter, the standard real-time route to a painterly look. It is expensive; see the assessment below.

---

## 3. Amber-lit cinematic
*Rich stylized realism lit through a glowing amber haze, light shafts and teal accents.*

**In Raptor Race:** the sun low and ahead, a backlit raptor with glowing feather rims, dust hanging in the air, teal shadows against amber highlights, and light shafts through rock arches.

1. **Journey**, thatgamecompany / Annapurna Interactive · `mobile`
   [App Store](https://apps.apple.com/us/app/journey/id1445593893) · [GDC talk: Sand Rendering in Journey](https://gdcvault.com/play/1017742/Sand-Rendering-in) · [Shader breakdown (Alan Zucconi)](https://www.alanzucconi.com/2019/10/08/journey-sand-shader-1/)
   Borrow: sand shading (ripple normals, glitter, rim brightening at grazing angles) and the warm-to-cool sky gradient. Don't borrow Journey's glowing-cloth and pilgrim imagery.
2. **Sky: Children of the Light**, thatgamecompany · `mobile`
   [App Store](https://apps.apple.com/us/app/sky-children-of-the-light/id1462117269)
   Borrow: proof that bloom, soft light shafts and height fog run on phones. Look at the golden-hour areas and how glow is kept to a few key objects.
3. **The Pathless**, Giant Squid / Annapurna Interactive · `mobile`
   [App Store](https://apps.apple.com/us/app/the-pathless/id6469709725)
   Borrow: high-speed traversal through stylized-realistic landscapes, with glowing targets that read through fog. Our amber gems need the same treatment.
4. **Prehistoric Planet**, Apple TV+ (BBC Studios Natural History Unit), "Deserts" episode · `paleo`
   [Official trailer](https://www.youtube.com/watch?v=vnoNeMlNeD0) · [Clip: "Did Velociraptor Have Feathers?"](https://www.youtube.com/watch?v=xcRxwi0x5ig)
   Borrow: how a feathered dromaeosaur looks in backlight (feather-edge rims, dust haze, documentary golden hour). The whole feathers clip is relevant. The "Deserts" episode has a Gobi Velociraptor sequence.
5. **Mad Max: Fury Road** (2015), director George Miller, cinematographer John Seale
   [ASC video collection with "The Look of Mad Max: Fury Road"](https://theasc.com/article/asc-breakfast-club-2015-video-collection/)
   Borrow: the teal-and-orange split. Saturated sky against saturated sand gives desert scenes punch instead of a beige wash.
6. **Albert Bierstadt, Among the Sierra Nevada, California** (1868) · `PD` (CC0)
   [Smithsonian object record](https://www.si.edu/object/among-sierra-nevada-california:saam_1977.107.1)
   Borrow: luminist composition, with a light source behind the subject, haze glowing between planes and dark foreground framing.

**Build notes (Three.js):**
- Fake light shafts with additive cone or card meshes (one draw each) rather than screen-space or raymarched god rays.
- Do the grade as a single lookup table (LUT) in the final pass.
- Use the three.js `GodraysNode` only if the project moves to WebGPU ([docs](https://threejs.org/docs/pages/GodraysNode.html)).

---

## 4. Bold graphic
*Flat graphic shapes, strong silhouettes, a tight limited palette, like a travel poster or papercut.*

**In Raptor Race:** cliffs as three or four flat strata bands, dunes as clean curves, a two-band sky with a big sun disc, and a raptor silhouette you can identify from its outline alone. In the papercut variant, layers have slight paper grain and soft drop shadows, which ties into the journal UI.

1. **Alto's Odyssey**, Team Alto (Snowman + Land & Sea) · `mobile`
   [App Store](https://apps.apple.com/us/app/altos-odyssey/id1182456409) · [Press kit](https://altosodyssey.com/press)
   Borrow: depth from layered silhouettes and atmospheric gradients, and a full palette shift for each time of day. **Caution:** this is a desert runner with this exact look, so take the principle and not the side-on dune silhouettes or the gradient sky treatment.
2. **Monument Valley**, ustwo games · `mobile`
   [App Store](https://apps.apple.com/us/app/monument-valley/id728293409)
   Borrow: shading carried by flat face colors (light, mid and dark side per object) and one strict palette per level.
3. **Firewatch**, Campo Santo (art direction by Olly Moss, world by Jane Ng)
   [Steam](https://store.steampowered.com/app/383870/Firewatch/) · [GDC talk video: making the world](https://www.gamedeveloper.com/design/video-how-campo-santo-crafted-the-world-of-i-firewatch-i-)
   Borrow: travel-poster palettes in real-time 3D, with gradient fog that flattens distance into graphic layers and props that simplify with distance. Proof that this style can feel premium.
4. **Primal**, Genndy Tartakovsky (Adult Swim; art director Scott Wills) · `paleo`
   [Show page](https://www.adultswim.com/videos/primal) · [Primal visual storytelling (SDCC 2019)](https://www.adultswim.com/videos/promos/primal-visual-storytelling-sdcc-2019)
   Borrow: dinosaurs built from bold shape language (wedges, big negative spaces), red skies and silhouettes against flat color fields. Full episodes may need a login; the promos do not.
5. **WPA national park posters** (1936-1943), Library of Congress · `PD` (no known restrictions)
   [Free-to-use collection](https://www.loc.gov/free-to-use/wpa-posters/) · [Example: "The national parks preserve wild life"](https://www.loc.gov/item/98518597/)
   Borrow: 3 to 5 flat silkscreen colors, a stylized sun and strata, and wildlife as clean shapes. A direct reference for a level palette.
6. **The Adventures of Prince Achmed** (1926), Lotte Reiniger · `PD` (US only)
   [Open Culture, with the film](https://www.openculture.com/2026/03/the-adventures-of-prince-achmed-the-oldest-surviving-animated-feature-film.html)
   Borrow: black cut-paper silhouettes over glowing colored grounds. This is the papercut extreme of the style and shows how much a silhouette alone can carry.

Also worth a look:
- [Sable](https://store.steampowered.com/app/757310/Sable/): a desert game with thin outlines and flat pastel fills in 3D. Its look is recognizable, so take the technique only.
- [Charley Harper's "minimal realism"](https://www.thehenryford.org/explore/blog/charley-harper-ford-motor-company-and-minimal-realism/): wildlife reduced to geometry without losing the species.
- [Badland](https://apps.apple.com/us/app/badland/id535176909) (`mobile`): silhouettes over painted backdrops.
- [Tengami](https://apps.apple.com/app/id794960248) (`mobile`): pop-up papercraft.

---

## Subject reference (any direction)
- [AMNH: the Fighting Dinosaurs](https://www.amnh.org/explore/ology/paleontology/fighting-dinos2) and the [AMNH Velociraptor exhibit page](https://www.amnh.org/exhibitions/permanent/saurischian-dinosaurs/velociraptor): the real Velociraptor vs Protoceratops pairing from the red sandstone of the Djadokhta Formation. The specimen comes from Tugrugiin Shiree, about 50 km from the Flaming Cliffs (Bayanzag), in the same formation.

---

## Public-domain paleo-art we can show

Use these as **in-game Field Journal plates** (for example, "1897 restoration", with a short note on what science has since corrected). Their anatomy is outdated (no feathers, dragging tails), so they are period pieces, not a model for our raptor.

| Work | Commons file page | Direct image | Why it is PD |
|---|---|---|---|
| **Leaping Laelaps** (now *Dryptosaurus*), Charles R. Knight, painted 1896-97, published 1897 (*Century Magazine*); AMNH | [File:Laelaps-Charles Knight-1897.jpg](https://commons.wikimedia.org/wiki/File:Laelaps-Charles_Knight-1897.jpg) | [upload.wikimedia.org/.../8/8f/Laelaps-Charles_Knight-1897.jpg](https://upload.wikimedia.org/wikipedia/commons/8/8f/Laelaps-Charles_Knight-1897.jpg) | US: published before 1931. Elsewhere: Knight died 1953, so PD in life+70 countries since 1 Jan 2024. A faithful scan of 2D art adds no new copyright (Commons "PD-Art"). |
| **Agathaumas** (a Triceratops-like ceratopsian), Knight, 1897, made under E. D. Cope for *Century Magazine* | [File:Agathaumas.jpg](https://commons.wikimedia.org/wiki/File:Agathaumas.jpg) | [upload.wikimedia.org/.../3/35/Agathaumas.jpg](https://upload.wikimedia.org/wikipedia/commons/3/35/Agathaumas.jpg) | Same as above. Independent US PD proof (printed in a PD publication): [Standard Ebooks](https://standardebooks.org/artworks/charles-r-knight/agathaumas). |
| **Nesting Protoceratops**, Knight, 1922 (Field Museum; dated 1922 or 1927 in museum records). A Gobi subject, our prey species. | [File:Nesting Protoceratops.jpg](https://commons.wikimedia.org/wiki/File:Nesting_Protoceratops.jpg) | [upload.wikimedia.org/.../4/49/Nesting_Protoceratops.jpg](https://upload.wikimedia.org/wikipedia/commons/4/49/Nesting_Protoceratops.jpg) | Commons tags it PD in the US; life+70 term expired (Knight died 1953). Check the publication date on the file page: US PD needs publication before 1931, and both candidate dates qualify. Commons flags it as inaccurate (the nest and eggs are Oviraptor's), which is good material for a Journal correction note. |

**Fallback links:** if a direct URL ever 404s, `https://commons.wikimedia.org/wiki/Special:FilePath/<File name>` always redirects to the current file.

Other legal sources for PD and CC0 images:
- **Édouard Riou, Iguanodon biting Megalosaurus** (wood engraving, about 1863): Public Domain Mark at the [Wellcome Collection](https://wellcomecollection.org/works/z7auazav). Riou died in 1900. Ideal ink-engraving reference for direction 1.
- **Thomas Moran and Albert Bierstadt** (Smithsonian American Art Museum): released as **CC0**, so commercial use is fine without attribution. [Grand Canyon of the Yellowstone](https://americanart.si.edu/artwork/grand-canyon-yellowstone-17831), [Among the Sierra Nevada](https://www.si.edu/object/among-sierra-nevada-california:saam_1977.107.1).
- **WPA posters** (Library of Congress): marked "no known restrictions on publication". That is not a formal PD ruling, so check each item's rights note. [Collection](https://www.loc.gov/free-to-use/wpa-posters/).
- **Roy Chapman Andrews, *On the Trail of Ancient Man*** (1926), the Central Asiatic Expeditions narrative: [scan on archive.org](https://archive.org/details/ontrailofancient00andr). PD in the US (published before 1931). Not yet PD in life+70 countries (Andrews died 1960), so use it for US builds only or as reference.
- **Viewing-only galleries:** the Linda Hall Library's [Paper Dinosaurs](https://www.lindahall.org/experience/digital-exhibitions/paper-dinosaurs/) exhibition (Knight, 1897-1942).

**Look, don't ship:**
- Field Museum archive scans are licensed **CC BY-NC 4.0**, which forbids commercial use; use the Commons scans of the same works instead.
- Copyrighted and reference only: Zallinger (1947), Matternes, Burian, Henderson, Gurney, Csotonyi, and every game and film above.

---

## Art director assessment

Scored for this game: portrait phone screen, running speed, feathered raptor, Gobi at golden hour, an iPhone 12-class GPU at DPR 2 (about 780x1688 pixels), and fewer than 150 draw calls. The owner's M1 notes weigh heavily: "boxy, low-res, not close to AAA", "no artistic identity", "too close to Temple Run".

The cost notes refer to the in-engine look treatments in `src/render/post/looks.ts`, which render each direction as one full-screen pass over the current scene.

### 1. Living field journal: 22/25
- **Readability 4.** Dark ink on light paper is the most legible combination there is, and contour lines separate the raptor, hazards and collectibles even in grayscale. The risk is soft washes flattening the track; keep hazards the darkest inked value and the track the lightest wash.
- **Fit 5.**
  - A naturalist's sketch is how feathered dinosaurs are studied and drawn; hatching suits feathers.
  - The desert becomes warm paper with sienna washes.
  - It continues the existing expedition-journal UI and fits the Field Journal codex, the insect-amber collectible and the 1920s Gobi expeditions.
- **Distinct 5.** No major runner looks like this. It answers "no identity" directly.
- **Build 4.**
  - The prototype is one pass with about 10 texture fetches plus procedural noise. Replace the noise with a pre-baked tiling paper texture to cut the arithmetic.
  - Depth-only edges miss creases. A normal pre-pass roughly doubles draw calls (about 26 to 52), still within budget, or use inverted-hull outlines (already used on collectibles) for the raptor, prey and hazards.
  - Rendering through the composer drops the canvas MSAA, so give the render target `samples: 4` or ink lines will shimmer at speed.
  - It is forgiving of mixed free low-poly assets because line and wash unify them.
- **IP 4.** Ink and watercolor is a centuries-old naturalist tradition. Avoid Okami's sumi-e brush motifs and Inked's ballpoint-on-white specifically.
- **Owner-feedback risk:** inking every polygon edge would make low-poly meshes look boxier. Ink only silhouettes and strong creases, and smooth the normals on organic shapes.

### 2. Paleo-art mural: 16/25
- **Readability 2.** Painterly filters smear small, fast objects (hazards, gems), and dramatic chiaroscuro conflicts with the Art Bible rule "track light, calm".
- **Fit 4.** Murals are literally the tradition of depicting dinosaurs, and red canyon light suits the cliffs. But murals are composed stills, and a runner never holds a composition.
- **Distinct 4.** Rare in runners.
- **Build 2.**
  - The prototype's Kuwahara filter (radius 7) samples 225 texels per pixel. At 780x1688 that is about 300 million fetches per frame (about 18 billion per second at 60 fps), which is not viable on a phone.
  - Half resolution at radius 3 is roughly 18 times cheaper but blurs gameplay objects.
  - The real route is hand-painted textures and matte-painted skies, which free assets rarely provide.
- **IP 4.** A broad tradition. Don't recreate Zallinger's or any film's specific mural.
- **Owner-feedback risk:** can look like a filter over the old game rather than a new look.

### 3. Amber-lit cinematic: 15/25
- **Readability 3.** Backlight gives great rims, but haze and bloom compress values, so hazards and sand converge. Haze must stay in the far field only.
- **Fit 4.** Golden-hour desert is native to this look, and backlit feathers look stunning. But convincing realistic feathers are the hardest thing to render well on mobile, and a weak attempt reads as cheap.
- **Distinct 2.** Warm, semi-realistic lighting is the closest of the four to Temple Run 2's look, and golden sand with glow is strongly associated with Journey and Sky.
- **Build 3.**
  - The grade and fog are nearly free.
  - UnrealBloomPass adds about a dozen small passes (its blur chain already starts at half resolution). That cost is measurable on phones; keep the current sprite halos unless bloom clearly earns it.
  - Fake shafts are cheap.
  - The expensive part is content: stylized realism needs high-fidelity models and textures. CC0 sand and rock textures exist, but a quality feathered dromaeosaur does not.
- **IP 3.** Generic in pieces, but the whole is close to thatgamecompany's desert games.
- **Owner-feedback risk:** the most "AAA"-sounding option on paper, but the hardest to make actually look AAA with this team and pipeline.

### 4. Bold graphic: 22/25
- **Readability 5.** Flat value bands and silhouettes are the gold standard for speed reading, and the grayscale test passes by construction.
- **Fit 4.** Strata and dunes are natural flat bands, and the raptor wedge silhouette is iconic. It is less "scientific" than the journal, but Charley Harper shows natural history survives the reduction.
- **Distinct 5.** Far from both Temple Run and Subway Surfers.
- **Build 5.** It can be done entirely in materials (stepped toon ramp, gradient fog, unlit sky bands) with no post-processing at all, so it is the cheapest on battery. Free low-poly CC0 packs fit after recoloring.
- **IP 3.** Alto's Odyssey is a desert runner with flat silhouettes and gradient skies, the closest genre neighbor of any direction. Our 3D chase camera helps, but the palette and sky must differ.
- **Owner-feedback risk:** done plainly, it reads as the same low-poly look the owner scored 1-2/5. It needs Firewatch-level shape design and the papercut and paper-grain finish to feel premium.

---

## Recommendation

**Build "the field journal come alive" (direction 1) on a bold graphic value plan (direction 4).** They tie on points but cover each other's weaknesses. The graphic structure guarantees speed readability and low cost. The journal surface supplies the identity the owner asked for and continues the UI.

- **Structure (from 4):**
  - Three value bands per material via a stepped ramp.
  - A two-band sky with a sun disc.
  - Strata as flat bands.
  - The Art Bible palette kept to about 12 hues per level.
  - Hazards are always the darkest ink, and the track is always the lightest wash.
- **Surface (from 1):**
  - Inverted-hull ink outlines on the raptor, prey, hazards and collectibles, with a depth-edge pass for terrain and line width fading with distance.
  - A watercolor wash that modulates the fills.
  - A static screen-space paper grain (baked texture) and deckled-edge vignette.
- **Glow (from 3):** amber gems, the insect-amber collectible and the sun are the only glowing things, using sprite halos (not full-screen bloom). Optionally add a slight teal shadow tint for the cool accent.
- **Stills (from 2):** title screen, loading cards, Field Journal plates, the pounce freeze-frame and store art can be fully painterly, because cost does not matter in a still. Knight's PD plates go in the Journal as "historic restorations" with correction notes.
- **Guardrails:**
  - No Okami brush and celestial motifs.
  - No Alto-style side-on dune silhouettes or its sky gradients.
  - No Journey cloth or glowing-glyph imagery.
  - No film-style scaly raptor (already in the Art Bible).

**Next steps for the owner gate:**
1. Show phone screenshots of all four looks plus the hybrid at the same three moments: start, hazard cluster and pounce. Include grayscale versions.
2. Measure frame time for each on an iPhone 12-class device with `?debug=1`.
3. Ask the owner two questions: "Which feels most like *your* game?" and "Which do you read fastest while running?"
