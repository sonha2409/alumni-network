-- =============================================================================
-- Seed data for manual testing of alumni directory
-- Creates 15 test users with profiles, career entries, and availability tags
-- =============================================================================

-- Helper: Get industry/specialization IDs by name
-- We'll use subqueries inline

-- =============================================================================
-- 1. Insert auth.users (triggers auto-creation of public.users)
-- All passwords are "password123" hashed with bcrypt
-- =============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  is_super_admin
) VALUES
  -- User 1: Nguyen Van Anh
  ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'anh.nguyen@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 2: Tran Minh Duc
  ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'duc.tran@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 3: Le Thi Bao Ngoc
  ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ngoc.le@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 4: Pham Quoc Huy
  ('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'huy.pham@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 5: Vo Hoang Linh
  ('11111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'linh.vo@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 6: Dang Thanh Tam
  ('11111111-1111-1111-1111-111111111106', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tam.dang@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 7: Bui Kim Ngan
  ('11111111-1111-1111-1111-111111111107', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ngan.bui@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 8: Hoang Viet Khoa
  ('11111111-1111-1111-1111-111111111108', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'khoa.hoang@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 9: Ngo Phuong Mai
  ('11111111-1111-1111-1111-111111111109', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'mai.ngo@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 10: Do Quang Vinh
  ('11111111-1111-1111-1111-111111111110', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'vinh.do@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 11: Ly Bich Phuong
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phuong.ly@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 12: Truong Hai Nam
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'nam.truong@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 13: Cao Thuy Trang
  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'trang.cao@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 14: Luu Minh Khoi
  ('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'khoi.luu@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false),

  -- User 15: Dinh Ngoc Ha
  ('11111111-1111-1111-1111-111111111115', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ha.dinh@test.com',
   '$2a$10$PznUkzGHWCd1fR4XwJBzTe7UqJE3YXVKwGk3gUJUGCyDaKPjPHSRC',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', false)
ON CONFLICT (id) DO NOTHING;

-- Also insert identities for each user (required by Supabase Auth)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111101', '{"sub":"11111111-1111-1111-1111-111111111101","email":"anh.nguyen@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111102', '{"sub":"11111111-1111-1111-1111-111111111102","email":"duc.tran@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111103', '{"sub":"11111111-1111-1111-1111-111111111103","email":"ngoc.le@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111104', '{"sub":"11111111-1111-1111-1111-111111111104","email":"huy.pham@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111105', '{"sub":"11111111-1111-1111-1111-111111111105","email":"linh.vo@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111106', '11111111-1111-1111-1111-111111111106', '11111111-1111-1111-1111-111111111106', '{"sub":"11111111-1111-1111-1111-111111111106","email":"tam.dang@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111107', '11111111-1111-1111-1111-111111111107', '11111111-1111-1111-1111-111111111107', '{"sub":"11111111-1111-1111-1111-111111111107","email":"ngan.bui@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111108', '11111111-1111-1111-1111-111111111108', '11111111-1111-1111-1111-111111111108', '{"sub":"11111111-1111-1111-1111-111111111108","email":"khoa.hoang@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111109', '11111111-1111-1111-1111-111111111109', '{"sub":"11111111-1111-1111-1111-111111111109","email":"mai.ngo@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111110', '{"sub":"11111111-1111-1111-1111-111111111110","email":"vinh.do@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"phuong.ly@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111112', '{"sub":"11111111-1111-1111-1111-111111111112","email":"nam.truong@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111113', '{"sub":"11111111-1111-1111-1111-111111111113","email":"trang.cao@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111114', '{"sub":"11111111-1111-1111-1111-111111111114","email":"khoi.luu@test.com"}', 'email', now(), now(), now()),
  ('11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111115', '{"sub":"11111111-1111-1111-1111-111111111115","email":"ha.dinh@test.com"}', 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. Mark all seed users as verified
-- =============================================================================

UPDATE public.users
SET verification_status = 'verified'
WHERE id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111105',
  '11111111-1111-1111-1111-111111111106',
  '11111111-1111-1111-1111-111111111107',
  '11111111-1111-1111-1111-111111111108',
  '11111111-1111-1111-1111-111111111109',
  '11111111-1111-1111-1111-111111111110',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111112',
  '11111111-1111-1111-1111-111111111113',
  '11111111-1111-1111-1111-111111111114',
  '11111111-1111-1111-1111-111111111115'
);

-- =============================================================================
-- 3. Create profiles with diverse industries, locations, and graduation years
-- =============================================================================

-- PTNK school ID
-- a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

INSERT INTO public.profiles (
  id, user_id, full_name, bio, graduation_year,
  primary_industry_id, primary_specialization_id,
  country, state_province, city, school_id,
  profile_completeness, last_active_at
) VALUES
  -- 1. Nguyen Van Anh — Technology / Software Engineering — HCMC — 2015
  ('22222222-2222-2222-2222-222222222201',
   '11111111-1111-1111-1111-111111111101',
   'Nguyen Van Anh',
   'Full-stack developer passionate about building scalable web applications. Love mentoring junior devs.',
   2015,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   'Vietnam', 'Ho Chi Minh City', 'District 1',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 85, now() - interval '1 hour'),

  -- 2. Tran Minh Duc — Finance / Investment Banking — Singapore — 2012
  ('22222222-2222-2222-2222-222222222202',
   '11111111-1111-1111-1111-111111111102',
   'Tran Minh Duc',
   'Investment banker with 10+ years of experience in M&A across Southeast Asia.',
   2012,
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'investment-banking'),
   'Singapore', NULL, 'Singapore',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 90, now() - interval '3 hours'),

  -- 3. Le Thi Bao Ngoc — Healthcare / Clinical Medicine — USA — 2010
  ('22222222-2222-2222-2222-222222222203',
   '11111111-1111-1111-1111-111111111103',
   'Le Thi Bao Ngoc',
   'Physician at UCSF. Researching tropical diseases and global health equity.',
   2010,
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'clinical-medicine'),
   'United States', 'California', 'San Francisco',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75, now() - interval '1 day'),

  -- 4. Pham Quoc Huy — Technology / Data Science — Vietnam — 2018
  ('22222222-2222-2222-2222-222222222204',
   '11111111-1111-1111-1111-111111111104',
   'Pham Quoc Huy',
   'Data scientist working on NLP and recommendation systems. Open to collaborations.',
   2018,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'data-science-ai-ml'),
   'Vietnam', 'Ho Chi Minh City', 'Thu Duc',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, now() - interval '2 hours'),

  -- 5. Vo Hoang Linh — Education / Higher Education — Vietnam — 2008
  ('22222222-2222-2222-2222-222222222205',
   '11111111-1111-1111-1111-111111111105',
   'Vo Hoang Linh',
   'Professor of Mathematics at VNU-HCM. Published 30+ papers on algebraic topology.',
   2008,
   (SELECT id FROM industries WHERE slug = 'education'),
   (SELECT id FROM specializations WHERE slug = 'higher-education'),
   'Vietnam', 'Ho Chi Minh City', 'District 5',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 70, now() - interval '5 days'),

  -- 6. Dang Thanh Tam — Marketing / Digital Marketing — Japan — 2016
  ('22222222-2222-2222-2222-222222222206',
   '11111111-1111-1111-1111-111111111106',
   'Dang Thanh Tam',
   'Digital marketing lead at a Tokyo-based startup. Bridging Vietnamese and Japanese markets.',
   2016,
   (SELECT id FROM industries WHERE slug = 'media-communications'),
   (SELECT id FROM specializations WHERE slug = 'marketing'),
   'Japan', 'Tokyo', 'Shibuya',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65, now() - interval '12 hours'),

  -- 7. Bui Kim Ngan — Finance / Venture Capital — Vietnam — 2014
  ('22222222-2222-2222-2222-222222222207',
   '11111111-1111-1111-1111-111111111107',
   'Bui Kim Ngan',
   'VC associate focused on early-stage tech startups in Vietnam.',
   2014,
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'venture-capital'),
   'Vietnam', 'Ho Chi Minh City', 'District 3',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, now() - interval '6 hours'),

  -- 8. Hoang Viet Khoa — Technology / Cybersecurity — Australia — 2013
  ('22222222-2222-2222-2222-222222222208',
   '11111111-1111-1111-1111-111111111108',
   'Hoang Viet Khoa',
   'Cybersecurity consultant. Helping enterprises in APAC region secure their infrastructure.',
   2013,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'cybersecurity'),
   'Australia', 'New South Wales', 'Sydney',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 70, now() - interval '2 days'),

  -- 9. Ngo Phuong Mai — Arts / Graphic Design — Vietnam — 2020
  ('22222222-2222-2222-2222-222222222209',
   '11111111-1111-1111-1111-111111111109',
   'Ngo Phuong Mai',
   'Freelance designer creating brand identities for startups. Also teaching design workshops.',
   2020,
   (SELECT id FROM industries WHERE slug = 'arts-entertainment'),
   (SELECT id FROM specializations WHERE slug = 'visual-arts'),
   'Vietnam', 'Ho Chi Minh City', 'Binh Thanh',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 60, now() - interval '4 hours'),

  -- 10. Do Quang Vinh — Engineering / Civil Engineering — Germany — 2011
  ('22222222-2222-2222-2222-222222222210',
   '11111111-1111-1111-1111-111111111110',
   'Do Quang Vinh',
   'Structural engineer working on sustainable building projects in Europe.',
   2011,
   (SELECT id FROM industries WHERE slug = 'engineering'),
   (SELECT id FROM specializations WHERE slug = 'civil-engineering'),
   'Germany', 'Bavaria', 'Munich',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75, now() - interval '3 days'),

  -- 11. Ly Bich Phuong — Healthcare / Nursing — Canada — 2017
  ('22222222-2222-2222-2222-222222222211',
   '11111111-1111-1111-1111-111111111111',
   'Ly Bich Phuong',
   'Registered nurse in Toronto. Advocating for Vietnamese community health resources.',
   2017,
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'nursing'),
   'Canada', 'Ontario', 'Toronto',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65, now() - interval '8 hours'),

  -- 12. Truong Hai Nam — Technology / Product Management — USA — 2015
  ('22222222-2222-2222-2222-222222222212',
   '11111111-1111-1111-1111-111111111112',
   'Truong Hai Nam',
   'Senior PM at a big tech company. Shipping products used by millions.',
   2015,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'product-management'),
   'United States', 'Washington', 'Seattle',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 90, now() - interval '30 minutes'),

  -- 13. Cao Thuy Trang — Law / Corporate Law — Vietnam — 2013
  ('22222222-2222-2222-2222-222222222213',
   '11111111-1111-1111-1111-111111111113',
   'Cao Thuy Trang',
   'Corporate lawyer specializing in foreign investment and M&A transactions in Vietnam.',
   2013,
   (SELECT id FROM industries WHERE slug = 'law'),
   (SELECT id FROM specializations WHERE slug = 'corporate-law'),
   'Vietnam', 'Ho Chi Minh City', 'District 1',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, now() - interval '1 day'),

  -- 14. Luu Minh Khoi — Research & Academia / Natural Sciences — South Korea — 2019
  ('22222222-2222-2222-2222-222222222214',
   '11111111-1111-1111-1111-111111111114',
   'Luu Minh Khoi',
   'PhD candidate in biotechnology at KAIST. Researching CRISPR applications.',
   2019,
   (SELECT id FROM industries WHERE slug = 'research-academia'),
   (SELECT id FROM specializations WHERE slug = 'natural-sciences'),
   'South Korea', 'Daejeon', 'Yuseong',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 55, now() - interval '10 hours'),

  -- 15. Dinh Ngoc Ha — Consulting / Management Consulting — UK — 2014
  ('22222222-2222-2222-2222-222222222215',
   '11111111-1111-1111-1111-111111111115',
   'Dinh Ngoc Ha',
   'Management consultant at a top-3 firm. Focused on digital transformation projects.',
   2014,
   (SELECT id FROM industries WHERE slug = 'consulting'),
   (SELECT id FROM specializations WHERE slug = 'management-consulting'),
   'United Kingdom', 'England', 'London',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 85, now() - interval '5 hours')
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 4. Create career entries (current jobs)
-- =============================================================================

INSERT INTO public.career_entries (
  profile_id, job_title, company, industry_id, specialization_id,
  start_date, is_current, sort_order
) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Senior Software Engineer', 'VNG Corporation',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   '2020-03-01', true, 0),

  ('22222222-2222-2222-2222-222222222202', 'Vice President', 'DBS Bank',
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'investment-banking'),
   '2019-01-01', true, 0),

  ('22222222-2222-2222-2222-222222222203', 'Attending Physician', 'UCSF Medical Center',
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'clinical-medicine'),
   '2021-07-01', true, 0),

  ('22222222-2222-2222-2222-222222222204', 'Data Scientist', 'Tiki',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'data-science-ai-ml'),
   '2022-01-01', true, 0),

  ('22222222-2222-2222-2222-222222222205', 'Associate Professor', 'VNU-HCM University of Science',
   (SELECT id FROM industries WHERE slug = 'education'),
   (SELECT id FROM specializations WHERE slug = 'higher-education'),
   '2015-09-01', true, 0),

  ('22222222-2222-2222-2222-222222222206', 'Digital Marketing Lead', 'Mercari',
   (SELECT id FROM industries WHERE slug = 'media-communications'),
   (SELECT id FROM specializations WHERE slug = 'marketing'),
   '2021-04-01', true, 0),

  ('22222222-2222-2222-2222-222222222207', 'Investment Associate', 'VinaCapital Ventures',
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'venture-capital'),
   '2020-06-01', true, 0),

  ('22222222-2222-2222-2222-222222222208', 'Cybersecurity Consultant', 'CyberCX',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'cybersecurity'),
   '2019-11-01', true, 0),

  ('22222222-2222-2222-2222-222222222209', 'Freelance Brand Designer', 'Self-Employed',
   (SELECT id FROM industries WHERE slug = 'arts-entertainment'),
   (SELECT id FROM specializations WHERE slug = 'visual-arts'),
   '2022-06-01', true, 0),

  ('22222222-2222-2222-2222-222222222210', 'Structural Engineer', 'Arup',
   (SELECT id FROM industries WHERE slug = 'engineering'),
   (SELECT id FROM specializations WHERE slug = 'civil-engineering'),
   '2018-03-01', true, 0),

  ('22222222-2222-2222-2222-222222222211', 'Registered Nurse', 'Toronto General Hospital',
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'nursing'),
   '2021-01-01', true, 0),

  ('22222222-2222-2222-2222-222222222212', 'Senior Product Manager', 'Amazon',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'product-management'),
   '2022-09-01', true, 0),

  ('22222222-2222-2222-2222-222222222213', 'Senior Associate', 'Baker McKenzie',
   (SELECT id FROM industries WHERE slug = 'law'),
   (SELECT id FROM specializations WHERE slug = 'corporate-law'),
   '2019-08-01', true, 0),

  ('22222222-2222-2222-2222-222222222214', 'PhD Researcher', 'KAIST',
   (SELECT id FROM industries WHERE slug = 'research-academia'),
   (SELECT id FROM specializations WHERE slug = 'natural-sciences'),
   '2023-03-01', true, 0),

  ('22222222-2222-2222-2222-222222222215', 'Senior Consultant', 'McKinsey & Company',
   (SELECT id FROM industries WHERE slug = 'consulting'),
   (SELECT id FROM specializations WHERE slug = 'management-consulting'),
   '2020-01-01', true, 0);

-- =============================================================================
-- 5. Add availability tags (diverse mix)
-- =============================================================================

INSERT INTO public.user_availability_tags (profile_id, tag_type_id)
SELECT p.profile_id::uuid, t.id
FROM (VALUES
  -- Anh: mentoring + coffee chats
  ('22222222-2222-2222-2222-222222222201', 'open-to-mentoring'),
  ('22222222-2222-2222-2222-222222222201', 'open-to-coffee-chats'),
  -- Duc: coffee chats
  ('22222222-2222-2222-2222-222222222202', 'open-to-coffee-chats'),
  -- Ngoc: mentoring + collaboration
  ('22222222-2222-2222-2222-222222222203', 'open-to-mentoring'),
  ('22222222-2222-2222-2222-222222222203', 'open-to-collaboration'),
  -- Huy: collaboration + looking for work
  ('22222222-2222-2222-2222-222222222204', 'open-to-collaboration'),
  ('22222222-2222-2222-2222-222222222204', 'looking-for-work'),
  -- Linh: mentoring
  ('22222222-2222-2222-2222-222222222205', 'open-to-mentoring'),
  -- Tam: hiring
  ('22222222-2222-2222-2222-222222222206', 'hiring'),
  -- Ngan: coffee chats + hiring
  ('22222222-2222-2222-2222-222222222207', 'open-to-coffee-chats'),
  ('22222222-2222-2222-2222-222222222207', 'hiring'),
  -- Khoa: mentoring + coffee chats
  ('22222222-2222-2222-2222-222222222208', 'open-to-mentoring'),
  ('22222222-2222-2222-2222-222222222208', 'open-to-coffee-chats'),
  -- Mai: collaboration + coffee chats
  ('22222222-2222-2222-2222-222222222209', 'open-to-collaboration'),
  ('22222222-2222-2222-2222-222222222209', 'open-to-coffee-chats'),
  -- Vinh: not available
  ('22222222-2222-2222-2222-222222222210', 'not-currently-available'),
  -- Phuong: looking for work + coffee chats
  ('22222222-2222-2222-2222-222222222211', 'looking-for-work'),
  ('22222222-2222-2222-2222-222222222211', 'open-to-coffee-chats'),
  -- Nam: mentoring + hiring + coffee chats
  ('22222222-2222-2222-2222-222222222212', 'open-to-mentoring'),
  ('22222222-2222-2222-2222-222222222212', 'hiring'),
  ('22222222-2222-2222-2222-222222222212', 'open-to-coffee-chats'),
  -- Trang: coffee chats
  ('22222222-2222-2222-2222-222222222213', 'open-to-coffee-chats'),
  -- Khoi: collaboration
  ('22222222-2222-2222-2222-222222222214', 'open-to-collaboration'),
  -- Ha: mentoring + coffee chats + collaboration
  ('22222222-2222-2222-2222-222222222215', 'open-to-mentoring'),
  ('22222222-2222-2222-2222-222222222215', 'open-to-coffee-chats'),
  ('22222222-2222-2222-2222-222222222215', 'open-to-collaboration')
) AS p(profile_id, tag_slug)
JOIN public.availability_tag_types t ON t.slug = p.tag_slug;
