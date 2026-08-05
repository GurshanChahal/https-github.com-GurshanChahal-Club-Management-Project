/*
# Seed Data for COSC Club Management System

This migration adds sample data for demonstration purposes.
Note: In production, remove or disable this migration.
*/

-- Create a system user for seed data (this would normally be a real auth.users)
-- We'll use a fixed UUID for the "system" user who creates seed data

-- Insert sample clubs
INSERT INTO clubs (id, name, description, category, meeting_schedule, contact_email, max_members, is_active, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Computer Science Society', 'The official club for CS students to collaborate, learn, and build projects together.', 'Technology', 'Every Tuesday 6PM', 'css@university.edu', 100, true, NOW() - INTERVAL '6 months'),
  ('00000000-0000-0000-0000-000000000002', 'Robotics Club', 'Building autonomous robots and competing in regional competitions.', 'Technology', 'Every Wednesday 5PM', 'robotics@university.edu', 50, true, NOW() - INTERVAL '4 months'),
  ('00000000-0000-0000-0000-000000000003', 'Data Science Club', 'Exploring data analysis, machine learning, and AI applications.', 'Academic', 'Every Thursday 7PM', 'datascience@university.edu', 75, true, NOW() - INTERVAL '3 months'),
  ('00000000-0000-0000-0000-000000000004', 'Cybersecurity Club', 'Learning ethical hacking, security best practices, and CTF competitions.', 'Professional', 'Every Monday 6PM', 'cybersec@university.edu', 40, true, NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- Insert sample events (without created_by for now, will be set when users exist)
INSERT INTO events (id, club_id, title, description, event_type, location, is_virtual, start_time, end_time, max_attendees, registration_deadline, status, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Intro to Machine Learning Workshop', 'Learn the basics of ML with hands-on Python exercises.', 'workshop', 'Science Building 101', false, NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 3 hours', 30, NOW() + INTERVAL '6 days', 'published', NOW() - INTERVAL '1 week'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Weekly Coding Meetup', 'Weekly coding session and project collaboration.', 'meeting', 'Library 203', false, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 20, NOW() + INTERVAL '1 day', 'published', NOW() - INTERVAL '3 days'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Robot Design Session', 'Design and prototype our next competition robot.', 'meeting', 'Engineering Lab 301', false, NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 4 hours', 15, NOW() + INTERVAL '3 days', 'published', NOW() - INTERVAL '5 days'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Data Visualization Workshop', 'Create stunning visualizations with Python and Tableau.', 'workshop', 'Virtual', true, NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days 2 hours', 50, NOW() + INTERVAL '9 days', 'published', NOW() - INTERVAL '2 days'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Hackathon 2026', 'Annual 24-hour coding competition with amazing prizes!', 'competition', 'University Center', false, NOW() + INTERVAL '14 days', NOW() + INTERVAL '15 days', 100, NOW() + INTERVAL '12 days', 'published', NOW() - INTERVAL '1 month')
ON CONFLICT DO NOTHING;

-- Insert sample budget categories
INSERT INTO budget_categories (id, club_id, name, type, budget_limit, is_active) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Workshop Materials', 'expense', 500.00, true),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Event Expenses', 'expense', 1000.00, true),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Membership Fees', 'income', 1000.00, true)
ON CONFLICT DO NOTHING;