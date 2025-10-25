import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  stock: number;
}

const products: Product[] = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    description: "High-quality noise-canceling headphones with 30-hour battery life",
    price: 299.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
    category: "Electronics",
    rating: 4.8,
    stock: 50
  },
  {
    id: "2",
    name: "Smart Fitness Watch",
    description: "Track your health and fitness with advanced sensors and GPS",
    price: 199.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
    category: "Wearables",
    rating: 4.6,
    stock: 35
  },
  {
    id: "3",
    name: "Portable Power Bank",
    description: "20000mAh fast charging power bank with dual USB ports",
    price: 49.99,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop",
    category: "Accessories",
    rating: 4.5,
    stock: 120
  },
  {
    id: "4",
    name: "4K Webcam Pro",
    description: "Professional webcam with auto-focus and background blur",
    price: 149.99,
    image: "https://images.unsplash.com/photo-1624823183493-ed5832f48f18?w=500&h=500&fit=crop",
    category: "Electronics",
    rating: 4.7,
    stock: 60
  },
  {
    id: "5",
    name: "Gaming Mouse RGB",
    description: "Ergonomic gaming mouse with 16000 DPI and customizable RGB",
    price: 79.99,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop",
    category: "Gaming",
    rating: 4.9,
    stock: 85
  },
  {
    id: "6",
    name: "Mechanical Keyboard",
    description: "Premium mechanical keyboard with blue switches and RGB backlight",
    price: 129.99,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop",
    category: "Gaming",
    rating: 4.8,
    stock: 42
  }
];

const Shop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
    toast({
      title: "Added to cart",
      description: "Item successfully added to your cart",
    });
  };

  const cartItemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">TechStore</h1>
              <p className="text-sm text-muted-foreground">Premium Electronics & Gadgets</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/cart', { state: { cart, products } })}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {product.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{product.rating}</span>
                  </div>
                </div>
                <CardDescription className="mb-3">
                  {product.description}
                </CardDescription>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    ${product.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {product.stock} in stock
                  </span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full"
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Shop;
