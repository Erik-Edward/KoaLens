-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ingredients TEXT[] DEFAULT '{}',
  is_vegan BOOLEAN DEFAULT false,
  confidence NUMERIC DEFAULT 0,
  non_vegan_ingredients TEXT[] DEFAULT '{}',
  all_ingredients TEXT[] DEFAULT '{}',
  reasoning TEXT DEFAULT '',
  watched_ingredients_found JSONB DEFAULT '[]',
  is_favorite BOOLEAN DEFAULT false,
  is_saved_to_history BOOLEAN DEFAULT true,
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT DEFAULT 'camera',
  image_uri TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  total_analyses INT DEFAULT 0,
  monthly_analyses INT DEFAULT 0,
  weekly_analyses INT DEFAULT 0,
  daily_analyses INT DEFAULT 0,
  last_analysis_date TIMESTAMP WITH TIME ZONE,
  month_reset_date DATE,
  week_reset_date DATE,
  day_reset_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can select their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can select their own analytics"
  ON public.user_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON public.user_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON public.user_analytics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 