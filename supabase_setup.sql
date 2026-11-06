-- ========================================================
-- PAISABUDDY FULL PRODUCTION DATABASE SEED (14 STARTUPS + 12 WHALES)
-- Copy & Run in Supabase SQL Editor anytime
-- ========================================================

-- Allow Public Write / Upsert for automated sync scripts
DROP POLICY IF EXISTS "Allow public write access for whales" ON public.whales;
CREATE POLICY "Allow public write access for whales" ON public.whales FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public write access for startups" ON public.startups;
CREATE POLICY "Allow public write access for startups" ON public.startups FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public write access for alerts" ON public.live_alerts;
CREATE POLICY "Allow public write access for alerts" ON public.live_alerts FOR ALL USING (true);

-- Insert All 14 Top Indian Startups
INSERT INTO public.startups (id, name, category, city, stage, is_unicorn, valuation, total_raised, min_investment, invest_status, raised_so_far, target_amount, progress_percent, days_left, investor_count, icon_bg, icon_emoji, investors, growth_metric)
VALUES
  ('1', 'Zepto', 'Quick Commerce • 10-Min Delivery', 'Mumbai', 'Series G (Pre-IPO)', true, '$5.0 Billion', '$1.4 Billion', '₹10,000', 'Open for Syndicates', '₹12.4 Cr', '₹15.0 Cr', 82, 8, 1420, '#10B981', '🥬', '["StepStone", "Nexus VP", "Glade Brook", "Goodwater Capital"]'::jsonb, '220% YoY Revenue Growth'),
  ('2', 'Krutrim AI', 'Full-Stack GenAI & Indic LLMs', 'Bengaluru', 'Series A', true, '$1.0 Billion', '$50 Million', '₹25,000', 'Accredited Round', '₹8.0 Cr', '₹10.0 Cr', 80, 14, 890, '#3B82F6', '🤖', '["Matrix Partners India", "Bhavish Aggarwal", "Temasek Angels"]'::jsonb, '1st AI Unicorn of India'),
  ('3', 'PhysicsWallah', 'EdTech, Skilling & Test Prep', 'Noida', 'Series B (Profitable)', true, '$2.8 Billion', '$210 Million', '₹10,000', 'Pre-IPO Secondary', '₹19.5 Cr', '₹20.0 Cr', 97, 3, 2840, '#6366F1', '📚', '["Hornbill Capital", "Lightspeed Ventures", "GSV Ventures"]'::jsonb, '9.5 Million+ active paid learners'),
  ('4', 'Lenskart', 'Omnichannel Eyewear & Tech', 'Gurugram', 'Pre-IPO Late Stage', true, '$5.6 Billion', '$1.1 Billion', '₹20,000', 'Secondary Syndicate', '₹28.4 Cr', '₹30.0 Cr', 94, 5, 3120, '#0F766E', '👓', '["Temasek Holdings", "Fidelity", "SoftBank Vision Fund", "KKR"]'::jsonb, '2,500+ stores across India & SE Asia'),
  ('5', 'Ather Energy', 'Smart Electric Scooters & Battery', 'Bengaluru', 'Pre-IPO Round', true, '$1.3 Billion', '$450 Million', '₹15,000', 'Pre-IPO Syndicate Open', '₹14.2 Cr', '₹15.0 Cr', 94, 6, 1950, '#F59E0B', '🛵', '["Hero MotoCorp", "NIIF India", "GIC Singapore", "Tiger Global"]'::jsonb, 'Over 2,00,000 EVs delivered'),
  ('6', 'Sarvam AI', 'Sovereign Indic Voice & GenAI', 'Bengaluru', 'Series A', false, '₹1,200 Crore', '₹340 Crore ($41M)', '₹10,000', 'Early DeepTech Round', '₹6.8 Cr', '₹8.0 Cr', 85, 9, 740, '#8B5CF6', '🧠', '["Lightspeed India", "Peak XV Partners", "Khosla Ventures"]'::jsonb, 'OpenHathi Indian Language Model'),
  ('7', 'BluSmart EV', 'All-Electric Ride Hailing', 'Gurugram', 'Growth Round', false, '₹2,600 Crore', '₹1,100 Crore', '₹15,000', 'Asset Lease / Equity', '₹18.2 Cr', '₹20.0 Cr', 91, 4, 2150, '#06B6D4', '⚡', '["BP Ventures", "ResponsAbility", "Mayfield Fund"]'::jsonb, '7,500+ Electric Cabs in NCR/BLR'),
  ('8', 'MediBuddy+', 'HealthTech & Digital Diagnostics', 'Hyderabad', 'Series B Extension', false, '₹420 Crore', '₹95 Crore', '₹5,000', 'Community Round Open', '₹3.4 Cr', '₹5.0 Cr', 68, 11, 530, '#EC4899', '🏥', '["Quadria Capital", "Lightrock India", "AngelList Syndicate"]'::jsonb, '35,000+ daily telehealth consults'),
  ('9', 'Country Delight', 'Farm-to-Door Pure Milk & Groceries', 'Gurugram', 'Series E', false, '₹2,400 Crore', '₹1,400 Crore', '₹10,000', 'Growth Syndicate Open', '₹11.2 Cr', '₹12.0 Cr', 93, 7, 1680, '#16A34A', '🥛', '["Temasek", "Venturi Partners", "Elevation Capital"]'::jsonb, '1.5 Million+ active households served'),
  ('10', 'Mokobara', 'Premium D2C Travel & Luggage', 'Bengaluru', 'Series B', false, '₹750 Crore', '₹130 Crore', '₹5,000', 'Community Equity Round', '₹4.8 Cr', '₹5.0 Cr', 96, 2, 920, '#D97706', '🧳', '["Peak XV Partners", "Sauce.vc", "Saama Capital"]'::jsonb, '400% YoY Revenue Growth'),
  ('11', 'Ultraviolette', 'High-Performance Electric Motorcycles', 'Bengaluru', 'Series D', false, '₹1,800 Crore', '₹500 Crore', '₹15,000', 'Expansion Round', '₹9.4 Cr', '₹10.0 Cr', 94, 5, 1140, '#DC2626', '🏍️', '["TVS Motor Company", "Zoho Corporation", "Qualcomm Ventures"]'::jsonb, 'Exporting F77 Superbikes to Europe'),
  ('12', 'AgriNext Drones', 'Agritech & Precision Spraying', 'Pune', 'Seed Round', false, '₹45 Crore', '₹4.5 Crore', '₹5,000', 'Early Backer Special', '₹2.9 Cr', '₹3.0 Cr', 96, 2, 610, '#84CC16', '🌾', '["Omnivore Partners", "IIT Bombay SINE", "Marico Innovation"]'::jsonb, 'Serving 45,000+ farmers across 3 states'),
  ('13', 'Sugar Cosmetics', 'Omnichannel D2C Beauty & Makeup', 'Mumbai', 'Series D (Pre-IPO)', false, '₹3,200 Crore', '₹700 Crore', '₹10,000', 'Late Stage Syndicate', '₹14.8 Cr', '₹15.0 Cr', 98, 1, 2200, '#BE185D', '💄', '["L Catterton", "Elevation Capital", "A91 Partners", "Vineeta Singh"]'::jsonb, 'Available in 45,000+ retail counters'),
  ('14', 'InCred Finance', 'Tech-Driven Retail & SME Lending', 'Mumbai', 'Growth Round', true, '$1.05 Billion', '$220 Million', '₹25,000', 'Institutional Syndicate', '₹18.0 Cr', '₹20.0 Cr', 90, 12, 1450, '#2563EB', '💳', '["KKR", "Manipal Group", "Oaks Asset Management"]'::jsonb, 'Loan Book over ₹8,000+ Crore')
ON CONFLICT (id) DO UPDATE SET
  valuation = EXCLUDED.valuation,
  total_raised = EXCLUDED.total_raised,
  raised_so_far = EXCLUDED.raised_so_far,
  progress_percent = EXCLUDED.progress_percent,
  days_left = EXCLUDED.days_left,
  investor_count = EXCLUDED.investor_count,
  updated_at = NOW();
