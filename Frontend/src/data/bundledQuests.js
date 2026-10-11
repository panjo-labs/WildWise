// Bundled curated nature quests for offline-first exploration
// Yeh offline collection bina internet ya API key ke browser mein chalti hai
// Inhe kabhi bhi AI-generated claim mat karo — yeh curated outdoor exploration quests hain

export const BUNDLED_QUESTS = [
  {
    id: "offline-park-plants-1",
    quest_title: "The Canopy & Bark Trail",
    introduction: "An offline exploration of neighborhood trees and foliage. Take your time to observe botanical details without rushing.",
    estimated_minutes: 20,
    environment: "Park",
    difficulty: "Beginner",
    interests: ["Plants", "General Discovery"],
    is_offline: true,
    source: "offline_curated",
    challenges: [
      {
        id: 1,
        title: "Leaf Edge Classification",
        instruction: "Find three fallen leaves from different trees. Examine their margins: are they smooth (entire), serrated (toothed), or lobed?",
        fact: "Toothed leaf margins help plants lose water vapor faster in cool early-season mornings, jumpstarting photosynthesis."
      },
      {
        id: 2,
        title: "Bark Texture Comparison",
        instruction: "Compare the trunk bark of a young tree versus a mature tree. Feel the grooves, peeling layers, or smoothness with your fingers.",
        fact: "Bark serves as a tree's protective armor against insect invasion, wildfires, and moisture loss."
      },
      {
        id: 3,
        title: "Sun vs. Shade Leaves",
        instruction: "Find leaves growing in direct sunlight and compare them with leaves in deep shade from the same or nearby plant. Notice any thickness or size differences.",
        fact: "Sun leaves are typically thicker with more layers of photosynthetic cells, while shade leaves are broader and thinner to capture diffused light."
      }
    ]
  },
  {
    id: "offline-garden-insects-1",
    quest_title: "Secret Micro-Fauna Safari",
    introduction: "Discover the hidden pollinators and leaf-dwellers in your local garden. Observe from a respectful distance without touching.",
    estimated_minutes: 15,
    environment: "Garden",
    difficulty: "Beginner",
    interests: ["Insects", "Plants"],
    is_offline: true,
    source: "offline_curated",
    challenges: [
      {
        id: 1,
        title: "Pollinator Flower Patrol",
        instruction: "Watch a single patch of flowering blooms for 3 minutes. Count how many distinct winged visitors arrive without disturbing them.",
        fact: "Over 75% of the world's flowering plant species depend on animal pollinators to reproduce."
      },
      {
        id: 2,
        title: "Underside Leaf Inspection",
        instruction: "Gently tilt a broad leaf upwards to inspect its underside for tiny critters, silk webbing, or sheltered aphids.",
        fact: "The underside of leaves provides microclimates sheltered from rain, direct sun, and predatory birds."
      },
      {
        id: 3,
        title: "Ant Trail Navigation",
        instruction: "Locate an active ant line on a walkway or plant stem. Trace where they are heading and notice how they communicate when crossing paths.",
        fact: "Ants leave invisible pheromone trails that act as chemical highways for nestmates."
      }
    ]
  },
  {
    id: "offline-forest-textures-1",
    quest_title: "Woodland Tactile & Sound Journey",
    introduction: "Tune into the physical textures and auditory layers of a woodland or tree grove.",
    estimated_minutes: 30,
    environment: "Forest",
    difficulty: "Curious Explorer",
    interests: ["Textures", "General Discovery"],
    is_offline: true,
    source: "offline_curated",
    challenges: [
      {
        id: 1,
        title: "Natural Soundscape Count",
        instruction: "Close your eyes for 2 full minutes. Count each distinct non-human sound: bird calls, rustling leaves, wind gusts, or creaking branches.",
        fact: "Acoustic ecology studies show that biodiversity can be measured by the density and complexity of natural soundscapes."
      },
      {
        id: 2,
        title: "Decomposition Layer Scout",
        instruction: "Examine the forest floor litter layer. Observe how top dry leaves transition into darkened, crumbling humus beneath.",
        fact: "The forest floor organic layer recycles nutrients back into the soil through mycelial and microbial decay."
      },
      {
        id: 3,
        title: "Lichen & Moss Colony Mapping",
        instruction: "Find a rock or log colonized by lichen or moss. Notice how many distinct colors (pale green, orange, grey) coexist.",
        fact: "Lichens are symbiotic partnerships between fungi and algae/cyanobacteria, and serve as sensitive bio-indicators of clean air."
      },
      {
        id: 4,
        title: "Dappled Light Shadow Tracking",
        instruction: "Observe the pattern of sunlight filtering through the canopy onto the ground. Notice how the wind alters the illumination geometry.",
        fact: "The shimmering effect of sunlight filtering through windblown trees is known in Japanese as 'Komorebi'."
      }
    ]
  },
  {
    id: "offline-anywhere-birds-1",
    quest_title: "Urban & Suburban Avian Watch",
    introduction: "Observe birds in your immediate vicinity — rooftop edges, telephone lines, shrubs, or lawn edges.",
    estimated_minutes: 20,
    environment: "Anywhere Outdoors",
    difficulty: "Beginner",
    interests: ["Birds", "General Discovery"],
    is_offline: true,
    source: "offline_curated",
    challenges: [
      {
        id: 1,
        title: "Flight Pattern Observation",
        instruction: "Watch two different birds in flight. Does one glide smoothly while the other flaps in quick bursts or undulating swoops?",
        fact: "Wing shape dictates flight style: broad rounded wings excel in quick maneuverability, while narrow wings favor soaring."
      },
      {
        id: 2,
        title: "Perch & Foraging Behavior",
        instruction: "Spot a bird searching for food. Is it hopping along the grass, pecking at bark crevices, or scanning from a high perch?",
        fact: "Different bird species divide niches in the same territory to reduce direct competition for resources."
      },
      {
        id: 3,
        title: "Avian Vocalization Mapping",
        instruction: "Listen for short alert chips versus longer melodic songs. Determine which direction the calls are coming from.",
        fact: "Short 'chip' calls are usually alarm or contact signals, while complex songs establish territory and courtship."
      }
    ]
  },
  {
    id: "offline-anywhere-general-1",
    quest_title: "The Micro-Wilderness Right Outside",
    introduction: "You do not need a national park to explore nature. Even sidewalk cracks, wall creepers, and neighborhood shrubs hold resilient ecosystems.",
    estimated_minutes: 10,
    environment: "Anywhere Outdoors",
    difficulty: "Beginner",
    interests: ["General Discovery", "Textures"],
    is_offline: true,
    source: "offline_curated",
    challenges: [
      {
        id: 1,
        title: "Pavement Crevice Flora",
        instruction: "Locate a plant growing out of a concrete seam or brick wall. Note how it anchors itself despite minimal soil.",
        fact: "Pioneer plants have specialized taproots that exploit hairline fissures, accumulating organic matter for future vegetation."
      },
      {
        id: 2,
        title: "Wind & Cloud Observation",
        instruction: "Look up at the cloud layer for 60 seconds. Note their movement direction and speed relative to trees swaying at ground level.",
        fact: "Upper-level winds often travel in different directions from surface breezes due to atmospheric pressure gradients."
      },
      {
        id: 3,
        title: "Natural vs. Human Sound Balance",
        instruction: "Take 5 deep breaths and focus on acoustic contrast: identify at least one natural sound cutting through the urban hum.",
        fact: "Mindful nature listening significantly lowers cortisol and restores attentional capacity."
      }
    ]
  }
];

/**
 * Preferences ke hisaab se offline collection me se best matching quest dhundhta hai
 */
export function getBundledQuest({ environment, interests = [], difficulty }) {
  const scored = BUNDLED_QUESTS.map((quest) => {
    let score = 0;
    if (environment && (quest.environment === environment || quest.environment === "Anywhere Outdoors")) {
      score += 2;
    }
    if (difficulty && quest.difficulty === difficulty) {
      score += 1;
    }
    if (interests && interests.length > 0) {
      const overlap = quest.interests.filter((i) => interests.includes(i)).length;
      score += overlap * 2;
    }
    return { quest, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const highest = scored[0].score;
  const topPicks = scored.filter((item) => item.score === highest).map((item) => item.quest);
  
  // Pick randomly from top matches so the user gets variety
  const chosen = topPicks[Math.floor(Math.random() * topPicks.length)];
  return JSON.parse(JSON.stringify(chosen));
}
