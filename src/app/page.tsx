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
import { assurances, faqs, reviews, airbnb, site } from "@/lib/site";

// Two graphs: the property itself, and the FAQ. Both are eligible for rich
// results, which is most of the available SEO upside for a single-property site.
const lodging = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  "@id": `${site.url}/#lodging`,
  name: site.name,
  description:
    "A privately hosted one-bedroom apartment on the seventh floor in Kilimani, Nairobi. Heated pool and gym, automatic backup power, fiber Wi-Fi and self check-in, eight minutes' walk from Yaya Centre. Book direct below Airbnb rates.",
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
  priceRange: "$$",
  amenityFeature: assurances.map((a) => ({
    "@type": "LocationFeatureSpecification",
    name: a.title,
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
