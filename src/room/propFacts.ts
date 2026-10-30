import type { CardFact, CardVideo } from './propCards';

/**
 * The hologram card's extra content, per card id: the header line (kind,
 * year, maker), the "Childhood Pro Tip", "The Real Story" and a few facts.
 * "The Real Story" is told in plain, everyday words, so a kid can read it
 * without guessing. Kept apart from propCards.ts so the stories and jokes
 * there stay as they were written. Every card works without an entry here.
 */
export const PROP_FACTS: Record<string, { kind?: string; year?: string | null; maker?: string | null; joke?: string; history?: string; facts?: CardFact[] }> = {
  "crt-tv": {
    "kind": "CRT television",
    "year": "1990s",
    "maker": null,
    "joke": "Picture fuzzy? One firm pat on the side really did fix a loose wire sometimes. Two pats is just being mean to the TV.",
    "history": "Back then, TVs were big glass boxes with a tube inside that shot tiny beams at the screen to make the picture. That's why they were so deep, so heavy, and why the screen zapped your arm hair. Flat TVs replaced them in the 2000s.",
    "facts": [
      {
        "label": "How it works",
        "value": "A beam inside paints the picture one line at a time, super fast"
      },
      {
        "label": "Weight",
        "value": "A big one weighed as much as a kid"
      },
      {
        "label": "V-chip",
        "value": "From 2000, new TVs had to let parents block shows"
      },
      {
        "label": "The static zap",
        "value": "The tube runs on so much power the glass holds a charge"
      }
    ]
  },
  "crt-vcr": {
    "kind": "VCR",
    "year": "1980s–90s",
    "maker": null,
    "joke": "Taping a show? Start the timer five minutes early and stop it five late. The TV clock and the VCR clock never agreed.",
    "history": "The VCR played and recorded VHS tapes. JVC made VHS in 1976, and it beat Sony's Betamax to become the tape everyone used. By the 90s one sat under almost every TV, blinking 12:00. The last ones were made in 2016.",
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
    "joke": "Cable box frozen? Unplug it, count to ten, plug it back in. It really works. You are now a cable technician.",
    "history": "The cable box gave your TV dozens of extra channels and unlocked the ones your family paid for. The scrolling channel guide was the Prevue Channel, which ran on old Amiga computers. In 1999 it became the TV Guide Channel.",
    "facts": [
      {
        "label": "Channel guide ran on",
        "value": "Old Commodore Amiga computers"
      },
      {
        "label": "Became",
        "value": "The TV Guide Channel, in 1999"
      },
      {
        "label": "Fuzzy channels",
        "value": "Paid channels were scrambled unless your family paid"
      }
    ]
  },
  "nes": {
    "kind": "Home console",
    "year": "1985",
    "maker": "Nintendo",
    "joke": "No save button? Write the password on paper the second it shows up. Lose that paper and you start over.",
    "history": "The Nintendo Entertainment System came out in the US in 1985, made to look like a VCR so stores would sell it. With Super Mario Bros., it brought video games back. Blowing in the cartridge never really fixed it. Pushing it back in did.",
    "facts": [
      {
        "label": "US launch",
        "value": "October 18, 1985, in New York first"
      },
      {
        "label": "In Japan it was",
        "value": "The Famicom, from 1983"
      },
      {
        "label": "Sold",
        "value": "About 62 million"
      },
      {
        "label": "The blinking screen",
        "value": "Worn-out pins in the slot, not dust"
      }
    ]
  },
  "boombox": {
    "kind": "Boombox",
    "year": "1980s",
    "maker": null,
    "joke": "Taping a song off the radio? Finger on Pause, other finger on Record, and let go the second the DJ stops talking.",
    "history": "A boombox was a big radio with tape decks and speakers you could carry anywhere. Two tape decks meant you could copy tapes and make mixtapes. They ate a lot of batteries, sometimes ten big D batteries at once.",
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
    "joke": "Trading Pokémon? Plug in the link cable before turning both Game Boys on, and nobody touch the cord till it's done.",
    "history": "The Game Boy came out in 1989 with Tetris in the box. Nintendo gave it a simple green screen instead of color so four AA batteries would last for hours. With the Game Boy Color, it sold about 118 million.",
    "facts": [
      {
        "label": "Came out",
        "value": "July 31, 1989, for $89.95"
      },
      {
        "label": "In the box",
        "value": "Tetris"
      },
      {
        "label": "Screen",
        "value": "Four shades of green-gray"
      },
      {
        "label": "Sold",
        "value": "About 118 million, with the Game Boy Color"
      }
    ]
  },
  "tamagotchi": {
    "kind": "Virtual pet",
    "year": "1997",
    "maker": "Bandai",
    "joke": "Pet beeping during class? Ask to use the bathroom, stay twenty minutes, and clean up its poop in peace.",
    "history": "Tamagotchi was a tiny egg-shaped pet on a keychain. You fed it, cleaned up after it, and if you forgot, it died. It came to the US in 1997 and got banned at a lot of schools. About 98 million have been sold.",
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
    "joke": "Building a fort? Tuck one edge of the blanket under the mattress and hold the other down with big books.",
    "history": "The bed was home base for sleepovers, pillow forts and reading with a flashlight after lights out. Twin beds became the normal kid bed in America. Jumping on the bed was banned in every house, and done in every house.",
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
    "joke": "Pillow fight rule: hit with the smiley side first. Nobody can stay mad at a face that happy.",
    "history": "The smiley face was drawn in 1963 by an artist named Harvey Ball. He got paid $45 for it and never owned the rights. It ended up on buttons, shirts and carnival prizes everywhere.",
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
    "joke": "Write your name on the inside tag in marker on day one. Half the class had the same JanSport.",
    "history": "Backpacks became normal school gear in the 70s and 80s, with brands like JanSport. By the 90s your backpack showed who you were: pins, patches, keychains and your name in marker. One strap or two was a real debate.",
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
    "joke": "Shake it up before you sit. Grab both sides and fluff it, or you'll end up sitting on the floor in a sack.",
    "history": "The bean bag chair started as a fancy Italian chair in 1968, a bag full of tiny foam beads that shapes itself around you. Cheaper ones landed in kids' rooms everywhere. Getting out of one gracefully is still impossible.",
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
    "joke": "Hear the ice cream truck? You have about one song to grab couch change, find your shoes and get to the curb. Go now.",
    "history": "Thin mini blinds were in almost every 80s and 90s house. Summer nights meant a box fan in the window and loud bugs outside. Some cicadas only come out every 13 or 17 years, so some summers were way louder.",
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
    "joke": "Can't sleep? Count the headlights sliding across the ceiling. Nobody ever made it past twenty.",
    "history": "That orange glow outside came from streetlights made to save power. Their orange light made every color look the same at night. Most towns have since switched to bright white LED lights.",
    "facts": [
      {
        "label": "Streetlight type",
        "value": "Orange power-saving lamps"
      },
      {
        "label": "Replaced by",
        "value": "White LED streetlights"
      }
    ]
  },
  "door": {
    "kind": "Door",
    "year": null,
    "maker": null,
    "joke": "Door won't stay shut? Fold a piece of paper a few times and wedge it by the latch. It stays closed, no lock needed.",
    "history": "Bedroom door locks aren't real locks. There's a little hole on the outside so anyone can pop it open with a thin tool in an emergency. That's how every parent got in. KEEP OUT signs were mostly for show.",
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
    "joke": "Watching The X-Files? Sit with your back to the wall so nothing sneaks up behind you. It doesn't help.",
    "history": "The X-Files started on TV in 1993. Two FBI agents, Mulder and Scully, chased aliens and weird mysteries. Mulder had an 'I Want to Believe' poster with a UFO in his office, and kids everywhere hung one too.",
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
    "joke": "Skee-Ball trick: roll it soft and straight up the middle. The 40 hole lands way more than the 100s.",
    "history": "Space Invaders came out in 1978 and was one of the first giant video game hits. Rows of aliens march down at you. They speed up as you shoot them because the machine has fewer to draw. That was an accident, and it made the game better.",
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
    "joke": "Lost the back of a pin? Push a pencil eraser onto the point. It holds better than the real one.",
    "history": "People have collected and traded pins for more than 100 years. In the 90s they went on jean jackets, hats and backpacks. Pin trading is still a big hobby, especially at theme parks.",
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
    "joke": "Keep a flashlight in the drawer. Storms knock the power out, and the family flashlight always has dead batteries.",
    "history": "The bedside table was mission control: alarm clock, lamp, and a drawer full of things that weren't supposed to be there. Most were cheap wood-look boards, and the drawer stuck unless you lifted it as you pulled.",
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
    "joke": "Put the alarm clock across the room. You have to get out of bed to turn it off, and by then you're up.",
    "history": "Red number clock radios sat on every nightstand. Big glowing numbers, a radio, an alarm, and a snooze button as big as the top. When the power blinked, they lost the time, so half the clocks in America flashed 12:00.",
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
    "history": "A British man named Edward Craven Walker invented the lava lamp in 1963 after seeing a homemade egg timer bubbling in a pub. A bulb warms a blob of wax so it rises, cools and sinks. They came back big in the 90s.",
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
    "joke": "Hot cocoa trick: stir in a splash of cold milk. It's cool enough to drink before the marshmallows melt.",
    "history": "Instant hot cocoa packets were made for snow days and after school, with tiny dried marshmallows right in the mix. A mug you made in art class was the official cup. A hard old marshmallow at the bottom was tradition.",
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
    "joke": "Monsters can't get you if a bear is watching the closet. Sit him facing the closet, not the bed. Known rule.",
    "history": "The teddy bear is named after President Teddy Roosevelt. In 1902 he refused to shoot a tied-up bear on a hunting trip, a newspaper drew a cartoon of it, and a shop owner started selling stuffed 'Teddy's bears.'",
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
    "joke": "Press Record and Play down together. On a lot of tape recorders, Record alone won't go.",
    "history": "Cassette tapes came out in 1963, and small tape recorders let anyone record their voice, the radio or music. Sony even made bright My First Sony recorders for kids. Hearing your own voice played back was a shock.",
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
    "history": "Yoshi first showed up in Super Mario World, which came with the Super Nintendo in 1991. He's a green dinosaur who eats bad guys with his long tongue and lets Mario ride on his back.",
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
    "joke": "Reading after lights out? Put a towel along the bottom of the door so the hallway can't see the flashlight.",
    "history": "Goosebumps started in 1992 with Welcome to Dead House. R.L. Stine wrote 62 books in the first series, and at its peak it sold about four million copies a month. Every chapter ended on a scary cliffhanger.",
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
    "joke": "Favorite tape going fuzzy? Run a head-cleaning tape through the VCR. It looks blank and works like magic.",
    "history": "Three movie night favorites. Jurassic Park (1993) mixed robot dinosaurs with computer ones. Hocus Pocus (1993) flopped in theaters and became a Halloween classic on tape. Toy Story (1995) was the first movie made all on computers.",
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
    "joke": "Rechargeable batteries cost more but pay for themselves in about a month. Every Game Boy kid learned this the hard way.",
    "history": "The first Game Boy ran on four AA batteries and was really tough. One got caught in a fire during the 1991 Gulf War and still worked, and Nintendo showed it off in its New York store. Nintendo made Game Boys until 2003.",
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
    "history": "Every 90s kid had a shelf for the most important stuff: collectibles, the good Game Boy, and toys too old to play with but too loved to give away. Up high, away from little cousins.",
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
    "history": "In 1965 two American businessmen saw the lava lamp at a trade show in Germany and started selling it in the US as the Lava Lite. Lava lamps were huge in the 60s, faded away, then came back big in the 90s.",
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
    "history": "Home Alone (1990) was one of the biggest comedies ever. Aladdin (1992), with Robin Williams as the Genie, was the top movie of its year. Jurassic Park (1993) was the biggest movie ever made, until Titanic.",
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
    "joke": "Want to win the race? Pick your heaviest car. The heavy ones beat the light ones down the orange track.",
    "history": "Mattel made Hot Wheels in 1968 to beat Matchbox cars. Their wheels barely touched anything, so they flew down the orange track. The very first one made was a dark blue Camaro.",
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
    "history": "In 1903 a German toy company called Steiff brought its teddy bear to a big toy fair, and an American store ordered thousands. That started the teddy bear craze. Real Steiff bears still have a little button in one ear.",
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
    "joke": "Taking the Game Boy to school? Turn the volume all the way down before you leave the house, not in class.",
    "history": "Game Boys were the thing teachers took away most in the 90s. In the US, 40,000 sold on day one. Pokémon Red and Blue in 1998 kept it going for years after other game systems from its time were gone.",
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
    "joke": "Playing Ninja Turtles with friends? Call Leonardo first. He's the leader, so you're technically in charge.",
    "history": "The Ninja Turtles started as a comic book in 1984. The cartoon came in 1987 and the toys in 1988, and they were some of the best-selling toys of the time. Leonardo wears blue and fights with two swords.",
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
    "joke": "Point it at a lamp or a window for brighter pictures. Never point it at the sun. Ask someone who tried.",
    "history": "The View-Master came out around 1939. Each paper reel holds seven pairs of tiny photos, one for each eye, so the pictures pop out in 3D. It started as a travel souvenir and turned into a classic kids' toy.",
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
    "joke": "Carry the big book to look smart. Actually read the Goosebumps. Nobody needs the details.",
    "history": "The Lost World (1995) was the sequel to Jurassic Park, and the movie came in 1997. Night of the Living Dummy (1993) was the Goosebumps book that brought us Slappy, the creepy dummy who became the most famous villain in the series.",
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
    "history": "Cube shelves with bins became the toy storage every kid's room had. 'Clean your room' meant throw everything in the closest bin. Whatever went in there wasn't seen again for months.",
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
    "joke": "A teddy with no fur on one ear is how you know it's been doing its job. Never let anybody fix that.",
    "history": "Most kids had one stuffed animal that went everywhere and came back worn out from being loved. Doctors even have a name for it: a comfort object that helps kids feel safe as they grow up.",
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
    "joke": "High scores don't save. Write yours on the back of the box in marker so everybody knows.",
    "history": "Tiger Electronics made cheap handheld games of everything from Batman to Sonic. Each one played just one game, with pictures already printed on the screen that lit up. Toy maker Hasbro bought Tiger in 1998.",
    "facts": [
      {
        "label": "Company started",
        "value": "1978"
      },
      {
        "label": "Screen",
        "value": "Pictures printed in, they just light up"
      },
      {
        "label": "Games per unit",
        "value": "One"
      },
      {
        "label": "Bought by Hasbro",
        "value": "1998"
      }
    ]
  },
  "ts-clock": {
    "kind": "Clock radio",
    "year": "1990s",
    "maker": null,
    "joke": "Set the alarm to radio, not buzzer. Waking up to a stranger talking about traffic is weird, but at least it's somebody.",
    "history": "Clock radios put an alarm and a radio in one box by the bed, so you could wake up to music or the morning DJ instead of a buzzer. The radio wire had to be moved around until the station came in.",
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
    "joke": "Learning to skate? Find your balance on the grass first, then move to the driveway. It hurts less.",
    "history": "Skateboarding started with California surfers in the 1950s and took off in 1972 when new rubbery wheels gave boards real grip. In 1999 Tony Hawk landed the first 900, two and a half spins in the air, at the X Games.",
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
    "joke": "Label every tape with what's on it and the date. Then tape over it anyway. The label is more of a guess.",
    "history": "Taping shows off TV onto blank VHS tapes was a family hobby, and in 1984 the Supreme Court said it was legal. The slowest speed fit six hours on one tape, but the picture looked worse.",
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
    "history": "The company that makes the original lava lamps changed its name to Mathmos in 1992, right as lava lamps got popular again. It still makes them in the same English town where they've been made since 1963.",
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
    "history": "Pokémon Red and Blue came to the US in September 1998, right after the cartoon. The cards came a few months later and took over every playground. Lots of schools banned them by the end of 1999 because of trading fights.",
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
    "joke": "Cut out the cheat codes and tape them inside the game box. Then you'll never lose the magazine page again.",
    "history": "Nintendo Power came out in 1988 and was where you got maps, tips and cheat codes. The most famous code was up, up, down, down, left, right, left, right, B, A, Start, which gave you 30 lives in Contra.",
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
    "joke": "Count the pieces before you start a game, not after. Then you'll know the missing one isn't your fault.",
    "history": "Monopoly has been sold since 1935. It was based on an older game from 1904 that was made to show why monopolies are bad. Family game night meant Monopoly, Mouse Trap and Sorry!, all of them missing a few pieces.",
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
    "joke": "Playing football in the yard? Make the tree the end zone. Nobody can argue with a tree.",
    "history": "The Buffalo Bills went to four Super Bowls in a row in the early 90s, the only team ever to do it. They lost all four. The first one ended when the winning kick sailed just wide right.",
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
    "history": "Harvey Ball drew the yellow smiley face in 1963. In the 70s two brothers added 'Have a nice day' and sold millions of buttons. It came back in the late 80s and 90s on everything, even bedroom lamps.",
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
    "joke": "Most houseplants die from too much water, not too little. Forgetting it exists is basically the right move.",
    "history": "Tough houseplants like pothos and snake plants can live through almost anything, which is why they survive kids' rooms. NASA once tested plants for cleaning the air, but you'd need a jungle to make a real difference.",
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
    "joke": "Bulb out on the strand? Test the dark ones one by one with a good bulb. Bring snacks. It's a while.",
    "history": "The first electric Christmas tree lights were put up in 1882 by a friend of Thomas Edison, with 80 red, white and blue bulbs. On older strands, one dead bulb makes the whole string go dark, so you had to test every bulb.",
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
    "joke": "Hide your stuff in the sock drawer, under the socks you never wear. Nobody looks there, not even you.",
    "history": "The dresser kept clothes in the bottom drawers and secrets in the top one. In a lot of 90s houses it was also covered in stickers from magazines, cereal boxes and the book fair. Those stickers never come all the way off.",
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
    "joke": "Peeling a sticker halfway is the worst choice. Commit. Leave it, or lose it forever.",
    "history": "Mario first showed up in Donkey Kong in 1981, where he was called Jumpman. By the 90s Nintendo characters were on everything, and Nintendo Power came with posters and stickers. The magazine ran until 2012.",
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
    "history": "No Fear started in 1989 in Southern California, from the dirt bike racing crowd. Its shirts had big tough sayings about winning, and by the mid-90s the logo was everywhere: shirts, stickers and car windows.",
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
    "joke": "Do your homework the minute you get home. Then the rest of the day is yours. Nobody ever followed this advice.",
    "history": "The desk was for homework, officially. Really it was for LEGO, drawing, snacks and games. The LEGO brick we know came out in 1958, and by the 90s every desk drawer had a few loose ones.",
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
    "joke": "Keep crayons, gum and anything wax far away from the lava lamp base. It gets hot enough to melt them.",
    "history": "A lava lamp is just a bulb under a bottle of liquid and wax. The heat makes the wax rise, it cools off at the top, and it sinks again, over and over. The base gets really hot, so don't touch it.",
    "facts": [
      {
        "label": "Heat comes from",
        "value": "A light bulb in the base"
      },
      {
        "label": "Idea came from",
        "value": "An egg timer bubbling on a stove"
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
    "joke": "Pen not writing? Scribble on the back of your hand or a rubber eraser to get the ink going. Works most of the time.",
    "history": "Gel pens were invented in Japan in 1984, and the glitter, milky and scented ones were all over 90s schools. Clicky pens are older: Parker's Jotter came out in 1954. Somebody always borrowed your best one.",
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
    "joke": "Friday night rental trick: get there right after school. By seven o'clock every copy of the new game is gone.",
    "history": "You rented movies and video games from the video store, and Blockbuster was the biggest one. It started in 1985 and had about 9,000 stores by 2004, then streaming took over. One store is still open, in Bend, Oregon.",
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
    "history": "Tiny metal toy cars took off in 1953 when a man made one small enough to fit in a matchbox for his daughter, and Matchbox was born. Mattel answered with Hot Wheels in 1968.",
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
    "history": "Clock radios had an alarm, a clock and a radio, with a big snooze button for slapping in the dark. Snooze usually gave you nine more minutes. Setting the time meant holding a button while the numbers raced by.",
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
    "joke": "Snake gets faster as it grows. Stay near the edges and turn early. That's how the high scores were made.",
    "history": "The first cell phone you could buy came out in 1983, cost $3,995, and was so big people called it 'the brick.' Phones got much smaller in the 90s, and in 1997 Nokia added Snake, one of the first famous phone games.",
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
    "history": "POG was a juice from Hawaii: Passion fruit, Orange and Guava. A teacher there brought back an old game of flipping the bottle caps in 1991, and by the mid-90s every school had it. Stack the caps, throw the slammer, keep what flips.",
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
    "joke": "Cool S: three lines on top, three on the bottom, then connect them. A minute to learn, a lifetime to master.",
    "history": "The 'Cool S' was drawn on every notebook in every school, and nobody knows who started it. It's made from two rows of three lines, which is why so many kids figured it out on their own.",
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
    "joke": "Old desk lamps double as interrogation lights. Point it at your little brother and ask where the remote went.",
    "history": "Old light bulbs turned most of their power into heat instead of light, which is why desk lamps burned your fingers. The bendy desk lamp design comes from the 1930s. Cooler LED bulbs have mostly taken over.",
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
    "history": "McDonald's started the Happy Meal across the US in 1979, and the toy inside became the real reason kids wanted one. Burger King and others followed. The biggest 90s toy craze was Teenie Beanie Babies in 1997.",
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
    "history": "The Magic 8 Ball came out around 1950. Shake it, flip it, and a floating answer shows up in the window. Inside is a 20-sided shape in blue liquid with 10 yes answers, 5 no answers and 5 maybes.",
    "facts": [
      {
        "label": "Came out",
        "value": "Around 1950"
      },
      {
        "label": "Inside",
        "value": "A 20-sided shape floating in blue liquid"
      },
      {
        "label": "Answers",
        "value": "10 yes, 5 maybe, 5 no"
      },
      {
        "label": "Owned by",
        "value": "Mattel"
      }
    ]
  },
  "cd-photo": {
    "kind": "School photo",
    "year": "1990s",
    "maker": null,
    "joke": "Picture day trick: think of something funny right before the flash. It beats the smile from the mirror.",
    "history": "Picture day meant a laser background, a free plastic comb, and tiny wallet photos to trade with friends. Companies like Lifetouch took millions of school pictures every year. Retake day was a second chance that rarely helped.",
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
    "joke": "A plastic movie cup makes a perfect marker holder. It also holds the smell of Sprite forever. Fair trade.",
    "history": "Turtle mania was huge: the cartoon started in 1987 and the first live-action movie came out in 1990, with turtle suits made by Jim Henson's team. Turtles were on cups, cereal and toys, and pizza places loved them.",
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
    "joke": "Save batteries: rewind tapes with a pencil in the hole. Spin it fast. Your wrist will survive.",
    "history": "Sony's first Walkman came out in 1979 and let you carry your music anywhere. Later ones could flip the tape for you, called auto-reverse. Sony sold about 220 million tape Walkmans before stopping in 2010.",
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
    "joke": "Donkey Kong Country secret: on the game select screen, press B, A, R, R, A, L for 50 lives.",
    "history": "Donkey Kong Country came out for the Super Nintendo in 1994. The team built the characters on powerful computers first, so the game looked way better than anything else on the system. It sold over 9 million copies.",
    "facts": [
      {
        "label": "Came out",
        "value": "November 1994"
      },
      {
        "label": "Made by",
        "value": "Rare, a game studio in England"
      },
      {
        "label": "The look",
        "value": "Built as 3D models first, then turned into game art"
      },
      {
        "label": "Sold",
        "value": "9.3 million copies"
      }
    ]
  },
  "cd-yoyo": {
    "kind": "Yo-yo",
    "year": "1929",
    "maker": "Duncan",
    "joke": "String twisted? Let the yo-yo hang and spin until it straightens. Then practice 'walk the dog' away from the dog.",
    "history": "Yo-yos took off in America in the 1920s and 30s when Duncan sent yo-yo pros to schools to show off tricks and run contests. The 90s had its own yo-yo craze, done the same way.",
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
    "history": "Sega made Sonic the Hedgehog in 1991 to take on Mario. Two Sonic cartoons came out in 1993: a silly one where he loved chili dogs, and a more serious Saturday morning one.",
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
    "history": "Space Jam (1996) put Michael Jordan on a basketball team with Bugs Bunny and the Looney Tunes against aliens called the Monstars. It was the number one movie when it came out, and the soundtrack was everywhere.",
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
    "history": "Tee-ball, where you hit the ball off a stand instead of a pitch, was the first sport for a lot of little kids. Many leagues gave every player a trophy at the end of the season, win or lose.",
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
    "history": "Glow-in-the-dark stickers soak up light and slowly give it back in the dark. Older ones faded fast. New ones from the 90s glowed brighter and much longer. Skater and surf stickers were a whole other collection.",
    "facts": [
      {
        "label": "Old glow stickers",
        "value": "Faded in a few minutes"
      },
      {
        "label": "90s glow stickers",
        "value": "Glowed bright for much longer"
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
    "history": "Thomas Jefferson is said to have used a spinning chair while writing the Declaration of Independence. Rolling desk chairs became normal in offices later, and kids found out they're perfect for hallway races.",
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
    "history": "In the late 90s a lot of families shared one computer and got online through the phone line. Windows 98 came out in 1998. If anyone picked up the phone, the internet hung up on you.",
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
    "joke": "Leave a screensaver on when you walk away. It isn't just for fun. It keeps the picture from burning into the screen.",
    "history": "Computer screens in the 90s were big beige boxes with a tube inside, just like TVs. A 15-inch one only showed about 14 inches of picture. They were heavy, they hummed, and they zapped you with static.",
    "facts": [
      {
        "label": "Common sizes",
        "value": "14 and 15 inches"
      },
      {
        "label": "Picture you could see",
        "value": "About 14 inches on a 15-inch screen"
      },
      {
        "label": "Screensavers",
        "value": "Made so a picture left on too long wouldn't burn into the screen"
      }
    ]
  },
  "pc-tower": {
    "kind": "PC tower",
    "year": "1993",
    "maker": "Intel",
    "joke": "Press the Turbo button. Nothing happens. Feel faster anyway.",
    "history": "Intel's Pentium chip came out in 1993, and the 'Intel Inside' sticker ended up on millions of beige computers. The Turbo button was confusing: it mostly slowed the computer down so old games wouldn't run too fast.",
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
    "history": "HP's DeskJet printers, starting in 1988, made color printing cheap enough for home. Before that, printers used long paper with holes down the sides, great for banners. Running out of one ink color the night before a project was a classic.",
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
    "joke": "Home row is A, S, D, F and J, K, L, semicolon. Feel for the little bumps on F and J and you'll never have to look down.",
    "history": "Mavis Beacon Teaches Typing came out in 1987 and was how kids learned to type. Fun fact: Mavis wasn't a real person. The woman on the box was a model. Old IBM keyboards were loud, clicky and nearly unbreakable.",
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
    "history": "The first computer mouse was a wooden box with wheels, built in 1964. Later mice used a rolling ball underneath, and the rollers inside always got gunked up. Light-based mice replaced them around 2000.",
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
    "joke": "Free AOL CDs make great coasters, mirrors and ninja stars. Only one of those is allowed.",
    "history": "Software used to come on floppy disks, and Windows 95 needed 13 of them. CDs held way more, about as much as 450 floppies, so they took over. AOL mailed free trial discs to basically every house in America.",
    "facts": [
      {
        "label": "A floppy held",
        "value": "1.44 MB, about one song"
      },
      {
        "label": "A CD held",
        "value": "About 650 MB, like 450 floppies"
      },
      {
        "label": "Windows 95 on floppies",
        "value": "13 disks"
      },
      {
        "label": "AOL offers",
        "value": "Free hours, mailed to every house"
      }
    ]
  },
  "pc-pencils": {
    "kind": "Colored pencils",
    "year": null,
    "maker": null,
    "joke": "Hide the blue pencil before the state project. Everyone needs the ocean. Supply and demand.",
    "history": "There's no lead in a pencil. It's graphite mixed with clay. People called it lead hundreds of years ago, when they found graphite in England and thought it was lead. Colored pencils use colored wax instead.",
    "facts": [
      {
        "label": "Pencil 'lead'",
        "value": "Graphite and clay, no lead at all"
      },
      {
        "label": "Name comes from",
        "value": "People in the 1500s mixing up graphite and lead"
      },
      {
        "label": "Colored pencils",
        "value": "Color mixed with wax"
      }
    ]
  },
  "pc-stickers": {
    "kind": "Stickers",
    "year": "1981",
    "maker": "MTV",
    "joke": "Put the sticker on the inside of the drawer. Mom never checks in there, and it lasts forever.",
    "history": "MTV started on August 1, 1981, playing music videos all day. By the 90s it had shows like The Real World and TRL, and the logo was on notebooks, stickers and shirts everywhere.",
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
    "joke": "Read the whole manual while the game installs. You've got an hour. Learn the backstory of every elf.",
    "history": "90s computer games came in huge boxes with thick manuals and maps, even though the disc was tiny. Myst (1993) was the best-selling computer game until The Sims in 2002. The big boxes went away in the early 2000s.",
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
    "joke": "Freeze your Gushers overnight. The juice turns into a cold little slush and they last way longer.",
    "history": "Fruit Gushers came out in 1991: chewy fruit snacks with juice inside. The first flavors were strawberry and grape. The commercials showed kids' heads turning into fruit after one bite. That never happened. We checked.",
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
    "joke": "Put your best cards in plastic sleeves and keep them out of your back pocket. Bent cards lose all their trade value.",
    "history": "Pokémon cards hit the US on January 9, 1999. The first set had 102 cards, 16 of them shiny, and the shiny Charizard was the card every kid wanted. First-edition ones are now worth a fortune.",
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
    "joke": "Hot Pocket strategy: let it sit one whole minute after the microwave. The middle stops being frozen.",
    "history": "Hot Pockets came out in 1983, made by two brothers, and the crispy sleeve was the big idea. Pizza rolls are older, from 1968, and became Totino's in 1993. Both burned the roof of your mouth. Both were worth it.",
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
    "joke": "New sneakers rule: stuff the toes with socks so they don't crease. Clean the soles with a toothbrush.",
    "history": "Nike signed Michael Jordan and made the first Air Jordans in 1985. They became the most famous sneakers ever. Kids saved up for months, and a crease in the toe felt like the end of the world.",
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
    "joke": "Batteries not included means no fun on Christmas morning. Ask for a pack of batteries on your list too. Trust us.",
    "history": "Cheap remote control trucks were a top Christmas gift in the 80s and 90s. Many used the same radio signal, so your remote could steer your friend's truck. Batteries were never included.",
    "facts": [
      {
        "label": "The problem",
        "value": "Two trucks on the same signal, one remote drives both"
      },
      {
        "label": "Power",
        "value": "AA or 9-volt batteries, never included"
      }
    ]
  },
  "hotwheels": {
    "kind": "Toy track",
    "year": "1968",
    "maker": "Mattel",
    "joke": "Car flying off the loop? Start it higher. Speed holds it in. A stack of books makes a great hill.",
    "history": "Mattel made Hot Wheels in 1968, with bright orange track you could snap into loops, jumps and long ramps. Kids built tracks across whole houses. Hot Wheels became one of the best-selling toys of all time.",
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
    "history": "Green plastic army men became a cheap bag-of-toys classic after World War II, when plastic replaced old metal toy soldiers. Toy Story made them famous all over again in 1995.",
    "facts": [
      {
        "label": "Made of",
        "value": "Cheap molded plastic"
      },
      {
        "label": "Before plastic",
        "value": "Toy soldiers were made of metal"
      },
      {
        "label": "Movie fame",
        "value": "Sarge and his troops in Toy Story, 1995"
      }
    ]
  },
  "ispy-book": {
    "kind": "Picture book",
    "year": "1992",
    "maker": "Scholastic",
    "joke": "Stuck on a page? Turn the book upside down. Your eyes stop seeing the picture and start seeing the shapes.",
    "history": "I Spy came out in 1992 with rhyming riddles by Jean Marzollo and photos by Walter Wick. Every page was built by hand from real toys and things, then photographed. No computers. The series sold tens of millions.",
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
    "joke": "Furby can't be turned off. To get some sleep, put it somewhere dark and quiet, and it will go to sleep too. Mostly.",
    "history": "Furby came out in October 1998 for about $35. It spoke its own language, Furbish, and seemed to learn English over time, but the words were already inside it. It sold millions, and the NSA banned it from its offices just in case.",
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
    "joke": "Talk to Poo-Chi up close and clear. In a noisy room he ignores you, just like a real dog.",
    "history": "Poo-Chi was a robot puppy from Sega Toys that came out in 2000 for $24.99. He had red light-up eyes, listened to your voice, and sang songs when you pressed his head. Over 10 million sold in about eight months.",
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
    "joke": "Keep the tiny guns and backpacks in a film canister or an old Altoids tin. They'll be lost within the hour otherwise.",
    "history": "Hasbro made up the term 'action figure' in 1964 for G.I. Joe, so boys' dolls would sound tougher. In 1982 the figures got small, and each package had a card on the back with the character's code name and story.",
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
    "joke": "Solve one side, then finish the whole top layer before you touch the rest. That's how the fast kids did it.",
    "history": "Ernő Rubik invented the cube in Hungary in 1974 and it went worldwide in 1980. It can be scrambled about 43 quintillion ways, and in 2010 people proved every one can be solved in 20 moves or less.",
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
    "joke": "Hold Play while you fast-forward to watch the previews zip by. It's also how VCRs get tired.",
    "history": "Power Rangers started on TV in 1993, built from Japanese fight scenes with American kids added in. The Pokémon cartoon came to the US in 1998 and the first movie in 1999. Tapes like these got watched until the boxes wore white.",
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
    "joke": "Want to save a tape forever? Snap out the little tab on the back. Then hide it from whoever owns the Scotch tape.",
    "history": "Every VHS tape has a little plastic tab on the back. Break it off and the VCR won't record over that tape. Put a piece of tape over the hole and it will, which is how 'DO NOT TAPE OVER' tapes got taped over.",
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
    "joke": "Book report trick: read the first chapter, the last chapter and the back cover. Then the middle. Teachers ask about the middle.",
    "history": "Harry Potter came to the US in September 1998 and turned millions of kids into readers. Captain Underpants started in 1997. Diary of a Wimpy Kid didn't come out until 2007, so that one belongs to a little brother.",
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
    "joke": "Hang a poster with tape rolled into loops on the back, not across the corners. It stays up longer and doesn't rip.",
    "history": "Pokémon started in Japan in 1996 as a Game Boy game. Pikachu, number 25, became the face of it all because of the cartoon. In the US, posters from game magazines were the easiest way to get Pokémon on your wall.",
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
    "history": "The Mummy came out in 1999, starring Brendan Fraser, a big action adventure remake of a 1932 monster movie. It made over $400 million, and its flesh-eating scarab beetles ruined a lot of sleepovers.",
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
    "history": "The Iron Giant came out in 1999, about a boy who makes friends with a giant robot from space. Hardly anyone saw it in theaters, but it became a favorite once it hit tape and TV.",
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
    "history": "Babe came out in 1995, about a pig who learns to herd sheep. It was nominated for seven Oscars, including Best Picture, and won one for its special effects. That'll do, pig.",
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

/**
 * A video per card, checked against archive.org: the file to play and how long
 * it runs (scripts/cards/resolve-media.mjs). Overrides the card's own; null
 * means none. Only the things that were a big deal in the 90s get one: a
 * sticker or a lamp doesn't need a commercial.
 */
export const PROP_VIDEOS: Record<string, CardVideo | null> = {
  "crt-tv": {
    "archiveId": "1989-commercial-for-sony-trinitron",
    "title": "Sony Trinitron commercial, 1989",
    "file": "1989 commercial for Sony Trinitron.mp4",
    "length": 15
  },
  "crt-vcr": {
    "archiveId": "panasonic-vcr-commercial",
    "title": "Panasonic VCR \"So easy to programme\" commercial, 1980s",
    "file": "Panasonic VCR Commercial.mp4",
    "length": 30
  },
  "crt-cable": {
    "archiveId": "prevue-july-3-1994",
    "title": "Prevue Channel clip, 1994",
    "file": "Prevue July 3 1994 02.mp4",
    "length": 80
  },
  "nes": {
    "archiveId": "nintendo-woolworths",
    "title": "Woolworth Nintendo: NES & Game Boy (1990)",
    "file": "Nintendo Woolworths.mp4",
    "length": 30
  },
  "boombox": null,
  "gameboy": {
    "archiveId": "1989-nintendo-game-boy-commercial",
    "title": "Nintendo Game Boy commercial, 1989",
    "file": "1989 Nintendo GameBoy Commercial.mp4",
    "length": 30
  },
  "tamagotchi": {
    "archiveId": "youtube-OxVMTxJvd7g",
    "title": "Tamagotchi toy hunting at FAO Schwarz, 1997",
    "file": "OxVMTxJvd7g.mp4",
    "length": 795
  },
  "bed": null,
  "bed-pillow": null,
  "backpack": null,
  "beanbag": null,
  "window": null,
  "window-south": null,
  "door": null,
  "door-poster": {
    "archiveId": "1995-promo-for-the-x-files",
    "title": "The X-Files promo, 1995",
    "file": "1995 promo for The X-Files.mp4",
    "length": 15
  },
  "door-cap": {
    "archiveId": "Space_Invaders_1980_Atari_US.mp4",
    "title": "Atari Space Invaders commercial, 1980",
    "file": "Space_Invaders_1980_Atari_US.mp4",
    "length": 30
  },
  "door-pins": null,
  "nightstand": null,
  "ns-clock": null,
  "ns-lava": {
    "archiveId": "pm-lamp",
    "title": "Power Macintosh lava lamp ad, 1990s",
    "file": "PM_Lamp.mp4",
    "length": 30
  },
  "ns-mug": null,
  "ns-teddy": null,
  "ns-recorder": null,
  "ns-yoshi": null,
  "ns-tapes": null,
  "ns-vhs": {
    "archiveId": "toy-story-1995_202411",
    "title": "Toy Story TV spot, 1995",
    "file": "Toy Story (1995) TV Spot.mp4",
    "length": 33
  },
  "ns-gameboy": null,
  "south-shelf": null,
  "sh-lava": null,
  "sh-vhs": null,
  "sh-car": null,
  "sh-teddy": null,
  "sh-gameboy": {
    "archiveId": "2001-commercial-for-game-boy-color",
    "title": "Game Boy Color commercial, 2001",
    "file": "2001 commercial for Game Boy Color.mp4",
    "length": 30
  },
  "sh-turtle": {
    "archiveId": "teenage-mutant-ninja-turtles-toon-turtles-action-figure-commercial",
    "title": "TMNT Toon Turtles action figure commercial",
    "file": "Teenage Mutant Ninja Turtles Toon Turtles action figure commercial.mp4",
    "length": 30
  },
  "sh-viewmaster": {
    "archiveId": "youtube-JxG0HuHNqKU",
    "title": "Talking View-Master commercial, 1983",
    "file": "JxG0HuHNqKU.mp4",
    "length": 30
  },
  "sh-books": null,
  "toyshelf": null,
  "ts-teddy": null,
  "ts-handheld": {
    "archiveId": "TigerVirtuaFighter95",
    "title": "Tiger Electronics handheld commercial, 1995",
    "file": "TigerVirtuaFighter95.mp4",
    "length": 15
  },
  "ts-clock": null,
  "ts-skateboard": null,
  "ts-vhs": null,
  "ts-lava": null,
  "ts-pokebox": {
    "archiveId": "2000-commercial-for-pokemon-trading-card-game",
    "title": "Pokémon Trading Card Game commercial, 2000",
    "file": "2000 commercial for Pokémon trading card game.mp4",
    "length": 30
  },
  "ts-magazines": {
    "archiveId": "1990-nintendo-power-magazine-get-the-power-super-mario-3-tv-commercial",
    "title": "Nintendo Power magazine commercial, 1990",
    "file": "1990 Nintendo Power Magazine _Get the power_ _Super Mario 3_ TV Commercial.mp4",
    "length": 60
  },
  "shelf": {
    "archiveId": "monopoly-jr-and-rare-headline-news-1994",
    "title": "Monopoly Junior commercial, 1994",
    "file": "0monoply.mp4",
    "length": 15
  },
  "gs-helmet": null,
  "gs-smiley": null,
  "gs-plant": null,
  "gs-lights": null,
  "dresser": null,
  "dr-stickers": null,
  "dr-nofear": null,
  "clutterdesk": null,
  "cd-lava": null,
  "cd-cup": null,
  "cd-tapes": {
    "archiveId": "blockbuster-video-commercial-1990s-a",
    "title": "Blockbuster Video commercial, 1990s",
    "file": "Blockbuster Video Commercial 1990's a.mp4",
    "length": 30
  },
  "cd-car": null,
  "cd-clock": null,
  "cd-phone": {
    "archiveId": "nokia-1998-tv-commercial-drew-carey",
    "title": "Nokia commercial, 1998",
    "file": "Nokia (1998) TV Commercial - Drew Carey.mp4",
    "length": 30
  },
  "cd-pogs": {
    "archiveId": "pogs-1995-t-6-a-7ir-szv-58",
    "title": "POG's commercial, 1995",
    "file": "POG's (1995)-T6A7irSZV58.mp4",
    "length": 203
  },
  "cd-sketch": null,
  "cd-lamp": null,
  "cd-frog": null,
  "cd-8ball": null,
  "cd-photo": null,
  "cd-tmnt": null,
  "cd-walkman": {
    "archiveId": "walkmandec81",
    "title": "Walkman commercial, 1981",
    "file": "walkmandec81.mp4",
    "length": 31
  },
  "cd-snes": {
    "archiveId": "Super_Nintendo_commercial_1992",
    "title": "Super Nintendo commercial, 1992",
    "file": "Super Nintendo commercial (1992)-UxqGyCG5YEE.mp4",
    "length": 30
  },
  "cd-yoyo": null,
  "cd-sonic": {
    "archiveId": "sonic-3-commercial",
    "title": "Sonic 3 commercial, 1994",
    "file": "sonic3.mp4",
    "length": 29
  },
  "cd-vhs": {
    "archiveId": "trailer-for-space-jam",
    "title": "Space Jam trailer, 1996",
    "file": "Trailer for Space Jam.mp4",
    "length": 75
  },
  "cd-trophy": null,
  "cd-stickers": null,
  "cd-chair": null,
  "desk": {
    "archiveId": "windows-98-commercial",
    "title": "Windows 98 commercial, 1998",
    "file": "Windows 98 Commercial.mp4",
    "length": 59
  },
  "pc-monitor": null,
  "pc-tower": {
    "archiveId": "1997-pentium-commercial",
    "title": "Intel Pentium commercial, 1997",
    "file": "1997 Pentium Commercial.mp4",
    "length": 30
  },
  "pc-printer": null,
  "pc-keyboard": null,
  "pc-mouse": null,
  "pc-cds": {
    "archiveId": "aol-america-online-commercial-1998",
    "title": "AOL America Online commercial, 1998",
    "file": "AOL America Online Commercial 1998.mp4",
    "length": 30
  },
  "pc-pencils": null,
  "pc-stickers": null,
  "pc-games": null,
  "gushers": {
    "archiveId": "fruit-gushers-1992-commercial",
    "title": "Fruit Gushers commercial, 1992",
    "file": "FRUIT GUSHERS - 1992 Commercial.mp4",
    "length": 30
  },
  "cards": {
    "archiveId": "2000-commercial-for-pokemon-trading-card-game",
    "title": "Pokémon Trading Card Game commercial, 2000",
    "file": "2000 commercial for Pokémon trading card game.mp4",
    "length": 30
  },
  "hotpockets": {
    "archiveId": "1992-hot-pockets-a-hot-meal-without-a-big-deal-tv-commercial",
    "title": "Hot Pockets commercial, 1992",
    "file": "1992 Hot Pockets _A hot meal without a big deal_ TV Commercial.mp4",
    "length": 31
  },
  "jordans": {
    "archiveId": "nike-air-jordan",
    "title": "Air Jordan commercial with Bugs Bunny, 1992",
    "file": "NIKE Air Jordan.mp4",
    "length": 60
  },
  "car": null,
  "hotwheels": {
    "archiveId": "videoplayback_20240819_1919",
    "title": "Hot Wheels Criss Cross Crash commercial, 1999",
    "file": "videoplayback.mp4",
    "length": 31
  },
  "army": {
    "archiveId": "small-soldiers-burger-king-kids-club-meal-commercial-1998",
    "title": "Small Soldiers Burger King Kids Club commercial, 1998",
    "file": "Small Soldiers Burger King Kids Club Meal commercial (1998).mp4",
    "length": 32
  },
  "ispy-book": {
    "archiveId": "how-i-spy-books-are-made",
    "title": "How 'I Spy' books are made",
    "file": "How 'I Spy' Books Are Made.mp4",
    "length": 259
  },
  "furby": {
    "archiveId": "youtube-ouh2Q_-pYLQ",
    "title": "Tiger Electronics Furby TV commercial",
    "file": "ouh2Q_-pYLQ.mp4",
    "length": 30
  },
  "poochi": {
    "archiveId": "2001-commercial-for-robo-chi-pets",
    "title": "Robo-Chi Pets commercial, 2001",
    "file": "2001 commercial for Robo Chi Pets.mp4",
    "length": 30
  },
  "armor": null,
  "rubik": {
    "archiveId": "youtube-_OHcaVc6ehQ",
    "title": "Rubik's Cube commercial, 1980",
    "file": "_OHcaVc6ehQ.mp4",
    "length": 10
  },
  "vhs-stack": {
    "archiveId": "home-alone-video",
    "title": "Home Alone VHS TV spot, 1991",
    "file": "Home Alone Video.mp4",
    "length": 15
  },
  "vhs-loose": null,
  "books": {
    "archiveId": "HarryPotterTheSorcerersStoneTrailer1",
    "title": "Harry Potter and the Sorcerer's Stone trailer, 2001",
    "file": "HarryPotterTheSorcerersStoneTrailer1.mp4",
    "length": 111
  },
  "poster-pokemon": {
    "archiveId": "Pokemon_The_First_Movie_Trailer_1999",
    "title": "Pokemon: The First Movie trailer, 1999",
    "file": "Pokemon - The First Movie Trailer (1999)-DfRbFf-m1no.mp4",
    "length": 30
  },
  "poster-mummy": {
    "archiveId": "TheMummy1999Trailer",
    "title": "The Mummy trailer, 1999",
    "file": "TheMummy1999Trailer.mp4",
    "length": 101
  },
  "poster-giant": {
    "archiveId": "iron-giant-screening-promo",
    "title": "The Iron Giant VHS screening promo, 1999",
    "file": "iron giant screening promo.mp4",
    "length": 257
  },
  "poster-babe": {
    "archiveId": "1996-commercial-for-babe",
    "title": "Babe commercial, 1996",
    "file": "1996 commercial for Babe.mp4",
    "length": 30
  }
};
