-- =====================================================
-- ANTIFRAUDSTER E-COMMERCE DATABASE MIGRATION
-- Run this in Supabase SQL Editor or use migration tool
-- =====================================================

-- 1. CREATE PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products are viewable by everyone
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true);

-- 2. CREATE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fraud_score DECIMAL(5, 4) DEFAULT 0,
  shipping_address TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update orders (for fraud detection)
CREATE POLICY "System can update orders"
  ON public.orders FOR UPDATE
  USING (true);

-- 3. CREATE ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users can view items from their own orders
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Users can create order items for their own orders
CREATE POLICY "Users can create their own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 4. ADD COLUMNS TO MERCHANT_PROFILES
ALTER TABLE public.merchant_profiles
ADD COLUMN IF NOT EXISTS fraud_detection_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- 5. CREATE TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. INSERT SAMPLE PRODUCTS
INSERT INTO public.products (name, description, price, image_url, category, stock) VALUES
('MacBook Pro M3', 'Powerful laptop with M3 chip, 16GB RAM, 512GB SSD', 1999.99, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 'laptops', 15),
('iPhone 15 Pro', 'Latest iPhone with titanium design and A17 Pro chip', 1199.99, 'https://images.unsplash.com/photo-1592286927505-c3b0f9b2b5f0', 'phones', 25),
('iPad Air', 'Versatile tablet with M1 chip and stunning display', 599.99, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0', 'tablets', 20),
('AirPods Pro', 'Premium wireless earbuds with active noise cancellation', 249.99, 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7', 'audio', 50),
('Apple Watch Series 9', 'Advanced health and fitness tracking watch', 429.99, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a', 'wearables', 30),
('Magic Keyboard', 'Wireless keyboard with numeric keypad', 129.99, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3', 'accessories', 40),
('Magic Mouse', 'Sleek wireless mouse with multi-touch surface', 79.99, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46', 'accessories', 45),
('27" 4K Monitor', 'Ultra HD display with P3 wide color gamut', 699.99, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf', 'monitors', 12),
('USB-C Hub', '7-in-1 adapter with HDMI, USB ports, and card reader', 49.99, 'https://images.unsplash.com/photo-1625948515291-69613efd103f', 'accessories', 100),
('Wireless Charger', 'Fast charging pad for iPhone and AirPods', 39.99, 'https://images.unsplash.com/photo-1591290619762-7e8c4b3f7c3e', 'accessories', 75),
('Samsung Galaxy S24', 'Flagship Android phone with AI features', 899.99, 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c', 'phones', 18),
('Dell XPS 15', 'Premium Windows laptop for professionals', 1799.99, 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45', 'laptops', 10);

-- 7. GRANT PERMISSIONS
GRANT SELECT ON public.products TO authenticated, anon;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- Your e-commerce store is now ready!
-- =====================================================
