-- Create testimonials table for customer reviews
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  location TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  testimonial TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  approved BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit testimonials
CREATE POLICY "Anyone can submit testimonials"
  ON public.testimonials
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only approved testimonials are publicly readable
CREATE POLICY "Public can view approved testimonials"
  ON public.testimonials
  FOR SELECT
  TO public
  USING (approved = TRUE);

-- Policy: Admins can view all testimonials (TODO: add admin role check)
CREATE POLICY "Admins can view all testimonials"
  ON public.testimonials
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can update testimonials
CREATE POLICY "Admins can update testimonials"
  ON public.testimonials
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(approved);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON public.testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON public.testimonials(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();
