/**
 * Demo listings for the AI tests. Shaped like rows from the shop API.
 * These are TEST DATA, not real products.
 */
export const SAMPLE_LISTINGS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Hand-block Printed Cotton Kurta",
    description:
      "Light cotton kurta with a hand-block floral print in indigo blue. Round neck, three-quarter sleeves, straight cut. Machine washable on a gentle cycle.",
    category: "Clothing",
    price_cents: 2499,
    currency: "USD",
    stock_quantity: 7,
    tags: ["kurta", "cotton", "block print", "indigo"],
    variants: [{ name: "Size", options: ["S", "M", "L"] }],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    title: "Glazed Ceramic Coffee Mug",
    description:
      "Handmade ceramic mug with a glossy sea-green glaze. Holds about 350 ml. Dishwasher safe, not microwave safe.",
    category: "Home & Kitchen",
    price_cents: 1200,
    currency: "USD",
    stock_quantity: 15,
    tags: ["mug", "ceramic", "handmade", "green"],
    variants: [{ name: "Color", options: ["Sea green", "Sand white"] }],
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Brown Leather Bifold Wallet",
    description:
      "Slim bifold wallet in brown genuine leather with 6 card slots and one bill compartment. Stitched edges.",
    category: "Bags & Accessories",
    price_cents: 3500,
    currency: "USD",
    stock_quantity: 0,
    tags: ["wallet", "leather", "brown"],
    variants: [],
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "Silver Jhumka Earrings",
    description:
      "Lightweight oxidised-silver jhumka earrings with small bell details. Push-back posts.",
    category: "Jewelry",
    price_cents: 1800,
    currency: "USD",
    stock_quantity: 3,
    tags: ["earrings", "jhumka", "silver"],
    variants: [],
  },
  {
    // Deliberately has no price set (e.g. seller hasn't priced it).
    id: "55555555-5555-5555-5555-555555555555",
    title: "Embroidered Cushion Cover",
    description: "Square cushion cover with hand embroidery in red and gold thread. Zip closure.",
    category: "Decor & Art",
    price_cents: null,
    currency: "USD",
    stock_quantity: 4,
    tags: ["cushion", "embroidery"],
    variants: [],
  },
];
