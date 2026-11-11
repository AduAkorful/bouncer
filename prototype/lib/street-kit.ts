/**
 * Every piece a sponsor can put on their street. Each list is a menu in the sponsor form, and a card stores
 * the position in the list, so options are only ever added at the end. The first option of every list is the
 * Accra street, so an old card or a bad index draws the street it always did.
 */

export type Learn = { title: string; text: string };
type Option<Id extends string> = { id: Id; label: string; learn?: Learn };

export const STALLS = [
  { id: "suya", label: "Suya stand", learn: { title: "Suya", text: "Spicy grilled beef skewers rubbed with peanut-chilli spice. Late-night street food across West Africa." } },
  { id: "kebab", label: "Kebab van", learn: { title: "Kebab van", text: "Doner, chips and chilli sauce: the traditional end to a night out in London." } },
  { id: "corn", label: "Roast corn cart", learn: { title: "Roast corn", text: "Corn on the cob roasted over charcoal, often with coconut or a squeeze of lime." } },
  { id: "coffee", label: "Coffee cart", learn: { title: "Coffee cart", text: "Espresso on wheels for the people who still have somewhere to be after midnight." } },
  { id: "icecream", label: "Ice cream bike", learn: { title: "Ice cream bike", text: "A freezer box on a bicycle, rung along with a bell. FanIce in Accra, gelato in Rome." } },
  { id: "noodles", label: "Noodle stall", learn: { title: "Noodle stall", text: "A pot of broth kept at a boil all night and noodles cooked to order in a minute." } },
  { id: "tacos", label: "Taco stand", learn: { title: "Tacos al pastor", text: "Pork cooked on a vertical spit with pineapple, shaved into small tortillas." } },
] as const satisfies readonly Option<string>[];

export const RIDES = [
  { id: "taxi", label: "Yellow taxi", learn: { title: "Accra taxi", text: "Painted yellow on the corners so you can spot one in traffic. Fares are agreed before you get in." } },
  { id: "cab", label: "Black cab", learn: { title: "Black cab", text: "London's licensed taxis. Drivers pass ‘The Knowledge’, memorising 25,000 streets." } },
  { id: "tuktuk", label: "Tuk-tuk", learn: { title: "Tuk-tuk", text: "A three-wheeled motor taxi, open at the sides. Called a pragya in Ghana and a keke in Nigeria." } },
  { id: "limo", label: "Stretch limo", learn: { title: "Stretch limo", text: "Somebody booked the long car. Whoever is in it still has to get past the door." } },
  { id: "classic", label: "Classic car", learn: { title: "Classic car", text: "An old car kept running on love and spare parts, parked where everyone can see it." } },
  { id: "scooters", label: "Parked scooters", learn: { title: "Scooters", text: "The way half the queue got here. Nobody remembers which one is theirs." } },
] as const satisfies readonly Option<string>[];

export const PASSERS = [
  { id: "okada", label: "Okada", learn: { title: "Okada", text: "A motorbike taxi. Quicker than anything with four wheels when the roads are jammed." } },
  { id: "bus", label: "Night bus", learn: { title: "Night bus", text: "Buses with an N before the number run all night when the Tube is shut." } },
  { id: "bike", label: "Cyclist", learn: { title: "Night rider", text: "Someone cycling home with a light that is too bright and a bag that is too full." } },
  { id: "tram", label: "Tram", learn: { title: "Night tram", text: "A late tram on rails down the middle of the street, nearly empty." } },
  { id: "skater", label: "Skateboarder", learn: { title: "Skater", text: "Going faster than is wise, past a queue that is not impressed." } },
  { id: "none", label: "Nobody passing" },
] as const satisfies readonly Option<string>[];

export const SELLERS = [
  { id: "water", label: "Water seller" },
  { id: "roses", label: "Rose seller" },
  { id: "glow", label: "Glow stick seller" },
  { id: "balloons", label: "Balloon seller" },
  { id: "snacks", label: "Snack tray seller" },
  { id: "chargers", label: "Phone charger seller" },
] as const satisfies readonly Option<string>[];

export type ShopKit = { id: string; label: string; ad: [string, string, string]; kiosk: string; shutter: string; adLearn: Learn; kioskLearn: Learn; tone: string };

export const SHOPS = [
  {
    id: "chop",
    label: "Chop bar and MoMo kiosk",
    ad: ["AUNTIE B'S", "CHOP BAR", "WAAKYE · BANKU · FUFU → 2ND LEFT"],
    kiosk: "TOP-UP · MOMO",
    shutter: "KOJO",
    adLearn: { title: "Chop bar", text: "A small local restaurant serving home-style dishes like waakye (rice and beans), banku and fufu." },
    kioskLearn: { title: "MoMo", text: "Mobile money: paying and getting paid from your phone. Kiosks like this top up credit and cash out." },
    tone: "#e9b52a",
  },
  {
    id: "cafe",
    label: "Café and off licence",
    ad: ["FRANCO'S", "CAFÉ", "FULL ENGLISH ALL DAY · TEA 1.50"],
    kiosk: "NEWS · OFF LICENCE",
    shutter: "CAFF",
    adLearn: { title: "Caff", text: "A no-frills café. A full English is eggs, bacon, sausage, beans, toast and tea." },
    kioskLearn: { title: "Off licence", text: "A corner shop licensed to sell alcohol to take away. The ‘offie’." },
    tone: "#e9b52a",
  },
  {
    id: "barber",
    label: "Barber and phone repair",
    ad: ["SHARP", "CUTS", "FADES · LINE-UPS · OPEN TILL 2"],
    kiosk: "PHONE REPAIR",
    shutter: "CUTZ",
    adLearn: { title: "Late barber", text: "Some barbers stay open late on a Friday, for everyone who wants a fresh line-up before the club." },
    kioskLearn: { title: "Phone repair", text: "Cracked screens fixed while you wait, and a charger lent if you look desperate." },
    tone: "#9fc4dc",
  },
  {
    id: "ramen",
    label: "Ramen bar and corner store",
    ad: ["NOODLE", "HOUSE", "RAMEN · GYOZA · LAST ORDERS 3AM"],
    kiosk: "24H STORE",
    shutter: "OPEN",
    adLearn: { title: "Ramen bar", text: "A counter, six stools, and a bowl of broth that has been simmering since the afternoon." },
    kioskLearn: { title: "24-hour store", text: "Snacks, umbrellas and phone credit at any hour. The light that never goes off." },
    tone: "#ff9aab",
  },
  {
    id: "records",
    label: "Record shop and launderette",
    ad: ["DEEP", "CUTS", "VINYL · TAPES · SECOND HAND"],
    kiosk: "LAUNDERETTE",
    shutter: "WASH",
    adLearn: { title: "Record shop", text: "Crates of second-hand vinyl. Half the DJs inside bought their first records here." },
    kioskLearn: { title: "Launderette", text: "Coin machines that run all night. Someone is always waiting on a spin cycle." },
    tone: "#8f6bff",
  },
  {
    id: "pharmacy",
    label: "Late pharmacy and grill",
    ad: ["MAMA'S", "GRILL", "CHICKEN · CHIPS · PLANTAIN"],
    kiosk: "PHARMACY",
    shutter: "+",
    adLearn: { title: "Grill house", text: "Charcoal chicken, chips and fried plantain, served in a box to eat standing up." },
    kioskLearn: { title: "Late pharmacy", text: "The green cross stays lit. Plasters, painkillers and water for the walk home." },
    tone: "#7ef0a8",
  },
] as const satisfies readonly ShopKit[];

export const WEATHERS = [
  { id: "clear", label: "Clear" },
  { id: "rain", label: "Rain" },
  { id: "fog", label: "Fog" },
  { id: "snow", label: "Snow" },
  { id: "fireworks", label: "Fireworks (open-air places)" },
  { id: "stars", label: "Starry sky (open-air places)" },
] as const satisfies readonly Option<string>[];

export type PosterPack = {
  id: string;
  label: string;
  purple: [string, string, string];
  cream: [string, string, string, string];
  flag: [string, string];
  wall: string;
};

export const POSTERS = [
  { id: "accra", label: "Accra slips", purple: ["AFRO", "BEATS", "EVERY SAT"], cream: ["FRI · LADIES", "SAT", "K-NOVA", "23:00 – 02:00"], flag: ["LADIES", "NIGHT"], wall: "OSU 4 LIFE" },
  { id: "london", label: "London slips", purple: ["NIGHT", "BUS", "SATURDAY"], cream: ["LAST TUBE", "SAT", "NIGHT", "ALL NIGHT"], flag: ["NIGHT", "OWLS"], wall: "ALL NIGHT" },
  { id: "jazz", label: "Jazz night", purple: ["LIVE", "JAZZ", "THURSDAYS"], cream: ["TONIGHT", "THE", "QUARTET", "21:00 – 01:00"], flag: ["NO", "COVER"], wall: "BLUE NOTE" },
  { id: "techno", label: "Techno all-nighter", purple: ["WARE", "HOUSE", "4/4 TIL 6"], cream: ["DOORS 23:00", "SAT", "ALL NIGHT", "NO PHOTOS"], flag: ["DARK", "ROOM"], wall: "BPM 130" },
  { id: "amapiano", label: "Amapiano Friday", purple: ["PIANO", "PARTY", "FRIDAYS"], cream: ["LOG DRUM", "FRI", "SPECIAL", "22:00 – 04:00"], flag: ["DANCE", "OFF"], wall: "YANOS" },
  { id: "comedy", label: "Comedy and karaoke", purple: ["OPEN", "MIC", "WEDNESDAY"], cream: ["STAND-UP", "THEN", "KARAOKE", "20:00 – 00:00"], flag: ["SING", "IT"], wall: "ENCORE" },
  { id: "carnival", label: "Carnival weekend", purple: ["STEEL", "PAN", "ALL WEEKEND"], cream: ["CARNIVAL", "SUN", "PARADE", "FROM NOON"], flag: ["WINE", "UP"], wall: "PLAY MAS" },
] as const satisfies readonly PosterPack[];

export const SOUNDS = [
  { id: "accra", label: "Accra bed (tro-tro horns)" },
  { id: "london", label: "London bed (sirens)" },
  { id: "harbour", label: "Harbour (foghorn)" },
  { id: "drums", label: "Carnival drums" },
  { id: "quiet", label: "Quiet night" },
] as const satisfies readonly Option<string>[];

export const QUEUES = [
  { id: "usual", label: "Usual queue" },
  { id: "short", label: "Short queue" },
  { id: "packed", label: "Packed queue" },
] as const satisfies readonly Option<string>[];

export const BOARDS = [
  { id: "chalk", label: "Chalkboard" },
  { id: "neon", label: "Neon sign" },
  { id: "brass", label: "Brass easel" },
  { id: "lightbox", label: "Lightbox letters" },
] as const satisfies readonly Option<string>[];

export type StallId = (typeof STALLS)[number]["id"];
export type RideId = (typeof RIDES)[number]["id"];
export type PasserId = (typeof PASSERS)[number]["id"];
export type SellerId = (typeof SELLERS)[number]["id"];
export type ShopId = (typeof SHOPS)[number]["id"];
export type WeatherId = (typeof WEATHERS)[number]["id"];
export type PosterId = (typeof POSTERS)[number]["id"];
export type SoundId = (typeof SOUNDS)[number]["id"];
export type QueueId = (typeof QUEUES)[number]["id"];
export type BoardId = (typeof BOARDS)[number]["id"];
