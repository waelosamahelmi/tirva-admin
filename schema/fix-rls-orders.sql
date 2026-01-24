-- Fix RLS for orders in Tirva database
-- Run this in Supabase SQL Editor to fix the order update issue

-- Step 1: Create the is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- For admin app, any authenticated user is considered admin
  -- This simplifies the RLS check for the admin app
  RETURN auth.uid() IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing policies on orders table (if any)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Limited order updates" ON public.orders;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anon can view orders by phone" ON public.orders;
DROP POLICY IF EXISTS "Anon can view orders" ON public.orders;

-- Step 3: Create permissive policies for authenticated users
-- Admin users should be able to read, update, and manage orders

-- Policy for SELECT - authenticated users can view all orders
CREATE POLICY "Authenticated users can view orders" ON public.orders
  FOR SELECT TO authenticated USING (true);

-- Policy for INSERT - anyone can create orders (public access)
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Policy for UPDATE - authenticated users can update orders
CREATE POLICY "Authenticated users can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy for DELETE - authenticated users can delete orders
CREATE POLICY "Authenticated users can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (true);

-- Policy for anon SELECT (for customer order lookup)
CREATE POLICY "Anon can view orders" ON public.orders
  FOR SELECT TO anon USING (true);

-- Step 4: Also fix order_items policies
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon can view order items" ON public.order_items;

-- Policy for SELECT - authenticated users can view all order items
CREATE POLICY "Authenticated users can view order items" ON public.order_items
  FOR SELECT TO authenticated USING (true);

-- Policy for INSERT - anyone can create order items (when creating an order)
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Policy for UPDATE - authenticated users can update order items
CREATE POLICY "Authenticated users can update order items" ON public.order_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy for DELETE - authenticated users can delete order items  
CREATE POLICY "Authenticated users can delete order items" ON public.order_items
  FOR DELETE TO authenticated USING (true);

-- Policy for anon SELECT (for customer to see their order items)
CREATE POLICY "Anon can view order items" ON public.order_items
  FOR SELECT TO anon USING (true);

-- Verify RLS is enabled (shouldn't hurt if already enabled)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT ON public.order_items TO anon;

-- Also ensure the menu_items table can be accessed (for joining)
DROP POLICY IF EXISTS "Anyone can view menu items" ON public.menu_items;
CREATE POLICY "Anyone can view menu items" ON public.menu_items
  FOR SELECT TO anon, authenticated USING (true);

-- Step 6: Fix restaurant_config table RLS policies
DROP POLICY IF EXISTS "Anyone can view restaurant config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Authenticated users can view restaurant config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Authenticated users can update restaurant config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Authenticated users can insert restaurant config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Authenticated users can delete restaurant config" ON public.restaurant_config;
DROP POLICY IF EXISTS "Admin can manage restaurant config" ON public.restaurant_config;

-- Ensure RLS is enabled
ALTER TABLE public.restaurant_config ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT - anyone can view restaurant config (needed for web app)
CREATE POLICY "Anyone can view restaurant config" ON public.restaurant_config
  FOR SELECT TO anon, authenticated USING (true);

-- Policy for INSERT - authenticated users can create restaurant config
CREATE POLICY "Authenticated users can insert restaurant config" ON public.restaurant_config
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy for UPDATE - authenticated users can update restaurant config
CREATE POLICY "Authenticated users can update restaurant config" ON public.restaurant_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy for DELETE - authenticated users can delete restaurant config
CREATE POLICY "Authenticated users can delete restaurant config" ON public.restaurant_config
  FOR DELETE TO authenticated USING (true);

-- Grant permissions for restaurant_config
GRANT SELECT ON public.restaurant_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_config TO authenticated;
