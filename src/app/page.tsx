import photos from "@/lib/photos.json";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Direct } from "@/components/Direct";
import { Walkthrough } from "@/components/Walkthrough";
import { Assurances } from "@/components/Assurances";
import { Neighbourhood } from "@/components/Neighbourhood";
import { Reviews } from "@/components/Reviews";
import { Booking } from "@/components/Booking";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { StickyBar } from "@/components/StickyBar";
import { faqs, reviews, airbnb, site } from "@/lib/site";

// Two graphs: the property itself, and the FAQ. Both are eligible for rich
// results, which is most of the available SEO upside for a single-property site.
const lodging = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": `${site.url}/#lodging`,
  name: site.name,
  description:
    `A privately hosted one-bedroom apartment on the seventh floor in Kilimani, Nairobi. Heated pool and gym, automatic backup power, fiber Wi-Fi and self check-in, eight minutes' walk from Yaya Centre. ${site.currency} ${site.nightlyKsh?.toLocaleString("en-KE")} a night, booked direct.`,
  url: site.url,
  telephone: site.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.street,
    addressLocality: site.area,
    addressRegion: site.city,
    addressCountry: "KE",
  },
  containedInPlace: { "@type": "ApartmentComplex", name: site.building },
  numberOfRooms: 1,
  petsAllowed: false,
  smokingAllowed: false,
  checkinTime: "14:00",
  checkoutTime: "11:00",
  priceRange: `${site.currency} ${site.nightlyKsh?.toLocaleString("en-KE")}`,
  currenciesAccepted: "KES",
  paymentAccepted: "M-Pesa",
  hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapsQuery)}`,
  // Width comes from the manifest, not a guess. The pool frame arrived over
  // WhatsApp at 1200px so no 1600 variant exists, and hard-coding one pointed
  // Google at a 404.
  image: ["hero-bedroom", "living-wide", "balcony", "pool"].map((slug) => {
    const widths = (photos as Record<string, { widths: number[] }>)[slug].widths;
    return `${site.url}/gallery/${slug}-${Math.max(...widths)}.jpg`;
  }),
  makesOffer: {
    "@type": "Offer",
    name: "Direct booking",
    priceCurrency: "KES",
    price: site.nightlyKsh,
    availability: "https://schema.org/InStock",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: site.nightlyKsh,
      priceCurrency: "KES",
      unitCode: "DAY",
      unitText: "per night",
    },
  },
  // Amenity names, not headlines. This mapped straight from the assurance
  // titles, which are written to persuade a reader — "The power does not go
  // out", "You control the door". A crawler reading those as amenity names
  // learns nothing it can match a search against, so the markup was doing
  // none of the work it appeared to be doing. The persuasion stays on the
  // page; this list says what the apartment actually has.
  amenityFeature: [
    "Free WiFi",
    "Fiber internet",
    "Dedicated workspace",
    "Backup generator",
    "Heated swimming pool",
    "Fitness centre",
    "Washing machine",
    "Kitchen",
    "Smart TV",
    "Balcony",
    "Self check-in",
    "Keypad lock",
    "Drinking water",
    "Lift",
  ].map((name) => ({
    "@type": "LocationFeatureSpecification",
    name,
    value: true,
  })),
  // Only claim a rating when there is a real one behind it.
  ...(airbnb.reviewCount > 0 && reviews.length
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: airbnb.rating,
          reviewCount: airbnb.reviewCount,
        },
      }
    : {}),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs
    .filter((f) => !f.pending)
    .map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
};

export default function Home() {
  return (
    <>
      <a
        href="#walkthrough"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-cream-50 focus:px-4 focus:py-2 focus:text-ink-900"
      >
        Skip to content
      </a>

      <Nav />
      <main>
        <Hero />
        <Direct />
        <Walkthrough />
        <Assurances />
        <Neighbourhood />
        <Reviews />
        <Booking />
        <Faq />
      </main>
      <Footer />
      <StickyBar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lodging) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
