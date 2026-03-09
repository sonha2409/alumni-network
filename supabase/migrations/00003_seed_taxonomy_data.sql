-- Migration: Seed industry taxonomy data
-- ~20 industries with 5-15 specializations each.
-- Uses ON CONFLICT (slug) DO NOTHING for idempotency.

-- =============================================================================
-- Industries
-- =============================================================================
insert into public.industries (name, slug, sort_order) values
  ('Technology',                    'technology',                     1),
  ('Finance & Banking',             'finance-banking',                2),
  ('Healthcare & Medicine',         'healthcare-medicine',            3),
  ('Education',                     'education',                      4),
  ('Law',                           'law',                            5),
  ('Engineering',                   'engineering',                    6),
  ('Arts & Entertainment',          'arts-entertainment',             7),
  ('Media & Communications',        'media-communications',           8),
  ('Government & Public Policy',    'government-public-policy',       9),
  ('Non-Profit',                    'non-profit',                    10),
  ('Consulting',                    'consulting',                    11),
  ('Real Estate',                   'real-estate',                   12),
  ('Retail & E-commerce',           'retail-ecommerce',              13),
  ('Manufacturing',                 'manufacturing',                 14),
  ('Energy & Environment',          'energy-environment',            15),
  ('Agriculture',                   'agriculture',                   16),
  ('Transportation & Logistics',    'transportation-logistics',      17),
  ('Hospitality & Tourism',         'hospitality-tourism',           18),
  ('Sports & Fitness',              'sports-fitness',                19),
  ('Research & Academia',           'research-academia',             20)
on conflict (slug) do nothing;

-- =============================================================================
-- Specializations
-- Helper: use a CTE to look up industry IDs by slug for readability.
-- =============================================================================

-- Technology
with ind as (select id from public.industries where slug = 'technology')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Software Engineering',       'software-engineering',        1),
  ('Data Science & AI/ML',       'data-science-ai-ml',          2),
  ('Product Management',         'product-management',           3),
  ('Cybersecurity',              'cybersecurity',                4),
  ('DevOps & Infrastructure',    'devops-infrastructure',        5),
  ('UX/UI Design',               'ux-ui-design',                 6),
  ('Mobile Development',         'mobile-development',           7),
  ('Cloud Computing',            'cloud-computing',              8),
  ('Blockchain & Web3',          'blockchain-web3',              9),
  ('IT Management',              'it-management',               10)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Finance & Banking
with ind as (select id from public.industries where slug = 'finance-banking')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Investment Banking',         'investment-banking',            1),
  ('Venture Capital',            'venture-capital',               2),
  ('Financial Planning',         'financial-planning',            3),
  ('Accounting',                 'accounting',                    4),
  ('Fintech',                    'fintech',                       5),
  ('Insurance',                  'insurance',                     6),
  ('Private Equity',             'private-equity',                7),
  ('Risk Management',            'risk-management',               8),
  ('Wealth Management',          'wealth-management',             9)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Healthcare & Medicine
with ind as (select id from public.industries where slug = 'healthcare-medicine')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Clinical Medicine',          'clinical-medicine',             1),
  ('Nursing',                    'nursing',                       2),
  ('Public Health',              'public-health',                 3),
  ('Pharmaceuticals',            'pharmaceuticals',               4),
  ('Biotech',                    'biotech',                       5),
  ('Health Administration',      'health-administration',         6),
  ('Mental Health',              'mental-health',                 7),
  ('Medical Research',           'medical-research',              8),
  ('Dentistry',                  'dentistry',                     9)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Education
with ind as (select id from public.industries where slug = 'education')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('K-12 Teaching',              'k12-teaching',                  1),
  ('Higher Education',           'higher-education',              2),
  ('EdTech',                     'edtech',                        3),
  ('Curriculum Design',          'curriculum-design',             4),
  ('School Administration',      'school-administration',         5),
  ('Special Education',          'special-education',             6),
  ('Corporate Training',         'corporate-training',            7)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Law
with ind as (select id from public.industries where slug = 'law')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Corporate Law',              'corporate-law',                 1),
  ('Criminal Law',               'criminal-law',                  2),
  ('Intellectual Property',      'intellectual-property',         3),
  ('Family Law',                 'family-law',                    4),
  ('Immigration Law',            'immigration-law',               5),
  ('Environmental Law',          'environmental-law',             6),
  ('Tax Law',                    'tax-law',                       7),
  ('Litigation',                 'litigation',                    8)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Engineering
with ind as (select id from public.industries where slug = 'engineering')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Civil Engineering',          'civil-engineering',             1),
  ('Mechanical Engineering',     'mechanical-engineering',        2),
  ('Electrical Engineering',     'electrical-engineering',        3),
  ('Chemical Engineering',       'chemical-engineering',          4),
  ('Aerospace Engineering',      'aerospace-engineering',         5),
  ('Biomedical Engineering',     'biomedical-engineering',        6),
  ('Environmental Engineering',  'environmental-engineering',     7),
  ('Industrial Engineering',     'industrial-engineering',        8)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Arts & Entertainment
with ind as (select id from public.industries where slug = 'arts-entertainment')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Film & Television',          'film-television',               1),
  ('Music',                      'music',                         2),
  ('Visual Arts',                'visual-arts',                   3),
  ('Performing Arts',            'performing-arts',               4),
  ('Game Design',                'game-design',                   5),
  ('Animation',                  'animation',                     6),
  ('Photography',                'photography',                   7)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Media & Communications
with ind as (select id from public.industries where slug = 'media-communications')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Journalism',                 'journalism',                    1),
  ('Public Relations',           'public-relations',              2),
  ('Marketing',                  'marketing',                     3),
  ('Advertising',                'advertising',                   4),
  ('Content Strategy',           'content-strategy',              5),
  ('Social Media',               'social-media',                  6),
  ('Broadcasting',               'broadcasting',                  7)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Government & Public Policy
with ind as (select id from public.industries where slug = 'government-public-policy')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Public Administration',      'public-administration',         1),
  ('Policy Analysis',            'policy-analysis',               2),
  ('Diplomacy & Foreign Affairs','diplomacy-foreign-affairs',     3),
  ('Urban Planning',             'urban-planning',                4),
  ('Intelligence & Security',    'intelligence-security',         5),
  ('Legislative Affairs',        'legislative-affairs',           6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Non-Profit
with ind as (select id from public.industries where slug = 'non-profit')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Program Management',         'nonprofit-program-management',  1),
  ('Fundraising',                'fundraising',                   2),
  ('Social Work',                'social-work',                   3),
  ('Community Development',      'community-development',         4),
  ('Humanitarian Aid',           'humanitarian-aid',              5),
  ('Advocacy',                   'advocacy',                      6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Consulting
with ind as (select id from public.industries where slug = 'consulting')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Management Consulting',      'management-consulting',         1),
  ('Strategy Consulting',        'strategy-consulting',           2),
  ('IT Consulting',              'it-consulting',                 3),
  ('HR Consulting',              'hr-consulting',                 4),
  ('Financial Advisory',         'financial-advisory',            5),
  ('Operations Consulting',      'operations-consulting',         6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Real Estate
with ind as (select id from public.industries where slug = 'real-estate')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Commercial Real Estate',     'commercial-real-estate',        1),
  ('Residential Real Estate',    'residential-real-estate',       2),
  ('Property Management',        'property-management',           3),
  ('Real Estate Development',    'real-estate-development',       4),
  ('Real Estate Finance',        'real-estate-finance',           5)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Retail & E-commerce
with ind as (select id from public.industries where slug = 'retail-ecommerce')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('E-commerce',                 'ecommerce',                     1),
  ('Retail Management',          'retail-management',             2),
  ('Supply Chain',               'supply-chain',                  3),
  ('Merchandising',              'merchandising',                 4),
  ('Brand Management',           'brand-management',              5)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Manufacturing
with ind as (select id from public.industries where slug = 'manufacturing')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Production Management',      'production-management',         1),
  ('Quality Assurance',          'quality-assurance',             2),
  ('Lean Manufacturing',         'lean-manufacturing',            3),
  ('Automation & Robotics',      'automation-robotics',           4),
  ('Process Engineering',        'process-engineering',           5)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Energy & Environment
with ind as (select id from public.industries where slug = 'energy-environment')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Renewable Energy',           'renewable-energy',              1),
  ('Oil & Gas',                  'oil-gas',                       2),
  ('Environmental Science',      'environmental-science',         3),
  ('Sustainability',             'sustainability',                4),
  ('Climate Policy',             'climate-policy',                5),
  ('Nuclear Energy',             'nuclear-energy',                6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Agriculture
with ind as (select id from public.industries where slug = 'agriculture')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Agribusiness',               'agribusiness',                  1),
  ('Food Science',               'food-science',                  2),
  ('Agricultural Technology',    'agricultural-technology',       3),
  ('Animal Science',             'animal-science',                4),
  ('Sustainable Farming',        'sustainable-farming',           5)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Transportation & Logistics
with ind as (select id from public.industries where slug = 'transportation-logistics')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Logistics Management',       'logistics-management',          1),
  ('Aviation',                   'aviation',                      2),
  ('Maritime',                   'maritime',                      3),
  ('Freight & Shipping',         'freight-shipping',              4),
  ('Urban Transit',              'urban-transit',                 5),
  ('Autonomous Vehicles',        'autonomous-vehicles',           6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Hospitality & Tourism
with ind as (select id from public.industries where slug = 'hospitality-tourism')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Hotel Management',           'hotel-management',              1),
  ('Restaurant Management',      'restaurant-management',         2),
  ('Event Planning',             'event-planning',                3),
  ('Tourism Management',         'tourism-management',            4),
  ('Travel Technology',          'travel-technology',             5)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Sports & Fitness
with ind as (select id from public.industries where slug = 'sports-fitness')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Sports Management',          'sports-management',             1),
  ('Athletic Training',          'athletic-training',             2),
  ('Sports Medicine',            'sports-medicine',               3),
  ('Fitness & Wellness',         'fitness-wellness',              4),
  ('Sports Marketing',           'sports-marketing',              5),
  ('Coaching',                   'coaching',                      6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;

-- Research & Academia
with ind as (select id from public.industries where slug = 'research-academia')
insert into public.specializations (industry_id, name, slug, sort_order)
select ind.id, v.name, v.slug, v.sort_order from ind, (values
  ('Natural Sciences',           'natural-sciences',              1),
  ('Social Sciences',            'social-sciences',               2),
  ('Humanities',                 'humanities',                    3),
  ('Mathematics & Statistics',   'mathematics-statistics',        4),
  ('Computer Science Research',  'computer-science-research',     5),
  ('Library & Information Science','library-information-science', 6)
) as v(name, slug, sort_order)
on conflict (slug) do nothing;
