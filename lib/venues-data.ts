export interface VenueReview {
  id: number;
  author: string;
  avatar: string;
  date: string;
  rating: number;
  text: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  type: string;
  price: string;
  priceUnit: string;
  pricePerPlateVeg?: string;
  pricePerPlateNonVeg?: string;
  rentalCost?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean;
  image: string;
  heroImage?: string;
  gallery: string[];
  videos?: string[];
  contactPhone?: string;
  mapLink?: string;
  minGuests: number;
  maxGuests: number;
  rooms: number;
  outdoor: boolean;
  indoor: boolean;
  parking: boolean;
  catering: boolean;
  description: string;
  features: string[];
  faqs: { question: string; answer: string }[];
  reviews: VenueReview[];
}

export const venues: Venue[] = [
  {
    id: "venue-paris-1",
    name: "Château de Chantilly",
    location: "Paris Center",
    city: "Paris",
    country: "Global",
    type: "Historic Château",
    price: "₹335840",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5695",
    pricePerPlateNonVeg: "₹10161",
    rentalCost: "₹344724",
    rating: 4.7,
    reviewCount: 98,
    verified: true,
    featured: true,
    contactPhone: "+91 98765 43210",
    image: "/images/venues/93e4edb0efd7ac902c480f49cdbf2697.webp",
    gallery: [
      "/images/venues/53234027fb9a7ac30ab05a227a7b4d90.webp",
      "/images/venues/49af563c5438f875cce1dc86be62f43a.webp",
      "/images/venues/6d1fc06392014fe21e78ccdec409943a.jpg",
    ],
    minGuests: 122,
    maxGuests: 468,
    rooms: 68,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "A majestic French château offering aristocratic elegance, vast manicured gardens, and opulent ballrooms for a truly royal wedding.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-paris-2",
    name: "The Peninsula Paris",
    location: "Paris Center",
    city: "Paris",
    country: "Global",
    type: "5-Star Hotel",
    price: "₹278251",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7624",
    pricePerPlateNonVeg: "₹8342",
    rentalCost: "₹264240",
    rating: 4.9,
    reviewCount: 233,
    verified: true,
    featured: false,
    contactPhone: "+91 98765 43211",
    image: "/images/venues/fef86b75f570fac8263f4e2b8bac059e.jpg",
    gallery: [
      "/images/venues/fef86b75f570fac8263f4e2b8bac059e.jpg",
      "/images/venues/813dae52a08423236cc5de46d9f2e4d5.jpg",
      "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
    ],
    minGuests: 103,
    maxGuests: 934,
    rooms: 112,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Located steps from the Arc de Triomphe, offering rooftop views of the Eiffel Tower and exquisite Parisian gastronomy.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-paris-3",
    name: "Hôtel Ritz Paris",
    location: "Paris Center",
    city: "Paris",
    country: "Global",
    type: "Luxury Palace",
    price: "₹269205",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5460",
    pricePerPlateNonVeg: "₹7221",
    rentalCost: "₹302485",
    rating: 4.6,
    reviewCount: 164,
    verified: true,
    featured: false,
    image: "/images/venues/813dae52a08423236cc5de46d9f2e4d5.jpg",
    gallery: [
      "/images/venues/813dae52a08423236cc5de46d9f2e4d5.jpg",
      "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
      "/images/venues/fef86b75f570fac8263f4e2b8bac059e.jpg",
    ],
    minGuests: 58,
    maxGuests: 733,
    rooms: 121,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "The epitome of French art de vivre. Host your reception in the legendary Grand Jardin or the lavish Salon Vendôme.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-new-york-1",
    name: "The Plaza Hotel",
    location: "New York Center",
    city: "New York",
    country: "Global",
    type: "Historic Luxury",
    price: "₹253972",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5274",
    pricePerPlateNonVeg: "₹10193",
    rentalCost: "₹344904",
    rating: 4.7,
    reviewCount: 230,
    verified: true,
    featured: true,
    image: "/images/venues/b1ea9c403e0b88139c71eaa449a366d8.webp",
    gallery: [
      "/images/venues/4c6d330355a38b37569cd227bcef593a.webp",
      "/images/venues/9c8c6c14cea93182566c4c5258d97d1d.webp",
      "/images/venues/8728061205a5d7f11820ef4e6c7d79c2.webp",
    ],
    minGuests: 78,
    maxGuests: 387,
    rooms: 25,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "An iconic Manhattan landmark. The Grand Ballroom provides a legendary, fairy-tale setting for the ultimate New York wedding.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-new-york-2",
    name: "Tribeca Rooftop",
    location: "New York Center",
    city: "New York",
    country: "Global",
    type: "Modern Loft",
    price: "₹227412",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7317",
    pricePerPlateNonVeg: "₹9037",
    rentalCost: "₹315009",
    rating: 4.5,
    reviewCount: 78,
    verified: true,
    featured: false,
    image: "/images/venues/79f5470251c962b9e2c9bea9994cfe19.jpg",
    gallery: [
      "/images/venues/79f5470251c962b9e2c9bea9994cfe19.jpg",
      "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
      "/images/venues/4fd0a4c0cc2a8596e3331858b086075a.jpg",
    ],
    minGuests: 143,
    maxGuests: 543,
    rooms: 141,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Chic industrial vibes with panoramic views of the Hudson River and downtown Manhattan skyline from a stunning glass-enclosed penthouse.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-new-york-3",
    name: "Oheka Castle",
    location: "New York Center",
    city: "New York",
    country: "Global",
    type: "Mansion Estate",
    price: "₹235190",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5852",
    pricePerPlateNonVeg: "₹9549",
    rentalCost: "₹337141",
    rating: 4.6,
    reviewCount: 341,
    verified: true,
    featured: false,
    image: "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
    gallery: [
      "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
      "/images/venues/4fd0a4c0cc2a8596e3331858b086075a.jpg",
      "/images/venues/79f5470251c962b9e2c9bea9994cfe19.jpg",
    ],
    minGuests: 60,
    maxGuests: 692,
    rooms: 24,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Just outside the city, this Gilded Age mansion offers sprawling estates, European-style gardens, and unmatched grandeur.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-london-1",
    name: "The Savoy",
    location: "London Center",
    city: "London",
    country: "Global",
    type: "5-Star Hotel",
    price: "₹317790",
    priceUnit: "per day",
    pricePerPlateVeg: "₹6049",
    pricePerPlateNonVeg: "₹7732",
    rentalCost: "₹210042",
    rating: 5.0,
    reviewCount: 152,
    verified: true,
    featured: true,
    image: "/images/venues/612c8e185f6636d5ae9501b2d48254c9.jpg",
    gallery: [
      "/images/venues/ce8064bc4a3207d04e91d2bc3d80c74c.webp",
      "/images/venues/18b1178a1ab22fe47cbaedafcaf0983d.jpg",
      "/images/venues/4d639ec9bd66ba1e318c3adbc08e2dd9.jpg",
    ],
    minGuests: 55,
    maxGuests: 671,
    rooms: 87,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "World-renowned luxury on the River Thames. Blending Edwardian and Art Deco elegance for a quintessentially British celebration.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-london-2",
    name: "Kew Gardens",
    location: "London Center",
    city: "London",
    country: "Global",
    type: "Botanical Garden",
    price: "₹342398",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7212",
    pricePerPlateNonVeg: "₹7566",
    rentalCost: "₹316062",
    rating: 4.7,
    reviewCount: 170,
    verified: true,
    featured: false,
    image: "/images/venues/ea1403af361a3dd18bf712773b2d8b64.jpg",
    gallery: [
      "/images/venues/ea1403af361a3dd18bf712773b2d8b64.jpg",
      "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
      "/images/venues/97eaedba6fc921e7d78d3eb4a6d7c4b2.jpg",
    ],
    minGuests: 58,
    maxGuests: 453,
    rooms: 160,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Exchange vows in the spectacular Victorian glasshouse surrounded by the world's most diverse collection of living plants.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-london-3",
    name: "Claridge's",
    location: "London Center",
    city: "London",
    country: "Global",
    type: "Luxury Hotel",
    price: "₹280157",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7867",
    pricePerPlateNonVeg: "₹9159",
    rentalCost: "₹313898",
    rating: 4.9,
    reviewCount: 56,
    verified: true,
    featured: false,
    image: "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
    gallery: [
      "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
      "/images/venues/97eaedba6fc921e7d78d3eb4a6d7c4b2.jpg",
      "/images/venues/ea1403af361a3dd18bf712773b2d8b64.jpg",
    ],
    minGuests: 133,
    maxGuests: 696,
    rooms: 136,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "The art deco jewel of Mayfair, synonymous with timeless elegance and impeccable royal-standard service.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-tokyo-1",
    name: "Aman Tokyo",
    location: "Tokyo Center",
    city: "Tokyo",
    country: "Global",
    type: "Luxury Hotel",
    price: "₹343730",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5067",
    pricePerPlateNonVeg: "₹10545",
    rentalCost: "₹312719",
    rating: 4.5,
    reviewCount: 54,
    verified: true,
    featured: true,
    image: "/images/venues/2d3f3a46300d71d974a186266fa3215b.jpg",
    gallery: [
      "https://www.telegraph.co.uk/content/dam/Travel/hotels/2025/june/aman-tokyo-hotel-bed-room-product-image.jpg",
      "/images/venues/0b28a32376b53a93c1eb6c9bd2442c8d.jpg",
      "/images/venues/ce22c18500485634401d5d4a6adf0c02.jpg",
    ],
    minGuests: 106,
    maxGuests: 806,
    rooms: 102,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "High above the city, blending traditional Japanese design with modern luxury, featuring panoramic views of the Imperial Palace Gardens.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-tokyo-2",
    name: "Meiji Kinenkan",
    location: "Tokyo Center",
    city: "Tokyo",
    country: "Global",
    type: "Historic Shrine",
    price: "₹329373",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5919",
    pricePerPlateNonVeg: "₹7056",
    rentalCost: "₹204415",
    rating: 4.7,
    reviewCount: 292,
    verified: true,
    featured: false,
    image: "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
    gallery: [
      "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
      "/images/venues/ca90d6adc2c50e60ba4bd6e09162a457.jpg",
      "/images/venues/a65878641d1fb054d619a56e67008cbe.jpg",
    ],
    minGuests: 119,
    maxGuests: 960,
    rooms: 145,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "A prestigious venue offering authentic Shinto wedding ceremonies in a serene forest setting right in the heart of Tokyo.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-tokyo-3",
    name: "The Peninsula Tokyo",
    location: "Tokyo Center",
    city: "Tokyo",
    country: "Global",
    type: "5-Star Hotel",
    price: "₹283268",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7199",
    pricePerPlateNonVeg: "₹9850",
    rentalCost: "₹241578",
    rating: 4.7,
    reviewCount: 309,
    verified: true,
    featured: false,
    image: "/images/venues/ca90d6adc2c50e60ba4bd6e09162a457.jpg",
    gallery: [
      "/images/venues/ca90d6adc2c50e60ba4bd6e09162a457.jpg",
      "/images/venues/a65878641d1fb054d619a56e67008cbe.jpg",
      "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
    ],
    minGuests: 78,
    maxGuests: 454,
    rooms: 167,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Sleek sophistication with sweeping views of the skyline and Hibiya Park, featuring unparalleled Japanese hospitality.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-dubai-1",
    name: "Burj Al Arab",
    location: "Dubai Center",
    city: "Dubai",
    country: "Global",
    type: "7-Star Hotel",
    price: "₹303040",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5869",
    pricePerPlateNonVeg: "₹9544",
    rentalCost: "₹268886",
    rating: 5.0,
    reviewCount: 68,
    verified: true,
    featured: true,
    image: "/images/venues/d0cd0e0d28bf57bfd0f5c89ea00579f3.webp",
    gallery: [
      "/images/venues/d8c7df5eb8f6a0204128bd787fdfd094.webp",
      "/images/venues/0f3e28c0adf05e4fe212a0399085b400.webp",
      "/images/venues/850b77ae15ec28c15d98be2824c84e7d.webp",
    ],
    minGuests: 148,
    maxGuests: 545,
    rooms: 112,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "The ultimate symbol of Arabian luxury. Exchange vows on the stunning terrace jutting out into the Arabian Gulf.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-dubai-2",
    name: "Atlantis The Palm",
    location: "Dubai Center",
    city: "Dubai",
    country: "Global",
    type: "Luxury Resort",
    price: "₹244358",
    priceUnit: "per day",
    pricePerPlateVeg: "₹6594",
    pricePerPlateNonVeg: "₹10197",
    rentalCost: "₹314189",
    rating: 4.6,
    reviewCount: 249,
    verified: true,
    featured: false,
    image: "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
    gallery: [
      "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
      "/images/venues/d9e422c815c431b488e36fc799879e80.jpg",
      "/images/venues/d52c206d9de6dd966110dabc3a197520.jpg",
    ],
    minGuests: 117,
    maxGuests: 748,
    rooms: 37,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "From underwater suites to pristine private beaches and magnificent ballrooms, offering a spectacular destination wedding.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-dubai-3",
    name: "Armani Hotel Dubai",
    location: "Dubai Center",
    city: "Dubai",
    country: "Global",
    type: "Boutique Hotel",
    price: "₹219168",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5528",
    pricePerPlateNonVeg: "₹8026",
    rentalCost: "₹336940",
    rating: 4.6,
    reviewCount: 286,
    verified: true,
    featured: false,
    image: "/images/venues/d9e422c815c431b488e36fc799879e80.jpg",
    gallery: [
      "/images/venues/d9e422c815c431b488e36fc799879e80.jpg",
      "/images/venues/d52c206d9de6dd966110dabc3a197520.jpg",
      "/images/venues/115f7488c85793f2c92465d3fa3108bd.jpg",
    ],
    minGuests: 83,
    maxGuests: 885,
    rooms: 160,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Located in the Burj Khalifa, featuring minimalist Italian elegance designed by Giorgio Armani himself.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-rome-1",
    name: "Villa Aurelia",
    location: "Rome Center",
    city: "Rome",
    country: "Global",
    type: "Historic Villa",
    price: "₹203399",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5248",
    pricePerPlateNonVeg: "₹7638",
    rentalCost: "₹251905",
    rating: 4.6,
    reviewCount: 224,
    verified: true,
    featured: true,
    image: "/images/venues/f52af15175d509c5f556af993ca50429.jpg",
    gallery: [
      "https://www.framelines.it/wp-content/uploads/2017/01/wedding_at_villa-aurelia_rome.jpg",
      "/images/venues/31a00bf512e4cf5ed52f945a697e44b4.jpg",
      "/images/venues/7ec25a7b1d7b0c2262d4cc40876e108a.jpg",
    ],
    minGuests: 109,
    maxGuests: 464,
    rooms: 100,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Perched on the Janiculum Hill, offering breathtaking panoramic views of Rome and magnificent 17th-century gardens.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-rome-2",
    name: "Hotel Eden",
    location: "Rome Center",
    city: "Rome",
    country: "Global",
    type: "5-Star Hotel",
    price: "₹267742",
    priceUnit: "per day",
    pricePerPlateVeg: "₹6813",
    pricePerPlateNonVeg: "₹8451",
    rentalCost: "₹271713",
    rating: 4.5,
    reviewCount: 94,
    verified: true,
    featured: false,
    image: "/images/venues/5d685ebe43b89cd8826c3759ab6a8470.jpg",
    gallery: [
      "/images/venues/5d685ebe43b89cd8826c3759ab6a8470.jpg",
      "/images/venues/97eaedba6fc921e7d78d3eb4a6d7c4b2.jpg",
      "/images/venues/809490f909bf06334227a0cca4bdd429.jpg",
    ],
    minGuests: 148,
    maxGuests: 442,
    rooms: 64,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Classic Roman elegance meets modern luxury, featuring a rooftop terrace with sweeping views of the Eternal City.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-rome-3",
    name: "Castello di Bracciano",
    location: "Rome Center",
    city: "Rome",
    country: "Global",
    type: "Medieval Castle",
    price: "₹203533",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7690",
    pricePerPlateNonVeg: "₹9126",
    rentalCost: "₹316967",
    rating: 4.7,
    reviewCount: 238,
    verified: true,
    featured: false,
    image: "/images/venues/97eaedba6fc921e7d78d3eb4a6d7c4b2.jpg",
    gallery: [
      "/images/venues/97eaedba6fc921e7d78d3eb4a6d7c4b2.jpg",
      "/images/venues/809490f909bf06334227a0cca4bdd429.jpg",
      "/images/venues/5d685ebe43b89cd8826c3759ab6a8470.jpg",
    ],
    minGuests: 50,
    maxGuests: 988,
    rooms: 53,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "A short drive from Rome, this spectacular 15th-century castle offers a dramatic and romantic fairy-tale setting.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-bali-1",
    name: "Ayana Resort and Spa",
    location: "Bali Center",
    city: "Bali",
    country: "Global",
    type: "Cliffside Resort",
    price: "₹292515",
    priceUnit: "per day",
    pricePerPlateVeg: "₹6633",
    pricePerPlateNonVeg: "₹9904",
    rentalCost: "₹307498",
    rating: 4.7,
    reviewCount: 97,
    verified: true,
    featured: true,
    image: "/images/venues/d26340e9eba57f7de2f3222e2e7ad456.jpg",
    gallery: [
      "/images/venues/d26340e9eba57f7de2f3222e2e7ad456.jpg",
      "/images/venues/39b3f8bceeb2bd54a9ef17600f414ce1.jpg",
      "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
    ],
    minGuests: 113,
    maxGuests: 999,
    rooms: 38,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "World-famous for its dramatic cliff-top wedding chapels overlooking the Indian Ocean and legendary Bali sunsets.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-bali-2",
    name: "The Edge Bali",
    location: "Bali Center",
    city: "Bali",
    country: "Global",
    type: "Luxury Villas",
    price: "₹324749",
    priceUnit: "per day",
    pricePerPlateVeg: "₹6379",
    pricePerPlateNonVeg: "₹10363",
    rentalCost: "₹295290",
    rating: 4.5,
    reviewCount: 125,
    verified: true,
    featured: false,
    image: "/images/venues/39b3f8bceeb2bd54a9ef17600f414ce1.jpg",
    gallery: [
      "/images/venues/39b3f8bceeb2bd54a9ef17600f414ce1.jpg",
      "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
      "/images/venues/d26340e9eba57f7de2f3222e2e7ad456.jpg",
    ],
    minGuests: 132,
    maxGuests: 444,
    rooms: 38,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Exclusive cliff-front luxury featuring a glass-bottom sky pool and breathtaking panoramic ocean views.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-bali-3",
    name: "Four Seasons Sayan",
    location: "Bali Center",
    city: "Bali",
    country: "Global",
    type: "Jungle Resort",
    price: "₹295091",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5882",
    pricePerPlateNonVeg: "₹10569",
    rentalCost: "₹233764",
    rating: 4.8,
    reviewCount: 225,
    verified: true,
    featured: false,
    image: "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
    gallery: [
      "/images/venues/bc8fc7031d971fe6477313cdee412bfc.jpg",
      "/images/venues/d26340e9eba57f7de2f3222e2e7ad456.jpg",
      "/images/venues/39b3f8bceeb2bd54a9ef17600f414ce1.jpg",
    ],
    minGuests: 125,
    maxGuests: 490,
    rooms: 78,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Nestled in the lush Ayung River Valley in Ubud, offering a serene, deeply spiritual, and exotic wedding experience.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-sydney-1",
    name: "Park Hyatt Sydney",
    location: "Sydney Center",
    city: "Sydney",
    country: "Global",
    type: "Luxury Hotel",
    price: "₹291227",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7240",
    pricePerPlateNonVeg: "₹8957",
    rentalCost: "₹344271",
    rating: 4.8,
    reviewCount: 177,
    verified: true,
    featured: true,
    image: "/images/venues/a2049c893ce7218969642ba47af01bc5.jpg",
    gallery: [
      "/images/venues/a2049c893ce7218969642ba47af01bc5.jpg",
      "/images/venues/16425eaf35a173fa3cc437e08b7ce4d6.jpg",
      "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
    ],
    minGuests: 141,
    maxGuests: 998,
    rooms: 74,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Unrivaled waterfront luxury with direct views of the Sydney Opera House and Harbour Bridge from your reception.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-sydney-2",
    name: "Taronga Centre",
    location: "Sydney Center",
    city: "Sydney",
    country: "Global",
    type: "Waterfront Venue",
    price: "₹337226",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7384",
    pricePerPlateNonVeg: "₹10646",
    rentalCost: "₹242462",
    rating: 4.8,
    reviewCount: 327,
    verified: true,
    featured: false,
    image: "/images/venues/16425eaf35a173fa3cc437e08b7ce4d6.jpg",
    gallery: [
      "/images/venues/16425eaf35a173fa3cc437e08b7ce4d6.jpg",
      "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
      "/images/venues/a2049c893ce7218969642ba47af01bc5.jpg",
    ],
    minGuests: 134,
    maxGuests: 716,
    rooms: 83,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Offering sweeping 180-degree views of Sydney Harbour in a unique, lush setting.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-sydney-3",
    name: "Gunners' Barracks",
    location: "Sydney Center",
    city: "Sydney",
    country: "Global",
    type: "Historic Venue",
    price: "₹335381",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7132",
    pricePerPlateNonVeg: "₹10600",
    rentalCost: "₹224963",
    rating: 4.9,
    reviewCount: 344,
    verified: true,
    featured: false,
    image: "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
    gallery: [
      "/images/venues/c7215aaf4c8cf1197c0060815b32cc1a.jpg",
      "/images/venues/a2049c893ce7218969642ba47af01bc5.jpg",
      "/images/venues/16425eaf35a173fa3cc437e08b7ce4d6.jpg",
    ],
    minGuests: 125,
    maxGuests: 780,
    rooms: 162,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "Nestled in bushland overlooking the harbour, featuring heritage charm, crystal chandeliers, and a sandstone courtyard.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-istanbul-1",
    name: "Çırağan Palace Kempinski",
    location: "Istanbul Center",
    city: "Istanbul",
    country: "Global",
    type: "Ottoman Palace",
    price: "₹246986",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7496",
    pricePerPlateNonVeg: "₹8933",
    rentalCost: "₹276407",
    rating: 4.7,
    reviewCount: 161,
    verified: true,
    featured: true,
    image: "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
    gallery: [
      "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
      "/images/venues/15ad89fa60a56f42e1d635aa2c7fd435.jpg",
      "/images/venues/6d29062cf1deaf1d3b85dc8495caadc5.jpg",
    ],
    minGuests: 66,
    maxGuests: 550,
    rooms: 144,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "The only Ottoman Imperial Palace and Hotel on the Bosphorus, offering unparalleled grandeur and waterfront elegance.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-istanbul-2",
    name: "Four Seasons Bosphorus",
    location: "Istanbul Center",
    city: "Istanbul",
    country: "Global",
    type: "5-Star Hotel",
    price: "₹345756",
    priceUnit: "per day",
    pricePerPlateVeg: "₹5646",
    pricePerPlateNonVeg: "₹10960",
    rentalCost: "₹262752",
    rating: 4.8,
    reviewCount: 139,
    verified: true,
    featured: false,
    image: "/images/venues/15ad89fa60a56f42e1d635aa2c7fd435.jpg",
    gallery: [
      "/images/venues/15ad89fa60a56f42e1d635aa2c7fd435.jpg",
      "/images/venues/6d29062cf1deaf1d3b85dc8495caadc5.jpg",
      "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
    ],
    minGuests: 115,
    maxGuests: 382,
    rooms: 86,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "A beautifully restored 19th-century palace where East meets West, featuring stunning terraces along the Bosphorus strait.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  },
  {
    id: "venue-istanbul-3",
    name: "Esma Sultan Mansion",
    location: "Istanbul Center",
    city: "Istanbul",
    country: "Global",
    type: "Historic Mansion",
    price: "₹267946",
    priceUnit: "per day",
    pricePerPlateVeg: "₹7993",
    pricePerPlateNonVeg: "₹8752",
    rentalCost: "₹291233",
    rating: 4.5,
    reviewCount: 229,
    verified: true,
    featured: false,
    image: "/images/venues/6d29062cf1deaf1d3b85dc8495caadc5.jpg",
    gallery: [
      "/images/venues/6d29062cf1deaf1d3b85dc8495caadc5.jpg",
      "/images/venues/b803857579bae406ebd0213f61f32a2b.jpg",
      "/images/venues/15ad89fa60a56f42e1d635aa2c7fd435.jpg",
    ],
    minGuests: 116,
    maxGuests: 840,
    rooms: 140,
    outdoor: true,
    indoor: true,
    parking: true,
    catering: true,
    description: "A stunning brick shell of a historic mansion with a modern glass interior, situated right on the edge of the Bosphorus.",
    features: ["Valet Parking", "In-house Catering", "Bridal Suite", "AV & Lighting", "Concierge Service", "Scenic Views"],
    faqs: [
      { question: "What is the minimum guest count?", answer: "We accommodate weddings from 50 guests." },
      { question: "Is outside catering allowed?", answer: "We have an exclusive in-house catering team." }
    ],
    reviews: [
      { id: 1, author: "A Happy Couple", avatar: "A", date: "April 2025", rating: 5, text: "A truly unforgettable experience. Highly recommended!" }
    ]
  }
];




export const cities = [
  { name: "New York", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Hong Kong", image: "https://images.unsplash.com/photo-1506970845246-18f21d533b20?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Chicago", image: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Honolulu", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Dubai", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Sydney", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Auckland", image: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Paris", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Kollam", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Kochi", image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=200&h=200&fit=crop&crop=center&q=80" },
  { name: "Phuket", image: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=200&h=200&fit=crop&crop=center&q=80" },
];

export function getVenueById(id: string): Venue | undefined {
  return venues.find((v) => v.id === id);
}
