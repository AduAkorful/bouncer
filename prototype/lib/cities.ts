// City kits: the same door, a different street around it.
type Gossip = { who: string; lines: { text: string; gloss?: string; note: string }[] };

export type CityId = "accra" | "london";

export interface CityKit {
  id: CityId;
  name: string;
  area: string;
  /** Street gossip, tap ids 4–6: the food stand, the vehicle, the seller. Same clues in every city. */
  gossip: [Gossip, Gossip, Gossip];
  ad: [string, string, string];
  kiosk: string;
  /** "Did you know" cards for the things on the street */
  learn: Record<string, { title: string; text: string }>;
  rain: boolean;
}

export const CITIES: Record<CityId, CityKit> = {
  accra: {
    id: "accra",
    name: "Accra",
    area: "Osu, Accra",
    gossip: [
      {
        who: "Suya auntie",
        lines: [
          { text: "Golden Hour boys argue the door count with Sam every Sunday. Never agree.", note: "Golden Hour's door count is disputed (suya auntie)" },
          { text: "Coastline's van came at six. New driver, new paperwork, new everything.", note: "Coastline: new paperwork this week (suya auntie)" },
        ],
      },
      {
        who: "Taxi driver",
        lines: [
          { text: "I drove K-Nova home last Saturday. Says he's paid the same every week, no drama.", note: "K-Nova paid the same every week (taxi driver)" },
          { text: "Somebody cancelled a table today, I heard it on the radio. …No, I'm joking.", note: "A table was cancelled today? Joking? (taxi driver)" },
        ],
      },
      {
        who: "Water seller",
        lines: [
          {
            text: "Pure water! …The DJ? Eleven to two, same as last week. I sell to his crew.",
            note: "Headline set 23:00–02:00, same as last week (water seller)",
            gloss: "Pure water: drinking water sold in small sealed sachets, everywhere in Ghana.",
          },
          { text: "Tunde? He's paid already. He bought everybody water.", note: "Tunde's paid, bought water for everyone (water seller)" },
        ],
      },
    ],
    ad: ["AUNTIE B'S", "CHOP BAR", "WAAKYE · BANKU · FUFU → 2ND LEFT"],
    kiosk: "TOP-UP · MOMO",
    learn: {
      food: { title: "Suya", text: "Spicy grilled beef skewers rubbed with peanut-chilli spice. Late-night street food across West Africa." },
      vehicle: { title: "Accra taxi", text: "Painted yellow on the corners so you can spot one in traffic. Fares are agreed before you get in." },
      passer: { title: "Okada", text: "A motorbike taxi. Quicker than anything with four wheels when the roads are jammed." },
      kiosk: { title: "MoMo", text: "Mobile money: paying and getting paid from your phone. Kiosks like this top up credit and cash out." },
      ad: { title: "Chop bar", text: "A small local restaurant serving home-style dishes like waakye (rice and beans), banku and fufu." },
    },
    rain: false,
  },
  london: {
    id: "london",
    name: "London",
    area: "Dalston, London",
    gossip: [
      {
        who: "Kebab van",
        lines: [
          { text: "Golden Hour lot argue the door count with your man every Sunday. Never settle it.", note: "Golden Hour's door count is disputed (kebab van)" },
          { text: "Coastline's lorry came at six. New driver, new paperwork, the works.", note: "Coastline: new paperwork this week (kebab van)" },
        ],
      },
      {
        who: "Cabbie",
        lines: [
          { text: "Had K-Nova in the back last Saturday. Says he's paid the same every week. No drama.", note: "K-Nova paid the same every week (cabbie)" },
          { text: "Someone cancelled a table today, heard it on the radio. …Nah, I'm having you on.", note: "A table was cancelled today? Joking? (cabbie)" },
        ],
      },
      {
        who: "Rose seller",
        lines: [
          { text: "Roses, a pound! …The DJ? Eleven till two, same as last week. I sell to his crew.", note: "Headline set 23:00–02:00, same as last week (rose seller)" },
          { text: "Tunde? He's been paid. Bought the whole queue a rose.", note: "Tunde's paid, bought roses for the queue (rose seller)" },
        ],
      },
    ],
    ad: ["FRANCO'S", "CAFÉ", "FULL ENGLISH ALL DAY · TEA 1.50"],
    kiosk: "NEWS · OFF LICENCE",
    learn: {
      food: { title: "Kebab van", text: "Doner, chips and chilli sauce: the traditional end to a night out in London." },
      vehicle: { title: "Black cab", text: "London's licensed taxis. Drivers pass ‘The Knowledge’, memorising 25,000 streets." },
      passer: { title: "Night bus", text: "Buses with an N before the number run all night when the Tube is shut." },
      kiosk: { title: "Off licence", text: "A corner shop licensed to sell alcohol to take away. The ‘offie’." },
      ad: { title: "Caff", text: "A no-frills café. A full English is eggs, bacon, sausage, beans, toast and tea." },
    },
    rain: true,
  },
};
