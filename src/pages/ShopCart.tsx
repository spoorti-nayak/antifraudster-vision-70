import { useState, useEffect } from "react";
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { demoProducts, Product } from "@/data/products";

interface CartItem extends Product {
  quantity: number;
}

const ShopCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = localStorage.getItem("shop_cart");
      if (!savedCart) {
        setLoading(false);
        return;
      }

      const cart = JSON.parse(savedCart);
      const productIds = Object.keys(cart);

      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      const items: CartItem[] = productIds
        .map((id) => {
          const product = demoProducts.find((p) => p.id === id);
          if (!product) return null;
          return { ...product, quantity: cart[id] };
        })
        .filter(Boolean) as CartItem[];

      setCartItems(items);
    } catch (error) {
      console.error("Error loading cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    const savedCart = JSON.parse(localStorage.getItem('shop_cart') || '{}');
    savedCart[productId] = newQuantity;
    localStorage.setItem('shop_cart', JSON.stringify(savedCart));

    setCartItems(items =>
      items.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    const savedCart = JSON.parse(localStorage.getItem('shop_cart') || '{}');
    delete savedCart[productId];
    localStorage.setItem('shop_cart', JSON.stringify(savedCart));
    setCartItems(items => items.filter(item => item.id !== productId));
    toast.success('Item removed from cart');
  };

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/shop')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </Button>

        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate('/shop')}>
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center border-b pb-4 last:border-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-primary font-bold">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={() => navigate('/shop/checkout')}
                >
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopCart;
