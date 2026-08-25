// ============================================================
// Kito Oak Haven — single source of truth for site content.
//
// Everything marked  ⚠️ NEEDS ALEX  is structurally wired but waiting on a
// real value. Nothing here is invented: where a number or a quote would have
// to be fabricated, the field is empty and the UI hides that block rather
// than shipping a plausible-looking lie.
// ============================================================

export const site = {
  name: "Kito Oak Haven",
  tagline: "Urban Sanctuary · Nairobi",
  building: "Oak Classic Residence",
  street: "George Padmore Road",
  area: "Kilimani",
  city: "Nairobi",
  country: "Kenya",
  // Optional host signature. Empty = the site speaks as the property ("us",
  // "your host") and no name appears anywhere. Set it and a proper
  // "Hosted by ___" line renders on the booking section — never interpolated
  // into headline copy, where a bare first name reads like a stray note to a
  // guest who has not met you. Worth filling in: naming a real host is one of
  // the strongest trust signals a direct-booking page has, and it is the thing
  // Airbnb does that a generic hotel page cannot.
  host: "Sylvia Malala",
  // Alex handles every booking enquiry — confirmed by the owner 23 Aug:
  // "put yours [contact] and payment on mine". The owner's number is
  // deliberately NOT on this site; it is where guests pay, not where they call.
  phone: "+254 740 180 214",
  phoneAlt: "",
  whatsapp: "254740180214",
  email: "", // ⚠️ NEEDS: real inbox. Empty = email links hidden.
  url: "https://kitooakhaven.com",

  // Hours you actually answer messages. Promising 24/7 and missing one is
  // worse than promising a window and keeping it.
  replyHours: "7am – 10pm EAT",
  replyTypical: "under 15 minutes",

  // Indicative only — nobody has verified the owner's actual Airbnb price, so
  // this figure is never asserted as a headline claim. The calculator shows
  // each guest their own saving against the quote THEY enter, which is true
  // by construction and needs no such number.
  directDiscountPct: 15,
  // Set by the owner, 23 Aug 2026. This is the real direct rate a guest pays.
  nightlyKsh: 7000 as number | null,
  currency: "KSh",

  // Google Apps Script /exec URL for the booking log. Empty = logging is
  // off and every CTA still works normally; see scripts/apps-script.gs
  // for the three-minute setup that produces this URL.
  bookingLogUrl: "https://script.google.com/macros/s/AKfycbyBBydnZkDQ8W2dA5L9HNCkvpVJ4U1qYaKm_OsDQuXuIGdN5IYL5AIpbMZOV_jLcz6XdQ/exec",
  // Shared token the Apps Script checks before it will write a row. This is
  // NOT a secret — it ships in the client bundle and anyone who views source
  // can read it. Its only job is keeping scanners and bots out of the ledger.
  // It must never guard anything that actually matters.
  bookingLogToken: "JSX1p9iZb8DF2tUZOitglYtNgciPGWC4",
} as const;

export const nav = [
  { label: "The Space", href: "#walkthrough" },
  { label: "Why Direct", href: "#direct" },
  { label: "What's Handled", href: "#assurances" },
  { label: "Kilimani", href: "#neighbourhood" },
  { label: "Questions", href: "#faq" },
];

export const heroFacts = [
  { value: "1", label: "bedroom" },
  { value: "2–3", label: "guests" },
  { value: "7th", label: "floor" },
  { value: "15s", label: "backup power" },
];

// ---- The walkthrough. Order is the film: arrive, settle, rest, look out. ----
//
// `layout` is the anti-slideshow contract from STORYBOARD.md v3: no two
// consecutive beats may share a mechanic. Each value maps to a distinct
// component in components/Beats.tsx with its own scale, motion and type
// placement. Changing the order here without re-checking neighbours is how a
// site turns back into an album.
export type BeatLayout =
  | "pinned"  // inset frame, held one viewport, eases in on scroll
  | "duo"     // two frames, deliberately overlapping
  | "strip"   // horizontal scroll-scrub, unequal widths
  | "still"   // centred, huge margin, no motion at all
  | "split"   // image bleeds one edge, type holds the other
  | "reveal"  // crop opens from tight to full bleed
  | "cards"   // three-card stagger
  | "full";   // full bleed, type set into the frame's own negative space

export type Beat = {
  layout: BeatLayout;
  /** 1-4 slugs. How many are used depends on the layout. */
  photos: string[];
  eyebrow: string;
  title: string;
  body: string;
  tags?: string[];
};

export const walkthrough: Beat[] = [
  {
    layout: "pinned",
    photos: ["arrival-door"],
    eyebrow: "Arrival",
    title: "No keys. No waiting.",
    body:
      "Your own code reaches you the morning you land. The door is a smart lock, there is a caretaker on site, and you can walk in at 2am off a delayed flight without anyone handing you anything.",
    tags: ["Smart lock", "Self check-in", "Caretaker on site"],
  },
  {
    layout: "duo",
    photos: ["living-wide", "living-close"],
    eyebrow: "The living room",
    title: "Sink in.",
    body:
      "The afternoon does its thing through sheer linen. Two deep sofas, a low table, and nothing in the room asking anything of you.",
    tags: ["Smart TV", "Soundbar", "Fiber Wi-Fi"],
  },
  {
    layout: "strip",
    photos: ["dining-wide", "mirror-detail", "table-setting", "kitchen"],
    eyebrow: "Gather",
    title: "The kitchen isn't a prop.",
    body:
      "Cook properly, host quietly. Gas under the pan, a real fridge, and a table that seats four without anyone apologising for their elbows.",
    tags: ["Gas cooktop", "Air fryer", "Blender", "Coffee", "Purified water"],
  },
  {
    layout: "still",
    photos: ["bedroom-still"],
    eyebrow: "Rest",
    title: "The bed you'll mention in your review.",
    body:
      "Blackout drapes, hotel-grade cotton, and a room that goes properly dark at ten at night in the middle of Nairobi.",
    tags: ["King bed", "Hotel-grade cotton", "Blackout drapes"],
  },
  {
    layout: "split",
    photos: ["shower"],
    eyebrow: "Reset",
    title: "Rainfall pressure. Hot, always.",
    body:
      "The building's generator picks up inside fifteen seconds, so the shower you started stays the shower you finish.",
    tags: ["Rainfall shower", "Instant hot water", "Backup generator"],
  },
  {
    layout: "reveal",
    photos: ["balcony", "balcony-door"],
    eyebrow: "Above the city",
    title: "Seventh-floor mornings.",
    body:
      "Coffee on the bench, Kilimani going about its business below you, and the whole skyline doing the work of a view you did not pay extra for.",
    tags: ["Private balcony", "Seventh floor", "City views"],
  },
  {
    layout: "cards",
    // Pool leads: it is the amenity the copy promises twice, and it is the one
    // most Kilimani listings cannot show. Two gym frames behind it rather than
    // three — the third was a near-duplicate angle.
    photos: ["pool", "gym-wide", "gym-weights"],
    eyebrow: "The building",
    title: "A heated pool and a gym you'd actually use.",
    body:
      "The pool is indoors and heated, so it works in July. The gym is not a cupboard with a treadmill in it — cardio, racks, free weights and mirrors along a wall of windows. Both open from six in the morning.",
    tags: ["Heated pool", "Open 6am-9pm", "Free weights", "Cardio floor"],
  },
  {
    layout: "full",
    photos: ["bed-city"],
    eyebrow: "And then",
    title: "Wake up over the city.",
    body:
      "The last thing the room does is give you the window. That is the whole pitch.",
  },
];

export const assurances: { icon: string; title: string; desc: string }[] = [
  {
    icon: "bolt",
    title: "The power does not go out",
    desc:
      "Nairobi's grid drops. The building runs a full automatic generator that picks up in 10–15 seconds — not a partial one that keeps the corridor lights on. Your call stays connected.",
  },
  {
    icon: "wifi",
    title: "Fiber that holds a video call",
    desc:
      "Dedicated fiber line plus a desk and chair that are meant for working, not a laptop on the bed. Tested on calls, not on a speed-test screenshot.",
  },
  {
    icon: "drop",
    title: "Water you can drink from the tap",
    desc:
      "A purifier dispenser for drinking and cooking, refilled between every stay. No stacked plastic bottles to manage.",
  },
  {
    icon: "lock",
    title: "You control the door",
    desc:
      "Keyless entry on a timed code that is yours alone and expires at check-out. Gated building, caretaker on site, no key handovers with strangers.",
  },
  {
    icon: "pool",
    title: "Heated pool and gym included",
    desc:
      "Second floor, 6am to 9pm daily, no extra fee and no booking sheet. The pool is genuinely heated, which in Nairobi's evenings matters.",
  },
  {
    icon: "washer",
    title: "Laundry in the apartment",
    desc:
      "An LG washing machine in the unit. Worth more than it sounds on a stay longer than about four nights.",
  },
];

export const neighbourhood = [
  { place: "Yaya Centre & Adlife Plaza", meta: "Shops, forex, pharmacies", time: "8 min walk" },
  { place: "Carrefour & Chandarana", meta: "Full supermarkets", time: "10 min walk" },
  { place: "Kilimani cafés & dining", meta: "Java, CJ's, Chania Avenue", time: "Walk" },
  { place: "Nairobi Hospital", meta: "24-hour emergency care", time: "8 min drive" },
  { place: "Nairobi CBD", meta: "Business district", time: "12 min drive" },
  { place: "JKIA airport", meta: "Private transfer arranged", time: "30–45 min" },
];

// ---- Social proof ----
// ⚠️ NEEDS ALEX: paste your real Airbnb guest reviews here, in any format.
// Deliberately empty. Inventing testimonials for a real, bookable property
// would be fraud, and the Reviews section hides itself while this is empty.
export type Review = { quote: string; name: string; origin: string; nights: string };
export const reviews: Review[] = [];

// ⚠️ NEEDS ALEX: public Airbnb listing URL + review count, for the "verified
// elsewhere" trust link. Empty = that badge is not rendered.
export const airbnb = { url: "", reviewCount: 0, rating: 0 };

// `pending: true` hides an entry from both the page and the FAQ schema. Use it
// rather than writing a placeholder answer — a collapsed <details> still ships
// its text to the browser, so a placeholder is one click from a guest reading it.
export type Faq = { q: string; a: string; pending?: boolean };

export const faqs: Faq[] = [
  {
    q: "Is booking direct actually safe?",
    a: `Fair question — you give up Airbnb's dispute process, so here is how it works instead. You pay a deposit to hold the dates, not the full stay. You get the building name, unit and the caretaker's number before you travel. The balance is settled on arrival once you are inside and satisfied. If anything is not as described, you have not paid for it yet. Payment is by M-Pesa, and you are dealing with a person on ${site.phone} — not a queue.`,
  },
  {
    q: `How much cheaper is direct, really?`,
    a: `${site.currency} ${site.nightlyKsh?.toLocaleString("en-KE")} a night, direct, with nothing added at checkout. Whatever a booking platform quotes on top of that is its host fee and guest service fee — charges that go to the platform, not the apartment. Send a screenshot of your quote on WhatsApp and you will get the direct figure back, no negotiating.`,
  },
  {
    q: "What happens when the power goes out?",
    a: "The building's automatic generator takes the load in 10–15 seconds without anyone doing anything. Lights, Wi-Fi, water pump and lifts all stay on. In practice you notice a brief flicker mid-sentence on a call.",
  },
  {
    q: "How does check-in work, and can it be flexible?",
    a: "Contactless, via a smart keypad lock. Standard check-in is from 2:00 PM and check-out by 11:00 AM, but because there is no key to hand over, early arrival and late departure are usually possible — ask when you book and it will be confirmed in writing, not left vague.",
  },
  {
    q: "Do you arrange airport pickup from JKIA?",
    a: "Yes, with a vetted driver rather than a rank taxi — roughly a 30–45 minute drive depending on Mombasa Road. Complimentary on direct bookings of three nights or more; a flat fee otherwise. Send your flight number and someone will be there with your name.",
  },
  {
    q: "Is it suitable for working remotely?",
    a: "It is one of the main reasons people book it. Fiber line, a real desk, backup power, and quiet during the day. Calls hold. If you need a second monitor, ask — it can usually be arranged.",
  },
  {
    // ⚠️ NEEDS ALEX: confirm the terms, then delete `pending` to publish this.
    // Recommendation: free cancellation up to 5 days before arrival with the
    // deposit refunded in full — flexible terms out-convert strict ones for
    // direct bookings, and a vague cancellation answer loses the booking here.
    q: "What is the cancellation policy?",
    a: "Free cancellation up to 5 days before arrival, with your deposit refunded in full. Inside 5 days the deposit is held against the dates, but message us — if the nights can be re-let, they are refunded.",
    pending: true,
  },
];
