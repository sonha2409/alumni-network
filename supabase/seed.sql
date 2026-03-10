-- =============================================================================
-- Seed data for manual testing
-- Creates 1 admin + 10 test users with profiles, career entries, and tags
-- All passwords: 24092003
-- Admin: admin@gmail.com | Test users: test1@gmail.com ... test10@gmail.com
-- =============================================================================

-- Bcrypt hash of "24092003"
-- $2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW

-- =============================================================================
-- 1. Insert auth.users (triggers auto-creation of public.users)
-- =============================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, phone_change, phone_change_token,
  email_change_token_current, reauthentication_token,
  is_super_admin, is_sso_user, is_anonymous
) VALUES
  -- Admin: Son Ha
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 1: Nguyen Van Anh
  ('a0000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test1@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 2: Tran Minh Duc
  ('a0000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test2@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 3: Le Thi Bao Ngoc
  ('a0000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test3@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 4: Pham Quoc Huy
  ('a0000000-0000-4000-8000-000000000104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test4@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 5: Vo Hoang Linh
  ('a0000000-0000-4000-8000-000000000105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test5@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 6: Dang Thanh Tam
  ('a0000000-0000-4000-8000-000000000106', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test6@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 7: Bui Kim Ngan
  ('a0000000-0000-4000-8000-000000000107', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test7@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 8: Hoang Viet Khoa
  ('a0000000-0000-4000-8000-000000000108', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test8@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 9: Ngo Phuong Mai
  ('a0000000-0000-4000-8000-000000000109', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test9@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false),

  -- Test 10: Do Quang Vinh
  ('a0000000-0000-4000-8000-000000000110', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test10@gmail.com',
   '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW',
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', '', '', '', '',
   false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Insert identities for each user (required by Supabase Auth)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000101', '{"sub":"a0000000-0000-4000-8000-000000000101","email":"test1@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000102', '{"sub":"a0000000-0000-4000-8000-000000000102","email":"test2@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000103', '{"sub":"a0000000-0000-4000-8000-000000000103","email":"test3@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000104', '{"sub":"a0000000-0000-4000-8000-000000000104","email":"test4@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000105', '{"sub":"a0000000-0000-4000-8000-000000000105","email":"test5@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000106', '{"sub":"a0000000-0000-4000-8000-000000000106","email":"test6@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000107', '{"sub":"a0000000-0000-4000-8000-000000000107","email":"test7@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000108', 'a0000000-0000-4000-8000-000000000108', 'a0000000-0000-4000-8000-000000000108', '{"sub":"a0000000-0000-4000-8000-000000000108","email":"test8@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000109', 'a0000000-0000-4000-8000-000000000109', 'a0000000-0000-4000-8000-000000000109', '{"sub":"a0000000-0000-4000-8000-000000000109","email":"test9@gmail.com"}', 'email', now(), now(), now()),
  ('a0000000-0000-4000-8000-000000000110', 'a0000000-0000-4000-8000-000000000110', 'a0000000-0000-4000-8000-000000000110', '{"sub":"a0000000-0000-4000-8000-000000000110","email":"test10@gmail.com"}', 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. Set admin role + mark all users as verified
-- =============================================================================

UPDATE public.users SET role = 'admin' WHERE id = 'a0000000-0000-4000-8000-000000000001';

UPDATE public.users
SET verification_status = 'verified'
WHERE id IN (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000101',
  'a0000000-0000-4000-8000-000000000102',
  'a0000000-0000-4000-8000-000000000103',
  'a0000000-0000-4000-8000-000000000104',
  'a0000000-0000-4000-8000-000000000105',
  'a0000000-0000-4000-8000-000000000106',
  'a0000000-0000-4000-8000-000000000107',
  'a0000000-0000-4000-8000-000000000108',
  'a0000000-0000-4000-8000-000000000109',
  'a0000000-0000-4000-8000-000000000110'
);

-- =============================================================================
-- 3. Create profiles
-- =============================================================================

-- PTNK school ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

INSERT INTO public.profiles (
  id, user_id, full_name, bio, graduation_year,
  primary_industry_id, primary_specialization_id,
  country, state_province, city, school_id,
  profile_completeness, last_active_at
) VALUES
  -- Admin: Son Ha
  ('b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'Son Ha',
   'Platform admin. PTNK alum building tools for our community.',
   2020,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   'Vietnam', 'Ho Chi Minh City', 'District 1',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 85, now()),

  -- Test 1: Nguyen Van Anh — Technology / Software Engineering — HCMC — 2015
  ('b0000000-0000-4000-8000-000000000101',
   'a0000000-0000-4000-8000-000000000101',
   'Nguyen Van Anh',
   'Full-stack developer passionate about building scalable web applications. Love mentoring junior devs.',
   2015,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   'Vietnam', 'Ho Chi Minh City', 'District 1',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 85, now() - interval '1 hour'),

  -- Test 2: Tran Minh Duc — Finance / Investment Banking — Singapore — 2012
  ('b0000000-0000-4000-8000-000000000102',
   'a0000000-0000-4000-8000-000000000102',
   'Tran Minh Duc',
   'Investment banker with 10+ years of experience in M&A across Southeast Asia.',
   2012,
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'investment-banking'),
   'Singapore', NULL, 'Singapore',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 90, now() - interval '3 hours'),

  -- Test 3: Le Thi Bao Ngoc — Healthcare / Clinical Medicine — USA — 2010
  ('b0000000-0000-4000-8000-000000000103',
   'a0000000-0000-4000-8000-000000000103',
   'Le Thi Bao Ngoc',
   'Physician at UCSF. Researching tropical diseases and global health equity.',
   2010,
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'clinical-medicine'),
   'United States', 'California', 'San Francisco',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75, now() - interval '1 day'),

  -- Test 4: Pham Quoc Huy — Technology / Data Science — Vietnam — 2018
  ('b0000000-0000-4000-8000-000000000104',
   'a0000000-0000-4000-8000-000000000104',
   'Pham Quoc Huy',
   'Data scientist working on NLP and recommendation systems. Open to collaborations.',
   2018,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'data-science-ai-ml'),
   'Vietnam', 'Ho Chi Minh City', 'Thu Duc',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, now() - interval '2 hours'),

  -- Test 5: Vo Hoang Linh — Education / Higher Education — Vietnam — 2008
  ('b0000000-0000-4000-8000-000000000105',
   'a0000000-0000-4000-8000-000000000105',
   'Vo Hoang Linh',
   'Professor of Mathematics at VNU-HCM. Published 30+ papers on algebraic topology.',
   2008,
   (SELECT id FROM industries WHERE slug = 'education'),
   (SELECT id FROM specializations WHERE slug = 'higher-education'),
   'Vietnam', 'Ho Chi Minh City', 'District 5',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 70, now() - interval '5 days'),

  -- Test 6: Dang Thanh Tam — Media / Marketing — Japan — 2016
  ('b0000000-0000-4000-8000-000000000106',
   'a0000000-0000-4000-8000-000000000106',
   'Dang Thanh Tam',
   'Digital marketing lead at a Tokyo-based startup. Bridging Vietnamese and Japanese markets.',
   2016,
   (SELECT id FROM industries WHERE slug = 'media-communications'),
   (SELECT id FROM specializations WHERE slug = 'marketing'),
   'Japan', 'Tokyo', 'Shibuya',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65, now() - interval '12 hours'),

  -- Test 7: Bui Kim Ngan — Finance / Venture Capital — Vietnam — 2014
  ('b0000000-0000-4000-8000-000000000107',
   'a0000000-0000-4000-8000-000000000107',
   'Bui Kim Ngan',
   'VC associate focused on early-stage tech startups in Vietnam.',
   2014,
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'venture-capital'),
   'Vietnam', 'Ho Chi Minh City', 'District 3',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, now() - interval '6 hours'),

  -- Test 8: Hoang Viet Khoa — Technology / Cybersecurity — Australia — 2013
  ('b0000000-0000-4000-8000-000000000108',
   'a0000000-0000-4000-8000-000000000108',
   'Hoang Viet Khoa',
   'Cybersecurity consultant. Helping enterprises in APAC region secure their infrastructure.',
   2013,
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'cybersecurity'),
   'Australia', 'New South Wales', 'Sydney',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 70, now() - interval '2 days'),

  -- Test 9: Ngo Phuong Mai — Arts / Visual Arts — Vietnam — 2020
  ('b0000000-0000-4000-8000-000000000109',
   'a0000000-0000-4000-8000-000000000109',
   'Ngo Phuong Mai',
   'Freelance designer creating brand identities for startups. Also teaching design workshops.',
   2020,
   (SELECT id FROM industries WHERE slug = 'arts-entertainment'),
   (SELECT id FROM specializations WHERE slug = 'visual-arts'),
   'Vietnam', 'Ho Chi Minh City', 'Binh Thanh',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 60, now() - interval '4 hours'),

  -- Test 10: Do Quang Vinh — Engineering / Civil Engineering — Germany — 2011
  ('b0000000-0000-4000-8000-000000000110',
   'a0000000-0000-4000-8000-000000000110',
   'Do Quang Vinh',
   'Structural engineer working on sustainable building projects in Europe.',
   2011,
   (SELECT id FROM industries WHERE slug = 'engineering'),
   (SELECT id FROM specializations WHERE slug = 'civil-engineering'),
   'Germany', 'Bavaria', 'Munich',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75, now() - interval '3 days')
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 4. Create career entries (current jobs)
-- =============================================================================

INSERT INTO public.career_entries (
  profile_id, job_title, company, industry_id, specialization_id,
  start_date, is_current, sort_order
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Platform Developer', 'AlumNet',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   '2024-01-01', true, 0),

  ('b0000000-0000-4000-8000-000000000101', 'Senior Software Engineer', 'VNG Corporation',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'software-engineering'),
   '2020-03-01', true, 0),

  ('b0000000-0000-4000-8000-000000000102', 'Vice President', 'DBS Bank',
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'investment-banking'),
   '2019-01-01', true, 0),

  ('b0000000-0000-4000-8000-000000000103', 'Attending Physician', 'UCSF Medical Center',
   (SELECT id FROM industries WHERE slug = 'healthcare-medicine'),
   (SELECT id FROM specializations WHERE slug = 'clinical-medicine'),
   '2021-07-01', true, 0),

  ('b0000000-0000-4000-8000-000000000104', 'Data Scientist', 'Tiki',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'data-science-ai-ml'),
   '2022-01-01', true, 0),

  ('b0000000-0000-4000-8000-000000000105', 'Associate Professor', 'VNU-HCM University of Science',
   (SELECT id FROM industries WHERE slug = 'education'),
   (SELECT id FROM specializations WHERE slug = 'higher-education'),
   '2015-09-01', true, 0),

  ('b0000000-0000-4000-8000-000000000106', 'Digital Marketing Lead', 'Mercari',
   (SELECT id FROM industries WHERE slug = 'media-communications'),
   (SELECT id FROM specializations WHERE slug = 'marketing'),
   '2021-04-01', true, 0),

  ('b0000000-0000-4000-8000-000000000107', 'Investment Associate', 'VinaCapital Ventures',
   (SELECT id FROM industries WHERE slug = 'finance-banking'),
   (SELECT id FROM specializations WHERE slug = 'venture-capital'),
   '2020-06-01', true, 0),

  ('b0000000-0000-4000-8000-000000000108', 'Cybersecurity Consultant', 'CyberCX',
   (SELECT id FROM industries WHERE slug = 'technology'),
   (SELECT id FROM specializations WHERE slug = 'cybersecurity'),
   '2019-11-01', true, 0),

  ('b0000000-0000-4000-8000-000000000109', 'Freelance Brand Designer', 'Self-Employed',
   (SELECT id FROM industries WHERE slug = 'arts-entertainment'),
   (SELECT id FROM specializations WHERE slug = 'visual-arts'),
   '2022-06-01', true, 0),

  ('b0000000-0000-4000-8000-000000000110', 'Structural Engineer', 'Arup',
   (SELECT id FROM industries WHERE slug = 'engineering'),
   (SELECT id FROM specializations WHERE slug = 'civil-engineering'),
   '2018-03-01', true, 0);

-- =============================================================================
-- 5. Add availability tags (diverse mix)
-- =============================================================================

INSERT INTO public.user_availability_tags (profile_id, tag_type_id)
SELECT p.profile_id::uuid, t.id
FROM (VALUES
  -- Admin: mentoring + coffee chats
  ('b0000000-0000-4000-8000-000000000001', 'open-to-mentoring'),
  ('b0000000-0000-4000-8000-000000000001', 'open-to-coffee-chats'),
  -- Test 1: mentoring + coffee chats
  ('b0000000-0000-4000-8000-000000000101', 'open-to-mentoring'),
  ('b0000000-0000-4000-8000-000000000101', 'open-to-coffee-chats'),
  -- Test 2: coffee chats
  ('b0000000-0000-4000-8000-000000000102', 'open-to-coffee-chats'),
  -- Test 3: mentoring + collaboration
  ('b0000000-0000-4000-8000-000000000103', 'open-to-mentoring'),
  ('b0000000-0000-4000-8000-000000000103', 'open-to-collaboration'),
  -- Test 4: collaboration + looking for work
  ('b0000000-0000-4000-8000-000000000104', 'open-to-collaboration'),
  ('b0000000-0000-4000-8000-000000000104', 'looking-for-work'),
  -- Test 5: mentoring
  ('b0000000-0000-4000-8000-000000000105', 'open-to-mentoring'),
  -- Test 6: hiring
  ('b0000000-0000-4000-8000-000000000106', 'hiring'),
  -- Test 7: coffee chats + hiring
  ('b0000000-0000-4000-8000-000000000107', 'open-to-coffee-chats'),
  ('b0000000-0000-4000-8000-000000000107', 'hiring'),
  -- Test 8: mentoring + coffee chats
  ('b0000000-0000-4000-8000-000000000108', 'open-to-mentoring'),
  ('b0000000-0000-4000-8000-000000000108', 'open-to-coffee-chats'),
  -- Test 9: collaboration + coffee chats
  ('b0000000-0000-4000-8000-000000000109', 'open-to-collaboration'),
  ('b0000000-0000-4000-8000-000000000109', 'open-to-coffee-chats'),
  -- Test 10: not available
  ('b0000000-0000-4000-8000-000000000110', 'not-currently-available')
) AS p(profile_id, tag_slug)
JOIN public.availability_tag_types t ON t.slug = p.tag_slug;

-- =============================================================================
-- 6. Add sample contact details for a few users
-- =============================================================================

INSERT INTO public.profile_contact_details (profile_id, personal_email, phone, linkedin_url)
VALUES
  ('b0000000-0000-4000-8000-000000000101', 'anh.personal@gmail.com', '+84 912 345 678', 'https://linkedin.com/in/anhnguyendev'),
  ('b0000000-0000-4000-8000-000000000102', 'duc.tran.finance@gmail.com', '+65 9123 4567', 'https://linkedin.com/in/ductran'),
  ('b0000000-0000-4000-8000-000000000107', 'ngan.bui.vc@gmail.com', NULL, 'https://linkedin.com/in/nganbui');

UPDATE public.profiles
SET has_contact_details = true
WHERE id IN (
  'b0000000-0000-4000-8000-000000000101',
  'b0000000-0000-4000-8000-000000000102',
  'b0000000-0000-4000-8000-000000000107'
);
