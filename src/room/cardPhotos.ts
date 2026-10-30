import type { CardPhoto } from './propCards';

/**
 * A few more real photos per time capsule, so every card's Images tab has
 * something from the 90s to swipe through after the real thing itself.
 * Picked by hand from Wikimedia Commons search results
 * (scripts/cards/resolve-media.mjs), hot-linked at 640 px, credited on the card.
 */
export const EXTRA_PHOTOS: Record<string, CardPhoto[]> = {
  "crt-tv": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/9/91/1990s_Television_Set.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "ProtoKiwi, CC BY 4.0 · Wikimedia Commons",
      "alt": "1990s Television Set"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Living_Room_1998_NOLA.jpg/960px-Living_Room_1998_NOLA.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Infrogmation of New Orleans, CC BY 2.0 · Wikimedia Commons",
      "alt": "Living Room 1998 NOLA"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Sony_Trinitron_TV_with_remote_User_code.jpg/960px-Sony_Trinitron_TV_with_remote_User_code.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Csendes Vivien, Public domain · Wikimedia Commons",
      "alt": "Sony Trinitron TV with remote User code"
    }
  ],
  "crt-vcr": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/JVC_HR-A592U_VCR.jpg/960px-JVC_HR-A592U_VCR.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Dillan Payne, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "JVC HR-A592U VCR"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Panasonic_VCR_%28Front%29.jpg/960px-Panasonic_VCR_%28Front%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "DiscoA340, CC0 · Wikimedia Commons",
      "alt": "Panasonic VCR (Front)"
    }
  ],
  "crt-cable": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/0/08/Prevue_Guide_Hardware.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Codeslinger2010, Public domain · Wikimedia Commons",
      "alt": "Prevue Guide Hardware"
    }
  ],
  "nes": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Nintendo-Entertainment-System-NES-Console-BL.jpg/960px-Nintendo-Entertainment-System-NES-Console-BL.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Nintendo-Entertainment-System-NES-Console-BL"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Nintendo-Entertainment-System-NES-Controller-FL.jpg/960px-Nintendo-Entertainment-System-NES-Controller-FL.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Nintendo-Entertainment-System-NES-Controller-FL"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Nintendo_Entertainment_System_NES_%281985%29_2.jpg/960px-Nintendo_Entertainment_System_NES_%281985%29_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jzh2074, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Nintendo Entertainment System NES (1985) 2"
    }
  ],
  "boombox": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/JVC_cassette-cd_boombox.jpg/960px-JVC_cassette-cd_boombox.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Imageuploader2614, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "JVC cassette-cd boombox"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Sanyo_M7770K_Portable_Radio_Cassette_Stereo_%2842668942385%29.jpg/960px-Sanyo_M7770K_Portable_Radio_Cassette_Stereo_%2842668942385%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "James Case from Philadelphia, Mississi…, CC BY 2.0 · Wikimedia Commons",
      "alt": "Sanyo M7770K Portable Radio Cassette Stereo"
    }
  ],
  "gameboy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Game_Boy_and_Tetris.jpg/960px-Game_Boy_and_Tetris.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Sammlung der Medien und Wissenschaft, CC BY 4.0 · Wikimedia Commons",
      "alt": "Game Boy and Tetris"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Game_Boy_with_Tetris_cartridge.jpg/960px-Game_Boy_with_Tetris_cartridge.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Studio Alijn, CC0 · Wikimedia Commons",
      "alt": "Game Boy with Tetris cartridge"
    }
  ],
  "tamagotchi": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/c/c2/Various_Tamagotchi_virtual_pet_devices.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Dex Vintage, CC BY 3.0 · Wikimedia Commons",
      "alt": "Various Tamagotchi virtual pet devices"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Tamagotchi_-_%2846219507555%29.jpg/960px-Tamagotchi_-_%2846219507555%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Brett Jordan, CC BY 2.0 · Wikimedia Commons",
      "alt": "Tamagotchi -"
    }
  ],
  "bed": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Mess_at_Home_-_Uptown_New_Orleans_Bedroom_January_1990_01.jpg/960px-Mess_at_Home_-_Uptown_New_Orleans_Bedroom_January_1990_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Infrogmation of New Orleans, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Mess at Home - Uptown New Orleans Bedroom January 1990 01"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Maple_Street_House%2C_Carrollton%2C_New_Orleans%2C_1990s_-_15.jpg/960px-Maple_Street_House%2C_Carrollton%2C_New_Orleans%2C_1990s_-_15.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Infrogmation of New Orleans, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Maple Street House, Carrollton, New Orleans, 1990s - 15"
    }
  ],
  "bed-pillow": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/DSCF0650_Evening_at_the_fair_kids_line_up_at_the_carnival_shooting_gallery_aiming_for_rows_of_colorful_rubber_ducks_and_plush_prizes.jpg/960px-DSCF0650_Evening_at_the_fair_kids_line_up_at_the_carnival_shooting_gallery_aiming_for_rows_of_colorful_rubber_ducks_and_plush_prizes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "PattayaPatrol, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "DSCF0650 Evening at the fair kids line up at the carnival shooting gallery aiming for rows of colorful rubber ducks and plush prizes"
    }
  ],
  "backpack": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Jansport_D-3_backpack.jpg/960px-Jansport_D-3_backpack.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Haolenate, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Jansport D-3 backpack"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Jansport_Backpack_2_2019-03-07.jpg/960px-Jansport_Backpack_2_2019-03-07.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "FASTILY, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Jansport Backpack 2 2019-03-07"
    }
  ],
  "beanbag": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Bean-Bag-chair-Fatboy-Camuflage.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Natwiki31, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Bean-Bag-chair-Fatboy-Camuflage"
    }
  ],
  "window": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Icicles_and_snow_behind_window_venetian_blinds.jpg/960px-Icicles_and_snow_behind_window_venetian_blinds.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Kotivalo, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Icicles and snow behind window venetian blinds"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/9/99/Bedroom_window_%283476202531%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Andy / Andrew Fogg from near Cambridge…, CC BY 2.0 · Wikimedia Commons",
      "alt": "Bedroom window"
    }
  ],
  "window-south": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Sunset_from_Behind_the_Blinds.jpg/960px-Sunset_from_Behind_the_Blinds.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "SavidgeMichael, CC BY 4.0 · Wikimedia Commons",
      "alt": "Sunset from Behind the Blinds"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Pattern_of_light_on_wall_by_sun_through_blinds_plus_window.JPG/960px-Pattern_of_light_on_wall_by_sun_through_blinds_plus_window.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Tomwsulcer, CC0 · Wikimedia Commons",
      "alt": "Pattern of light on wall by sun through blinds plus window"
    }
  ],
  "door": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Kool-Aid_Man_Graffiti_Clayton_Melbourne_2020.jpg/960px-Kool-Aid_Man_Graffiti_Clayton_Melbourne_2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Xyxyzyz, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Kool-Aid Man Graffiti Clayton Melbourne 2020"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Kool-Aid_Man_-_C2E2_2015_%2817281835072%29.jpg/960px-Kool-Aid_Man_-_C2E2_2015_%2817281835072%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Chris Favero from USA, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Kool-Aid Man - C2E2 2015"
    }
  ],
  "door-poster": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/The_X-Files_Office.jpg/960px-The_X-Files_Office.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Marcin Wichary from San Francisco, U.S…, CC BY 2.0 · Wikimedia Commons",
      "alt": "The X-Files Office"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/9/9f/Gulf_Breeze_UFO_model.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Tbrighamphd, CC0 · Wikimedia Commons",
      "alt": "Gulf Breeze UFO model"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Supposed_UFO%2C_Passaic%2C_New_Jersey.jpg/960px-Supposed_UFO%2C_Passaic%2C_New_Jersey.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "George Stock, Public domain · Wikimedia Commons",
      "alt": "Supposed UFO, Passaic, New Jersey"
    }
  ],
  "door-cap": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Space_Invaders.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Tomomarusan, CC BY 2.5 · Wikimedia Commons",
      "alt": "Space Invaders"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Space_Invaders_-_Midway%27s.JPG/960px-Space_Invaders_-_Midway%27s.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jordiferrer, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Space Invaders - Midway's"
    }
  ],
  "nightstand": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Lamp_on_a_bedside_table.JPG/960px-Lamp_on_a_bedside_table.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Nanoxyde, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Lamp on a bedside table"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Bedside_Table_Lamp.jpg/960px-Bedside_Table_Lamp.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "PatongHarbor, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Bedside Table Lamp"
    }
  ],
  "ns-clock": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Sony_Dream_Machine%2C_radio_cassette_recorder_with_LED_alarm_clock_%28cropped%29.jpg/960px-Sony_Dream_Machine%2C_radio_cassette_recorder_with_LED_alarm_clock_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "bobcat rock, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Sony Dream Machine, radio cassette recorder with LED alarm clock (cropped)"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Palladium_clock_radio_931_241_-_LED_Display-1819.jpg/960px-Palladium_clock_radio_931_241_-_LED_Display-1819.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Raimond Spekking, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Palladium clock radio 931 241 - LED Display-1819"
    }
  ],
  "ns-lava": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Lava_lamp_%28yellow%29.jpg/960px-Lava_lamp_%28yellow%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "DMGualtieri, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Lava lamp (yellow)"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Lava_lamp_on_windowsill.jpg/960px-Lava_lamp_on_windowsill.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Aaaatu, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Lava lamp on windowsill"
    }
  ],
  "ns-mug": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/CanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow.jpg/960px-CanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "DanielPenfield, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "CanandaiguaFireIceWinterFestival2019CocoaCrawlDoubleMarshmallow"
    }
  ],
  "ns-teddy": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Old_Teddy_Bear.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Unknown, Public domain · Wikimedia Commons",
      "alt": "Old Teddy Bear"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Handmade_teddy_bear.jpg/960px-Handmade_teddy_bear.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Clément Bucco-Lechat, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Handmade teddy bear"
    }
  ],
  "ns-recorder": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Sony_CF-1700_mono_radio_cassette_recorder_%281973%29.jpg/960px-Sony_CF-1700_mono_radio_cassette_recorder_%281973%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Richard, enjoy my life! from 台北市, ROC…, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Sony CF-1700 mono radio cassette recorder (1973)"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Ferguson_portable_radio_cassette_recorder.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Leif Jørgensen, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Ferguson portable radio cassette recorder"
    }
  ],
  "ns-yoshi": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/SFC_Super_Mario_World_cassette_20090828.jpg/960px-SFC_Super_Mario_World_cassette_20090828.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Y katsu 810, Public domain · Wikimedia Commons",
      "alt": "SFC Super Mario World cassette 20090828"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Nintendo_Super_Famicom_Tietokonemuseo.JPG/960px-Nintendo_Super_Famicom_Tietokonemuseo.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "MKFI, Public domain · Wikimedia Commons",
      "alt": "Nintendo Super Famicom Tietokonemuseo"
    }
  ],
  "ns-tapes": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/The_Goosebumps_%22Dead_House%22.png/960px-The_Goosebumps_%22Dead_House%22.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "PetSematary182, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "The Goosebumps \"Dead House\""
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Goosebumps_-_London_Book_Fair_2016.jpg/960px-Goosebumps_-_London_Book_Fair_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "ActuaLitté, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Goosebumps - London Book Fair 2016"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/R._L._Stine_by_Gage_Skidmore.jpg/960px-R._L._Stine_by_Gage_Skidmore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Gage Skidmore, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "R. L. Stine by Gage Skidmore"
    }
  ],
  "ns-vhs": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Toy_Story_VHS_tape.jpg/960px-Toy_Story_VHS_tape.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "JJBers, CC BY 2.0 · Wikimedia Commons",
      "alt": "Toy Story VHS tape"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Stackoftdkvhstapes.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Bobbiejuice08, CC0 · Wikimedia Commons",
      "alt": "Stackoftdkvhstapes"
    }
  ],
  "ns-gameboy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Game-Boy-Pocket-FL.jpg/960px-Game-Boy-Pocket-FL.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Game-Boy-Pocket-FL"
    }
  ],
  "south-shelf": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/f/f5/View-Master_with_Reel.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Museum of Hartlepool, No restrictions · Wikimedia Commons",
      "alt": "View-Master with Reel"
    }
  ],
  "sh-lava": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Blue_Lava_lamp.JPG/960px-Blue_Lava_lamp.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Risa1029, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Blue Lava lamp"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Blue_lava_lamp.jpg/960px-Blue_lava_lamp.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "SchneiderMac, CC BY 2.0 · Wikimedia Commons",
      "alt": "Blue lava lamp"
    }
  ],
  "sh-vhs": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Dudes_VHS.jpg/960px-Dudes_VHS.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "IllaZilla, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Dudes VHS"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/BGSU_Pop_Culture_Stacks.jpg/960px-BGSU_Pop_Culture_Stacks.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Mbrickn, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "BGSU Pop Culture Stacks"
    }
  ],
  "sh-car": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/HOT_WHEELS_MAINLINE_2013_-_CHEVY_CAMARO.jpg/960px-HOT_WHEELS_MAINLINE_2013_-_CHEVY_CAMARO.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "BenedictLiang, CC0 · Wikimedia Commons",
      "alt": "HOT WHEELS MAINLINE 2013 - CHEVY CAMARO"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Tesla_Hot_Wheels_and_Matchbox_cars.jpg/960px-Tesla_Hot_Wheels_and_Matchbox_cars.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Hans Herrington, CC0 · Wikimedia Commons",
      "alt": "Tesla Hot Wheels and Matchbox cars"
    }
  ],
  "sh-teddy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Teddy_Bear_Big.jpg/960px-Teddy_Bear_Big.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Furush, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Teddy Bear Big"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Stuffed_Animal_Sleepover_at_Arbutus_Branch_BCPL_%289492382003%29.jpg/960px-Stuffed_Animal_Sleepover_at_Arbutus_Branch_BCPL_%289492382003%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Baltimore County Public Library, CC BY 2.0 · Wikimedia Commons",
      "alt": "Stuffed Animal Sleepover at Arbutus Branch BCPL"
    }
  ],
  "sh-gameboy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Nintendo-Game-Boy-Color-FL.jpg/960px-Nintendo-Game-Boy-Color-FL.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Nintendo-Game-Boy-Color-FL"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Game_Boy_Color_Pikachu.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Xabi Vazquez, CC BY 2.0 · Wikimedia Commons",
      "alt": "Game Boy Color Pikachu"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Game-Boy-Color-Yellow.jpg/960px-Game-Boy-Color-Yellow.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Game-Boy-Color-Yellow"
    }
  ],
  "sh-turtle": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/DSC09908_-_Teenage_Mutant_Ninja_Turtles_%2836386558384%29.jpg/960px-DSC09908_-_Teenage_Mutant_Ninja_Turtles_%2836386558384%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Dennis G. Jarvis, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "DSC09908 - Teenage Mutant Ninja Turtles"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Teenage_Mutant_Ninja_Turtles_Van_%283902667030%29.jpg/960px-Teenage_Mutant_Ninja_Turtles_Van_%283902667030%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Scott Rubin from Astoria, NY, United S…, CC BY 2.0 · Wikimedia Commons",
      "alt": "Teenage Mutant Ninja Turtles Van"
    }
  ],
  "sh-viewmaster": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/View_Master_-_Model_G_Red.jpg/960px-View_Master_-_Model_G_Red.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "L'Ospite Inatteso, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "View Master - Model G Red"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/1980_3D_View_Master_model_J_with_Scooby_Doo_disks_Made_in_Belgium.jpg/960px-1980_3D_View_Master_model_J_with_Scooby_Doo_disks_Made_in_Belgium.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "R. Henrik Nilsson, CC BY 4.0 · Wikimedia Commons",
      "alt": "1980 3D View Master model J with Scooby Doo disks Made in Belgium"
    }
  ],
  "sh-books": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Goosebumps_-_London_Book_Fair_2016.jpg/960px-Goosebumps_-_London_Book_Fair_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "ActuaLitté, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Goosebumps - London Book Fair 2016"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/1/12/The_Lost_World_Jurassic_Park_logo.webp?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "https://www.themoviedb.org/u/cyrax_36, CC0 · Wikimedia Commons",
      "alt": "The Lost World Jurassic Park logo"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Bookshelf_Roald_Dahl.jpg/960px-Bookshelf_Roald_Dahl.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "solarisgirl, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Bookshelf Roald Dahl"
    }
  ],
  "toyshelf": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/8/89/Harrys_Toy_Box_-_geograph.org.uk_-_1220768.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "PAUL FARMER, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Harrys Toy Box - geograph.org.uk - 1220768"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Toy_Box_-_geograph.org.uk_-_7085518.jpg/960px-Toy_Box_-_geograph.org.uk_-_7085518.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jonathan Billinger, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Toy Box - geograph.org.uk - 7085518"
    }
  ],
  "ts-teddy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Old_teddy_bears.jpg/960px-Old_teddy_bears.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Helenaver, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Old teddy bears"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Battered_antique_teddy_bears_%2826713450163%29.jpg/960px-Battered_antique_teddy_bears_%2826713450163%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Thomas Quine, CC BY 2.0 · Wikimedia Commons",
      "alt": "Battered antique teddy bears"
    }
  ],
  "ts-handheld": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Tiger_-_mouse_maze_-_retro.jpg/960px-Tiger_-_mouse_maze_-_retro.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Arosio Stefano, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Tiger - mouse maze - retro"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Tandy_Electronic_Repeat_%28Taiwan%29_%26_Tiger_Copycat_%28China%29_-_Matching_Handheld_Electronic_Games.jpg/960px-Tandy_Electronic_Repeat_%28Taiwan%29_%26_Tiger_Copycat_%28China%29_-_Matching_Handheld_Electronic_Games.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Joe Haupt from USA, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Tandy Electronic Repeat (Taiwan) & Tiger Copycat (China) - Matching Handheld Electronic Games"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/The_Real_Ghostbusters_%28Trap_The_Ghosts%29_by_Remco_%2C_Made_In_China%2C_Copyright_1988_%28LCD_Handheld_Electronic_Game%29.jpg/960px-The_Real_Ghostbusters_%28Trap_The_Ghosts%29_by_Remco_%2C_Made_In_China%2C_Copyright_1988_%28LCD_Handheld_Electronic_Game%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Joe Haupt from USA, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "The Real Ghostbusters (Trap The Ghosts) by Remco , Made In China, Copyright 1988 (LCD Handheld Electronic Game)"
    }
  ],
  "ts-clock": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/GE_7-4550_Clock_Radio.jpg/960px-GE_7-4550_Clock_Radio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "phreakindee, CC0 · Wikimedia Commons",
      "alt": "GE 7-4550 Clock Radio"
    }
  ],
  "ts-skateboard": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/1990s_skateboard_in_Tornio_20190608_001.jpg/960px-1990s_skateboard_in_Tornio_20190608_001.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Methem (Mikko J. Putkonen), CC BY 4.0 · Wikimedia Commons",
      "alt": "1990s skateboard in Tornio 20190608 001"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Skateboarding_Kid.jpg/960px-Skateboarding_Kid.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Monaam Ben Fredj, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Skateboarding Kid"
    }
  ],
  "ts-vhs": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/VHS-Video-Tape-Top-Flat.jpg/960px-VHS-Video-Tape-Top-Flat.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "VHS-Video-Tape-Top-Flat"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/That_video_from_The_Ring_VHS_cassette.jpg/960px-That_video_from_The_Ring_VHS_cassette.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "B137, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "That video from The Ring VHS cassette"
    }
  ],
  "ts-lava": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Lava_Lamp_inside_Encounter_Restaurant_%26_Bar_at_Los_Angeles_International_Airport_%2810818808193%29.jpg/960px-Lava_Lamp_inside_Encounter_Restaurant_%26_Bar_at_Los_Angeles_International_Airport_%2810818808193%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Sam Howzit, CC BY 2.0 · Wikimedia Commons",
      "alt": "Lava Lamp inside Encounter Restaurant & Bar at Los Angeles International Airport"
    }
  ],
  "ts-pokebox": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/6/64/Pokemon_tcg_de.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "The Pokémon Company, Public domain · Wikimedia Commons",
      "alt": "Pokemon tcg de"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Pokemon_centre.jpg/960px-Pokemon_centre.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Fredrik Rubensson, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Pokemon centre"
    }
  ],
  "ts-magazines": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Copies_of_Nintendo_Power_at_Future_US_HQ.JPG/960px-Copies_of_Nintendo_Power_at_Future_US_HQ.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "BrokenSphere, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Copies of Nintendo Power at Future US HQ"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/5/59/Bit_10-1991_and_12-1994.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "NeonPuffin, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Bit 10-1991 and 12-1994"
    }
  ],
  "shelf": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Monopoly_board_game.jpg/960px-Monopoly_board_game.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Yahya, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Monopoly board game"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Monopoly_board_on_white_bg.jpg/960px-Monopoly_board_on_white_bg.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "fir0002 flagstaffotos [at] gmail.com C…, GFDL 1.2 · Wikimedia Commons",
      "alt": "Monopoly board on white bg"
    }
  ],
  "gs-helmet": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Cleveland_Browns_vs._Buffalo_Bills_%2820589255520%29.jpg/960px-Cleveland_Browns_vs._Buffalo_Bills_%2820589255520%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Erik Drost, CC BY 2.0 · Wikimedia Commons",
      "alt": "Cleveland Browns vs. Buffalo Bills"
    }
  ],
  "gs-smiley": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/8/84/A_smiley_face_balloon_from_a_Gregory_FUNNY-B%27LOONS_ad_on_page_20_of_The_Billboard_March_18_1922.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "the Gregory Rubber Company, Akron, Ohio, Public domain · Wikimedia Commons",
      "alt": "A smiley face balloon from a Gregory FUNNY-B'LOONS ad on page 20 of The Billboard March 18 1922"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Smiley_face_service_bell.png/960px-Smiley_face_service_bell.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Funknendai, CC0 · Wikimedia Commons",
      "alt": "Smiley face service bell"
    }
  ],
  "gs-plant": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Epipremnum_aureum_31082012.jpg/960px-Epipremnum_aureum_31082012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Joydeep, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Epipremnum aureum 31082012"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Epipremnum_aureum_%28Marble_Queen%29_houseplant_%282%29.png/960px-Epipremnum_aureum_%28Marble_Queen%29_houseplant_%282%29.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Spnq, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Epipremnum aureum (Marble Queen) houseplant (2)"
    }
  ],
  "gs-lights": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Adliswil_christmas_lights_2_20211213.jpg/960px-Adliswil_christmas_lights_2_20211213.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Daniel Kraft, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Adliswil christmas lights 2 20211213"
    }
  ],
  "dresser": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/2nd_flr_Kids_Chest_of_drawers_6258.jpg/960px-2nd_flr_Kids_Chest_of_drawers_6258.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Chris Light, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "2nd flr Kids Chest of drawers 6258"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Child%27s_bedroom_LCCN2016824205.jpg/960px-Child%27s_bedroom_LCCN2016824205.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "National Photo Company Collection, Public domain · Wikimedia Commons",
      "alt": "Child's bedroom LCCN2016824205"
    }
  ],
  "dr-stickers": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/NES_European_Version_with_a_Super_Mario_Bros_sticker_20110723.jpg/960px-NES_European_Version_with_a_Super_Mario_Bros_sticker_20110723.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jakez, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "NES European Version with a Super Mario Bros sticker 20110723"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/San_Diego_Comic-Con_2014_-_Yoshi_%2814769237294%29.jpg/960px-San_Diego_Comic-Con_2014_-_Yoshi_%2814769237294%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "William Tung from USA, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "San Diego Comic-Con 2014 - Yoshi"
    }
  ],
  "clutterdesk": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Gammel_liten_skolepult_pult_skolebenk_Tre_Benk_stol_Lokk_Rom_under_bordplate_Grop_til_blekkhus_Maling_flasser_Old_small_wooden_school_room_bench_writing_desk_Storage_compartment_space_under_table_top_Porsgrunn_Norway_2020-01-14_1646.jpg/960px-thumbnail.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Wolfmann, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Gammel liten skolepult pult skolebenk Tre Benk stol Lokk Rom under bordplate Grop til blekkhus Maling flasser Old small wooden school room bench writing desk Storage compartment space under table top Porsgrunn Norway 2020-01-14 1646"
    }
  ],
  "cd-lava": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Lava_lamp_auras_glow_red_dragonfire.jpg/960px-Lava_lamp_auras_glow_red_dragonfire.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Nlightning, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Lava lamp auras glow red dragonfire"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/d/dd/Lava_lamp.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "The original uploader was Shadster at…, Public domain · Wikimedia Commons",
      "alt": "Lava lamp"
    }
  ],
  "cd-cup": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Pencils_in_a_cup_%282568202837%29.jpg/960px-Pencils_in_a_cup_%282568202837%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Rhett Maxwell, CC BY 2.0 · Wikimedia Commons",
      "alt": "Pencils in a cup"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Plastic_pen_stand_from_the_1970s_in_Sweden%2C_front.jpg/960px-Plastic_pen_stand_from_the_1970s_in_Sweden%2C_front.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "W.carter, CC BY 4.0 · Wikimedia Commons",
      "alt": "Plastic pen stand from the 1970s in Sweden, front"
    }
  ],
  "cd-tapes": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Anchorage_Blockbuster_video_store_%2841894010352%29.jpg/960px-Anchorage_Blockbuster_video_store_%2841894010352%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jon Konrath from Oakland, USA, CC BY 2.0 · Wikimedia Commons",
      "alt": "Anchorage Blockbuster video store"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Blockbuster_Video%2C_Addison_Illinois%2C_April_2009.jpg/960px-Blockbuster_Video%2C_Addison_Illinois%2C_April_2009.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Joe+Jeanette Archie, CC BY 2.0 · Wikimedia Commons",
      "alt": "Blockbuster Video, Addison Illinois, April 2009"
    }
  ],
  "cd-clock": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Emerson_DCF-80_Flip-Number_Alarm_Clock_Radio_Front.JPG/960px-Emerson_DCF-80_Flip-Number_Alarm_Clock_Radio_Front.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Forest51690, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Emerson DCF-80 Flip-Number Alarm Clock Radio Front"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Digital-clock-radio-basic_hf.jpg/960px-Digital-clock-radio-basic_hf.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Tysto (Derek Jensen), Public domain · Wikimedia Commons",
      "alt": "Digital-clock-radio-basic hf"
    }
  ],
  "cd-phone": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Nokia_3310_grey_front_%28tidied_and_enhanced%29.jpg/960px-Nokia_3310_grey_front_%28tidied_and_enhanced%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Multicherry, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Nokia 3310 grey front (tidied and enhanced)"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Nokia_3310_blue.jpg/960px-Nokia_3310_blue.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Michael Brandtner, Public domain · Wikimedia Commons",
      "alt": "Nokia 3310 blue"
    }
  ],
  "cd-pogs": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/6/61/Kids_playing_pogs.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Jewel457, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Kids playing pogs"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Pogs_case_and_playing.jpg/960px-Pogs_case_and_playing.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Nizzan Cohen, CC BY 4.0 · Wikimedia Commons",
      "alt": "Pogs case and playing"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Pogslam.jpg/960px-Pogslam.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Elfer, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Pogslam"
    }
  ],
  "cd-lamp": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Luxo_Jr_in_Pixar_Fest_Hong_Kong_2021.jpg/960px-Luxo_Jr_in_Pixar_Fest_Hong_Kong_2021.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Achanhk, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Luxo Jr in Pixar Fest Hong Kong 2021"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Shooting_LUXO_1.jpg/960px-Shooting_LUXO_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ynniv27, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Shooting LUXO 1"
    }
  ],
  "cd-frog": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Burger_King_Kids_Club_Fun_Center.jpg/960px-Burger_King_Kids_Club_Fun_Center.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "PeRshGo, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Burger King Kids Club Fun Center"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/01827jfHappy_Meal_Toys_McDonalds_productsfvf_15.JPG/960px-01827jfHappy_Meal_Toys_McDonalds_productsfvf_15.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Judgefloro, Public domain · Wikimedia Commons",
      "alt": "01827jfHappy Meal Toys McDonalds productsfvf 15"
    }
  ],
  "cd-8ball": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Magic_8_Ball_-_Instrument_Of_Evil%3F_%282426454804%29.jpg/960px-Magic_8_Ball_-_Instrument_Of_Evil%3F_%282426454804%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "greeblie from US, CC BY 2.0 · Wikimedia Commons",
      "alt": "Magic 8 Ball - Instrument Of Evil?"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Magic_8_Ball_-_Do_I_get_my_Christmas_wish%3F_%286521326205%29.jpg/960px-Magic_8_Ball_-_Do_I_get_my_Christmas_wish%3F_%286521326205%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "frankieleon from Maffle Ath, Belgium, CC BY 2.0 · Wikimedia Commons",
      "alt": "Magic 8 Ball - Do I get my Christmas wish?"
    }
  ],
  "cd-photo": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Eaglebrook_School_Archives%2C_1990s_%285574671230%29.jpg/960px-Eaglebrook_School_Archives%2C_1990s_%285574671230%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "EaglebrookSchool, CC BY 2.0 · Wikimedia Commons",
      "alt": "Eaglebrook School Archives, 1990s"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Crusaders_School_Bus%2C_Chalmette%2C_Louisiana.jpg/960px-Crusaders_School_Bus%2C_Chalmette%2C_Louisiana.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Uncredited for National Park Service, Public domain · Wikimedia Commons",
      "alt": "Crusaders School Bus, Chalmette, Louisiana"
    }
  ],
  "cd-tmnt": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Pyrkon_2022_-_Teenage_Mutant_Ninja_Turtles.jpg/960px-Pyrkon_2022_-_Teenage_Mutant_Ninja_Turtles.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Tomasz Molina, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Pyrkon 2022 - Teenage Mutant Ninja Turtles"
    }
  ],
  "cd-walkman": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Sony_Walkman_WM-2013.jpg/960px-Sony_Walkman_WM-2013.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Accurimbono, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Sony Walkman WM-2013"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Sony_Walkman_WM-41.jpg/960px-Sony_Walkman_WM-41.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Dillan Payne, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Sony Walkman WM-41"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Original_Sony_Walkman_TPS-L2.JPG/960px-Original_Sony_Walkman_TPS-L2.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Binarysequence, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Original Sony Walkman TPS-L2"
    }
  ],
  "cd-snes": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Entrance_to_Donkey_Kong_Country.jpg/960px-Entrance_to_Donkey_Kong_Country.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Avatar5991, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Entrance to Donkey Kong Country"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Nintendo-Super-NES-Cartridge-Boards.jpg/960px-Nintendo-Super-NES-Cartridge-Boards.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Nintendo-Super-NES-Cartridge-Boards"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Super_Mario_World_cassette_on_Super_Nintendo_Entertainment_System_20080610.jpg/960px-Super_Mario_World_cassette_on_Super_Nintendo_Entertainment_System_20080610.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Dhscommtech, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Super Mario World cassette on Super Nintendo Entertainment System 20080610"
    }
  ],
  "cd-yoyo": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Yo_yo_toy.jpg/960px-Yo_yo_toy.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "ANBARASU THIRAVIYAM, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Yo yo toy"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/9/92/Wooden_yo-yo.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "XuliánConX, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Wooden yo-yo"
    }
  ],
  "cd-sonic": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/WW_Chicago_2011_-_Sonic_the_Hedgehog_%288168360292%29.jpg/960px-WW_Chicago_2011_-_Sonic_the_Hedgehog_%288168360292%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "GabboT, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "WW Chicago 2011 - Sonic the Hedgehog"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Sega-Genesis-NA-Mk2-Console-Set.png/960px-Sega-Genesis-NA-Mk2-Console-Set.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, Public domain · Wikimedia Commons",
      "alt": "Sega-Genesis-NA-Mk2-Console-Set"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Sega-Genesis-Mk2-6button.jpg/960px-Sega-Genesis-Mk2-6button.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Sega-Genesis-Mk2-6button"
    }
  ],
  "cd-vhs": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Space_Jam.jpg/960px-Space_Jam.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ungry Young Man, CC BY 2.0 · Wikimedia Commons",
      "alt": "Space Jam"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/c/c3/Jordan_by_Lipofsky_16577.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Steve Lipofsky www.Basketballphoto.com, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Jordan by Lipofsky 16577"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Rocket_-_Fabbri_Space_Jam_at_a_fun-fair_in_Irun%2C_Spain.jpg/960px-Rocket_-_Fabbri_Space_Jam_at_a_fun-fair_in_Irun%2C_Spain.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Vasconium, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Rocket - Fabbri Space Jam at a fun-fair in Irun, Spain"
    }
  ],
  "cd-trophy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Bands_of_America_participation_trophy.JPG/960px-Bands_of_America_participation_trophy.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ktr101, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Bands of America participation trophy"
    }
  ],
  "cd-stickers": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Sega-Saturn-Console-Set-Mk2.jpg/960px-Sega-Saturn-Console-Set-Mk2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Evan-Amos, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Sega-Saturn-Console-Set-Mk2"
    }
  ],
  "cd-chair": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Office_chair_lumbal_support.jpg/960px-Office_chair_lumbal_support.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Buteo, CC BY-SA 3.0 de · Wikimedia Commons",
      "alt": "Office chair lumbal support"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Old_revolving_office_chair_%281%29.jpg/960px-Old_revolving_office_chair_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Praveenp, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Old revolving office chair (1)"
    }
  ],
  "desk": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/1990s_home_computer_office_New_Orleans.jpg/960px-1990s_home_computer_office_New_Orleans.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Infrogmation of New Orleans, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "1990s home computer office New Orleans"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/CD_Room_de_instalaci%C3%B3n_de_Windows_98.jpg/960px-CD_Room_de_instalaci%C3%B3n_de_Windows_98.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Mark Morgan, CC BY 2.0 · Wikimedia Commons",
      "alt": "CD Room de instalación de Windows 98"
    }
  ],
  "pc-monitor": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/HP_Pavilion_v72_17_inch_CRT_Monitor_front_view_IMG_9419.JPG/960px-HP_Pavilion_v72_17_inch_CRT_Monitor_front_view_IMG_9419.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Scott A. Miller, CC BY 3.0 · Wikimedia Commons",
      "alt": "HP Pavilion v72 17 inch CRT Monitor front view IMG 9419"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Maury_Hall_computer_lab_-02-_%2849978326986%29.jpg/960px-Maury_Hall_computer_lab_-02-_%2849978326986%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ben Schumin from Montgomery Village, M…, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Maury Hall computer lab -02-"
    }
  ],
  "pc-tower": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/2017_mid_range_pc_in_late_1990s_case.jpg/960px-2017_mid_range_pc_in_late_1990s_case.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Tobias \"ToMar\" Maier, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "2017 mid range pc in late 1990s case"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Viglen_PC_%2851332336626%29.jpg/960px-Viglen_PC_%2851332336626%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Steve Elliott from UK, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Viglen PC"
    }
  ],
  "pc-printer": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/HP_DeskJet_610C.jpg/960px-HP_DeskJet_610C.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Sensibilität Sensibilité, CC BY 3.0 · Wikimedia Commons",
      "alt": "HP DeskJet 610C"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/HP_DeskJet_940C.jpg/960px-HP_DeskJet_940C.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Andy / Andrew Fogg, CC BY 2.0 · Wikimedia Commons",
      "alt": "HP DeskJet 940C"
    }
  ],
  "pc-keyboard": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/IBM_1394100_keyboard.jpg/960px-IBM_1394100_keyboard.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "James R. Maynard III, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "IBM 1394100 keyboard"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/IBM_1390572_keyboard_01.jpg/960px-IBM_1390572_keyboard_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "James R. Maynard III, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "IBM 1390572 keyboard 01"
    }
  ],
  "pc-mouse": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Ball_Mouse_semi-inside_view.jpg/960px-Ball_Mouse_semi-inside_view.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Grain, Public domain · Wikimedia Commons",
      "alt": "Ball Mouse semi-inside view"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/f/fd/Mouse-mechanism-cutaway.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Unknown, Copyrighted free use · Wikimedia Commons",
      "alt": "Mouse-mechanism-cutaway"
    }
  ],
  "pc-cds": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/AOL_promotional_CDs_in_Canada.jpg/960px-AOL_promotional_CDs_in_Canada.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jeran Renz (talk), CC0 · Wikimedia Commons",
      "alt": "AOL promotional CDs in Canada"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/AOL_CD-ROM%2C_German%2C_650_hours_free_Internet-49221.jpg/960px-AOL_CD-ROM%2C_German%2C_650_hours_free_Internet-49221.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Raimond Spekking, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "AOL CD-ROM, German, 650 hours free Internet-49221"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/8/88/Package_of_ten_3.5-inch_floppy_disks_%282HD%29_from_BASF.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "User:Iswoar, CC BY 3.0 · Wikimedia Commons",
      "alt": "Package of ten 3.5-inch floppy disks (2HD) from BASF"
    }
  ],
  "pc-pencils": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/1990_Crayola_Colored_Pencil_Set_%28Colors%29.jpg/960px-1990_Crayola_Colored_Pencil_Set_%28Colors%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "INFLATE AND POP!, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "1990 Crayola Colored Pencil Set (Colors)"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Colored_pencils_in_holder.jpg/960px-Colored_pencils_in_holder.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "ThoBel-0043, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Colored pencils in holder"
    }
  ],
  "pc-stickers": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/e/ee/MTV_First_Promo.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "NASA / Neil A. Armstrong / MTV, Public domain · Wikimedia Commons",
      "alt": "MTV First Promo"
    }
  ],
  "gushers": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Fruit_Rollups%2C_Fruit_Gushers_and_Fruit_by_the_Foot.jpg/960px-Fruit_Rollups%2C_Fruit_Gushers_and_Fruit_by_the_Foot.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Thomson200, CC0 · Wikimedia Commons",
      "alt": "Fruit Rollups, Fruit Gushers and Fruit by the Foot"
    }
  ],
  "cards": [
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/c/c1/Pokemon_collection.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Jarek Tuszyński, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Pokemon collection"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/POKEMON_card_battle.jpg/960px-POKEMON_card_battle.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "MIKI Yoshihito, CC BY 2.0 · Wikimedia Commons",
      "alt": "POKEMON card battle"
    }
  ],
  "hotpockets": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/Hot_Pocket_Cooked.jpg/960px-Hot_Pocket_Cooked.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Tony Branston (my Flickr profile), CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Hot Pocket Cooked"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Jeno%27s_Pizza_Rolls_box.jpg/960px-Jeno%27s_Pizza_Rolls_box.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jeno's, Inc., Public domain · Wikimedia Commons",
      "alt": "Jeno's Pizza Rolls box"
    }
  ],
  "jordans": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Air_jordan_XI_space_jam.jpg/960px-Air_jordan_XI_space_jam.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ric_man (talk) (Uploads), CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Air jordan XI space jam"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/1985_Air_Jordan_1s.jpg/960px-1985_Air_Jordan_1s.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Smithsonian Institute, CC0 · Wikimedia Commons",
      "alt": "1985 Air Jordan 1s"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Nike_Air_Jordan_IV.jpg/960px-Nike_Air_Jordan_IV.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Osyffar, CC0 · Wikimedia Commons",
      "alt": "Nike Air Jordan IV"
    }
  ],
  "car": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Chevrolet_Camaro_SS_RC_Car.jpg/960px-Chevrolet_Camaro_SS_RC_Car.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Kskhh, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Chevrolet Camaro SS RC Car"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Nitro_Buggy_RC_Car.jpg/960px-Nitro_Buggy_RC_Car.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Quist, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Nitro Buggy RC Car"
    }
  ],
  "hotwheels": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Hot_Wheels_display_at_Safeway.jpg/960px-Hot_Wheels_display_at_Safeway.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ser Amantio di Nicolao, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Hot Wheels display at Safeway"
    }
  ],
  "army": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Plastic_soldiers_%2812%29.jpg/960px-Plastic_soldiers_%2812%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Chmee2, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Plastic soldiers (12)"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Green_Plastic_Soldier_Overlooking_River_Shore.png/960px-Green_Plastic_Soldier_Overlooking_River_Shore.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Coyote in a MiG, CC0 · Wikimedia Commons",
      "alt": "Green Plastic Soldier Overlooking River Shore"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Max_green_plastic_soldier.jpg/960px-Max_green_plastic_soldier.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "puuikibeach, CC BY 2.0 · Wikimedia Commons",
      "alt": "Max green plastic soldier"
    }
  ],
  "ispy-book": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Online_Scholastic_Book_Fair_at_McCornack_Elementary_School.jpg/960px-Online_Scholastic_Book_Fair_at_McCornack_Elementary_School.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Rick Obst, CC BY 2.0 · Wikimedia Commons",
      "alt": "Online Scholastic Book Fair at McCornack Elementary School"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Scholastic_-_London_Book_Fair_2018.jpg/960px-Scholastic_-_London_Book_Fair_2018.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "ActuaLitté, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Scholastic - London Book Fair 2018"
    }
  ],
  "furby": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Furbies%3F.jpg/960px-Furbies%3F.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "danieljordahl, CC BY 2.0 · Wikimedia Commons",
      "alt": "Furbies?"
    }
  ],
  "armor": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Action_Man_Vickers_machine_gun.jpg/960px-Action_Man_Vickers_machine_gun.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "User:GraemeLeggett., Public domain · Wikimedia Commons",
      "alt": "Action Man Vickers machine gun"
    }
  ],
  "rubik": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Rubiks_cube_by_keqs.jpg/960px-Rubiks_cube_by_keqs.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Lars Karlsson (Keqs), CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Rubiks cube by keqs"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Rubiks_Cube_scrambled_cubemeister_com.jpg/960px-Rubiks_Cube_scrambled_cubemeister_com.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "cubemeister.com, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Rubiks Cube scrambled cubemeister com"
    }
  ],
  "vhs-stack": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Home_Alone_House.jpg/960px-Home_Alone_House.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "anarchosyn, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Home Alone House"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/VHS_videocassette_-_front.jpg/960px-VHS_videocassette_-_front.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "LoMit, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "VHS videocassette - front"
    }
  ],
  "vhs-loose": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/VHS_cassette_plastic_case_open.JPG/960px-VHS_cassette_plastic_case_open.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "BrokenSphere, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "VHS cassette plastic case open"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/2023_Kaseta_VHS_%281%29.jpg/960px-2023_Kaseta_VHS_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Jacek Halicki, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "2023 Kaseta VHS (1)"
    }
  ],
  "books": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Harry_Potter_Book_1%2C_1st_American_ed._without_dust_jacket.JPG/960px-Harry_Potter_Book_1%2C_1st_American_ed._without_dust_jacket.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "BrokenSphere, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Harry Potter Book 1, 1st American ed. without dust jacket"
    }
  ],
  "poster-pokemon": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Big_Pikachu_figure_at_K%C3%B6nigsbau_Stuttgart_%282022-12-31%29_2.jpg/960px-Big_Pikachu_figure_at_K%C3%B6nigsbau_Stuttgart_%282022-12-31%29_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Almanta, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Big Pikachu figure at Königsbau Stuttgart (2022-12-31) 2"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/3D_Pikachu_Latte_Art_-_Harajuku_%2828080147878%29.jpg/960px-3D_Pikachu_Latte_Art_-_Harajuku_%2828080147878%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Ajay Suresh from New York, NY, USA, CC BY 2.0 · Wikimedia Commons",
      "alt": "3D Pikachu Latte Art - Harajuku"
    }
  ],
  "poster-mummy": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Karnak_temple_scarab_beetle_A.jpg/960px-Karnak_temple_scarab_beetle_A.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Wouter Hagens, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "Karnak temple scarab beetle A"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/3/34/The_Mummy_%281999%29_Logo_-_Norwegian%2C_Swedish_and_Danish_-_Mumien.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Torfilm, CC BY-SA 3.0 · Wikimedia Commons",
      "alt": "The Mummy (1999) Logo - Norwegian, Swedish and Danish - Mumien"
    }
  ],
  "poster-giant": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/The_Iron_Giant_%2852499922096%29.jpg/960px-The_Iron_Giant_%2852499922096%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Phil Parker from Leamington Spa, UK, CC BY 2.0 · Wikimedia Commons",
      "alt": "The Iron Giant"
    },
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Iron_Giant%2C_LA_Animation_Festival%2C_Christopher_McDonald%2C_Brad_Bird%2C_Eli_Marienthol.jpg/960px-Iron_Giant%2C_LA_Animation_Festival%2C_Christopher_McDonald%2C_Brad_Bird%2C_Eli_Marienthol.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Doug Kline, CC BY 2.0 · Wikimedia Commons",
      "alt": "Iron Giant, LA Animation Festival, Christopher McDonald, Brad Bird, Eli Marienthol"
    }
  ],
  "poster-babe": [
    {
      "src": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Standing_piglet_at_golden_hour_in_Don_Det_Laos.jpg/960px-Standing_piglet_at_golden_hour_in_Don_Det_Laos.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "credit": "Basile Morin, CC BY-SA 4.0 · Wikimedia Commons",
      "alt": "Standing piglet at golden hour in Don Det Laos"
    },
    {
      "src": "https://upload.wikimedia.org/wikipedia/commons/2/2c/Piglets_in_West_Tisted%2C_Hampshire_-_geograph.org.uk_-_368788.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "credit": "Colin Smith, CC BY-SA 2.0 · Wikimedia Commons",
      "alt": "Piglets in West Tisted, Hampshire - geograph.org.uk - 368788"
    }
  ]
};
