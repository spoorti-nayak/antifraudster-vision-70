export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

export const demoProducts: Product[] = [
  {
    id: "prod-1",
    name: "AI Fraud Detection Suite",
    description: "Comprehensive fraud analytics and real-time monitoring platform.",
    price: 199.0,
    image_url: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg",
    category: "software",
    stock: 15,
  },
  {
    id: "prod-2",
    name: "Secure Payment Gateway",
    description: "PCI-compliant gateway with advanced risk controls.",
    price: 129.0,
    image_url: "https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg",
    category: "payments",
    stock: 25,
  },
  {
    id: "prod-3",
    name: "Merchant Analytics Dashboard",
    description: "Visualize transactions, chargebacks, and fraud hotspots.",
    price: 89.0,
    image_url: "https://images.pexels.com/photos/6476584/pexels-photo-6476584.jpeg",
    category: "analytics",
    stock: 40,
  },
  {
    id: "prod-4",
    name: "Device Fingerprinting Add-on",
    description: "Track risky devices and repeat offenders across sessions.",
    price: 59.0,
    image_url: "https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg",
    category: "security",
    stock: 30,
  },
];
