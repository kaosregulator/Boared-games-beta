import type { CardFact, CardVideo } from './propCards';

/**
 * The hologram card's extra content, per card id: the header line (kind,
 * year, maker), the "Childhood Pro Tip", "The Real Story" and a few facts.
 * Kept apart from propCards.ts so the stories and jokes there stay as they
 * were written. Every card works without an entry here.
 */
export const PROP_FACTS: Record<string, { kind?: string; year?: string | null; maker?: string | null; joke?: string; history?: string; facts?: CardFact[] }> = {
  "crt-tv": {
    "kind": "CRT television",
    "year": "1990s",
    "maker": null,
    "joke": "Picture fuzzy? Smack the side of the TV. Still fuzzy? Smack it with feeling.",
    "history": "Through the 1990s almost every living room and lucky bedroom had a cathode-ray tube TV: a glass picture tube firing electrons at a phosphor-coated screen. Big sets were famously deep and heavy, and the tube held a strong static charge, which is why the screen made your arm hair stand up. Flat panels replaced them during the 2000s.",
    "facts": [
      {
        "label": "How it works",
        "value": "An electron beam sweeps the screen line by line, lighting up phosphor dots"
      },
      {
        "label": "Standard in the US",
        "value": "NTSC, 525 lines at about 30 frames per second"
      },
      {
        "label": "V-chip",
        "value": "Required by US law on most new sets 13 inches and up from January 1, 2000"
      },
      {
        "label": "The static zap",
        "value": "The tube runs on tens of thousands of volts, so the glass builds up a charge"
      }
    ]
  },
  "crt-vcr": {
    "kind": "VCR",
    "year": "1980s–90s",
    "maker": null,
    "joke": "Set the clock? Absolutely not. Put a piece of electrical tape over the blinking 12:00 and live your life.",
    "history": "JVC introduced the VHS format in Japan in 1976, and it went on to beat Sony's Betamax to become the home video standard. By the 1990s a VCR sat under most TVs, recording shows and playing rentals. The last known VCRs were made in 2016 by Funai in Japan.",
    "facts": [
      {
        "label": "VHS introduced",
        "value": "1976, by JVC"
      },
      {
        "label": "Rival format",
        "value": "Sony Betamax, 1975"
      },
      {
        "label": "A T-120 tape holds",
        "value": "2 hours at SP, about 6 hours at EP/SLP"
      },
      {
        "label": "Last VCRs made",
        "value": "2016 (Funai)"
      },
      {
        "label": "Why 12:00 blinks",
        "value": "The clock resets whenever the power cuts out"
      }
    ]
  },
  "crt-cable": {
    "kind": "Cable box",
    "year": "1990s",
    "maker": null,
    "joke": "Cable box lost signal? Unplug it, count to ten, plug it back in. You are now a cable technician.",
    "history": "Cable converter boxes let a TV tune dozens of channels it couldn't receive on its own, and they descrambled the premium ones you paid for. The famous scrolling listings came from the Prevue Channel, whose grid ran on Commodore Amiga computers at cable headends. Prevue became the TV Guide Channel on February 1, 1999.",
    "facts": [
      {
        "label": "Prevue listings ran on",
        "value": "Commodore Amiga computers"
      },
      {
        "label": "Prevue renamed",
        "value": "TV Guide Channel, February 1, 1999"
      },
      {
        "label": "Scrambled channels",
        "value": "Premium channels were encoded so only paying boxes could show them clearly"
      }
    ]
  },
  "nes": {
    "kind": "Home console",
    "year": "1985",
    "maker": "Nintendo",
    "joke": "Game won't load? Blow in the cartridge, push it down, then pray. Repeat until it works or dinner.",
    "history": "The Nintendo Entertainment System was the American version of Japan's 1983 Famicom, redesigned as a gray, front-loading box so it looked less like a video game after the 1983 industry crash. It test-launched in New York City on October 18, 1985, with Super Mario Bros. close behind, and brought home video games back to life in North America. Blowing in cartridges never actually fixed anything; reseating the cart did, and moisture from your breath could corrode the pins.",
    "facts": [
      {
        "label": "North American debut",
        "value": "October 18, 1985 (New York City test market)"
      },
      {
        "label": "Japanese original",
        "value": "Famicom, July 1983"
      },
      {
        "label": "Units sold",
        "value": "About 61.9 million worldwide"
      },
      {
        "label": "The blinking problem",
        "value": "Worn connector pins in the front-loading slot, not dust"
      }
    ]
  },
  "boombox": {
    "kind": "Boombox",
    "year": "1980s",
    "maker": null,
    "joke": "Making a mixtape? Finger on Pause, other finger on Record, breathe only during commercials.",
    "history": "Portable stereos with big speakers and cassette decks became a street-culture icon in the late 1970s and 1980s, especially in hip-hop and breakdancing scenes. Dual-deck models let you copy one tape to another, which made them mixtape factories. They were also famously hungry for batteries, often running on six to ten D cells.",
    "facts": [
      {
        "label": "Peak era",
        "value": "Late 1970s to early 1990s"
      },
      {
        "label": "Power",
        "value": "Typically 6 to 10 D batteries, or a wall plug"
      },
      {
        "label": "Dual decks",
        "value": "Made tape-to-tape dubbing easy at home"
      },
      {
        "label": "Cassette format",
        "value": "Compact Cassette, introduced by Philips in 1963"
      }
    ]
  },
  "gameboy": {
    "kind": "Handheld console",
    "year": "1989",
    "maker": "Nintendo",
    "joke": "Can't see the screen? Tilt it toward the lamp at exactly 43 degrees and stop breathing.",
    "history": "Nintendo's Game Boy launched in Japan on April 21, 1989 and in North America on July 31, 1989, where it came bundled with Tetris. Designed by Gunpei Yokoi's team, it chose a simple green-tinted screen over color so it could run for many hours on four AA batteries. Together with the Game Boy Color it sold about 118.69 million units.",
    "facts": [
      {
        "label": "Released (NA)",
        "value": "July 31, 1989, at $89.95"
      },
      {
        "label": "Pack-in game",
        "value": "Tetris"
      },
      {
        "label": "Screen",
        "value": "160 × 144 pixels, four shades of green-gray"
      },
      {
        "label": "Sold",
        "value": "About 118.69 million (with Game Boy Color)"
      },
      {
        "label": "Lead designer",
        "value": "Gunpei Yokoi"
      }
    ]
  },
  "tamagotchi": {
    "kind": "Virtual pet",
    "year": "1997",
    "maker": "Bandai",
    "joke": "Pet dying during class? Ask to use the bathroom. Stay twenty minutes. Clean up its poop in peace.",
    "history": "Tamagotchi was created by Aki Maita of Bandai and Akihiro Yokoi of WiZ. It launched in Japan on November 23, 1996 and in the US on May 1, 1997, and its egg-shaped screen pet that needed feeding and cleaning got it banned in plenty of schools. Bandai reports about 98 million sold worldwide as of 2025.",
    "facts": [
      {
        "label": "Released",
        "value": "November 23, 1996 (Japan); May 1, 1997 (US)"
      },
      {
        "label": "Creators",
        "value": "Aki Maita and Akihiro Yokoi"
      },
      {
        "label": "Name",
        "value": "Mix of the Japanese 'tamago' (egg) and 'watch'"
      },
      {
        "label": "Sold",
        "value": "About 98.1 million (Bandai Namco, 2025)"
      }
    ]
  },
  "bed": {
    "kind": "Furniture",
    "year": null,
    "maker": null,
    "joke": "Making your bed is pointless. You're getting back in it tonight. Present this argument calmly.",
    "history": "The kid's twin bed was the base for sleepovers, couch-cushion forts and secret flashlight reading. Twin mattresses became the standard single bed in American kids' rooms in the 20th century. Bed-jumping was banned in every house and practiced in every house.",
    "facts": [
      {
        "label": "Standard twin size",
        "value": "About 38 × 75 inches"
      },
      {
        "label": "Best uses",
        "value": "Fort foundation, trampoline, under-bed storage"
      },
      {
        "label": "Under-bed storage",
        "value": "Usually socks, snacks and one missing library book"
      }
    ]
  },
  "bed-pillow": {
    "kind": "Fair prize",
    "year": null,
    "maker": null,
    "joke": "Missing every ring toss on purpose lowers their guard. Then you still miss. Take the smiley pillow anyway.",
    "history": "The smiley face itself was drawn in 1963 by commercial artist Harvey Ball, for a Worcester, Massachusetts insurance company's staff morale campaign. He was paid $45 and never trademarked it. The grin went on to cover buttons, shirts, and plenty of carnival prizes.",
    "facts": [
      {
        "label": "Smiley designed",
        "value": "1963, by Harvey Ball"
      },
      {
        "label": "Original client",
        "value": "State Mutual Life Assurance Company"
      },
      {
        "label": "Ball's fee",
        "value": "$45"
      },
      {
        "label": "Trademark",
        "value": "Ball never registered one"
      }
    ]
  },
  "backpack": {
    "kind": "School bag",
    "year": "1990s",
    "maker": null,
    "joke": "Both straps is for nerds. One strap is for legends with a permanent lean to the left.",
    "history": "Nylon backpacks became standard school gear in the 1970s and 80s, when outdoor brands like JanSport started selling them to students. By the 90s a backpack was a personality: pins, patches, keychains and markered names. Kids really did argue about one strap versus two.",
    "facts": [
      {
        "label": "JanSport founded",
        "value": "1967, Seattle"
      },
      {
        "label": "Common material",
        "value": "Nylon or Cordura fabric"
      },
      {
        "label": "Decor of choice",
        "value": "Pins, patches, keychains and markered names"
      }
    ]
  },
  "beanbag": {
    "kind": "Furniture",
    "year": "1968",
    "maker": null,
    "joke": "Getting out of a bean bag requires a plan, a grunt, and someone to blame for the noise.",
    "history": "The bean bag chair began as Italian design: the Sacco, created in 1968 by Piero Gatti, Cesare Paolini and Franco Teodoro for the furniture company Zanotta. Filled with polystyrene pellets, it shaped itself to whoever sat in it. Cheaper versions became a staple of kids' rooms and dorms for decades.",
    "facts": [
      {
        "label": "Original design",
        "value": "Sacco, 1968"
      },
      {
        "label": "Designers",
        "value": "Piero Gatti, Cesare Paolini, Franco Teodoro"
      },
      {
        "label": "Maker",
        "value": "Zanotta (Italy)"
      },
      {
        "label": "Filling",
        "value": "Expanded polystyrene beads"
      }
    ]
  },
  "window": {
    "kind": "Window",
    "year": null,
    "maker": null,
    "joke": "Grounded? Bend one blind slat. Peek. Count how many kids are having fun without you.",
    "history": "Thin vinyl and aluminum mini blinds were in nearly every 1980s and 90s house. On summer nights, the window let in box-fan air and cicada noise. Periodical cicadas only come up every 13 or 17 years, so some summers were much louder than others.",
    "facts": [
      {
        "label": "Mini blind slats",
        "value": "Usually about 1 inch wide"
      },
      {
        "label": "Periodical cicadas",
        "value": "Come up on 13- or 17-year cycles"
      },
      {
        "label": "Can-and-string phone",
        "value": "Works only if the string is pulled tight"
      }
    ]
  },
  "window-south": {
    "kind": "Window",
    "year": null,
    "maker": null,
    "joke": "Reading Goosebumps by streetlight counts as bedtime if you're technically lying down.",
    "history": "The orange glow outside came from high-pressure sodium streetlights, which spread across American streets from the 1970s because they were very efficient. They give off a narrow band of yellow-orange light that makes colors hard to tell apart. Most cities have since switched to white LED lights.",
    "facts": [
      {
        "label": "Streetlight type",
        "value": "High-pressure sodium"
      },
      {
        "label": "Color",
        "value": "Yellow-orange, around 2,000 K"
      },
      {
        "label": "Replaced by",
        "value": "LED streetlights, mostly from the 2010s"
      }
    ]
  },
  "door": {
    "kind": "Door",
    "year": null,
    "maker": null,
    "joke": "A KEEP OUT sign is legally binding for siblings. Parents, unfortunately, have a butter knife.",
    "history": "Most bedroom doors use a 'privacy' lock, not a real security lock. It has a small hole or slot on the outside so someone can unlock it in an emergency with a thin tool, which is how every parent got in. KEEP OUT signs were mostly for show.",
    "facts": [
      {
        "label": "Lock type",
        "value": "Privacy lockset, push-button or turn-button"
      },
      {
        "label": "Emergency release",
        "value": "A small hole or slot on the outside knob"
      },
      {
        "label": "Real effectiveness",
        "value": "Low. Parents always got in"
      }
    ]
  },
  "door-poster": {
    "kind": "Poster",
    "year": "1993",
    "maker": null,
    "joke": "Hang the alien poster facing out. That way they know you're on their side.",
    "history": "The X-Files premiered on Fox on September 10, 1993, created by Chris Carter, and followed FBI agents Fox Mulder and Dana Scully investigating the unexplained. The 'I Want to Believe' poster, a UFO over trees, hung in Mulder's basement office and became one of the show's best-known images. The original run lasted nine seasons, to 2002.",
    "facts": [
      {
        "label": "Premiered",
        "value": "September 10, 1993, on Fox"
      },
      {
        "label": "Created by",
        "value": "Chris Carter"
      },
      {
        "label": "Stars",
        "value": "David Duchovny and Gillian Anderson"
      },
      {
        "label": "Original run",
        "value": "9 seasons, 1993–2002"
      },
      {
        "label": "Tagline",
        "value": "The truth is out there"
      }
    ]
  },
  "door-cap": {
    "kind": "Arcade prize",
    "year": "1978",
    "maker": "Taito",
    "joke": "Wear the cap backwards. Forwards is for dads and baseball players who aren't cool.",
    "history": "Space Invaders was designed by Tomohiro Nishikado and released by Taito in Japan in 1978. Its marching rows of aliens became one of the first video game blockbusters and are still recognized everywhere. The aliens speed up as you shoot them because the hardware draws fewer of them faster, a happy accident that made the game more exciting.",
    "facts": [
      {
        "label": "Released",
        "value": "1978 (Japan)"
      },
      {
        "label": "Designer",
        "value": "Tomohiro Nishikado"
      },
      {
        "label": "Publisher",
        "value": "Taito; Midway in the US"
      },
      {
        "label": "Speed-up",
        "value": "The aliens move faster as fewer remain on screen"
      }
    ]
  },
  "door-pins": {
    "kind": "Pins",
    "year": null,
    "maker": null,
    "joke": "One alien pin equals two Pokémon cards and a pudding cup. Do not let them talk you down.",
    "history": "Pin-back buttons and enamel pins have been collected and traded for over a century, from political campaigns to cereal-box prizes. In the 90s they ended up on jean jackets, hats and backpacks. Pin trading is still a big hobby, especially at theme parks.",
    "facts": [
      {
        "label": "Celluloid button patent",
        "value": "1896, Whitehead & Hoag"
      },
      {
        "label": "Common types",
        "value": "Pin-back buttons and enamel lapel pins"
      },
      {
        "label": "Best display",
        "value": "The backpack, until it rips"
      }
    ]
  },
  "nightstand": {
    "kind": "Furniture",
    "year": null,
    "maker": null,
    "joke": "Candy goes in the back of the drawer. Behind the socks. Under the instructions for the Game Boy.",
    "history": "The bedside table became mission control in a 90s kid's room: alarm clock, lamp, and a drawer full of things that weren't supposed to be there. Most were particleboard with a single drawer that stuck if you pulled it straight out.",
    "facts": [
      {
        "label": "Usual contents",
        "value": "Alarm clock, lamp, contraband candy"
      },
      {
        "label": "Drawer trick",
        "value": "Lift and pull"
      },
      {
        "label": "Typical material",
        "value": "Particleboard with a wood-look finish"
      }
    ]
  },
  "ns-clock": {
    "kind": "Clock radio",
    "year": "1990s",
    "maker": "RCA",
    "joke": "Set it seven minutes fast. Then remember it's seven minutes fast. Then snooze seven times. Science.",
    "history": "RCA, General Electric and the rest sold millions of these red-LED clock radios, the kind that lived on every 90s nightstand. A glowing red seven-segment display, an AM/FM dial, a buzzer or wake-to-radio alarm, and a snooze bar the size of the whole top. Many lost the time whenever the power blinked, which is why so many houses had a clock flashing 12:00. Snooze buttons go back to the 1950s.",
    "facts": [
      {
        "label": "Display",
        "value": "Red seven-segment LED"
      },
      {
        "label": "Snooze buttons",
        "value": "Introduced on alarm clocks in the 1950s"
      },
      {
        "label": "Classic snooze length",
        "value": "About 9 minutes on many models"
      },
      {
        "label": "After a power cut",
        "value": "Blinks 12:00 until someone sets it"
      }
    ]
  },
  "ns-lava": {
    "kind": "Lava lamp",
    "year": "1963",
    "maker": null,
    "joke": "Do not shake the lava lamp. If you shake the lava lamp, do not tell anyone you shook the lava lamp.",
    "history": "British inventor Edward Craven Walker came up with the lava lamp after seeing a homemade egg timer bubbling on a pub stove, and launched the first one, the Astro, in 1963. A bulb heats a waxy blob that rises, cools and sinks in liquid. They came back in a big way in the 1990s.",
    "facts": [
      {
        "label": "Invented",
        "value": "1963, by Edward Craven Walker"
      },
      {
        "label": "First model",
        "value": "The Astro"
      },
      {
        "label": "How it works",
        "value": "Heated wax becomes less dense, rises, cools and sinks"
      },
      {
        "label": "Why shaking ruins it",
        "value": "It mixes wax into the liquid and turns it cloudy"
      }
    ]
  },
  "ns-mug": {
    "kind": "Mug",
    "year": null,
    "maker": null,
    "joke": "Correct marshmallow ratio: one cocoa packet, nine marshmallows, zero adult supervision.",
    "history": "Instant hot cocoa packets became an after-school and snow-day staple in American kitchens from the mid-20th century on, with tiny dehydrated marshmallows mixed right in. A homemade art-class mug was the official vessel. A fossilized marshmallow at the bottom is traditional.",
    "facts": [
      {
        "label": "Recipe",
        "value": "One packet, hot water or milk, stir"
      },
      {
        "label": "Marshmallows",
        "value": "Tiny dehydrated ones, already in the mix"
      },
      {
        "label": "Best served",
        "value": "Snow days and after sledding"
      }
    ]
  },
  "ns-teddy": {
    "kind": "Teddy bear",
    "year": "1902",
    "maker": null,
    "joke": "Monsters can't get you if a bear is watching the closet. This is a known rule. Look it up.",
    "history": "The teddy bear is named after President Theodore Roosevelt, who refused to shoot a tied-up bear on a 1902 hunting trip in Mississippi. A Clifford Berryman cartoon of the moment inspired Brooklyn shopkeeper Morris Michtom to make a stuffed 'Teddy's bear.' Around the same time, Germany's Steiff company was making its own jointed bears.",
    "facts": [
      {
        "label": "Named after",
        "value": "President Theodore Roosevelt"
      },
      {
        "label": "Origin story",
        "value": "A 1902 hunting trip in Mississippi"
      },
      {
        "label": "Early makers",
        "value": "Morris Michtom (US) and Steiff (Germany)"
      },
      {
        "label": "Inspired by",
        "value": "A Clifford Berryman newspaper cartoon"
      }
    ]
  },
  "ns-recorder": {
    "kind": "Tape recorder",
    "year": "1980s",
    "maker": "Sony",
    "joke": "Record your own radio show. Then hide the tape forever. Future you will thank you.",
    "history": "Philips introduced the Compact Cassette in 1963, and small portable cassette recorders soon made it easy for anyone to record voices, radio and music. Sony's handheld cassette-corders, and its bright kid-sized My First Sony line in the late 1980s, put recording in kids' hands. Hearing your own voice played back was a shock for a whole generation.",
    "facts": [
      {
        "label": "Cassette format",
        "value": "Compact Cassette, Philips, 1963"
      },
      {
        "label": "Kids' line",
        "value": "My First Sony, late 1980s"
      },
      {
        "label": "Classic trick",
        "value": "Hold Pause, wait for the song, release"
      }
    ]
  },
  "ns-yoshi": {
    "kind": "Sticker",
    "year": "1990",
    "maker": "Nintendo",
    "joke": "Fastest way to the cereal-box prize: pour the whole box into a mixing bowl. Act natural.",
    "history": "Yoshi first appeared in Super Mario World, which launched with the Super Famicom in Japan on November 21, 1990, and came to North America in 1991 with the Super Nintendo. Designed by Shigefumi Hino, the green dinosaur eats enemies with his long tongue and lets Mario ride on his back.",
    "facts": [
      {
        "label": "Debut",
        "value": "Super Mario World (1990)"
      },
      {
        "label": "Designer",
        "value": "Shigefumi Hino"
      },
      {
        "label": "Signature move",
        "value": "Eating enemies with his tongue"
      },
      {
        "label": "Famous sound",
        "value": "A little 'yoshi!' when you hop on"
      }
    ]
  },
  "ns-tapes": {
    "kind": "Book stack",
    "year": "1992–1997",
    "maker": null,
    "joke": "Read Goosebumps under the covers. If the flashlight dies, the haunted mask wins.",
    "history": "R.L. Stine's Goosebumps series started in July 1992 with Welcome to Dead House, published by Scholastic. Sixty-two books came out in the original series through 1997, and at its peak it sold about four million copies a month. Each book ended chapters on a cliffhanger, and the covers by Tim Jacobus were half the appeal.",
    "facts": [
      {
        "label": "First book",
        "value": "Welcome to Dead House, July 1992"
      },
      {
        "label": "Original series",
        "value": "62 books, 1992–1997"
      },
      {
        "label": "Author",
        "value": "R.L. Stine"
      },
      {
        "label": "Cover artist",
        "value": "Tim Jacobus"
      },
      {
        "label": "Tagline",
        "value": "Reader beware, you're in for a scare!"
      }
    ]
  },
  "ns-vhs": {
    "kind": "VHS tapes",
    "year": "1993–1995",
    "maker": null,
    "joke": "Pausing a tape too long chews it up. Pause anyway. The kitchen scene needs studying.",
    "history": "These three were 90s movie-night staples. Jurassic Park (June 1993) mixed Stan Winston's animatronics with ILM's computer-generated dinosaurs. Hocus Pocus (July 1993) underperformed in theaters and became a Halloween classic on home video, and Toy Story (November 1995) was the first entirely computer-animated feature film.",
    "facts": [
      {
        "label": "Jurassic Park",
        "value": "June 11, 1993, directed by Steven Spielberg"
      },
      {
        "label": "Hocus Pocus",
        "value": "July 16, 1993, directed by Kenny Ortega"
      },
      {
        "label": "Toy Story",
        "value": "November 22, 1995, Pixar"
      },
      {
        "label": "Toy Story first",
        "value": "First fully computer-animated feature film"
      }
    ]
  },
  "ns-gameboy": {
    "kind": "Handheld console",
    "year": "1989",
    "maker": "Nintendo",
    "joke": "Batteries dying mid-boss? Raid the TV remote. Blame the cat. The cat can't argue.",
    "history": "The original Game Boy (model DMG-01) ran on four AA batteries, and its simple screen was a big reason they lasted so long. It was tough too: one Game Boy damaged in a fire during the 1991 Gulf War still worked and was displayed at Nintendo's New York store. Nintendo kept making Game Boy hardware until 2003.",
    "facts": [
      {
        "label": "Model number",
        "value": "DMG-01"
      },
      {
        "label": "Power",
        "value": "4 AA batteries"
      },
      {
        "label": "Famous survivor",
        "value": "A fire-damaged Game Boy from the Gulf War that still worked"
      },
      {
        "label": "Successor",
        "value": "Game Boy Color, 1998"
      }
    ]
  },
  "south-shelf": {
    "kind": "Shelf",
    "year": null,
    "maker": null,
    "joke": "High shelf rule: if a little cousin can reach it, it's no longer yours. Stack accordingly.",
    "history": "Every 90s kid's room had a display zone for the stuff that mattered most: collectibles, the good Game Boy and toys that were 'too old' for play but too loved to give away. Wall-mounted shelves kept them out of reach of younger siblings.",
    "facts": [
      {
        "label": "Purpose",
        "value": "Display only"
      },
      {
        "label": "Threat level",
        "value": "Little cousins"
      },
      {
        "label": "Access method",
        "value": "Spinning desk chair (not recommended)"
      }
    ]
  },
  "sh-lava": {
    "kind": "Lava lamp",
    "year": "1965",
    "maker": null,
    "joke": "Lava lamp homework method: check on it every five minutes. Lava done, homework not done.",
    "history": "In 1965 Adolph Wertheimer and Hy Spector spotted Edward Craven Walker's lamp at a German trade show, bought the American rights, and sold it as the Lava Lite from Chicago. Lava lamps were a 60s icon, faded, and boomed again in the 1990s.",
    "facts": [
      {
        "label": "US rights bought",
        "value": "1965, by Wertheimer and Spector"
      },
      {
        "label": "US brand name",
        "value": "Lava Lite"
      },
      {
        "label": "Warm-up time",
        "value": "Usually an hour or more to flow well"
      },
      {
        "label": "Blobs stuck at the top",
        "value": "Usually means the lamp is running too hot"
      }
    ]
  },
  "sh-vhs": {
    "kind": "VHS tapes",
    "year": "1990–1993",
    "maker": null,
    "joke": "Home Alone traps work great on burglars. On dads, less great. Test on a pillow first.",
    "history": "Home Alone (November 1990), written by John Hughes and directed by Chris Columbus, became one of the highest-grossing comedies ever. Aladdin (November 1992), with Robin Williams as the Genie, was the top-grossing film of 1992. Jurassic Park (June 1993) became the highest-grossing film ever at the time, until Titanic.",
    "facts": [
      {
        "label": "Home Alone",
        "value": "November 16, 1990"
      },
      {
        "label": "Aladdin",
        "value": "November 1992; Disney's white clamshell VHS"
      },
      {
        "label": "Jurassic Park",
        "value": "June 11, 1993"
      },
      {
        "label": "'Keep the change, ya filthy animal'",
        "value": "From Angels with Filthy Souls, a fake gangster movie made for Home Alone"
      }
    ]
  },
  "sh-car": {
    "kind": "Die-cast car",
    "year": "1968",
    "maker": "Mattel",
    "joke": "Launching cars off the stairs is science. Write 'experiment' on a piece of paper first to make it official.",
    "history": "Mattel launched Hot Wheels in 1968, pushed by co-founder Elliot Handler, as faster, flashier rivals to Matchbox cars. Low-friction wheels made them fly down the orange track. The first 16 cars are known to collectors as the 'Sweet Sixteen,' and the first one made was a dark blue Custom Camaro.",
    "facts": [
      {
        "label": "Launched",
        "value": "1968"
      },
      {
        "label": "Maker",
        "value": "Mattel"
      },
      {
        "label": "First line",
        "value": "The 'Sweet Sixteen'"
      },
      {
        "label": "Scale",
        "value": "About 1:64"
      },
      {
        "label": "First car produced",
        "value": "Dark blue Custom Camaro"
      }
    ]
  },
  "sh-teddy": {
    "kind": "Teddy bear",
    "year": "1902",
    "maker": null,
    "joke": "Being too old for teddy bears ends the moment thunder starts. Nobody needs to know.",
    "history": "Steiff, the German toy company founded by Margarete Steiff, showed its jointed mohair bear at the 1903 Leipzig Toy Fair, where an American buyer ordered thousands. That helped kick off the teddy bear craze on both sides of the Atlantic. Steiff bears still carry the company's 'Button in Ear' tag.",
    "facts": [
      {
        "label": "Steiff founded by",
        "value": "Margarete Steiff"
      },
      {
        "label": "Big break",
        "value": "Leipzig Toy Fair, 1903"
      },
      {
        "label": "Trademark",
        "value": "The 'Button in Ear'"
      },
      {
        "label": "Classic material",
        "value": "Mohair plush"
      }
    ]
  },
  "sh-gameboy": {
    "kind": "Handheld console",
    "year": "1989",
    "maker": "Nintendo",
    "joke": "Taking the Game Boy to school is fine as long as nobody sees it, hears it, or knows you exist.",
    "history": "Game Boys were the most confiscated item in 90s classrooms. Nintendo's handheld sold 40,000 units on its first day in the US and passed a million within weeks. Pokémon Red and Blue in 1998 kept it alive for years after most consoles of its age had retired.",
    "facts": [
      {
        "label": "US release day sales",
        "value": "About 40,000"
      },
      {
        "label": "Japanese launch",
        "value": "300,000 units sold out in two weeks"
      },
      {
        "label": "Late-life hit",
        "value": "Pokémon Red and Blue (US, 1998)"
      },
      {
        "label": "Discontinued",
        "value": "2003"
      }
    ]
  },
  "sh-turtle": {
    "kind": "Action figure",
    "year": "1988",
    "maker": "Playmates",
    "joke": "Being Leonardo is fine. Just tell everyone Leonardo is the leader, so technically you're in charge.",
    "history": "The Teenage Mutant Ninja Turtles started as a black-and-white comic by Kevin Eastman and Peter Laird in 1984. Playmates Toys launched the action figure line in 1988, alongside the cartoon that began in 1987, and it became one of the best-selling toy lines of its time. Leonardo wears the blue mask and fights with two katana swords.",
    "facts": [
      {
        "label": "Created by",
        "value": "Kevin Eastman and Peter Laird, 1984"
      },
      {
        "label": "Toy line",
        "value": "Playmates Toys, from 1988"
      },
      {
        "label": "Leonardo's mask",
        "value": "Blue"
      },
      {
        "label": "Weapon",
        "value": "Two katanas"
      },
      {
        "label": "Named after",
        "value": "Leonardo da Vinci"
      }
    ]
  },
  "sh-viewmaster": {
    "kind": "Toy viewer",
    "year": "1939",
    "maker": null,
    "joke": "Point it at a lamp for better pictures. Never point it at the sun. Ask someone who tried.",
    "history": "View-Master was introduced around 1939 by Sawyer's of Portland, Oregon, built on photographer William Gruber's idea of putting stereo color slides on a paper reel. Each reel holds seven pairs of tiny Kodachrome slides, one for each eye, which makes the 3D effect. It began as a scenic souvenir and became a classic kids' toy.",
    "facts": [
      {
        "label": "Introduced",
        "value": "Around 1939"
      },
      {
        "label": "Original company",
        "value": "Sawyer's (Portland, Oregon)"
      },
      {
        "label": "Inventor",
        "value": "William Gruber"
      },
      {
        "label": "Each reel",
        "value": "7 stereo scenes (14 tiny images)"
      }
    ]
  },
  "sh-books": {
    "kind": "Books",
    "year": "1993–1995",
    "maker": null,
    "joke": "Carry the giant book to look smart. Actually read the Goosebumps. Nobody needs the details.",
    "history": "Michael Crichton's The Lost World (1995) was his sequel to Jurassic Park, and the movie version followed in 1997. Night of the Living Dummy (1993), the seventh Goosebumps book, introduced Slappy the ventriloquist dummy, who became the series' most famous villain.",
    "facts": [
      {
        "label": "The Lost World",
        "value": "1995, by Michael Crichton"
      },
      {
        "label": "Movie version",
        "value": "1997, directed by Steven Spielberg"
      },
      {
        "label": "Night of the Living Dummy",
        "value": "Goosebumps #7, 1993"
      },
      {
        "label": "Villain introduced",
        "value": "Slappy the Dummy"
      }
    ]
  },
  "toyshelf": {
    "kind": "Toy storage",
    "year": null,
    "maker": null,
    "joke": "Cleaning your room takes ninety seconds if you don't look at what goes in which bin.",
    "history": "Cube shelving with fabric or plastic bins became the standard toy-storage setup in kids' rooms. 'Clean your room' usually meant everything went into the nearest bin. Whatever ended up in there wasn't seen again for months.",
    "facts": [
      {
        "label": "Method",
        "value": "Throw it in the bin"
      },
      {
        "label": "Average time",
        "value": "Under 90 seconds"
      },
      {
        "label": "Contents",
        "value": "A Pokémon box, socks, one roller skate"
      }
    ]
  },
  "ts-teddy": {
    "kind": "Teddy bear",
    "year": null,
    "maker": null,
    "joke": "A teddy with no fur on one ear is how you know it's been doing its job.",
    "history": "Most kids had one stuffed animal that went everywhere and came back worn down from love. Psychologists call it a 'transitional object,' something that comforts a child as they become more independent. The idea was described by pediatrician Donald Winnicott in 1951.",
    "facts": [
      {
        "label": "Psychology term",
        "value": "Transitional object"
      },
      {
        "label": "Described by",
        "value": "Donald Winnicott, 1951"
      },
      {
        "label": "Common repair",
        "value": "Mom with a needle and thread"
      }
    ]
  },
  "ts-handheld": {
    "kind": "LCD handheld",
    "year": "1990s",
    "maker": "Tiger Electronics",
    "joke": "There is no volume button. There is only the beep. Parents learn to live with the beep.",
    "history": "Tiger Electronics, founded in 1978, made cheap handheld LCD games based on everything from Batman to Sonic. Each one could play only a single game, using fixed pre-printed images that lit up on the screen. They were the company's biggest earner through much of the 1990s, and Hasbro bought Tiger in 1998.",
    "facts": [
      {
        "label": "Company founded",
        "value": "June 15, 1978"
      },
      {
        "label": "Screen",
        "value": "Fixed LCD segments, not pixels"
      },
      {
        "label": "Games per unit",
        "value": "One"
      },
      {
        "label": "Bought by Hasbro",
        "value": "1998, for about $335 million"
      }
    ]
  },
  "ts-clock": {
    "kind": "Clock radio",
    "year": "1990s",
    "maker": null,
    "joke": "Set the alarm to radio, not buzzer. Waking up to traffic news is worse, but at least it's somebody.",
    "history": "Clock radios put an alarm clock and an AM/FM radio in one bedside box and were in bedrooms everywhere by the late 20th century. You could wake up to music or the morning DJ instead of a buzzer. Many used a thin wire antenna, so reception depended on where you strung it.",
    "facts": [
      {
        "label": "Bands",
        "value": "AM and FM"
      },
      {
        "label": "Wake modes",
        "value": "Buzzer or radio"
      },
      {
        "label": "FM antenna",
        "value": "Often a thin wire you moved until it worked"
      }
    ]
  },
  "ts-skateboard": {
    "kind": "Skateboard",
    "year": "1990s",
    "maker": null,
    "joke": "Sitting on the skateboard and rolling downhill is a real trick. It's called 'the Survivor.'",
    "history": "Skateboarding started with California surfers in the 1950s and took off after Frank Nasworthy's urethane wheels arrived in 1972, giving boards real grip. By the 90s, street skating ruled, and in 1999 Tony Hawk landed the first 900 at the X Games. Gritty griptape on top kept your feet on the board, and wore through jeans.",
    "facts": [
      {
        "label": "Origins",
        "value": "California, 1950s"
      },
      {
        "label": "Urethane wheels",
        "value": "Frank Nasworthy, 1972"
      },
      {
        "label": "First 900",
        "value": "Tony Hawk, X Games, 1999"
      },
      {
        "label": "Griptape",
        "value": "Sandpaper-like sheet on the top of the deck"
      }
    ]
  },
  "ts-vhs": {
    "kind": "VHS tapes",
    "year": "1980s–90s",
    "maker": null,
    "joke": "Label every tape. Then tape over it anyway. The label is more of a guess.",
    "history": "Recording TV onto blank VHS tapes was a household hobby, and it was legal: in 1984 the US Supreme Court ruled in Sony v. Universal that taping shows to watch later was fair use. Slower recording speeds like EP fit up to six hours on one tape, with lower picture quality.",
    "facts": [
      {
        "label": "Key ruling",
        "value": "Sony Corp. v. Universal City Studios, January 1984"
      },
      {
        "label": "Decision",
        "value": "Home 'time-shifting' is fair use"
      },
      {
        "label": "Speeds",
        "value": "SP (best), LP, EP/SLP (longest)"
      },
      {
        "label": "Bonus content",
        "value": "The commercials"
      }
    ]
  },
  "ts-lava": {
    "kind": "Lava lamp",
    "year": "1992",
    "maker": "Mathmos",
    "joke": "Lava lamps need the whole outlet. Your Game Boy charger can wait. Priorities.",
    "history": "Edward Craven Walker's British company, originally Crestworth, was renamed Mathmos in 1992 after new partners Cressida Granger and David Mulley took over. Mathmos led the lava lamp's big 1990s comeback and still makes lamps in Poole, England, where they've been made since 1963.",
    "facts": [
      {
        "label": "Renamed Mathmos",
        "value": "1992"
      },
      {
        "label": "Original company",
        "value": "Crestworth"
      },
      {
        "label": "Made in",
        "value": "Poole, Dorset, England"
      },
      {
        "label": "Original 1963 model",
        "value": "The Astro"
      }
    ]
  },
  "ts-pokebox": {
    "kind": "Collectibles",
    "year": "1998",
    "maker": null,
    "joke": "Lent your cousin the Charizard? That's not a loan. That's a goodbye.",
    "history": "Pokémon Red and Blue arrived in North America on September 28, 1998, a few weeks after the anime started airing in the US. The trading cards followed in January 1999, and Pokémania took over playgrounds. Many schools banned the cards by the end of 1999 because of trading fights.",
    "facts": [
      {
        "label": "Pokémon Red/Blue (US)",
        "value": "September 28, 1998"
      },
      {
        "label": "Original Pokémon",
        "value": "151"
      },
      {
        "label": "Anime (US debut)",
        "value": "September 1998"
      },
      {
        "label": "Trading card game (US)",
        "value": "January 9, 1999"
      }
    ]
  },
  "ts-magazines": {
    "kind": "Game magazines",
    "year": "1988",
    "maker": "Nintendo",
    "joke": "Up, Up, Down, Down, Left, Right, Left, Right, B, A, Start. Try it on homework. Didn't work.",
    "history": "Nintendo Power debuted with a July/August 1988 issue and became the go-to source for maps, tips and cheat codes. The Konami Code was created by Kazuhisa Hashimoto for the NES version of Gradius and became famous in Contra, where it gives you 30 lives. The Sea-Monkeys ads in the back were selling brine shrimp.",
    "facts": [
      {
        "label": "Nintendo Power first issue",
        "value": "July/August 1988"
      },
      {
        "label": "Konami Code creator",
        "value": "Kazuhisa Hashimoto"
      },
      {
        "label": "Contra code bonus",
        "value": "30 lives"
      },
      {
        "label": "Sea-Monkeys",
        "value": "Brine shrimp, marketed by Harold von Braunhut from 1962"
      }
    ]
  },
  "shelf": {
    "kind": "Board games",
    "year": "1935",
    "maker": "Parker Brothers",
    "joke": "Monopoly ends one of two ways: bankruptcy or somebody 'accidentally' flipping the board.",
    "history": "Parker Brothers began selling Monopoly in 1935, after Charles Darrow sold them a version of the game. It was based on The Landlord's Game, patented by Lizzie Magie in 1904 to show the dangers of monopolies. Classic family game nights relied on boxes like Monopoly, Mouse Trap and Sorry!, each missing a few pieces.",
    "facts": [
      {
        "label": "Monopoly by Parker Brothers",
        "value": "1935"
      },
      {
        "label": "Based on",
        "value": "The Landlord's Game, by Lizzie Magie (patented 1904)"
      },
      {
        "label": "Mouse Trap",
        "value": "1963, Ideal Toy Company"
      },
      {
        "label": "Free Parking jackpot",
        "value": "A house rule, not in the official rules"
      }
    ]
  },
  "gs-helmet": {
    "kind": "Football helmet",
    "year": "1990–1993",
    "maker": null,
    "joke": "Tackling the hedges builds character. The hedges will not tackle back, which is the whole appeal.",
    "history": "The Buffalo Bills are the only NFL team to play in four straight Super Bowls, XXV through XXVIII, after the 1990 to 1993 seasons. Led by Jim Kelly, Thurman Thomas and coach Marv Levy, they lost all four. Super Bowl XXV ended with Scott Norwood's 47-yard field goal going wide right.",
    "facts": [
      {
        "label": "Super Bowls",
        "value": "XXV, XXVI, XXVII, XXVIII"
      },
      {
        "label": "Seasons",
        "value": "1990–1993"
      },
      {
        "label": "Head coach",
        "value": "Marv Levy"
      },
      {
        "label": "Quarterback",
        "value": "Jim Kelly"
      },
      {
        "label": "Super Bowl XXV",
        "value": "Lost 20–19 to the Giants after a missed kick, 'wide right'"
      }
    ]
  },
  "gs-smiley": {
    "kind": "Lamp",
    "year": "1970s",
    "maker": null,
    "joke": "A smiley lamp is comforting until midnight. After midnight, don't make eye contact.",
    "history": "Harvey Ball drew the yellow smiley face in 1963. In the early 1970s, brothers Bernard and Murray Spain paired it with 'Have a nice day' and sold millions of buttons and novelties. It was everywhere again in the late 80s and 90s, from rave flyers to bedroom lamps.",
    "facts": [
      {
        "label": "Smiley created",
        "value": "1963, by Harvey Ball"
      },
      {
        "label": "'Have a nice day' merch",
        "value": "Early 1970s, Bernard and Murray Spain"
      },
      {
        "label": "Revival",
        "value": "Late 1980s and 1990s rave and pop culture"
      }
    ]
  },
  "gs-plant": {
    "kind": "Houseplant",
    "year": null,
    "maker": null,
    "joke": "The secret to keeping a plant alive is forgetting it exists. Leftover Kool-Aid optional.",
    "history": "Hardy houseplants like pothos and snake plants survive almost any amount of neglect, which is why they've lasted in kids' rooms for decades. A famous 1989 NASA Clean Air Study tested common houseplants for removing chemicals from sealed chambers, though a normal room would need a huge number of plants to make a difference.",
    "facts": [
      {
        "label": "Hard-to-kill picks",
        "value": "Pothos, snake plant, spider plant"
      },
      {
        "label": "Pothos nickname",
        "value": "Devil's ivy, because it's so hard to kill"
      },
      {
        "label": "NASA Clean Air Study",
        "value": "1989"
      }
    ]
  },
  "gs-lights": {
    "kind": "String lights",
    "year": "1882",
    "maker": null,
    "joke": "One bulb dies, the whole strand dies. Test them one by one. Cancel your Saturday.",
    "history": "Electric Christmas lights were first used in 1882 by Edward H. Johnson, a partner of Thomas Edison, who hand-wired 80 red, white and blue bulbs on his tree. Cheaper pre-wired strands followed in the early 1900s. Older series-wired strands go dark when one bulb fails, which is why you had to test every bulb.",
    "facts": [
      {
        "label": "First electric tree lights",
        "value": "1882, Edward H. Johnson"
      },
      {
        "label": "Bulbs on that tree",
        "value": "80, red, white and blue"
      },
      {
        "label": "Series wiring",
        "value": "One bad bulb can kill the whole strand"
      },
      {
        "label": "Modern fix",
        "value": "Shunts let current pass a dead bulb"
      }
    ]
  },
  "dresser": {
    "kind": "Furniture",
    "year": null,
    "maker": null,
    "joke": "Stickers on furniture are illegal. Unless they're Nintendo stickers. Then they're art.",
    "history": "The bedroom dresser held clothes in the bottom drawers and secrets in the top one. In a lot of 90s houses it was also a gallery for stickers from magazines, cereal boxes and the school book fair. Sticker residue is famously hard to get off.",
    "facts": [
      {
        "label": "Bottom drawer",
        "value": "Clothes"
      },
      {
        "label": "Top drawer",
        "value": "Anything important"
      },
      {
        "label": "Sticker removal",
        "value": "Hair dryer heat helps; patience mostly doesn't"
      }
    ]
  },
  "dr-stickers": {
    "kind": "Stickers",
    "year": "1988",
    "maker": "Nintendo",
    "joke": "Peeling a sticker halfway is the worst choice. Commit. Leave it or lose it forever.",
    "history": "Mario first appeared in 1981's Donkey Kong, where he was called Jumpman. By the late 80s and 90s Nintendo characters were on everything, and Nintendo Power often came with pull-out posters and other extras. The magazine ran from 1988 to 2012.",
    "facts": [
      {
        "label": "Mario's debut",
        "value": "Donkey Kong (1981), as 'Jumpman'"
      },
      {
        "label": "Created by",
        "value": "Shigeru Miyamoto"
      },
      {
        "label": "Nintendo Power run",
        "value": "1988–2012"
      },
      {
        "label": "Yoshi's debut",
        "value": "Super Mario World (1990)"
      }
    ]
  },
  "dr-nofear": {
    "kind": "Sticker",
    "year": "1989",
    "maker": null,
    "joke": "No Fear means no fear. Except of Mom finding the sticker on the dresser. That's normal fear.",
    "history": "No Fear was founded in 1989 by Mark and Brian Simo, with Marty Moates, in Southern California, coming out of motocross and racing culture. Its shirts carried bold sayings about winning and toughness, and by the mid-90s it was one of the most recognizable logos in America, on shirts, stickers and car windows.",
    "facts": [
      {
        "label": "Founded",
        "value": "1989"
      },
      {
        "label": "Founders",
        "value": "Mark Simo, Brian Simo, Marty Moates"
      },
      {
        "label": "Roots",
        "value": "Motocross and racing"
      },
      {
        "label": "Known for",
        "value": "Slogan T-shirts and stickers"
      }
    ]
  },
  "clutterdesk": {
    "kind": "Desk",
    "year": null,
    "maker": null,
    "joke": "Homework done on the bus counts the same. The bus is just a moving desk.",
    "history": "The bedroom desk was officially for homework and mostly for everything else: Lego, drawing, snacks and games. LEGO's modern interlocking brick was patented in 1958, and by the 90s every desk drawer had a few loose bricks.",
    "facts": [
      {
        "label": "Modern LEGO brick",
        "value": "Patented 1958"
      },
      {
        "label": "LEGO founded",
        "value": "1932, by Ole Kirk Christiansen, Denmark"
      },
      {
        "label": "Name",
        "value": "From Danish 'leg godt,' meaning 'play well'"
      }
    ]
  },
  "cd-lava": {
    "kind": "Lava lamp",
    "year": "1963",
    "maker": null,
    "joke": "Never put crayons next to the lava lamp. Unless you want a new crayon shaped like a puddle.",
    "history": "A lava lamp is a bulb under a glass bottle holding liquid and a waxy blend. Heat makes the wax expand and rise, then it cools at the top and sinks, over and over. Early formulas used carbon tetrachloride, which was banned in US-market lamps from 1970 for being toxic.",
    "facts": [
      {
        "label": "Heat source",
        "value": "An incandescent bulb in the base"
      },
      {
        "label": "Inspiration",
        "value": "An egg timer bubbling on a pub stove"
      },
      {
        "label": "Old formula ingredient",
        "value": "Carbon tetrachloride, dropped in the US by 1970"
      },
      {
        "label": "The base gets",
        "value": "Hot. Very hot."
      }
    ]
  },
  "cd-cup": {
    "kind": "Pencil cup",
    "year": null,
    "maker": null,
    "joke": "Every dead pen goes back in the cup. Someday one will work again. Hope is free.",
    "history": "Sakura Color Products of Japan invented the gel pen in 1984, and its Gelly Roll line and scented, glittery gel pens were everywhere in 90s schools. Retractable click pens are much older; Parker's Jotter came out in 1954.",
    "facts": [
      {
        "label": "Gel pen invented",
        "value": "1984, Sakura Color Products"
      },
      {
        "label": "Famous line",
        "value": "Gelly Roll"
      },
      {
        "label": "Parker Jotter",
        "value": "1954"
      },
      {
        "label": "90s favorites",
        "value": "Glitter, milky and scented inks"
      }
    ]
  },
  "cd-tapes": {
    "kind": "Rental tapes",
    "year": "1990s",
    "maker": null,
    "joke": "Return the rental before it's due. Or don't, and owe the store a car payment.",
    "history": "Video rental stores rented out movies and video game cartridges, and Blockbuster was the biggest. Founded in Dallas in 1985 by David Cook, it reached about 9,000 stores by 2004, then shrank as DVD-by-mail and streaming took over. One store, in Bend, Oregon, is still open.",
    "facts": [
      {
        "label": "Blockbuster founded",
        "value": "1985, Dallas, Texas"
      },
      {
        "label": "Founder",
        "value": "David Cook"
      },
      {
        "label": "Peak",
        "value": "About 9,000 stores (2004)"
      },
      {
        "label": "Last store",
        "value": "Bend, Oregon"
      },
      {
        "label": "Most feared phrase",
        "value": "Late fee"
      }
    ]
  },
  "cd-car": {
    "kind": "Die-cast car",
    "year": "1953",
    "maker": null,
    "joke": "Car noises must be made with your mouth. The louder the noise, the faster the car. Facts.",
    "history": "Small die-cast cars took off with Lesney's Matchbox line in 1953, reportedly started when Jack Odell made a tiny brass model that fit in a matchbox for his daughter's school. Mattel answered with Hot Wheels in 1968, and around 1:64 became the standard pocket-car scale.",
    "facts": [
      {
        "label": "Matchbox launched",
        "value": "1953, by Lesney Products (UK)"
      },
      {
        "label": "Hot Wheels launched",
        "value": "1968, by Mattel"
      },
      {
        "label": "Common scale",
        "value": "About 1:64"
      }
    ]
  },
  "cd-clock": {
    "kind": "Clock radio",
    "year": "1990s",
    "maker": null,
    "joke": "Don't know how to change the alarm? Leave it. You're now an early riser. Congratulations.",
    "history": "Classic clock radios mixed an alarm, a clock and an AM/FM radio, with a big snooze bar on top for hitting in the dark. Many people believe the common 9-minute snooze length came from old clock gears, though the exact reason is debated. Setting the time and alarm took holding down a button and waiting.",
    "facts": [
      {
        "label": "Common snooze",
        "value": "About 9 minutes"
      },
      {
        "label": "Display",
        "value": "Red LED digits"
      },
      {
        "label": "Setting it",
        "value": "Hold a button while the numbers race by"
      }
    ]
  },
  "cd-phone": {
    "kind": "Cell phone",
    "year": "1983",
    "maker": null,
    "joke": "Snake isn't a game. It's 'checking if the phone still works.' For twenty minutes.",
    "history": "The first handheld cell phone sold to the public, the Motorola DynaTAC 8000X, came out in 1983 for $3,995 and earned the nickname 'the brick.' Phones got much smaller through the 90s. In 1997 Nokia engineer Taneli Armanto put Snake on the Nokia 6110, making it one of the first famous mobile games.",
    "facts": [
      {
        "label": "First handheld cell phone",
        "value": "Motorola DynaTAC 8000X, 1983"
      },
      {
        "label": "Launch price",
        "value": "$3,995"
      },
      {
        "label": "Snake debut",
        "value": "Nokia 6110, 1997"
      },
      {
        "label": "Snake creator",
        "value": "Taneli Armanto"
      }
    ]
  },
  "cd-pogs": {
    "kind": "Milk caps",
    "year": "Early 1990s",
    "maker": null,
    "joke": "Never play for keeps. If you do play for keeps, bring the skull slammer and no feelings.",
    "history": "POG was a passion fruit, orange and guava juice created in 1971 by Mary Soon for Haleakala Dairy on Maui, and its bottle caps gave the game its name. A Hawaiian teacher, Blossom Galbiso, revived the old milk-cap flipping game with her students in 1991, and it spread to mainland schools by the mid-90s. You stacked caps, threw a heavy slammer, and kept whatever landed face up.",
    "facts": [
      {
        "label": "Name comes from",
        "value": "POG juice: Passion fruit, Orange, Guava"
      },
      {
        "label": "Juice created",
        "value": "1971, by Mary Soon for Haleakala Dairy"
      },
      {
        "label": "Game revived",
        "value": "1991, Hawaii"
      },
      {
        "label": "Peak craze",
        "value": "Early to mid-1990s"
      },
      {
        "label": "Slammer",
        "value": "A heavier cap, often plastic or metal"
      }
    ]
  },
  "cd-sketch": {
    "kind": "Doodle",
    "year": null,
    "maker": null,
    "joke": "Drawing the Cool S is easy. Six lines, then six more, then connect. Takes a lifetime to master.",
    "history": "The 'Cool S' (also called the Stussy S, Superman S or Pointy S) was doodled by schoolkids around the world for decades, and nobody has proven where it came from. It's built from a simple grid of parallel lines, which is why so many kids figured it out on their own. Researchers and fans still argue about where it started.",
    "facts": [
      {
        "label": "Also called",
        "value": "Stussy S, Superman S, Pointy S"
      },
      {
        "label": "Inventor",
        "value": "Unknown"
      },
      {
        "label": "Construction",
        "value": "Two rows of three parallel lines, then connect"
      }
    ]
  },
  "cd-lamp": {
    "kind": "Desk lamp",
    "year": null,
    "maker": null,
    "joke": "Old desk lamps double as interrogation lights. Point it at your little brother. Ask where the remote went.",
    "history": "Incandescent bulbs give off around 90% of their energy as heat instead of light, which is why old desk lamps burned fingertips. The adjustable balanced-arm desk lamp traces back to George Carwardine's Anglepoise design in the early 1930s. Cooler LED bulbs have mostly replaced incandescents.",
    "facts": [
      {
        "label": "Incandescent waste",
        "value": "About 90% of energy becomes heat"
      },
      {
        "label": "Balanced-arm lamp",
        "value": "Anglepoise, George Carwardine, 1930s"
      },
      {
        "label": "Replaced by",
        "value": "Compact fluorescents, then LEDs"
      }
    ]
  },
  "cd-frog": {
    "kind": "Meal toy",
    "year": "1979",
    "maker": null,
    "joke": "The toy is the meal. The food is just packaging. Every kid knows this.",
    "history": "McDonald's rolled out the Happy Meal nationwide in 1979, and the little toy inside became the main reason kids wanted it. Burger King and others followed with their own kids' meals, and fast-food toys became huge collectibles in the 90s, peaking with Teenie Beanie Babies in 1997.",
    "facts": [
      {
        "label": "Happy Meal launched",
        "value": "1979, nationwide in the US"
      },
      {
        "label": "Biggest 90s craze",
        "value": "Teenie Beanie Babies, 1997"
      },
      {
        "label": "Value",
        "value": "Higher than the meal, emotionally"
      }
    ]
  },
  "cd-8ball": {
    "kind": "Fortune toy",
    "year": "1950",
    "maker": null,
    "joke": "If the Magic 8 Ball says no, shake it again. Keep shaking until it agrees. That's how science works.",
    "history": "The Magic 8 Ball came from Albert C. Carter and Abe Bookman, who developed a fortune-telling tube in the late 1940s. It took its 8-ball shape around 1950 in a promotion for the Brunswick billiards company. Inside, a 20-sided die floats in blue liquid, and Mattel owns it today after buying Tyco Toys in 1997.",
    "facts": [
      {
        "label": "Inventors",
        "value": "Albert C. Carter and Abe Bookman"
      },
      {
        "label": "Inside",
        "value": "A 20-sided die in blue-dyed liquid"
      },
      {
        "label": "Answers",
        "value": "10 yes, 5 non-committal, 5 no"
      },
      {
        "label": "Owner today",
        "value": "Mattel"
      }
    ]
  },
  "cd-photo": {
    "kind": "School photo",
    "year": "1990s",
    "maker": null,
    "joke": "Practice your smile in the mirror for a week. Blink right as the flash goes off.",
    "history": "School picture day was run by companies like Lifetouch, founded in 1936, which photographed millions of students every year. The 90s were known for laser and colorful abstract backgrounds, comb handouts and wallet-sized prints traded with friends. Retake day was the second chance that rarely helped.",
    "facts": [
      {
        "label": "Lifetouch founded",
        "value": "1936"
      },
      {
        "label": "90s look",
        "value": "Laser backgrounds"
      },
      {
        "label": "Package staple",
        "value": "Wallet-size prints"
      },
      {
        "label": "Free gift",
        "value": "A plastic comb"
      }
    ]
  },
  "cd-tmnt": {
    "kind": "Cup",
    "year": "1990",
    "maker": null,
    "joke": "A pizza place cup holds markers forever. It also holds the smell of Sprite forever. Fair trade.",
    "history": "Turtlemania ruled the turn of the decade: the cartoon began in 1987, and the first live-action movie came out in March 1990, with Jim Henson's Creature Shop building the turtle suits. Turtle merch included cups, cereal and toys, and pizza places loved the tie-ins because the turtles loved pizza.",
    "facts": [
      {
        "label": "First movie",
        "value": "Teenage Mutant Ninja Turtles, March 1990"
      },
      {
        "label": "Turtle suits",
        "value": "Jim Henson's Creature Shop"
      },
      {
        "label": "Movie theme",
        "value": "'Turtle Power!' by Partners in Kryme"
      },
      {
        "label": "Favorite food",
        "value": "Pizza"
      }
    ]
  },
  "cd-walkman": {
    "kind": "Cassette player",
    "year": "1979",
    "maker": "Sony",
    "joke": "Save batteries: rewind tapes with a pencil. Spin it fast. Your wrist will survive.",
    "history": "Sony's first Walkman, the TPS-L2, went on sale in Japan on July 1, 1979, and made music something you could carry with you. Auto-reverse arrived on Walkman models in the early 80s, so you didn't have to flip the tape. Sony sold about 220 million cassette Walkmans before ending production in Japan in 2010.",
    "facts": [
      {
        "label": "First model",
        "value": "TPS-L2, July 1, 1979"
      },
      {
        "label": "Auto-reverse",
        "value": "Added in 1982"
      },
      {
        "label": "Cassette Walkmans sold",
        "value": "About 220 million"
      },
      {
        "label": "Cassette production ended",
        "value": "2010 (Japan)"
      }
    ]
  },
  "cd-snes": {
    "kind": "SNES game",
    "year": "1994",
    "maker": "Rare",
    "joke": "If it doesn't work, just blow in it. Nothing says advanced troubleshooting like a little 90s spit.",
    "history": "Donkey Kong Country was developed by the British studio Rare and released for the Super Nintendo in November 1994. Rare built the characters as 3D models on Silicon Graphics workstations and turned them into pre-rendered sprites, a method called Advanced Computer Modeling, so the SNES looked far ahead of its time. It sold 9.3 million copies, the third best-selling SNES game.",
    "facts": [
      {
        "label": "Released",
        "value": "November 1994"
      },
      {
        "label": "Developer",
        "value": "Rare"
      },
      {
        "label": "Graphics",
        "value": "Pre-rendered 3D models made on Silicon Graphics workstations"
      },
      {
        "label": "Sold",
        "value": "9.3 million copies"
      },
      {
        "label": "Composer",
        "value": "David Wise, with Eveline Fischer and Robin Beanland"
      }
    ]
  },
  "cd-yoyo": {
    "kind": "Yo-yo",
    "year": "1929",
    "maker": "Duncan",
    "joke": "Practice 'walk the dog' away from the dog. Practice 'around the world' away from the lamp. So, outside.",
    "history": "Pedro Flores started making yo-yos in California in 1928, and Donald F. Duncan bought his company soon after and built the Duncan brand. Duncan made yo-yos big by sending demonstrators into schools and neighborhoods to show off tricks and run contests, and later yo-yo crazes in the 1990s used the same idea.",
    "facts": [
      {
        "label": "Pedro Flores Yo-yo Company",
        "value": "1928, Santa Barbara"
      },
      {
        "label": "Duncan",
        "value": "Took over in the early 1930s"
      },
      {
        "label": "Classic tricks",
        "value": "Walk the Dog, Around the World, Rock the Baby"
      },
      {
        "label": "Marketing secret",
        "value": "Touring yo-yo demonstrators"
      }
    ]
  },
  "cd-sonic": {
    "kind": "VHS tape",
    "year": "1991",
    "maker": "Sega",
    "joke": "Sonic or Mario? Say 'both' and you'll be fine. Say 'Mario' at the wrong lunch table and you won't.",
    "history": "Sega released Sonic the Hedgehog for the Genesis on June 23, 1991, made by Yuji Naka and Naoto Ohshima at Sonic Team, to compete with Mario. Two Sonic cartoons debuted in 1993: the goofy Adventures of Sonic the Hedgehog, where he loved chili dogs, and the darker Saturday-morning series on ABC.",
    "facts": [
      {
        "label": "Game released",
        "value": "June 23, 1991 (Genesis)"
      },
      {
        "label": "Creators",
        "value": "Yuji Naka and Naoto Ohshima"
      },
      {
        "label": "Cartoons",
        "value": "Two Sonic series debuted in 1993"
      },
      {
        "label": "Favorite food",
        "value": "Chili dogs"
      },
      {
        "label": "Rival",
        "value": "Mario"
      }
    ]
  },
  "cd-vhs": {
    "kind": "VHS tape",
    "year": "1996",
    "maker": "Warner Bros.",
    "joke": "To dunk like Michael Jordan, lower the hoop to four feet. Then tell everyone it was regulation.",
    "history": "Space Jam, directed by Joe Pytka, teamed Michael Jordan with Bugs Bunny and the Looney Tunes against the alien Monstars. It opened at No. 1 in November 1996 and grossed about $250 million worldwide, the biggest basketball movie of its time. Its soundtrack was a huge seller too.",
    "facts": [
      {
        "label": "Released",
        "value": "November 15, 1996"
      },
      {
        "label": "Director",
        "value": "Joe Pytka"
      },
      {
        "label": "Stars",
        "value": "Michael Jordan and the Looney Tunes"
      },
      {
        "label": "Worldwide gross",
        "value": "About $250 million"
      },
      {
        "label": "Villains",
        "value": "The Monstars"
      }
    ]
  },
  "cd-trophy": {
    "kind": "Trophy",
    "year": "1990s",
    "maker": null,
    "joke": "Losing every game still gets a trophy. Keep losing with confidence. The trophy doesn't know.",
    "history": "Tee-ball, where kids hit off a stationary tee instead of a pitched ball, became a common first sport for young kids in the US by the 70s and 80s. Plenty of youth leagues gave every player a trophy at the end of the season, plastic figure on a fake-marble base.",
    "facts": [
      {
        "label": "Tee-ball ages",
        "value": "Usually about 4 to 7"
      },
      {
        "label": "Trophy style",
        "value": "Gold-colored plastic figure on a base"
      },
      {
        "label": "Best part of the game",
        "value": "Orange slices"
      }
    ]
  },
  "cd-stickers": {
    "kind": "Stickers",
    "year": "1990s",
    "maker": null,
    "joke": "Charge glow-in-the-dark stickers with a flashlight right before bed. Then immediately fall asleep and miss it.",
    "history": "Glow-in-the-dark stickers and ceiling stars use phosphors that soak up light and slowly let it out in the dark. Older ones used zinc sulfide and faded fast; strontium aluminate, introduced in the 1990s, glows brighter and for much longer. Skater and surf stickers were a whole other collection.",
    "facts": [
      {
        "label": "Older glow material",
        "value": "Zinc sulfide (short glow)"
      },
      {
        "label": "Newer glow material",
        "value": "Strontium aluminate, 1990s (longer glow)"
      },
      {
        "label": "Charge them with",
        "value": "Any bright light"
      }
    ]
  },
  "cd-chair": {
    "kind": "Desk chair",
    "year": null,
    "maker": null,
    "joke": "Spin until dizzy. Spin back the other way to cancel it out. This does not work. Spin anyway.",
    "history": "Thomas Jefferson is said to have used a swivel chair while drafting the Declaration of Independence in 1776, and Charles Darwin is said to have put wheels on his study chair. Modern rolling office chairs spread in the 20th century, and kids discovered they're perfect for racing down hallways.",
    "facts": [
      {
        "label": "Early swivel chair",
        "value": "Credited to Thomas Jefferson, 1776"
      },
      {
        "label": "Wheels pioneer",
        "value": "Charles Darwin (by legend)"
      },
      {
        "label": "Best use",
        "value": "Hallway races"
      }
    ]
  },
  "desk": {
    "kind": "Home computer",
    "year": "1998",
    "maker": null,
    "joke": "Downloading something big? Tape a sign to every phone in the house: DO NOT PICK UP.",
    "history": "In the late 90s many families shared one computer in a corner, online through a dial-up modem on the home phone line. The 56k V.90 modem standard was approved in 1998, the same year Windows 98 came out. Anyone picking up a phone in the house could cut the connection.",
    "facts": [
      {
        "label": "Windows 98 released",
        "value": "June 25, 1998"
      },
      {
        "label": "Top dial-up speed",
        "value": "56 kbps (V.90 standard, 1998)"
      },
      {
        "label": "Connection sound",
        "value": "The modem handshake screech"
      },
      {
        "label": "Biggest threat",
        "value": "Someone picking up the phone"
      }
    ]
  },
  "pc-monitor": {
    "kind": "CRT monitor",
    "year": "1990s",
    "maker": null,
    "joke": "Turn on the 3D Pipes screensaver and stare at it. You are now doing computer stuff.",
    "history": "Beige CRT monitors were standard on 90s computers, with 14 and 15 inch screens common in homes. A 15-inch CRT actually showed only about 13.8 inches of viewable picture because the tube's edges were hidden by the case. They were heavy, hummed, and built up static just like TVs.",
    "facts": [
      {
        "label": "Common sizes",
        "value": "14 and 15 inches"
      },
      {
        "label": "Viewable area",
        "value": "About 13.8 inches on a 15-inch tube"
      },
      {
        "label": "Typical resolution",
        "value": "640×480 or 800×600"
      },
      {
        "label": "Screensavers",
        "value": "Invented to stop images burning into the phosphor"
      }
    ]
  },
  "pc-tower": {
    "kind": "PC tower",
    "year": "1993",
    "maker": "Intel",
    "joke": "Press the Turbo button. Nothing happens. Feel faster anyway.",
    "history": "Intel launched the Pentium processor on March 22, 1993, and the 'Intel Inside' sticker, a marketing campaign started in 1991, ended up on millions of beige PCs. The Turbo button was confusing because it mostly slowed the computer down for old software that ran too fast on newer chips.",
    "facts": [
      {
        "label": "Pentium launch",
        "value": "March 22, 1993"
      },
      {
        "label": "'Intel Inside' campaign",
        "value": "Started 1991"
      },
      {
        "label": "Turbo button",
        "value": "Really a 'slow down' button for old software"
      },
      {
        "label": "1994 headline",
        "value": "The Pentium FDIV math bug"
      }
    ]
  },
  "pc-printer": {
    "kind": "Inkjet printer",
    "year": "1988",
    "maker": null,
    "joke": "Out of color ink? Print the cover page in black and white and call it 'artistic.'",
    "history": "Hewlett-Packard's DeskJet line, launched in 1988, helped make inkjet printers affordable at home. Before that, many families used dot-matrix printers fed with continuous paper that had perforated holes down the sides, perfect for printing banners. Running out of one color cartridge became a classic school-night crisis.",
    "facts": [
      {
        "label": "HP DeskJet launch",
        "value": "1988"
      },
      {
        "label": "Before inkjets",
        "value": "Dot-matrix printers"
      },
      {
        "label": "Holey paper",
        "value": "Continuous tractor-feed paper for dot-matrix printers"
      },
      {
        "label": "Banner software",
        "value": "The Print Shop, 1984"
      }
    ]
  },
  "pc-keyboard": {
    "kind": "Keyboard",
    "year": "1987",
    "maker": null,
    "joke": "Learn to type with Mavis Beacon. Then actually learn to type in chat rooms at 2 a.m.",
    "history": "Mavis Beacon Teaches Typing came out in 1987 and became the classic typing program in homes and schools. Mavis was a made-up character; the woman on the box was model Renée L'Espérance. The loud, clicky IBM Model M keyboard from 1985 set the standard for heavy-duty keyboards.",
    "facts": [
      {
        "label": "Mavis Beacon released",
        "value": "1987"
      },
      {
        "label": "Mavis is",
        "value": "A fictional character"
      },
      {
        "label": "Cover model",
        "value": "Renée L'Espérance"
      },
      {
        "label": "IBM Model M",
        "value": "1985, buckling-spring keys"
      }
    ]
  },
  "pc-mouse": {
    "kind": "Ball mouse",
    "year": "1972",
    "maker": null,
    "joke": "Cursor skipping? Pop out the ball, scrape the rollers with a fingernail, and never discuss the gunk.",
    "history": "Douglas Engelbart's team at SRI built the first computer mouse in 1964, a wooden box with two wheels, and got a patent in 1970. Bill English designed the rolling-ball mouse at Xerox PARC in 1972, and ball mice were standard until optical mice took over around the turn of the millennium. The rollers inside collected dust and gunk constantly.",
    "facts": [
      {
        "label": "First mouse",
        "value": "1964, Douglas Engelbart's team at SRI"
      },
      {
        "label": "Ball mouse",
        "value": "1972, Bill English at Xerox PARC"
      },
      {
        "label": "Replaced by",
        "value": "Optical mice, around 1999–2000s"
      },
      {
        "label": "Maintenance",
        "value": "Clean the ball and the rollers"
      }
    ]
  },
  "pc-cds": {
    "kind": "Software",
    "year": "1990s",
    "maker": null,
    "joke": "Free AOL CDs make great coasters, mirrors, and ninja stars. Only one of those is allowed.",
    "history": "In the 90s, software came on 3.5-inch floppy disks holding 1.44 MB each, and big programs needed stacks of them; Windows 95 was even sold on 13 floppies. CD-ROMs held about 650 MB and took over, bringing multimedia encyclopedias like Microsoft Encarta (1993). AOL mailed out huge numbers of free trial disks and CDs to sign people up.",
    "facts": [
      {
        "label": "3.5-inch floppy",
        "value": "1.44 MB (high density)"
      },
      {
        "label": "CD-ROM",
        "value": "About 650 MB"
      },
      {
        "label": "Windows 95 on floppy",
        "value": "13 disks"
      },
      {
        "label": "Encarta launched",
        "value": "1993"
      },
      {
        "label": "AOL trial offers",
        "value": "Free hours, mailed on disks and CDs"
      }
    ]
  },
  "pc-pencils": {
    "kind": "Colored pencils",
    "year": null,
    "maker": null,
    "joke": "Hide the blue pencil before the state project. Everyone needs the ocean. Supply and demand.",
    "history": "Pencils have never contained lead. The 'lead' is graphite mixed with clay, a habit of speech from the 1500s, when a big graphite deposit found in Borrowdale, England was mistaken for a kind of lead. Colored pencils use pigment held together with wax or binder instead of graphite.",
    "facts": [
      {
        "label": "Pencil 'lead'",
        "value": "Graphite mixed with clay"
      },
      {
        "label": "Graphite source",
        "value": "Borrowdale, England, 1500s"
      },
      {
        "label": "Colored pencil core",
        "value": "Pigment plus wax or binder"
      }
    ]
  },
  "pc-stickers": {
    "kind": "Stickers",
    "year": "1981",
    "maker": "MTV",
    "joke": "Put the rebel sticker on the drawer. Being caught means you're a rebel. Not being caught means you're a genius.",
    "history": "MTV launched on August 1, 1981, with The Buggles' 'Video Killed the Radio Star' as its first music video. By the 90s it meant more than music videos, with shows like The Real World and Total Request Live, and the logo was all over notebooks, stickers and T-shirts.",
    "facts": [
      {
        "label": "Launched",
        "value": "August 1, 1981"
      },
      {
        "label": "First video",
        "value": "'Video Killed the Radio Star,' The Buggles"
      },
      {
        "label": "Real World premiere",
        "value": "1992"
      },
      {
        "label": "TRL premiere",
        "value": "1998"
      }
    ]
  },
  "pc-games": {
    "kind": "PC games",
    "year": "1990s",
    "maker": null,
    "joke": "Read the whole manual while it installs. You've got an hour. Learn the backstory of every elf.",
    "history": "PC games of the 90s came in big cardboard boxes with thick manuals, maps and extras, even when the disc inside was tiny. Myst (1993), from Cyan and Broderbund, helped sell CD-ROM drives and was the best-selling PC game until The Sims took over in 2002. The big boxes faded out in the early 2000s.",
    "facts": [
      {
        "label": "Myst released",
        "value": "1993"
      },
      {
        "label": "Myst developer",
        "value": "Cyan"
      },
      {
        "label": "Myst's record",
        "value": "Best-selling PC game until The Sims (2002)"
      },
      {
        "label": "Big box extras",
        "value": "Manuals, maps, posters, 'feelies'"
      }
    ]
  },
  "gushers": {
    "kind": "Fruit snack",
    "year": "1991",
    "maker": "Betty Crocker",
    "joke": "Gushers are cafeteria currency. Never spend them on gum. Gum has terrible exchange rates.",
    "history": "Fruit Gushers came out in 1991 under General Mills' Betty Crocker brand: chewy fruit snacks with a liquid center. The original flavors were Strawberry Splash and Gushin' Grape. TV ads showed kids' heads turning into fruit after a bite, which, for the record, never happened.",
    "facts": [
      {
        "label": "Introduced",
        "value": "1991"
      },
      {
        "label": "Brand",
        "value": "Betty Crocker (General Mills)"
      },
      {
        "label": "Original flavors",
        "value": "Strawberry Splash and Gushin' Grape"
      },
      {
        "label": "Big comeback",
        "value": "Watermelon returned in 2024 by fan demand"
      }
    ]
  },
  "cards": {
    "kind": "Trading cards",
    "year": "1999",
    "maker": "Wizards of the Coast",
    "joke": "Never trade a holo Charizard for a bike. Unless it's a really good bike. It's never a good enough bike.",
    "history": "The Pokémon Trading Card Game started in Japan in October 1996, and Wizards of the Coast released the English Base Set in the US on January 9, 1999. The 102-card set included 16 holographic Pokémon, and the holo Charizard became the most wanted card on every playground. First-edition copies are now some of the most valuable cards in the world.",
    "facts": [
      {
        "label": "US release",
        "value": "January 9, 1999"
      },
      {
        "label": "Publisher (US)",
        "value": "Wizards of the Coast"
      },
      {
        "label": "Cards in set",
        "value": "102"
      },
      {
        "label": "Holographic Pokémon",
        "value": "16"
      },
      {
        "label": "Most wanted",
        "value": "Charizard, #4/102"
      }
    ]
  },
  "hotpockets": {
    "kind": "Frozen snack",
    "year": "1983",
    "maker": "Chef America",
    "joke": "Hot Pocket strategy: bite the frozen middle first. The lava edge is a trap. It's always a trap.",
    "history": "Brothers Paul and David Merage, who founded Chef America in 1977, introduced Hot Pockets in 1983, first selling them to restaurants. The crisping sleeve was part of the pitch. Nestlé bought Chef America in 2002 for $2.6 billion. Pizza rolls came from Jeno Paulucci's company in 1968 and became Totino's Pizza Rolls in 1993.",
    "facts": [
      {
        "label": "Hot Pockets introduced",
        "value": "1983"
      },
      {
        "label": "Hot Pockets creators",
        "value": "Paul and David Merage"
      },
      {
        "label": "Sold to Nestlé",
        "value": "2002, for $2.6 billion"
      },
      {
        "label": "Pizza rolls created",
        "value": "1968, by Jeno's Inc. (developed by Beatrice Ojakangas)"
      },
      {
        "label": "Rebranded Totino's",
        "value": "1993"
      }
    ]
  },
  "jordans": {
    "kind": "Sneakers",
    "year": "1985",
    "maker": "Nike",
    "joke": "New sneakers rule: walk like a robot so they don't crease. Look weird. Stay fresh.",
    "history": "Nike signed rookie Michael Jordan and released the first Air Jordan in 1985, designed by Peter Moore. The line became the most famous sneaker franchise ever, with Tinker Hatfield designing many of the most-loved models starting with the Air Jordan III in 1988. Kids saved up for months, and creases were a tragedy.",
    "facts": [
      {
        "label": "First Air Jordan",
        "value": "1985"
      },
      {
        "label": "Air Jordan 1 designer",
        "value": "Peter Moore"
      },
      {
        "label": "Air Jordan III",
        "value": "1988, Tinker Hatfield"
      },
      {
        "label": "Brand",
        "value": "Jordan Brand (Nike)"
      }
    ]
  },
  "car": {
    "kind": "RC trucks",
    "year": "1990s",
    "maker": null,
    "joke": "Batteries not included means no fun on Christmas until the store opens. Steal from the remote. You know the drill.",
    "history": "Cheap radio-control trucks were a top Christmas gift in the 80s and 90s. Most toy RC cars ran on a few shared radio bands, often 27 MHz or 49 MHz, so two trucks on the same band could hijack each other. Batteries were famously not included.",
    "facts": [
      {
        "label": "Common toy RC bands",
        "value": "27 MHz and 49 MHz"
      },
      {
        "label": "Same-band problem",
        "value": "One remote could control both trucks"
      },
      {
        "label": "Power",
        "value": "AA or 9V, plus rechargeable packs"
      }
    ]
  },
  "hotwheels": {
    "kind": "Toy track",
    "year": "1968",
    "maker": "Mattel",
    "joke": "Every loop needs a test car. Use your sibling's. That's not cruel, that's engineering.",
    "history": "Mattel launched Hot Wheels in 1968 with the first 16 cars and bright orange plastic track you could clip into loops, jumps and long downhill runs. The track pieces join with small connectors, and kids built everything from simple loops to whole-house tracks. Hot Wheels went on to become one of the best-selling toy brands ever.",
    "facts": [
      {
        "label": "Launched",
        "value": "1968"
      },
      {
        "label": "Maker",
        "value": "Mattel"
      },
      {
        "label": "Driving force",
        "value": "Mattel co-founder Elliot Handler"
      },
      {
        "label": "Famous track color",
        "value": "Orange"
      },
      {
        "label": "First cars",
        "value": "The 'Sweet Sixteen'"
      }
    ]
  },
  "army": {
    "kind": "Toy soldiers",
    "year": "1950s",
    "maker": null,
    "joke": "Never step on army men barefoot. If you do, the bazooka guy was obviously aiming for you.",
    "history": "Green plastic army men became a cheap bag-of-toys staple after World War II, when injection-molded plastic replaced older lead and dimestore soldiers. Companies like Louis Marx and Company sold them in huge playsets in the 1950s. Toy Story (1995) made them famous all over again.",
    "facts": [
      {
        "label": "Material",
        "value": "Injection-molded plastic"
      },
      {
        "label": "Before plastic",
        "value": "Lead and composition 'dimestore' soldiers"
      },
      {
        "label": "Big 1950s maker",
        "value": "Louis Marx and Company"
      },
      {
        "label": "Toy Story cameo",
        "value": "Sarge and the Bucket O' Soldiers, 1995"
      }
    ]
  },
  "ispy-book": {
    "kind": "Picture book",
    "year": "1992",
    "maker": "Scholastic",
    "joke": "Found every item? Circle them in pen for the next kid. Being helpful is its own reward.",
    "history": "I Spy: A Book of Picture Riddles was published by Scholastic in 1992, with rhyming riddles by Jean Marzollo and photographs by Walter Wick. Wick built every scene by hand from real objects and photographed it, no computers involved. The series grew to dozens of books with tens of millions of copies in print.",
    "facts": [
      {
        "label": "First published",
        "value": "1992"
      },
      {
        "label": "Riddles by",
        "value": "Jean Marzollo"
      },
      {
        "label": "Photographs by",
        "value": "Walter Wick"
      },
      {
        "label": "How the pages were made",
        "value": "Real objects arranged and photographed"
      },
      {
        "label": "Format",
        "value": "Rhyming riddles"
      }
    ]
  },
  "furby": {
    "kind": "Robot toy",
    "year": "1998",
    "maker": "Tiger Electronics",
    "joke": "Furby can't be turned off. Put it in a drawer. It will say 'me sleepy' at 3 a.m. anyway.",
    "history": "Furby was invented by Dave Hampton and Caleb Chung and launched by Tiger Electronics on October 2, 1998, at about $35. It started out speaking Furbish and slowly 'learned' English, though the words were all preprogrammed. It sold 1.8 million in 1998 and 14 million in 1999, and the NSA banned it from its offices in 1999 just in case.",
    "facts": [
      {
        "label": "Launched",
        "value": "October 2, 1998"
      },
      {
        "label": "Inventors",
        "value": "Dave Hampton and Caleb Chung"
      },
      {
        "label": "Price",
        "value": "About $35"
      },
      {
        "label": "Sold",
        "value": "40+ million during its original three-year run"
      },
      {
        "label": "NSA ban",
        "value": "1999, later withdrawn"
      }
    ]
  },
  "poochi": {
    "kind": "Robot dog",
    "year": "2000",
    "maker": "Sega Toys",
    "joke": "Poo-Chis can talk to each other. Hold two nose to nose all recess. Report back. Nobody reports back.",
    "history": "Poo-Chi was a robot puppy made by Sega Toys and sold by Tiger Electronics in most countries, launching in 2000 for $24.99 in the US. It had red LED eyes, reacted to voice commands, and sang one of six songs when you pressed its head. It sold over 10 million within about eight months, and was replaced by FurReal Friends in 2002.",
    "facts": [
      {
        "label": "Released",
        "value": "2000"
      },
      {
        "label": "Made by",
        "value": "Sega Toys; distributed by Tiger Electronics"
      },
      {
        "label": "US price",
        "value": "$24.99"
      },
      {
        "label": "Sold",
        "value": "10+ million in about eight months"
      },
      {
        "label": "Spin-offs",
        "value": "Meow-Chi, Dino-Chi, Chirpy-Chi"
      }
    ]
  },
  "armor": {
    "kind": "Action figure",
    "year": "1982",
    "maker": "Hasbro",
    "joke": "Accessories last one hour. Gun: couch. Backpack: vacuum. Helmet: the dog. Read the file card while it lasts.",
    "history": "Hasbro coined the term 'action figure' in 1964 for G.I. Joe, so boys' dolls would sound tougher. In 1982 it relaunched G.I. Joe: A Real American Hero as 3¾-inch figures, the size Kenner made popular with Star Wars, and printed a character file card with a code name and backstory on the back of each package. The tiny guns and backpacks were famously easy to lose.",
    "facts": [
      {
        "label": "'Action figure' coined",
        "value": "1964, by Hasbro for G.I. Joe"
      },
      {
        "label": "A Real American Hero",
        "value": "1982"
      },
      {
        "label": "Standard size",
        "value": "3¾ inches"
      },
      {
        "label": "Package extra",
        "value": "Character file cards"
      }
    ]
  },
  "rubik": {
    "kind": "Puzzle",
    "year": "1974",
    "maker": null,
    "joke": "Peeling the stickers counts as solving it. Peeling them back on badly is the real puzzle.",
    "history": "Hungarian architecture professor Ernő Rubik invented the cube in 1974 to teach spatial thinking. It was sold in Hungary as the Magic Cube, then went worldwide in 1980 through Ideal Toy Company as Rubik's Cube. It has about 43 quintillion possible positions, and it was proven in 2010 that any of them can be solved in 20 moves or fewer.",
    "facts": [
      {
        "label": "Invented",
        "value": "1974, by Ernő Rubik"
      },
      {
        "label": "Worldwide launch",
        "value": "1980, Ideal Toy Company"
      },
      {
        "label": "Possible positions",
        "value": "About 43 quintillion"
      },
      {
        "label": "'God's number'",
        "value": "20 moves (proven 2010)"
      }
    ]
  },
  "vhs-stack": {
    "kind": "VHS tapes",
    "year": "1993–1999",
    "maker": null,
    "joke": "Holding Play while fast-forwarding is how you watch previews in fast motion. It's also how VCRs die.",
    "history": "Mighty Morphin Power Rangers premiered on Fox Kids on August 28, 1993, built from Japanese Super Sentai fight footage, and became a huge hit. The Pokémon anime reached the US in September 1998, and Pokémon: The First Movie came out in November 1999. Tapes like these got rewatched until the cases wore white.",
    "facts": [
      {
        "label": "Power Rangers premiere",
        "value": "August 28, 1993, Fox Kids"
      },
      {
        "label": "Power Rangers source",
        "value": "Japanese Super Sentai footage"
      },
      {
        "label": "Pokémon anime (US)",
        "value": "September 1998"
      },
      {
        "label": "Pokémon: The First Movie (US)",
        "value": "November 1999"
      }
    ]
  },
  "vhs-loose": {
    "kind": "VHS tapes",
    "year": "1980s–90s",
    "maker": null,
    "joke": "Want to protect a tape forever? Snap out the little tab on the back. Lose it. Tape over it anyway.",
    "history": "Every VHS cassette has a small plastic tab on its back edge. Break it off and the VCR won't record on that tape, which is how studios protected their releases. Cover the hole with a piece of tape and you can record again, which is how 'DO NOT TAPE OVER' tapes got taped over.",
    "facts": [
      {
        "label": "Record-protect tab",
        "value": "A breakable tab on the back of the cassette"
      },
      {
        "label": "Tab removed",
        "value": "VCR refuses to record"
      },
      {
        "label": "Undo it",
        "value": "Cover the hole with tape"
      },
      {
        "label": "Cases",
        "value": "Somewhere. Probably."
      }
    ]
  },
  "books": {
    "kind": "Books",
    "year": "1997–2007",
    "maker": null,
    "joke": "Book report hack: read the back cover, the first page, and the last page. Call it 'a summary.'",
    "history": "Harry Potter and the Sorcerer's Stone reached the US in September 1998 from Scholastic, a year after the UK edition, and turned millions of kids into readers. Dav Pilkey's Captain Underpants began in 1997. Diary of a Wimpy Kid didn't arrive until 2007, so that one is definitely a little brother's.",
    "facts": [
      {
        "label": "Harry Potter (US)",
        "value": "September 1, 1998"
      },
      {
        "label": "Harry Potter (UK)",
        "value": "June 26, 1997"
      },
      {
        "label": "Captain Underpants",
        "value": "1997, by Dav Pilkey"
      },
      {
        "label": "Diary of a Wimpy Kid",
        "value": "2007, by Jeff Kinney"
      }
    ]
  },
  "poster-pokemon": {
    "kind": "Poster",
    "year": "1998",
    "maker": null,
    "joke": "Hang a magazine poster with one piece of tape. When it falls, use the entire roll. That's the rule.",
    "history": "Pokémon began as Pokémon Red and Green for the Game Boy in Japan on February 27, 1996, created by Satoshi Tajiri's Game Freak. Pikachu, #025, became the face of the series thanks to the anime. In the US, pull-out posters in game magazines were the easiest way to get Pokémon on your wall.",
    "facts": [
      {
        "label": "Japan debut",
        "value": "February 27, 1996"
      },
      {
        "label": "Created by",
        "value": "Satoshi Tajiri, Game Freak"
      },
      {
        "label": "Pikachu's number",
        "value": "#025"
      },
      {
        "label": "US games",
        "value": "Pokémon Red and Blue, September 1998"
      }
    ]
  },
  "poster-mummy": {
    "kind": "Movie poster",
    "year": "1999",
    "maker": "Universal",
    "joke": "Never hang a scary movie poster facing your bed. It watches. It always watches.",
    "history": "The Mummy, directed by Stephen Sommers and starring Brendan Fraser and Rachel Weisz, came out on May 7, 1999. It loosely remade Universal's 1932 Boris Karloff film as a big action adventure. It made over $400 million worldwide, and its flesh-eating scarab beetles traumatized a lot of sleepovers.",
    "facts": [
      {
        "label": "Released",
        "value": "May 7, 1999"
      },
      {
        "label": "Director",
        "value": "Stephen Sommers"
      },
      {
        "label": "Stars",
        "value": "Brendan Fraser, Rachel Weisz"
      },
      {
        "label": "Based on",
        "value": "The Mummy (1932), with Boris Karloff"
      },
      {
        "label": "Worldwide gross",
        "value": "Over $400 million"
      }
    ]
  },
  "poster-giant": {
    "kind": "Movie poster",
    "year": "1999",
    "maker": "Warner Bros.",
    "joke": "If you cry at the ending, say it was allergies. Everyone else will say the same thing.",
    "history": "The Iron Giant, Brad Bird's first feature as director, was released by Warner Bros. in August 1999. Based loosely on Ted Hughes' 1968 book The Iron Man, it starred Vin Diesel as the voice of the Giant. It flopped in theaters, grossing about $31 million, then became a beloved classic on home video and TV.",
    "facts": [
      {
        "label": "Released",
        "value": "August 1999"
      },
      {
        "label": "Director",
        "value": "Brad Bird"
      },
      {
        "label": "Based on",
        "value": "The Iron Man, by Ted Hughes (1968)"
      },
      {
        "label": "Giant's voice",
        "value": "Vin Diesel"
      },
      {
        "label": "Box office",
        "value": "About $31 million, a flop that became a classic"
      }
    ]
  },
  "poster-babe": {
    "kind": "Movie poster",
    "year": "1995",
    "maker": "Universal",
    "joke": "Watching Babe means no bacon for a week. Plan breakfast accordingly. Pancakes are pig-friendly.",
    "history": "Babe, directed by Chris Noonan and co-written and produced by George Miller, came out in the US on August 4, 1995. Based on Dick King-Smith's 1983 novel The Sheep-Pig, it followed a pig who learns to herd sheep. It earned seven Academy Award nominations, including Best Picture, and won for Best Visual Effects.",
    "facts": [
      {
        "label": "Released",
        "value": "August 4, 1995 (US)"
      },
      {
        "label": "Director",
        "value": "Chris Noonan"
      },
      {
        "label": "Based on",
        "value": "The Sheep-Pig, by Dick King-Smith (1983)"
      },
      {
        "label": "Oscars",
        "value": "7 nominations; won Best Visual Effects"
      },
      {
        "label": "Famous line",
        "value": "'That'll do, pig. That'll do.'"
      }
    ]
  }
};

/** A video per card, checked against archive.org. Overrides the card's own; null means none. */
export const PROP_VIDEOS: Record<string, CardVideo | null> = {
  "crt-tv": {
    "archiveId": "1989-commercial-for-sony-trinitron",
    "title": "Sony Trinitron commercial, 1989"
  },
  "crt-vcr": {
    "archiveId": "panasonic-vcr-commercial",
    "title": "Panasonic VCR \"So easy to programme\" commercial, 1980s"
  },
  "crt-cable": {
    "archiveId": "prevue-july-3-1994",
    "title": "Prevue Channel clip, 1994"
  },
  "nes": {
    "archiveId": "nintendo-woolworths",
    "title": "Woolworth Nintendo: NES & Game Boy (1990)"
  },
  "boombox": {
    "archiveId": "walkmandec81",
    "title": "Walkman commercial, 1981"
  },
  "gameboy": {
    "archiveId": "1989-nintendo-game-boy-commercial",
    "title": "Nintendo Game Boy commercial, 1989"
  },
  "tamagotchi": {
    "archiveId": "youtube-OxVMTxJvd7g",
    "title": "Tamagotchi toy hunting at FAO Schwarz, 1997"
  },
  "bed": {
    "archiveId": "simmons-beautyrest-mattress-commercial-1989",
    "title": "Simmons Beautyrest mattress commercial, 1989"
  },
  "bed-pillow": {
    "archiveId": "youtube-qfS67eQr_Es",
    "title": "Chuck E. Cheese commercial, 1997"
  },
  "backpack": {
    "archiveId": "CLE-B12_478673-479583",
    "title": "Target back-to-school commercial, 1994"
  },
  "beanbag": {
    "archiveId": "youtube-sy9rXXh4WlU",
    "title": "JC Penney bean bag chair commercial, 1980"
  },
  "window": {
    "archiveId": "2002-commercial-for-windex",
    "title": "Windex commercial, 2002"
  },
  "window-south": {
    "archiveId": "MNN-001_452917-453519",
    "title": "Ultimate Goosebumps special promo, 1997"
  },
  "door": {
    "archiveId": "1984-kool-aid-roller-hockey-with-kool-aid-man-commercial",
    "title": "Kool-Aid Man commercial, 1984"
  },
  "door-poster": {
    "archiveId": "1995-promo-for-the-x-files",
    "title": "The X-Files promo, 1995"
  },
  "door-cap": {
    "archiveId": "Space_Invaders_1980_Atari_US.mp4",
    "title": "Atari Space Invaders commercial, 1980"
  },
  "door-pins": null,
  "nightstand": null,
  "ns-clock": {
    "archiveId": "genral-electric-c-4315-a-clock-radio-1980s-esgw-zao-ke-wc",
    "title": "Vintage red-LED clock radio, like the RCA on the nightstand"
  },
  "ns-lava": {
    "archiveId": "pm-lamp",
    "title": "Power Macintosh lava lamp ad, 1990s"
  },
  "ns-mug": {
    "archiveId": "swiss-miss-hot-cocoa-commercial-1999",
    "title": "Swiss Miss hot cocoa commercial, 1999"
  },
  "ns-teddy": {
    "archiveId": "duracell-singing-bear-commercial-1989",
    "title": "Duracell singing bear commercial, 1989"
  },
  "ns-recorder": {
    "archiveId": "DET-012_70838-71748",
    "title": "Home Alone 2 Talkboy tape recorder ad, 1993"
  },
  "ns-yoshi": {
    "archiveId": "Nintendo_-_Yoshi_commercial_USA_1992",
    "title": "Nintendo Yoshi commercial, 1992"
  },
  "ns-tapes": {
    "archiveId": "goosebumps-s01",
    "file": "S01_01-02.mp4",
    "title": "Goosebumps · The Haunted Mask (1995)"
  },
  "ns-vhs": {
    "archiveId": "toy-story-1995_202411",
    "title": "Toy Story TV spot, 1995"
  },
  "ns-gameboy": {
    "archiveId": "game-boy-ice-blue",
    "title": "Game Boy Pocket commercial, 1997"
  },
  "south-shelf": {
    "archiveId": "yt-5s.com-the-lost-world-jurassic-park-talking-view-master-commercial-1997-360p",
    "title": "Talking View-Master: The Lost World commercial, 1997"
  },
  "sh-lava": {
    "archiveId": "pm-lamp",
    "title": "Power Macintosh lava lamp ad, 1990s"
  },
  "sh-vhs": {
    "archiveId": "DET-012_246062-247002",
    "title": "Disney Aladdin VHS commercial, 1993"
  },
  "sh-car": {
    "archiveId": "DET-012_52007-52915",
    "title": "Hot Wheels Attack Pack commercial, 1993"
  },
  "sh-teddy": {
    "archiveId": "snuggle-morning-fresh-commercial-1988",
    "title": "Snuggle bear commercial, 1988"
  },
  "sh-gameboy": {
    "archiveId": "2001-commercial-for-game-boy-color",
    "title": "Game Boy Color commercial, 2001"
  },
  "sh-turtle": {
    "archiveId": "teenage-mutant-ninja-turtles-toon-turtles-action-figure-commercial",
    "title": "TMNT Toon Turtles action figure commercial"
  },
  "sh-viewmaster": {
    "archiveId": "youtube-JxG0HuHNqKU",
    "title": "Talking View-Master commercial, 1983"
  },
  "sh-books": {
    "archiveId": "09-lost-world-jurassic-park-1997-tv-spot",
    "title": "The Lost World: Jurassic Park TV spot, 1997"
  },
  "toyshelf": {
    "archiveId": "dvdvolumet01c17",
    "title": "Toys \"R\" Us grand opening commercial, 1991"
  },
  "ts-teddy": {
    "archiveId": "mc-donalds-muppet-babies-plush-commercial-1988",
    "title": "McDonald's Muppet Babies plush commercial, 1988"
  },
  "ts-handheld": {
    "archiveId": "TigerVirtuaFighter95",
    "title": "Tiger Electronics handheld commercial, 1995"
  },
  "ts-clock": {
    "archiveId": "z-100-radio",
    "title": "Z-100 radio station commercial, 1990s"
  },
  "ts-skateboard": {
    "archiveId": "1986-mountain-dew-skateboarding-dew-it-country-cool-tv-commercial",
    "title": "Mountain Dew skateboarding commercial, 1986"
  },
  "ts-vhs": {
    "archiveId": "fujivideotape_12-17-1989",
    "title": "Fuji blank video tape commercial, 1989"
  },
  "ts-lava": {
    "archiveId": "pm-lamp",
    "title": "Power Macintosh lava lamp ad, 1990s"
  },
  "ts-pokebox": {
    "archiveId": "2000-commercial-for-pokemon-trading-card-game",
    "title": "Pokémon Trading Card Game commercial, 2000"
  },
  "ts-magazines": {
    "archiveId": "1990-nintendo-power-magazine-get-the-power-super-mario-3-tv-commercial",
    "title": "Nintendo Power magazine commercial, 1990"
  },
  "shelf": {
    "archiveId": "monopoly-jr-and-rare-headline-news-1994",
    "title": "Monopoly Junior commercial, 1994",
    "file": "0monoply.mp4"
  },
  "gs-helmet": {
    "archiveId": "1990AFCChampionshipBillsClinch1stSuperBowlAppearanceRaidersVs.BillsNFLFullGame",
    "title": "Bills clinch 1st Super Bowl, 1990 AFC Championship"
  },
  "gs-smiley": {
    "archiveId": "wal-mart-smiley-tv-commercial-1999",
    "title": "Wal-Mart smiley commercial, 1999"
  },
  "gs-plant": {
    "archiveId": "windex-plant-commercial-2000",
    "title": "Windex plant commercial, 2000"
  },
  "gs-lights": {
    "archiveId": "christmas-vacation",
    "title": "National Lampoon's Christmas Vacation VHS promo, 1989"
  },
  "dresser": {
    "archiveId": "super-mario-world-for-super-nintendo-1991-tv-commercial-2-remastered-hd",
    "title": "Super Mario World commercial #2, 1991"
  },
  "dr-stickers": {
    "archiveId": "super-mario-world-for-super-nintendo-1991-tv-commercial-1-remastered-hd",
    "title": "Super Mario World commercial, 1991"
  },
  "dr-nofear": null,
  "clutterdesk": {
    "archiveId": "CLE-014_79826-80724",
    "title": "LEGO System commercial, 1993"
  },
  "cd-lava": {
    "archiveId": "pm-lamp",
    "title": "Power Macintosh lava lamp ad, 1990s"
  },
  "cd-cup": {
    "archiveId": "1996-commercial-for-bic-pens",
    "title": "Bic pens commercial, 1996"
  },
  "cd-tapes": {
    "archiveId": "blockbuster-video-commercial-1990s-a",
    "title": "Blockbuster Video commercial, 1990s"
  },
  "cd-car": {
    "archiveId": "hotwheels-commercial",
    "title": "Hot Wheels commercial, 1980s"
  },
  "cd-clock": {
    "archiveId": "1998-radio-105-1-the-edge-michigan",
    "title": "105.1 The Edge radio station commercial, 1998"
  },
  "cd-phone": {
    "archiveId": "nokia-1998-tv-commercial-drew-carey",
    "title": "Nokia commercial, 1998"
  },
  "cd-pogs": {
    "archiveId": "pogs-1995-t-6-a-7ir-szv-58",
    "title": "POG's commercial, 1995"
  },
  "cd-sketch": {
    "archiveId": "crayola_how_to_draw",
    "title": "Crayola \"Learn to Draw\" VHS, 1992"
  },
  "cd-lamp": {
    "archiveId": "pixar-short-film-animation-luxo-jr.-1986-hd-dvd-rip",
    "title": "Pixar Luxo Jr. short, 1986"
  },
  "cd-frog": {
    "archiveId": "burger-king-kids-club-commercial-1990",
    "title": "Burger King Kids Club meal commercial, 1990"
  },
  "cd-8ball": null,
  "cd-photo": {
    "archiveId": "kodak-advantix-film-commercial-1996",
    "title": "Kodak Advantix film commercial, 1996"
  },
  "cd-tmnt": {
    "archiveId": "tmnt-pizza_202509",
    "title": "Pizza Hut Ninja Turtles kids meal commercial, 1990"
  },
  "cd-walkman": {
    "archiveId": "walkmandec81",
    "title": "Walkman commercial, 1981"
  },
  "cd-snes": {
    "archiveId": "Super_Nintendo_commercial_1992",
    "title": "Super Nintendo commercial, 1992"
  },
  "cd-yoyo": {
    "archiveId": "youtube-dfqykR14O3Y",
    "title": "Duncan Yo-yo commercial, 1976"
  },
  "cd-sonic": {
    "archiveId": "sonic-3-commercial",
    "title": "Sonic 3 commercial, 1994"
  },
  "cd-vhs": {
    "archiveId": "trailer-for-space-jam",
    "title": "Space Jam trailer, 1996"
  },
  "cd-trophy": {
    "archiveId": "TheSandlotTrailer",
    "title": "The Sandlot trailer, 1993"
  },
  "cd-stickers": {
    "archiveId": "SEGA_Saturn_commercial_USA_1997",
    "title": "Sega Saturn commercial, 1997"
  },
  "cd-chair": {
    "archiveId": "1997-staples-commercial",
    "title": "Staples office supplies commercial, 1997"
  },
  "desk": {
    "archiveId": "windows-98-commercial",
    "title": "Windows 98 commercial, 1998"
  },
  "pc-monitor": {
    "archiveId": "20230625-124621",
    "title": "Compaq computer commercial, 1997"
  },
  "pc-tower": {
    "archiveId": "1997-pentium-commercial",
    "title": "Intel Pentium commercial, 1997"
  },
  "pc-printer": {
    "archiveId": "HPDeskjet693cxDisney101DalmationsPrintStudioBundleAdvert1996",
    "title": "HP DeskJet printer commercial, 1996"
  },
  "pc-keyboard": {
    "archiveId": "radio-shack-tandy-1000-rl-computer-commercial-1991",
    "title": "Radio Shack Tandy 1000 RL computer commercial, 1991"
  },
  "pc-mouse": {
    "archiveId": "000713_202006",
    "title": "Microsoft Mouse commercial"
  },
  "pc-cds": {
    "archiveId": "aol-america-online-commercial-1998",
    "title": "AOL America Online commercial, 1998"
  },
  "pc-pencils": {
    "archiveId": "youtube-diScJF-k5g4",
    "title": "Crayola Caddy commercial, 1983"
  },
  "pc-stickers": {
    "archiveId": "1981-mtv-commercial-i-want-my-mtv-early-promo",
    "title": "\"I want my MTV\" promo, 1981"
  },
  "pc-games": {
    "archiveId": "1996-commercial-for-games-on-cd-rom",
    "title": "Games on CD-ROM commercial, 1996"
  },
  "gushers": {
    "archiveId": "fruit-gushers-1992-commercial",
    "title": "Fruit Gushers commercial, 1992"
  },
  "cards": {
    "archiveId": "2000-commercial-for-pokemon-trading-card-game",
    "title": "Pokémon Trading Card Game commercial, 2000"
  },
  "hotpockets": {
    "archiveId": "1992-hot-pockets-a-hot-meal-without-a-big-deal-tv-commercial",
    "title": "Hot Pockets commercial, 1992"
  },
  "jordans": {
    "archiveId": "nike-air-jordan",
    "title": "Air Jordan commercial with Bugs Bunny, 1992"
  },
  "car": {
    "archiveId": "DET-011_562051-562529",
    "title": "Tyco Hijacker RC car commercial, 1993"
  },
  "hotwheels": {
    "archiveId": "videoplayback_20240819_1919",
    "title": "Hot Wheels Criss Cross Crash commercial, 1999"
  },
  "army": {
    "archiveId": "small-soldiers-burger-king-kids-club-meal-commercial-1998",
    "title": "Small Soldiers Burger King Kids Club commercial, 1998"
  },
  "ispy-book": {
    "archiveId": "how-i-spy-books-are-made",
    "title": "How 'I Spy' books are made"
  },
  "furby": {
    "archiveId": "youtube-ouh2Q_-pYLQ",
    "title": "Tiger Electronics Furby TV commercial"
  },
  "poochi": {
    "archiveId": "2001-commercial-for-robo-chi-pets",
    "title": "Robo-Chi Pets commercial, 2001"
  },
  "armor": {
    "archiveId": "youtube-8QqAxY6Zzu8",
    "title": "Kenner Ghostbusters action figures commercial, 1987"
  },
  "rubik": {
    "archiveId": "youtube-_OHcaVc6ehQ",
    "title": "Rubik's Cube commercial, 1980"
  },
  "vhs-stack": {
    "archiveId": "home-alone-video",
    "title": "Home Alone VHS TV spot, 1991"
  },
  "vhs-loose": {
    "archiveId": "1998-blockbuster-dancing-vhs-tapes-commercial",
    "title": "Blockbuster dancing VHS tapes commercial, 1998"
  },
  "books": {
    "archiveId": "HarryPotterTheSorcerersStoneTrailer1",
    "title": "Harry Potter and the Sorcerer's Stone trailer, 2001"
  },
  "poster-pokemon": {
    "archiveId": "Pokemon_The_First_Movie_Trailer_1999",
    "title": "Pokemon: The First Movie trailer, 1999"
  },
  "poster-mummy": {
    "archiveId": "TheMummy1999Trailer",
    "title": "The Mummy trailer, 1999"
  },
  "poster-giant": {
    "archiveId": "iron-giant-screening-promo",
    "title": "The Iron Giant VHS screening promo, 1999"
  },
  "poster-babe": {
    "archiveId": "1996-commercial-for-babe",
    "title": "Babe commercial, 1996"
  }
};
