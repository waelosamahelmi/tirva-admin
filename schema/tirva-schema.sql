-- Tirvan Kahvila Database Schema
-- This schema creates all necessary tables, sequences, and relationships for the restaurant system
-- Based on template schema with Tirvan Kahvila specific data

-- Create sequences first (required for auto-incrementing IDs)
CREATE SEQUENCE IF NOT EXISTS public.categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.menu_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.orders_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.order_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.restaurant_settings_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.toppings_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq;

-- Create tables in dependency order

-- 1. Branches table (for multi-location support - must be created first as other tables reference it)
CREATE TABLE IF NOT EXISTS public.branches (
  id serial PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  name_ru text,
  name_sv text,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  phone text NOT NULL,
  email text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  opening_hours jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- 2. Users table (depends on branches)
CREATE TABLE IF NOT EXISTS public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  branch_id integer REFERENCES public.branches(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'admin'::text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  last_login timestamp without time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 3. Categories table (no dependencies)
CREATE TABLE IF NOT EXISTS public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL,
  name_en text NOT NULL,
  name_ru text,
  name_sv text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- 4. Menu items table (depends on categories and branches)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id integer NOT NULL DEFAULT nextval('menu_items_id_seq'::regclass),
  category_id integer,
  branch_id integer REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_en text NOT NULL,
  name_ru text,
  name_sv text,
  description text,
  description_en text,
  description_ru text,
  description_sv text,
  price numeric NOT NULL,
  image_url text,
  is_vegetarian boolean DEFAULT false,
  is_vegan boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_available boolean DEFAULT true,
  offer_price numeric,
  offer_percentage integer,
  offer_start_date timestamp without time zone,
  offer_end_date timestamp without time zone,
  has_conditional_pricing boolean DEFAULT false,
  included_toppings_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

-- 5. Orders table (depends on branches)
CREATE TABLE IF NOT EXISTS public.orders (
  id integer NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  branch_id integer REFERENCES public.branches(id),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  delivery_address text,
  order_type text NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'dine-in')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'confirmed', 'preparing', 'ready', 'completed', 'delivered', 'cancelled')),
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric DEFAULT 0 CHECK (delivery_fee >= 0),
  small_order_fee numeric(10,2) DEFAULT 0,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  payment_method text DEFAULT 'cash',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  payment_method_details jsonb,
  refund_amount numeric(10,2),
  refund_reason text,
  refunded_at timestamp without time zone,
  special_instructions text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- 6. Order items table (depends on orders and menu_items)
CREATE TABLE IF NOT EXISTS public.order_items (
  id integer NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  order_id integer NOT NULL,
  menu_item_id integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  special_instructions text,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- 7. Printers table (no dependencies)
CREATE TABLE IF NOT EXISTS public.printers (
  id text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('network')),
  address text NOT NULL,
  port integer NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  font_settings JSONB DEFAULT '{"restaurantName":{"width":2,"height":2},"header":{"width":2,"height":2},"orderNumber":{"width":2,"height":3},"menuItems":{"width":2,"height":2},"toppings":{"width":1,"height":1},"totals":{"width":2,"height":2},"finalTotal":{"width":3,"height":3},"characterSpacing":0}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT printers_pkey PRIMARY KEY (id)
);

-- 8. Restaurant settings table (with optional printer reference)
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id integer NOT NULL DEFAULT nextval('restaurant_settings_id_seq'::regclass),
  is_open boolean DEFAULT true,
  is_busy boolean DEFAULT false,
  opening_hours text NOT NULL,
  pickup_hours text NOT NULL,
  delivery_hours text NOT NULL,
  lunch_buffet_hours text NOT NULL,
  special_message text,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  default_printer_id text,
  printer_auto_reconnect boolean DEFAULT true,
  printer_tab_sticky boolean DEFAULT true,
  receipt_format varchar DEFAULT 'text',
  direct_print_enabled boolean DEFAULT true,
  payment_methods jsonb DEFAULT '[
    {"id": "cash", "nameFi": "Käteinen", "nameEn": "Cash", "enabled": true, "icon": "banknote"},
    {"id": "card", "nameFi": "Kortti", "nameEn": "Card", "enabled": true, "icon": "credit-card"}
  ]'::jsonb,
  stripe_enabled boolean DEFAULT false,
  stripe_publishable_key text,
  stripe_secret_key text,
  stripe_webhook_secret text,
  stripe_test_mode boolean DEFAULT true,
  stripe_connect_account_id text,
  stripe_account_email text,
  stripe_account_country text,
  stripe_payment_methods_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT restaurant_settings_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_settings_default_printer_fkey FOREIGN KEY (default_printer_id) REFERENCES public.printers(id) ON DELETE SET NULL
);

-- 9. Session table (for session management)
CREATE TABLE IF NOT EXISTS public.session (
  sid character varying NOT NULL,
  sess json NOT NULL,
  expire timestamp without time zone NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- 10. Toppings table (no dependencies)
CREATE TABLE IF NOT EXISTS public.toppings (
  id integer NOT NULL DEFAULT nextval('toppings_id_seq'::regclass),
  name text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  name_ru text,
  name_sv text,
  price numeric NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  category text NOT NULL DEFAULT 'pizza',
  type text NOT NULL DEFAULT 'topping',
  is_required boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT toppings_pkey PRIMARY KEY (id)
);

-- 11. Topping groups table
CREATE TABLE IF NOT EXISTS public.topping_groups (
  id serial PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  name_ru text,
  name_sv text,
  is_required boolean DEFAULT false,
  min_selections integer DEFAULT 0,
  max_selections integer DEFAULT 99,
  selection_type text DEFAULT 'checkbox' CHECK (selection_type IN ('checkbox', 'radio')),
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- 12. Topping group items (join table)
CREATE TABLE IF NOT EXISTS public.topping_group_items (
  id serial PRIMARY KEY,
  topping_group_id integer NOT NULL REFERENCES public.topping_groups(id) ON DELETE CASCADE,
  topping_id integer NOT NULL REFERENCES public.toppings(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- 13. Category topping groups (join table)
CREATE TABLE IF NOT EXISTS public.category_topping_groups (
  id serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  topping_group_id integer NOT NULL REFERENCES public.topping_groups(id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT now(),
  UNIQUE(category_id, topping_group_id)
);

-- 14. Order item toppings (tracks selected toppings for order items)
CREATE TABLE IF NOT EXISTS public.order_item_toppings (
  id serial PRIMARY KEY,
  order_item_id integer NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  topping_id integer NOT NULL REFERENCES public.toppings(id) ON DELETE RESTRICT,
  quantity integer DEFAULT 1,
  unit_price numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- 15. Promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id serial PRIMARY KEY,
  name text NOT NULL,
  name_en text NOT NULL,
  name_ru text,
  name_sv text,
  description text,
  description_en text,
  description_ru text,
  description_sv text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10, 2) NOT NULL,
  category_id integer REFERENCES public.categories(id) ON DELETE CASCADE,
  branch_id integer REFERENCES public.branches(id) ON DELETE CASCADE,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  is_active boolean DEFAULT true,
  min_order_amount numeric(10, 2) DEFAULT 0,
  max_discount_amount numeric(10, 2),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 16. Locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  address varchar(500) NOT NULL,
  city varchar(100) NOT NULL,
  postal_code varchar(20),
  icon varchar(100) DEFAULT 'MapPin',
  logo_url varchar(500),
  region varchar(100),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 17. Lounas settings table (lunch time configuration)
CREATE TABLE IF NOT EXISTS public.lounas_settings (
  id serial PRIMARY KEY,
  branch_id integer NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  start_time time NOT NULL DEFAULT '10:30:00',
  end_time time NOT NULL DEFAULT '14:00:00',
  serves_sunday boolean DEFAULT false,
  serves_monday boolean DEFAULT true,
  serves_tuesday boolean DEFAULT true,
  serves_wednesday boolean DEFAULT true,
  serves_thursday boolean DEFAULT true,
  serves_friday boolean DEFAULT true,
  serves_saturday boolean DEFAULT false,
  info_text text,
  info_text_en text,
  info_text_ar text,
  info_text_ru text,
  info_text_sv text,
  price_text text,
  price_text_en text,
  price_text_ar text,
  price_text_ru text,
  price_text_sv text,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id)
);

-- 18. Lounas menus table (weekly lunch menu items)
CREATE TABLE IF NOT EXISTS public.lounas_menus (
  id serial PRIMARY KEY,
  branch_id integer NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  year integer NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  name text NOT NULL,
  name_en text,
  name_ar text,
  name_ru text,
  name_sv text,
  description text,
  description_en text,
  description_ar text,
  description_ru text,
  description_sv text,
  price text DEFAULT '',
  is_lactose_free boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_vegan boolean DEFAULT false,
  is_milk_free boolean DEFAULT false,
  is_hot boolean DEFAULT true,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, year, week_number, day_of_week, display_order)
);

-- 19. Restaurant config table
CREATE TABLE IF NOT EXISTS restaurant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  tagline text NOT NULL,
  tagline_en text NOT NULL,
  description text NOT NULL,
  description_en text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}',
  social_media jsonb DEFAULT '{}',
  hours jsonb NOT NULL DEFAULT '{}',
  services jsonb NOT NULL DEFAULT '{}',
  delivery_config jsonb NOT NULL DEFAULT '{}',
  theme jsonb NOT NULL DEFAULT '{}',
  page_layout_variants jsonb NOT NULL DEFAULT '{"home":"variant1","menu":"variant1","about":"variant1","header":"variant1","footer":"variant1","cart":"variant1","checkout":"variant1"}',
  logo jsonb NOT NULL DEFAULT '{}',
  about jsonb NOT NULL DEFAULT '{}',
  hero jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_branch_id ON public.menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON public.menu_items(display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_offer_dates ON public.menu_items(offer_start_date, offer_end_date);
CREATE INDEX IF NOT EXISTS idx_menu_items_conditional_pricing ON public.menu_items(has_conditional_pricing) WHERE has_conditional_pricing = true;

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_toppings_category ON public.toppings(category);
CREATE INDEX IF NOT EXISTS idx_toppings_is_active ON public.toppings(is_active);
CREATE INDEX IF NOT EXISTS idx_toppings_display_order ON public.toppings(display_order);

CREATE INDEX IF NOT EXISTS idx_topping_group_items_group_id ON public.topping_group_items(topping_group_id);
CREATE INDEX IF NOT EXISTS idx_topping_group_items_topping_id ON public.topping_group_items(topping_id);

CREATE INDEX IF NOT EXISTS idx_order_item_toppings_order_item_id ON public.order_item_toppings(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_toppings_topping_id ON public.order_item_toppings(topping_id);

CREATE INDEX IF NOT EXISTS idx_printers_is_active ON public.printers(is_active);
CREATE INDEX IF NOT EXISTS idx_printers_is_default ON public.printers(is_default);

CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_display_order ON public.branches(display_order);

CREATE INDEX IF NOT EXISTS idx_promotions_category_id ON public.promotions(category_id);
CREATE INDEX IF NOT EXISTS idx_promotions_branch_id ON public.promotions(branch_id);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active);

CREATE INDEX IF NOT EXISTS idx_locations_city ON public.locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_region ON public.locations(region);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_order ON public.locations(display_order);

CREATE INDEX IF NOT EXISTS idx_lounas_menus_branch_week ON public.lounas_menus(branch_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_lounas_menus_active ON public.lounas_menus(is_active, year, week_number);

CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users(branch_id);

CREATE INDEX IF NOT EXISTS idx_session_expire ON public.session(expire);

CREATE INDEX IF NOT EXISTS idx_restaurant_config_active ON restaurant_config(is_active) WHERE is_active = true;

-- Set sequence ownership
ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;
ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;
ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;
ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;
ALTER SEQUENCE public.restaurant_settings_id_seq OWNED BY public.restaurant_settings.id;
ALTER SEQUENCE public.toppings_id_seq OWNED BY public.toppings.id;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION ensure_single_default_printer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.printers SET is_default = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION ensure_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE restaurant_config SET is_active = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at 
    BEFORE UPDATE ON public.restaurant_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_printers_updated_at 
    BEFORE UPDATE ON public.printers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON public.menu_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toppings_updated_at 
    BEFORE UPDATE ON public.toppings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topping_groups_updated_at 
    BEFORE UPDATE ON public.topping_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON public.promotions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at 
    BEFORE UPDATE ON public.branches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON public.locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lounas_settings_updated_at 
    BEFORE UPDATE ON public.lounas_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lounas_menus_updated_at 
    BEFORE UPDATE ON public.lounas_menus 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ensure_single_default_printer_trigger
    BEFORE INSERT OR UPDATE ON public.printers
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_printer();

CREATE TRIGGER ensure_single_active_config_trigger
  BEFORE INSERT OR UPDATE ON restaurant_config
  FOR EACH ROW EXECUTE FUNCTION ensure_single_active_config();

CREATE TRIGGER update_restaurant_config_updated_at
  BEFORE UPDATE ON restaurant_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- TIRVAN KAHVILA SPECIFIC DATA
-- ==========================================

-- Insert default restaurant settings for Tirvan Kahvila
INSERT INTO public.restaurant_settings (
    id,
    is_open, 
    opening_hours, 
    pickup_hours, 
    delivery_hours, 
    lunch_buffet_hours,
    special_message,
    default_printer_id,
    printer_auto_reconnect,
    printer_tab_sticky
) VALUES (
    1,
    true,
    '{"monday":"11:00-22:00","tuesday":"11:00-22:00","wednesday":"11:00-22:00","thursday":"11:00-22:00","friday":"11:00-23:00","saturday":"11:00-23:00","sunday":"12:00-22:00"}',
    '{"monday":"11:00-22:00","tuesday":"11:00-22:00","wednesday":"11:00-22:00","thursday":"11:00-22:00","friday":"11:00-23:00","saturday":"11:00-23:00","sunday":"12:00-22:00"}',
    '{"monday":"11:00-21:30","tuesday":"11:00-21:30","wednesday":"11:00-21:30","thursday":"11:00-21:30","friday":"11:00-22:30","saturday":"11:00-22:30","sunday":"12:00-21:30"}',
    '{"monday":"11:00-15:00","tuesday":"11:00-15:00","wednesday":"11:00-15:00","thursday":"11:00-15:00","friday":"11:00-15:00","saturday":"11:00-15:00","sunday":"12:00-15:00"}',
    'Tervetuloa Tirvan Kahvilaan!',
    null,
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert admin users for Tirvan Kahvila
INSERT INTO public.users (id, email, password, role, is_active, created_at) VALUES 
  (1, 'admin@tirvankahvila.fi', '$2b$12$6I71d6v/DDJSe63h2AOO/u0kQOo.S6bLocrMYSLYToUPumKBpjc8C', 'admin', true, now()),
  (2, 'info@tirvankahvila.fi', '$2y$15$gbXL5zizte8zYStrcmEB..G8R8ncPRThm73Tjk2QqAGBS0jIekDzy', 'admin', true, now())
ON CONFLICT (id) DO NOTHING;

-- Insert categories
INSERT INTO public.categories (id, name, name_en, display_order, is_active) VALUES 
  (6, 'Pizzat 🍕😍', 'Pizzas 🍕😍', 1, true),
  (7, 'Kebabit 🌯', 'Kebabs 🌯', 2, true),
  (8, 'Kanaruoat 🍗', 'Chicken Dishes 🍗', 3, true),
  (9, 'Hot Wings 🍖', 'Hot Wings 🍖', 4, true),
  (10, 'Hampurilaiset 🍔🍟', 'Burgers 🍔🍟', 5, true),
  (11, 'Salaatit 🥗', 'Salads 🥗', 6, true),
  (12, 'Lapsille 🥰', 'For Kids 🥰', 7, true),
  (13, 'Juomat 🥤🧋', 'Drinks 🥤🧋', 8, true)
ON CONFLICT (id) DO NOTHING;

-- Insert toppings
INSERT INTO public.toppings (id, name, name_en, name_ar, price, is_active, display_order, category, type, is_required, created_at) VALUES 
  (1, 'tomaatti', 'tomato', 'طماطم', 1.00, true, 1, 'pizza', 'topping', false, now()),
  (2, 'sipuli', 'onion', 'بصل', 1.00, true, 2, 'pizza', 'topping', false, now()),
  (3, 'herkkusieni', 'mushroom', 'فطر', 1.00, true, 3, 'pizza', 'topping', false, now()),
  (4, 'paprika', 'bell pepper', 'فلفل حلو', 1.00, true, 4, 'pizza', 'topping', false, now()),
  (5, 'oliivi', 'olive', 'زيتون', 1.00, true, 5, 'pizza', 'topping', false, now()),
  (6, 'ananas', 'pineapple', 'أناناس', 1.00, true, 6, 'pizza', 'topping', false, now()),
  (7, 'jalapeno', 'jalapeño', 'هالابينو', 1.00, true, 7, 'pizza', 'topping', false, now()),
  (8, 'jauheliha', 'ground meat', 'لحم مفروم', 1.00, true, 8, 'pizza', 'topping', false, now()),
  (9, 'salami', 'salami', 'سلامي', 1.00, true, 9, 'pizza', 'topping', false, now()),
  (10, 'pizzasuikale', 'ham strips', 'شرائح لحم', 1.00, true, 10, 'pizza', 'topping', false, now()),
  (11, 'tonnikala', 'tuna', 'تونة', 1.00, true, 11, 'pizza', 'topping', false, now()),
  (12, 'pekoni', 'bacon', 'لحم مقدد', 1.00, true, 12, 'pizza', 'topping', false, now()),
  (13, 'kebabliha', 'kebab meat', 'لحم كباب', 1.00, true, 13, 'pizza', 'topping', false, now()),
  (14, 'kana', 'chicken', 'دجاج', 1.00, true, 14, 'pizza', 'topping', false, now()),
  (15, 'pepperonimakkara', 'pepperoni', 'بيبيروني', 1.00, true, 15, 'pizza', 'topping', false, now()),
  (16, 'simpukka', 'mussel', 'بلح البحر', 1.00, true, 16, 'pizza', 'topping', false, now()),
  (17, 'katkarapu', 'shrimp', 'جمبري', 1.00, true, 17, 'pizza', 'topping', false, now()),
  (18, 'aurajuusto', 'blue cheese', 'جبنة زرقاء', 1.00, true, 18, 'pizza', 'topping', false, now()),
  (19, 'tuplajuusto', 'extra cheese', 'جبنة إضافية', 1.00, true, 19, 'pizza', 'topping', false, now()),
  (20, 'salaattijuusto', 'feta cheese', 'جبنة فيتا', 1.00, true, 20, 'pizza', 'topping', false, now()),
  (21, 'mozzarellajuusto', 'mozzarella', 'موزاريلا', 1.00, true, 21, 'pizza', 'topping', false, now()),
  (22, 'smetana', 'sour cream', 'كريمة حامضة', 1.00, true, 22, 'pizza', 'topping', false, now()),
  (23, 'BBQ kastike', 'BBQ sauce', 'صوص باربكيو', 1.00, true, 23, 'pizza', 'topping', false, now()),
  (24, 'pesto', 'pesto', 'بيستو', 1.00, true, 24, 'pizza', 'topping', false, now()),
  (25, 'curry-mangokastike', 'curry-mango sauce', 'صوص كاري مانجو', 1.00, true, 25, 'pizza', 'topping', false, now()),
  (26, 'Gluteeniton pizzapohja', 'Gluten-free base', 'قاعدة خالية من الجلوتين', 3.00, true, 26, 'pizza', 'extra', false, now()),
  (27, 'Ruis pizzapohja', 'Rye pizza base', 'قاعدة بيتزا الجاودار', 2.00, true, 27, 'pizza', 'extra', false, now()),
  (28, 'Oregano', 'Oregano', 'أوريجانو', 0.00, true, 28, 'pizza', 'spice', false, now()),
  (29, 'Valkosipuli', 'Garlic', 'ثوم', 0.00, true, 29, 'pizza', 'spice', false, now()),
  (30, 'Mieto', 'Mild', 'خفيف', 0.00, true, 1, 'kebab', 'sauce', true, now()),
  (31, 'Keskivahva', 'Medium', 'متوسط', 0.00, true, 2, 'kebab', 'sauce', true, now()),
  (32, 'Vahva', 'Strong', 'قوي', 0.00, true, 3, 'kebab', 'sauce', true, now()),
  (33, 'Valkosipulikastike', 'Garlic sauce', 'صوص الثوم', 0.00, true, 4, 'kebab', 'sauce', true, now()),
  (34, 'Ei kastiketta', 'No sauce', 'بدون صوص', 0.00, true, 5, 'kebab', 'sauce', true, now()),
  (35, 'Tuplaliha', 'Double meat', 'لحم مضاعف', 3.00, true, 6, 'kebab', 'extra', false, now()),
  (36, 'Aurajuusto', 'Blue cheese', 'جبنة زرقاء', 1.00, true, 7, 'kebab', 'extra', false, now()),
  (37, 'Salaattijuusto', 'Feta cheese', 'جبنة فيتا', 1.00, true, 8, 'kebab', 'extra', false, now()),
  (38, 'Ananas', 'Pineapple', 'أناناس', 1.00, true, 9, 'kebab', 'extra', false, now()),
  (39, 'Jalapeno', 'Jalapeño', 'هالابينو', 1.00, true, 10, 'kebab', 'extra', false, now()),
  (40, 'Tuplaliha', 'Double meat', 'لحم مضاعف', 3.00, true, 1, 'chicken', 'extra', false, now()),
  (41, 'Aurajuusto', 'Blue cheese', 'جبنة زرقاء', 1.00, true, 2, 'chicken', 'extra', false, now()),
  (42, 'Salaattijuusto', 'Feta cheese', 'جبنة فيتا', 1.00, true, 3, 'chicken', 'extra', false, now()),
  (43, 'Ananas', 'Pineapple', 'أناناس', 1.00, true, 4, 'chicken', 'extra', false, now()),
  (44, 'Jalapeno', 'Jalapeño', 'هالابينو', 1.00, true, 5, 'chicken', 'extra', false, now()),
  (45, 'Medium', 'Medium', 'متوسط', 0.00, true, 1, 'wings', 'sauce', true, now()),
  (46, 'Hot', 'Hot', 'حار', 0.00, true, 2, 'wings', 'sauce', true, now()),
  (47, 'X-hot', 'X-hot', 'حار جداً', 0.00, true, 3, 'wings', 'sauce', true, now()),
  (48, 'XX-hot', 'XX-hot', 'حار للغاية', 0.00, true, 4, 'wings', 'sauce', true, now()),
  (49, 'ei kastiketta', 'no sauce', 'بدون صوص', 0.00, true, 5, 'wings', 'sauce', true, now()),
  (50, 'Ateria (Ranskalaiset + 0,33L)', 'Meal (Fries + 0.33L)', 'وجبة (بطاطس + ٠.٣٣ل)', 0.00, true, 1, 'burger', 'size', true, now()),
  (51, 'Coca Cola 0,33l', 'Coca Cola 0.33l', 'كوكا كولا ٠.٣٣ل', 0.00, true, 2, 'burger', 'drink', true, now()),
  (52, 'Coca Cola Zero 0,33l', 'Coca Cola Zero 0.33l', 'كوكا كولا زيرو ٠.٣٣ل', 0.00, true, 3, 'burger', 'drink', true, now()),
  (53, 'Fanta 0,33l', 'Fanta 0.33l', 'فانتا ٠.٣٣ل', 0.00, true, 4, 'burger', 'drink', true, now()),
  (54, 'aurajuusto', 'blue cheese', 'جبنة زرقاء', 1.00, true, 5, 'burger', 'extra', false, now()),
  (55, 'feta', 'feta', 'فيتا', 1.00, true, 6, 'burger', 'extra', false, now()),
  (56, 'ananas', 'pineapple', 'أناناس', 1.00, true, 7, 'burger', 'extra', false, now()),
  (57, 'jalapeno', 'jalapeño', 'هالابينو', 1.00, true, 8, 'burger', 'extra', false, now()),
  (58, 'kananmuna', 'egg', 'بيض', 1.00, true, 9, 'burger', 'extra', false, now())
ON CONFLICT (id) DO NOTHING;

-- Insert menu items (Pizzas)
INSERT INTO public.menu_items (id, category_id, name, name_en, description, description_en, price, image_url, is_vegetarian, is_vegan, is_gluten_free, display_order, is_available) VALUES 
  (53, 6, 'Margarita', 'Margarita', 'Tuore tomaatti', 'Fresh tomato', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/b0353b09-a3ac-4ea3-a802-2fa5038acc8e.webp', false, false, false, 1, true),
  (54, 6, 'Bolognese', 'Bolognese', 'Jauhelihakastike', 'Meat sauce', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/0e1d6136-ccaa-406d-bb24-c37cc560c5ea.webp', false, false, false, 2, true),
  (55, 6, 'Kinkku', 'Ham', 'Pizzasuikale', 'Pizza ham', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/0541d7a2-32d0-44e0-8501-9ecd481452dd.webp', false, false, false, 3, true),
  (56, 6, 'Salami', 'Salami', 'Salami', 'Salami', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/f1918d14-47ce-4f76-8bdc-e123b7b90a9b.webp', false, false, false, 4, true),
  (57, 6, 'Tonnikala', 'Tuna', 'Tonnikala', 'Tuna', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/3cc49a46-cdc6-4b40-bbfa-82c378f91ef3.webp', false, false, false, 5, true),
  (58, 6, 'Pepperoni', 'Pepperoni', 'Pepperonimakkara', 'Pepperoni sausage', 10.40, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/3df2e70c-ba94-431a-bd9c-feac4731186d.webp', false, false, false, 6, true),
  (59, 6, 'Francescana', 'Francescana', 'Pizzasuikale, herkkusieni', 'Pizza ham, mushrooms', 10.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/537f4e15-714e-4179-9774-e6c796f16bcb.webp', false, false, false, 7, true),
  (60, 6, 'Opera', 'Opera', 'Pizzasuikale, tonnikala', 'Pizza ham, tuna', 10.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/829755a4-8f85-4a1a-bda0-a63bb91e6864.webp', false, false, false, 8, true),
  (61, 6, 'Tropicana', 'Tropicana', 'Pizzasuikale, ananas', 'Pizza ham, pineapple', 10.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/f2de3855-48d2-483c-8eba-63bd8a12dc79.webp', false, false, false, 9, true),
  (62, 6, 'Opera Special', 'Opera Special', 'Pizzasuikale, salami, tonnikala', 'Pizza ham, salami, tuna', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/4b7f3271-8dcb-4cbb-96cc-ebc2b76b79db.webp', false, false, false, 10, true),
  (63, 6, 'Al capone', 'Al capone', 'Salami, pizzasuikale, pekoni', 'Salami, pizza ham, bacon', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/bd9242b3-a512-41a8-99da-15c0ea246c93.webp', false, false, false, 11, true),
  (64, 6, 'Frutti di mare', 'Frutti di mare', 'Tonnikala, katkarapu, simpukka', 'Tuna, shrimp, mussels', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/595d5517-b719-485c-9b69-dd7daf29ef17.webp', false, false, false, 12, true),
  (65, 6, 'Chicken hawai', 'Chicken hawai', 'Kana, ananas, aurajuusto', 'Chicken, pineapple, blue cheese', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/24269314-e7de-4b55-be0b-2bb00aa00d12.webp', false, false, false, 13, true),
  (66, 6, 'Americano', 'Americano', 'Pizzasuikale, ananas, aurajuusto', 'Pizza ham, pineapple, blue cheese', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/03026ae3-c05b-4672-a125-8bd35ce86531.webp', false, false, false, 14, true),
  (67, 6, 'Vegetariana', 'Vegetariana', 'Herkkusieni, sipuli, paprika, oliivi, tomaatti', 'Mushrooms, onion, bell pepper, olives, tomato', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/8052a52e-c3da-4223-8baa-222793268702.webp', false, false, false, 15, true),
  (68, 6, 'Julia', 'Julia', 'Pizzasuikale, ananas, katkarapu, aurajuusto', 'Pizza ham, pineapple, shrimp, blue cheese', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/39377e2a-49ee-46b0-8baa-64ad4b54aa9a.webp', false, false, false, 16, true),
  (69, 6, 'Romeo', 'Romeo', 'Salami, ananas, katkarapu, aurajuusto', 'Salami, pineapple, shrimp, blue cheese', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/79fcc592-1a45-4e21-8de4-0ba2221254e8.webp', false, false, false, 17, true),
  (70, 6, 'Hercules', 'Hercules', 'Salami, ananas, pekoni, aurajuusto', 'Salami, pineapple, bacon, blue cheese', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/e9a73544-746c-4f0e-b020-e0c49e26dc2a.webp', false, false, false, 18, true),
  (71, 6, 'Dillinger', 'Dillinger', 'Pizzasuikale, salami, sipuli, jauheliha', 'Pizza ham, salami, onion, ground beef', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/67759862-ceaf-4c60-97e8-bdf8bb4aa298.jpeg', false, false, false, 19, true),
  (72, 6, 'Kummisetä', 'Godfather', 'Pizzasuikale, herkkusieni, katkarapu, parsa', 'Pizza ham, mushrooms, shrimp, asparagus', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/50e42730-0a1b-450e-a8f5-322a34ee932d.jpeg', false, false, false, 20, true),
  (73, 6, 'Quattro stagioni', 'Four seasons', 'Pizzasuikale, tonnikala, herkkusieni, katkarapu', 'Pizza ham, tuna, mushrooms, shrimp', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/07e0ee0d-e9a1-46d6-a536-9976892bd659.jpeg', false, false, false, 21, true),
  (74, 6, 'Kebab pizza', 'Kebab pizza', 'Kebabliha, sipuli, paprika, jalapeno', 'Kebab meat, onion, bell pepper, jalapeño', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/f312810f-4359-42af-be42-d84094a7b420.jpeg', false, false, false, 22, true),
  (75, 6, 'Mexicano', 'Mexicano', 'Pepperonimakkara, tacokastike, jalapeno, ananas', 'Pepperoni sausage, taco sauce, jalapeño, pineapple', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/cfe73ccf-8ae8-4c22-b622-7e619e25a8c0.jpeg', false, false, false, 23, true),
  (76, 6, 'Juusto special', 'Cheese special', 'Salaattijuusto, aurajuusto, mozzarella, tuplajuusto', 'Salad cheese, blue cheese, mozzarella, double cheese', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/2e08acb7-7a67-40f3-92c8-46055d774391.jpeg', false, false, false, 24, true),
  (77, 6, 'Carlos tulinen', 'Carlos spicy', 'Kebabliha, extra jalapeno, aurajuusto, tulinen kastike', 'Kebab meat, extra jalapeño, blue cheese, spicy sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/ffe3d075-95e1-47bd-9695-0a3ef827ec14.jpeg', false, false, false, 25, true),
  (78, 6, 'Utin special', 'Utin special', 'Kebabliha, sipuli, salaattijuusto, tomaatti, paprika', 'Kebab meat, onion, salad cheese, tomato, bell pepper', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/630f0d58-b052-4bf7-9d09-25d4e753441f.jpeg', false, false, false, 26, true),
  (79, 6, 'Supersalami', 'Supersalami', 'Pizzasuikale, salami, sipuli, kebabliha, aurajuusto', 'Pizza ham, salami, onion, kebab meat, blue cheese', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/c458960e-b133-4b53-9460-3004723f818f.jpeg', false, false, false, 27, true),
  (80, 6, 'Empire special', 'Empire special', 'Salami, pizzasuikale, sipuli, katkarapu, tuplajuusto', 'Salami, pizza ham, onion, shrimp, double cheese', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/7924f128-c8f1-4305-acf2-e48e2f418516.jpeg', false, false, false, 28, true),
  (81, 6, 'Mozzarella', 'Mozzarella', 'Mozzarella, sipuli, tomaatti, salaattijuusto, pestokastike', 'Mozzarella, onion, tomato, salad cheese, pesto sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/a078a153-172b-4d53-9ade-d249a5d7ccad.jpeg', false, false, false, 29, true),
  (82, 6, 'Barbeque', 'Barbeque', 'Kana, sipuli, pekoni, mozzarella, BBQ-kastike', 'Chicken, onion, bacon, mozzarella, BBQ sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/a1d20be3-b209-4224-b98d-4ed27863479c.jpeg', false, false, false, 30, true),
  (83, 6, 'Pasinkylä special', 'Pasinkylä special', 'Pizzasuikale, salami, sipuli, pekoni, kananmuna', 'Pizza ham, salami, onion, bacon, egg', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/60ea781b-f879-4ec5-8e9b-3ca27f5a57de.png', false, false, false, 31, true),
  (84, 6, 'Papa''s special', 'Papa''s special', 'Pepperonimakkara, tonnikala, oliivi, sipuli, paprika, aurajuusto', 'Pepperoni sausage, tuna, olives, onion, bell pepper, blue cheese', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/cf0aba0f-8a2d-42b3-bbe9-8286721fcf17.png', false, false, false, 32, true),
  (85, 6, 'Italiano', 'Italiano', 'Salami, sipuli, paprika, oliivi, katkarapu, aurajuusto', 'Salami, onion, bell pepper, olives, shrimp, blue cheese', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/70896b19-cbec-454b-a251-a6da03ef9269.png', false, false, false, 33, true),
  (86, 6, 'Tirvan special', 'Tirvan special', 'Kana, ananas, aurajuusto, oliivi, tomaatti, paprika', 'Chicken, pineapple, blue cheese, olives, tomato, bell pepper', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/8c818a92-0198-4e46-89cc-fe0d56920c95.png', false, false, false, 34, true),
  (87, 6, 'Kaipiainen special', 'Kaipiainen special', 'Pepperonimakkara, jauheliha, salami, pizzasuikale, kebabliha, pekoni', 'Pepperoni sausage, ground beef, salami, pizza ham, kebab meat, bacon', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/129bcba8-8a80-4964-9602-2869e1c73727.png', false, false, false, 35, true),
  (88, 6, 'Istanbul special', 'Istanbul special', 'Pizzasuikale, salami, pekoni, jalapeno, aurajuusto, sipuli', 'Pizza ham, salami, bacon, jalapeño, blue cheese, onion', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/a3a11104-99ff-471e-b63e-5c10ebdde57a.png', false, false, false, 36, true),
  (89, 6, 'Curry-mango pizza', 'Curry-mango pizza', 'Kana, kebabliha, aurajuusto, ananas, curry-mango kastike', 'Chicken, kebab meat, blue cheese, pineapple, curry-mango sauce', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/9994fcbe-3b9c-455e-8edb-21fb79dd0256.png', false, false, false, 37, true),
  (90, 6, 'Smetana pizza', 'Smetana pizza', 'Kebabliha, sipuli, jalapeno, tomaatti, aurajuusto, smetana', 'Kebab meat, onion, jalapeño, tomato, blue cheese, sour cream', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/a65da6d2-e480-4e9c-8dfd-f57a22619685.jpeg', false, false, false, 38, true),
  (91, 6, 'Salaatti pizza', 'Salad pizza', 'Kebabliha, kana, salaatti, tomaatti, kurkku, salaattikastike', 'Kebab meat, chicken, salad, tomato, cucumber, salad dressing', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6b831c74-dd00-4231-9f81-f25697a9e148.jpeg', false, false, false, 39, true),
  (92, 6, 'Calzone (sisään leivottu)', 'Calzone (baked inside)', 'Kebabliha, juusto, sipuli, tomaatti, turkinpippuri', 'Kebab meat, cheese, onion, tomato, turkish pepper', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6dc0487a-814d-45d5-88b0-93ef51024853.jpeg', false, false, false, 40, true),
  (93, 6, 'Oma valinta', 'Your choice', '1-4 täytettä valintasi mukaan', '1-4 toppings of your choice', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/f6225a15-70a4-4788-aee0-ea88c97559fc.jpeg', false, false, false, 41, true),
  -- Kebabs
  (94, 7, 'Leipäkebab', 'Bread kebab', 'Tuore pitaleipä, kebabliha. Sisältyy: Salaatti ja kastikkeet', 'Fresh pita bread, kebab meat. Includes: Salad and sauces', 11.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebabbread.png', false, false, false, 1, true),
  (95, 7, 'Kebab riisillä', 'Kebab with rice', 'Kebabliha, riisi. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, rice. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebabriisi.png', false, false, false, 2, true),
  (96, 7, 'Kebab ranskalaisilla', 'Kebab with french fries', 'Kebabliha, ranskalaiset perunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, french fries. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebabrans.png', false, false, false, 3, true),
  (97, 7, 'Kebab lohkoperunoilla', 'Kebab with potato wedges', 'Kebabliha, lohkoperunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, potato wedges. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebabpot.png', false, false, false, 4, true),
  (98, 7, 'Kebab kermaperunoilla', 'Kebab with cream potatoes', 'Kebabliha, kermaperunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, cream potatoes. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebabkerm.png', false, false, false, 5, true),
  (99, 7, 'Kebab valkosipuliperunoilla', 'Kebab with garlic potatoes', 'Kebabliha, valkosipuliperunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, garlic potatoes. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/valkokeb.png', false, false, false, 6, true),
  (100, 7, 'Iskender kebab', 'Iskender kebab', 'Kebabliha, leipäkuutiot, jogurtti. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, bread cubes, yogurt. Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/iskkebab.png', false, false, false, 7, true),
  (101, 7, 'Rullakebab', 'Wrap kebab', 'Sisältyy: Salaatti ja kastikkeet', 'Includes: Salad and sauces', 11.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kebroll.png', false, false, false, 8, true),
  (102, 7, 'Kebab aurajuustoperunoilla', 'Kebab with blue cheese potatoes', 'Kebabliha, aurajuustoperunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, blue cheese potatoes. Includes: Salad and sauces', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/aura.png', false, false, false, 9, true),
  (103, 7, 'Kebab juustoperunoilla', 'Kebab with cheese potatoes', 'Kebabliha, kermajuustoperunat. Sisältyy: Salaatti ja kastikkeet', 'Kebab meat, cream cheese potatoes. Includes: Salad and sauces', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/cheesekeb.png', false, false, false, 10, true),
  (104, 7, 'Special kebab', 'Special kebab', 'Kebabliha, ranskalaiset, riisi, salaatti, kastikkeet', 'Kebab meat, french fries, rice, salad, sauces', 12.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/speckebab.png', false, false, false, 11, true),
  -- Chicken dishes
  (105, 8, 'Kanapita', 'Chicken pita', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kanapita.png', false, false, false, 1, true),
  (106, 8, 'Kana riisillä', 'Chicken with rice', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kanarice.png', false, false, false, 2, true),
  (107, 8, 'Kana ranskalaisilla', 'Chicken with french fries', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kanafries.png', false, false, false, 3, true),
  (108, 8, 'Kana lohkoperunoilla', 'Chicken with potato wedges', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kanapot.png', false, false, false, 4, true),
  (109, 8, 'Kana kermaperunoilla', 'Chicken with cream potatoes', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kermakan.png', false, false, false, 5, true),
  (110, 8, 'Kanarulla', 'Chicken wrap', 'Sisältyy: Ananas ja currymangokastike', 'Includes: Pineapple and curry mango sauce', 13.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kanaroll.png', false, false, false, 6, true),
  -- Hot Wings
  (111, 9, 'Hot Wings 10 kpl + ranskalaiset', 'Hot Wings 10 pcs + french fries', '10 kpl tulisia kanansiipiä ranskalaisilla', '10 pcs spicy chicken wings with french fries', 12.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/chickenwings.png', false, false, false, 1, true),
  (112, 9, 'Hot Wings 16 kpl + ranskalaiset', 'Hot Wings 16 pcs + french fries', '16 kpl tulisia kanansiipiä ranskalaisilla', '16 pcs spicy chicken wings with french fries', 15.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/chickenwings.png', false, false, false, 2, true),
  (113, 9, 'Hot Wings 20 kpl + ranskalaiset', 'Hot Wings 20 pcs + french fries', '20 kpl tulisia kanansiipiä ranskalaisilla', '20 pcs spicy chicken wings with french fries', 18.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/chickenwings.png', false, false, false, 3, true),
  (114, 9, 'Hot Wings 25 kpl + ranskalaiset', 'Hot Wings 25 pcs + french fries', '25 kpl tulisia kanansiipiä ranskalaisilla', '25 pcs spicy chicken wings with french fries', 22.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/chickenwings.png', false, false, false, 4, true),
  (115, 9, 'Hot Wings 30 kpl + ranskalaiset', 'Hot Wings 30 pcs + french fries', '30 kpl tulisia kanansiipiä ranskalaisilla', '30 pcs spicy chicken wings with french fries', 27.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/chickenwings.png', false, false, false, 5, true),
  -- Burgers
  (116, 10, 'Cheese burger', 'Cheese burger', '120 g pihvi, cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g patty, cheddar cheese. Meal includes 0.33 l soda and french fries', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger1.png', false, false, false, 1, true),
  (117, 10, 'Kebab burger', 'Kebab burger', 'Kebabliha, cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', 'Kebab meat, cheddar cheese. Meal includes 0.33 l soda and french fries', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger2.png', false, false, false, 2, true),
  (118, 10, 'Kana burger', 'Chicken burger', '120 g kanapihvi, cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g chicken patty, cheddar cheese. Meal includes 0.33 l soda and french fries', 11.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger3.png', false, false, false, 3, true),
  (119, 10, 'Double burger', 'Double burger', '2 x 120 g pihvi, cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '2 x 120 g patty, cheddar cheese. Meal includes 0.33 l soda and french fries', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger4.png', false, false, false, 4, true),
  (120, 10, 'Kananmuna burger', 'Egg burger', '120 g pihvi, kananmuna. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g patty, egg. Meal includes 0.33 l soda and french fries', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger5.png', false, false, false, 5, true),
  (121, 10, 'BBQ pekoni burger', 'BBQ bacon burger', '120 g pihvi, pekoni, cheddarjuusto, BBQ-kastike. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g patty, bacon, cheddar cheese, BBQ sauce. Meal includes 0.33 l soda and french fries', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger6.png', false, false, false, 6, true),
  (122, 10, 'Aura burger', 'Blue cheese burger', '120 g pihvi, aurajuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g patty, blue cheese. Meal includes 0.33 l soda and french fries', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger7.png', false, false, false, 7, true),
  (123, 10, 'Chili burger', 'Chili burger', '120 g pihvi, jalapeno, chili kastike, cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '120 g patty, jalapeño, chili sauce, cheddar cheese. Meal includes 0.33 l soda and french fries', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger8.png', false, false, false, 8, true),
  (124, 10, 'XXL burger', 'XXL burger', '3 x 120 g pihvi, 2 x cheddarjuusto. Ateriaan kuuluu 0,33 l limu ja ranskalaiset', '3 x 120 g patty, 2 x cheddar cheese. Meal includes 0.33 l soda and french fries', 15.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/burger9.png', false, false, false, 9, true),
  -- Salads
  (125, 11, 'Tonnikala Salaatti', 'Tuna Salad', 'Tonnikala, ananas, sitruuna, paprika. Sisältyy: salaatti, tomaatti, kurkku, leipä, salaattikastike', 'Tuna, pineapple, lemon, bell pepper. Includes: salad, tomato, cucumber, bread, salad dressing', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/salad1.png', false, false, false, 1, true),
  (126, 11, 'Katkarapu Salaatti', 'Shrimp Salad', 'Katkarapu, ananas, sitruuna. Sisältyy: salaatti, tomaatti, kurkku, leipä, salaattikastike', 'Shrimp, pineapple, lemon. Includes: salad, tomato, cucumber, bread, salad dressing', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/salad2.png', false, false, false, 2, true),
  (127, 11, 'Kana Salaatti', 'Chicken Salad', 'Kana, ananas, paprika, currykastike, sitruuna. Sisältyy: salaatti, tomaatti, kurkku, leipä, salaattikastike', 'Chicken, pineapple, bell pepper, curry sauce, lemon. Includes: salad, tomato, cucumber, bread, salad dressing', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/salad3.png', false, false, false, 3, true),
  (128, 11, 'Kreikkalainen Salaatti', 'Greek Salad', 'Salaattijuusto, sipuli, oliivi. Sisältyy: salaatti, tomaatti, kurkku, leipä, salaattikastike', 'Salad cheese, onion, olives. Includes: salad, tomato, cucumber, bread, salad dressing', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/salad4.png', false, false, false, 4, true),
  (129, 11, 'Kebab Salaatti', 'Kebab Salad', 'Kebabliha, salaattijuusto, sipuli, oliivi. Sisältyy: salaatti, tomaatti, kurkku, leipä, salaattikastike', 'Kebab meat, salad cheese, onion, olives. Includes: salad, tomato, cucumber, bread, salad dressing', 12.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/salad5.png', false, false, false, 5, true),
  -- Kids menu
  (130, 12, 'Isot ranskalaiset', 'Large french fries', 'Isot ranskalaiset perunat', 'Large french fries', 4.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kid1.png', false, false, false, 1, true),
  (131, 12, 'Pizza kahdella täytteellä', 'Pizza with two toppings', 'Pieni pizza kahdella täytteellä', 'Small pizza with two toppings', 6.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kid2.png', false, false, false, 2, true),
  (132, 12, 'Lasten kebab ranskalaiset', 'Kids kebab with fries', 'Pieni kebab-annos ranskalaisilla', 'Small kebab portion with fries', 6.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kid3.png', false, false, false, 3, true),
  (133, 12, '5 kpl nugetit + ranskalaiset', '5 pcs nuggets + fries', '5 kpl kananugetit ranskalaisilla', '5 pcs chicken nuggets with fries', 6.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kid4.png', false, false, false, 4, true),
  (134, 12, '5 kpl mozzarellatikut + ranskalaiset', '5 pcs mozzarella sticks + fries', '5 kpl mozzarellatikkuja ranskalaisilla', '5 pcs mozzarella sticks with fries', 6.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/kid5.png', false, false, false, 5, true),
  -- Drinks
  (135, 13, 'Coca Cola 0,33L', 'Coca Cola 0.33L', 'Coca Cola 0,33L', 'Coca Cola 0.33L', 2.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6415600550390.jpg', false, false, false, 1, true),
  (136, 13, 'Coca Cola 0,5L', 'Coca Cola 0.5L', 'Coca Cola 0,5L', 'Coca Cola 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6415600550390.jpg', false, false, false, 2, true),
  (137, 13, 'Coca Cola Zero 0,33L', 'Coca Cola Zero 0.33L', 'Coca Cola Zero 0,33L', 'Coca Cola Zero 0.33L', 2.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/napitok_coca_cola_zero_bez_sakhara_1_l-1.png', false, false, false, 3, true),
  (138, 13, 'Coca Cola Zero 0,5L', 'Coca Cola Zero 0.5L', 'Coca Cola Zero 0,5L', 'Coca Cola Zero 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/napitok_coca_cola_zero_bez_sakhara_1_l-1.png', false, false, false, 4, true),
  (139, 13, 'Fanta 0,33L', 'Fanta 0.33L', 'Fanta appelsiini 0,33L', 'Fanta orange 0.33L', 2.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6415600549493.png', false, false, false, 5, true),
  (140, 13, 'Fanta 0,5L', 'Fanta 0.5L', 'Fanta appelsiini 0,5L', 'Fanta orange 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6415600549493.png', false, false, false, 6, true),
  (141, 13, 'Fanta (vihreä sokeriton) 0,5L', 'Fanta (green sugar-free) 0.5L', 'Fanta vihreä sokeriton 0,5L', 'Fanta green sugar-free 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/515Wx515H-null.jpeg', false, false, false, 7, true),
  (142, 13, 'Fanta light 1,5L', 'Fanta light 1.5L', 'Fanta light sokeriton 1,5L', 'Fanta light sugar-free 1.5L', 5.00, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/515Wx515H-null.jpeg', false, false, false, 8, true),
  (143, 13, 'Bonaqua 0,5L', 'Bonaqua 0.5L', 'Kivennäisvesi kuplaton 0,5L', 'Still mineral water 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/BonaquaStill05Lkuplaton_57095431_379de08fd79f_1.webp', false, false, false, 9, true),
  (144, 13, 'Bonaqua Vichy 0,5L', 'Bonaqua Vichy 0.5L', 'Kivennäisvesi korkeahiilihappoinen 0,5L', 'High carbonated mineral water 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/641560054618878.webp', false, false, false, 10, true),
  (145, 13, 'Smurffit päärynä 0,5L', 'Smurffit pear 0.5L', 'Smurffit päärynäjuoma 0,5L', 'Smurffit pear drink 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/6415600503068.jpeg', false, false, false, 11, true),
  (146, 13, 'Muumi Metsämansikka 0,5L', 'Moomin Wild Strawberry 0.5L', 'Muumi Metsämansikkajuoma 0,5L', 'Moomin Wild Strawberry drink 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/67ec8ade960d4e124d1311f1.jpg', false, false, false, 12, true),
  (147, 13, 'Sprite lime 0,5L', 'Sprite lime 0.5L', 'Sprite lime 0,5L', 'Sprite lime 0.5L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/7sSq84hwa_SBj9pMjn-3ry.jpg', false, false, false, 13, true),
  (148, 13, 'Crisp Tumma Lager 0,33L', 'Crisp Dark Lager 0.33L', 'Crisp Tumma Lager alkoholiton 0,33L', 'Crisp Dark Lager alcohol-free 0.33L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/dd51bdb6-336e-56b6-bba5-72b95edf42a9.webp', false, false, false, 14, true),
  (149, 13, 'Battery Energy Drink 0,33L', 'Battery Energy Drink 0.33L', 'Battery energiajuoma 0,33L', 'Battery energy drink 0.33L', 3.50, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/2hKss4sG4s29Ms3E84nA50.jpg', false, false, false, 15, true),
  (150, 13, 'Trip mehu 0,2L', 'Trip juice 0.2L', 'Trip hedelmämehu 0,2L', 'Trip fruit juice 0.2L', 2.20, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/67f64a50252f2f3f4d3861b8.webp', false, false, false, 16, true),
  (151, 13, 'Maito 1L', 'Milk 1L', 'Maito 1L', 'Milk 1L', 2.90, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/MaitoRASVATONMAITOUHT1LVALIO_129322_d2a59134363fe5ab0f9854c8b6e3a360_2.jpg', false, false, false, 17, true),
  (152, 13, 'Maito 0,2L', 'Milk 0.2L', 'Maito 0,2L', 'Milk 0.2L', 2.20, 'https://bgthrhrwbxdcmwracvcj.supabase.co/storage/v1/object/public/restaurant-images/menu-items/MaitoRASVATONMAITOUHT1LVALIO_129322_d2a59134363fe5ab0f9854c8b6e3a360_2.jpg', false, false, false, 18, true)
ON CONFLICT (id) DO NOTHING;

-- Insert Tirvan Kahvila restaurant configuration
INSERT INTO restaurant_config (
  name,
  name_en,
  tagline,
  tagline_en,
  description,
  description_en,
  phone,
  email,
  address,
  social_media,
  hours,
  services,
  delivery_config,
  theme,
  logo,
  about,
  hero,
  is_active
) VALUES (
  'Tirvan Kahvila',
  'Tirvan Kahvila',
  'Herkullisia ruokia Utissa',
  'Delicious food in Utti',
  'Tirvan Kahvilassa tarjoamme herkullisia pizzoja, kebabeja ja muita ruokia.',
  'At Tirvan Kahvila we offer delicious pizzas, kebabs and other food.',
  '+358413152619',
  'info@tirvankahvila.fi',
  '{
    "street": "Pasintie 2",
    "postalCode": "45410",
    "city": "Utti",
    "country": "Finland"
  }',
  '{
    "facebook": "https://www.facebook.com/tirvankahvila"
  }',
  '{
    "general": {
      "monday": {"open": "11:00", "close": "22:00", "closed": false},
      "tuesday": {"open": "11:00", "close": "22:00", "closed": false},
      "wednesday": {"open": "11:00", "close": "22:00", "closed": false},
      "thursday": {"open": "11:00", "close": "22:00", "closed": false},
      "friday": {"open": "11:00", "close": "23:00", "closed": false},
      "saturday": {"open": "11:00", "close": "23:00", "closed": false},
      "sunday": {"open": "12:00", "close": "22:00", "closed": false}
    },
    "pickup": {
      "monday": {"open": "11:00", "close": "22:00", "closed": false},
      "tuesday": {"open": "11:00", "close": "22:00", "closed": false},
      "wednesday": {"open": "11:00", "close": "22:00", "closed": false},
      "thursday": {"open": "11:00", "close": "22:00", "closed": false},
      "friday": {"open": "11:00", "close": "23:00", "closed": false},
      "saturday": {"open": "11:00", "close": "23:00", "closed": false},
      "sunday": {"open": "12:00", "close": "22:00", "closed": false}
    },
    "delivery": {
      "monday": {"open": "11:00", "close": "21:30", "closed": false},
      "tuesday": {"open": "11:00", "close": "21:30", "closed": false},
      "wednesday": {"open": "11:00", "close": "21:30", "closed": false},
      "thursday": {"open": "11:00", "close": "21:30", "closed": false},
      "friday": {"open": "11:00", "close": "22:30", "closed": false},
      "saturday": {"open": "11:00", "close": "22:30", "closed": false},
      "sunday": {"open": "12:00", "close": "21:30", "closed": false}
    }
  }',
  '{
    "hasLunchBuffet": false,
    "hasDelivery": true,
    "hasPickup": true,
    "hasDineIn": true,
    "lunchBuffetHours": null
  }',
  '{
    "zones": [
      {"maxDistance": 4, "fee": 0.00},
      {"maxDistance": 5, "fee": 4.00},
      {"maxDistance": 8, "fee": 7.00},
      {"maxDistance": 10, "fee": 10.00}
    ],
    "location": {
      "lat": 60.8912,
      "lng": 26.9567
    }
  }',
  '{
    "primary": "#16A34A",
    "secondary": "#DC2626",
    "accent": "#FFFFFF",
    "success": "#16a34a",
    "warning": "#ea580c",
    "error": "#dc2626",
    "background": "#ffffff",
    "foreground": "#1f2937",
    "light": {
      "background": "hsl(0, 0%, 100%)",
      "foreground": "hsl(222.2, 84%, 4.9%)",
      "card": "hsl(0, 0%, 100%)",
      "cardForeground": "hsl(222.2, 84%, 4.9%)",
      "popover": "hsl(0, 0%, 100%)",
      "popoverForeground": "hsl(222.2, 84%, 4.9%)",
      "primary": "#16A34A",
      "primaryForeground": "hsl(0, 0%, 98%)",
      "secondary": "hsl(210, 40%, 96%)",
      "secondaryForeground": "hsl(222.2, 84%, 4.9%)",
      "muted": "hsl(210, 40%, 96%)",
      "mutedForeground": "hsl(215.4, 16.3%, 46.9%)",
      "accent": "#DC2626",
      "accentForeground": "hsl(0, 0%, 98%)",
      "destructive": "hsl(0, 84.2%, 60.2%)",
      "destructiveForeground": "hsl(0, 0%, 98%)",
      "border": "hsl(214.3, 31.8%, 91.4%)",
      "input": "hsl(214.3, 31.8%, 91.4%)",
      "ring": "#16A34A"
    },
    "dark": {
      "background": "hsl(20, 14.3%, 4.1%)",
      "foreground": "hsl(0, 0%, 98%)",
      "card": "hsl(20, 14.3%, 4.1%)",
      "cardForeground": "hsl(0, 0%, 98%)",
      "popover": "hsl(20, 14.3%, 4.1%)",
      "popoverForeground": "hsl(0, 0%, 98%)",
      "primary": "#16A34A",
      "primaryForeground": "hsl(0, 0%, 98%)",
      "secondary": "hsl(12, 6.5%, 15.1%)",
      "secondaryForeground": "hsl(0, 0%, 98%)",
      "muted": "hsl(12, 6.5%, 15.1%)",
      "mutedForeground": "hsl(240, 5%, 64.9%)",
      "accent": "hsl(12, 6.5%, 15.1%)",
      "accentForeground": "hsl(0, 0%, 98%)",
      "destructive": "hsl(0, 62.8%, 30.6%)",
      "destructiveForeground": "hsl(0, 0%, 98%)",
      "border": "hsl(12, 6.5%, 15.1%)",
      "input": "hsl(12, 6.5%, 15.1%)",
      "ring": "hsl(240, 4.9%, 83.9%)"
    }
  }',
  '{
    "icon": "Coffee",
    "imageUrl": null,
    "showText": true,
    "backgroundColor": "#16A34A"
  }',
  '{
    "story": "Tirvan Kahvilassa tarjoamme herkullisia pizzoja, kebabeja ja muita ruokia ystävällisessä ilmapiirissä.",
    "storyEn": "At Tirvan Kahvila we offer delicious pizzas, kebabs and other food in a friendly atmosphere.",
    "mission": "Tarjoamme Utissa parhaita pizzoja, kebabeja ja muita herkullisia ruokia ystävällisessä palvelussa.",
    "missionEn": "We offer the best pizzas, kebabs and other delicious food in Utti with friendly service.",
    "specialties": [
      {
        "title": "Pizzat",
        "titleEn": "Pizzas",
        "description": "Tuoreista aineksista valmistettuja pizzoja",
        "descriptionEn": "Pizzas made from fresh ingredients",
        "icon": "Pizza"
      },
      {
        "title": "Kebabit",
        "titleEn": "Kebabs",
        "description": "Meheviä ja maukkaita kebabeja",
        "descriptionEn": "Juicy and tasty kebabs",
        "icon": "UtensilsCrossed"
      },
      {
        "title": "Hampurilaiset",
        "titleEn": "Burgers",
        "description": "Täyteläiset hampurilaiset",
        "descriptionEn": "Hearty burgers",
        "icon": "ChefHat"
      },
      {
        "title": "Kahvilatarjonta",
        "titleEn": "Café Menu",
        "description": "Virvokkeita ja leivonnaisia",
        "descriptionEn": "Refreshments and pastries",
        "icon": "Coffee"
      }
    ],
    "experience": "Herkullista ruokaa Utissa",
    "experienceEn": "Delicious food in Utti"
  }',
  '{
    "backgroundImage": "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
    "videoUrl": "https://videos.pexels.com/video-files/3752507/3752507-hd_1920_1080_24fps.mp4",
    "features": [
      {"title": "Premium pizzat", "titleEn": "Premium pizzas", "color": "#DC2626"},
      {"title": "Nopea toimitus", "titleEn": "Fast delivery", "color": "#16A34A"},
      {"title": "Aitoa makua", "titleEn": "Authentic taste", "color": "#FFFFFF"}
    ]
  }',
  true
) ON CONFLICT DO NOTHING;

-- Update sequences to continue from the highest ID
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM categories), false);
SELECT setval('menu_items_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM menu_items), false);
SELECT setval('toppings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM toppings), false);
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM users), false);

-- Enable RLS and create policies (simplified version - see template for full policies)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_topping_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounas_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounas_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_config ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SEQUENCE public.categories_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.menu_items_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.orders_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.order_items_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.restaurant_settings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.toppings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.users_id_seq TO authenticated;

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.menu_items TO authenticated;
GRANT SELECT ON public.toppings TO authenticated;
GRANT SELECT ON public.topping_groups TO authenticated;
GRANT SELECT ON public.topping_group_items TO authenticated;
GRANT SELECT ON public.category_topping_groups TO authenticated;
GRANT SELECT ON public.branches TO authenticated;
GRANT SELECT ON public.promotions TO authenticated;
GRANT SELECT ON public.locations TO authenticated;
GRANT SELECT ON public.lounas_settings TO authenticated;
GRANT SELECT ON public.lounas_menus TO authenticated;
GRANT SELECT ON public.restaurant_settings TO authenticated;
GRANT SELECT ON restaurant_config TO authenticated;

GRANT INSERT, SELECT, UPDATE ON public.orders TO authenticated;
GRANT INSERT, SELECT ON public.order_items TO authenticated;
GRANT INSERT, SELECT ON public.order_item_toppings TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT ALL ON public.session TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON restaurant_config TO service_role;
