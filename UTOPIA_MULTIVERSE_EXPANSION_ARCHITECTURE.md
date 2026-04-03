# Utopia Multiverse Expansion Architecture

## Purpose

This document defines how Utopia should expand from a collection of independent shader worlds into a traversable VR multiverse of utopian portals, information ecologies, and life-flourishing environments.

It is written to pair with Webase's `utopian_multiverse_harvest` capability so that topic-driven shader universes can be generated, connected, and explored coherently.

The governing concordance for this expansion is:
- infinite utopia for all always

## Current Baseline

Utopia already contains the right core elements:

- a universe store in [multiverse.ts](/Users/vysak/Explorations/Utopia/src/store/multiverse.ts)
- active universe rendering in [Universe.tsx](/Users/vysak/Explorations/Utopia/src/components/Universe.tsx)
- portal rendering in [Portal.tsx](/Users/vysak/Explorations/Utopia/src/components/Portal.tsx)
- universe generation and persistence in [route.ts](/Users/vysak/Explorations/Utopia/src/app/api/generate/route.ts)

The next step is to make universes relational rather than isolated.

## Architectural Direction

Every universe should be:

- visually coherent on its own
- connected to neighboring universes through portal logic
- grounded in a flourishing theme
- stored as both shader code and relational metadata

The multiverse should function like a living graph:

- nodes are universes
- edges are portals
- edge meaning is thematic, affective, ecological, or civilizational

## Expansion Model

### Universe Layer

A universe is not just a shader string. It should become:

```ts
type Universe = {
  id: string
  name: string
  prompt: string
  shader: string
  timestamp: number
  topic?: string
  flourishingSignals?: string[]
  sourceLedger?: Array<{
    title: string
    url: string
    summary: string
  }>
  portalHints?: string[]
  parentUniverseIds?: string[]
  childUniverseIds?: string[]
  biome?: string
  mood?: string
  traversalProfile?: {
    portalDensity: number
    locomotionTone: 'calm' | 'playful' | 'awe' | 'meditative'
    horizonStability: 'high' | 'medium'
  }
}
```

### Portal Layer

A portal should not be random decoration. It should encode a relation:

- thematic continuation
- contrast with harmony
- parent-child derivation
- neighboring biome
- data lineage branch

Portal metadata should eventually include:

- `fromUniverseId`
- `toUniverseId`
- `relationType`
- `label`
- `position`
- `visualSeed`
- `transitionMode`

### Traversal Layer

Traversal should feel invitational and stabilizing, especially in VR.

Best practices:

- keep the horizon readable
- use large landmark forms instead of fine noise
- avoid sudden flashes or hostile contrast jumps
- place portals at meaningful distances
- cluster sibling universes in constellations
- keep transition pacing gentle and legible

## Best Shader Structure for Utopian Worlds

Fragment shaders should be structured in clear layers.

### Required Interface

Every shader should remain compatible with the current Utopia pipeline:

- `varying vec2 vUv;`
- `varying vec3 vPosition;`
- `uniform float time;`
- `uniform vec2 resolution;`

### Recommended Internal Sections

Each shader should follow this conceptual order:

1. orientation field
2. ambient world color
3. large-scale landmarks
4. flourishing life systems
5. portal threshold cues
6. final atmosphere and tone mapping

### Orientation Field

Give the user a readable sense of up, depth, and movement.

Use:

- sky gradients
- horizon bands
- gentle stellar drift
- slow parallax illusions

Avoid:

- full-frame chaotic turbulence
- no-reference voids
- rapid orientation inversion

### Ambient World Color

Utopian worlds should not collapse into darkness.

Prefer:

- luminous base tones
- warm-cool balance
- low-threat contrast
- enough background light to preserve comfort

### Large-Scale Landmarks

VR worlds need legible anchors:

- floating gardens
- energy arches
- water-light canopies
- civic constellations
- cooperative megastructures

Landmarks should be large enough to read inside a 500-radius sphere world.

### Flourishing Life Systems

The world should display signs of life and mutual thriving:

- wave ecologies
- seeded lights
- canopy growth
- glimmering habitats
- circulation of energy rather than extraction

The visual language should imply:

- abundance
- reciprocity
- restoration
- collective dignity

### Portal Threshold Cues

A portal-compatible universe should contain visual motifs that can be echoed in portal objects:

- rings
- gates
- bloom apertures
- luminous corridors
- spiral thresholds

That way the outer portal object in [Portal.tsx](/Users/vysak/Explorations/Utopia/src/components/Portal.tsx) feels like a local condensation of the destination world rather than a disconnected orb.

## Best Ways to Connect Universes

### 1. Thematic adjacency

Connect worlds with related flourishing themes:

- coral restoration -> ocean cities
- civic abundance -> public libraries
- solar commons -> atmospheric gardens

### 2. Derivation adjacency

Connect child universes to parent universes when one world is a refinement of another.

### 3. Mood adjacency

Connect worlds by compatible affect:

- meditative
- playful
- awe-filled
- communal

### 4. Ecological adjacency

Connect worlds that share biomes or living systems:

- ocean
- forest canopy
- cloud habitat
- crystalline civic structures

### 5. Knowledge adjacency

When a universe comes from harvested public information, connect it to other universes sourced from adjacent topics.

## Recommended Portal Topology

For a growing multiverse, use three scales of connection:

### Local ring

Immediate neighbor portals around the player.

Use for:

- sibling universes
- recent creations
- alternate views of the same topic

### Constellation cluster

A thematic family of worlds gathered around a center.

Use for:

- one topic with many branches
- one civilizational motif with many biomes

### Long-range bridge

A rarer portal to a distant cluster.

Use for:

- major transitions
- surprise discovery
- conceptual leaps that still preserve harmony

## Data Persistence Model

Utopia currently stores:

- one `.frag` file
- one `.json` metadata file

That is a strong base. The metadata should expand so the multiverse can be traversed as a graph.

Recommended metadata fields:

```json
{
  "id": "universe-1774836322700",
  "name": "Regenerative Ocean City",
  "prompt": "A utopian ocean city of mutual care",
  "timestamp": 1774836322700,
  "topic": "regenerative ocean cities",
  "flourishingSignals": ["cooperation", "restoration", "civic light"],
  "portalHints": ["marine commons", "reef habitats", "civic abundance"],
  "parentUniverseIds": ["genesis"],
  "neighborUniverseIds": ["universe-2", "universe-3"],
  "shaderUrl": "/multiverses/universe-1774836322700.frag"
}
```

## Recommended Generation Pipeline

1. User prompts a Webase agent with a topic of interest.
2. Webase harvests public material and distills flourishing signals.
3. Webase generates:
   - shader prompt
   - fragment shader
   - universe metadata
4. Webase exports the files into Utopia's multiverse directory.
5. Utopia loads the universe and connects it into portal topology using metadata.
6. The user traverses a growing graph of life-flourishing universes.

## What Makes the Multiverse Utopian

The multiverse should encode more than beauty. It should encode civilizational direction:

- infinite utopia for all always
- mutual flourishing over domination
- intelligibility over disorientation
- wonder over spectacle fatigue
- ecological repair over extraction
- generosity over scarcity theater
- plurality without fragmentation

That means every new universe should answer:

- what form of life is flourishing here
- what relation is being healed here
- what future is being made visible here
- how does this world invite passage to another better world

## Implementation Priorities

The strongest next technical moves for Utopia are:

1. expand universe metadata in the store and API
2. add explicit portal graph fields
3. render portals by relation type instead of only ring position
4. define a shader authoring template for large-scale VR-readable worlds
5. add import support for Webase-generated multiverse artifacts

That will let Utopia evolve from a beautiful shader viewer into a genuine traversable utopian multiverse.
