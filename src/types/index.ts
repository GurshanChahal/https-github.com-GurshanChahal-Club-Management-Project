export type UserRole = 'admin' | 'manager' | 'member';
export type MembershipRole = 'president' | 'vice_president' | 'treasurer' | 'secretary' | 'manager' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'inactive' | 'banned';
export type EventType = 'meeting' | 'workshop' | 'social' | 'competition' | 'fundraiser' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendanceStatus = 'registered' | 'attended' | 'late' | 'absent' | 'cancelled';
export type BudgetType = 'income' | 'expense';
export type BudgetItemStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType = 'event' | 'membership' | 'budget' | 'system' | 'announcement' | 'role_request' | 'leave_request';
export type RoleRequestStatus = 'pending' | 'approved' | 'rejected';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  user_id: string;
  club_id: string;
  reason: string | null;
  status: LeaveRequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profiles?: Profile;
  clubs?: Club;
}

export interface RoleRequest {
  id: string;
  user_id: string;
  club_id: string;
  requested_role: MembershipRole;
  status: RoleRequestStatus;
  notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  clubs?: Club;
}

export interface EventFeedback {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Profile;
  events?: Event;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  student_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  founded_date: string | null;
  meeting_schedule: string | null;
  contact_email: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  max_members: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  club_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joined_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  clubs?: Club;
}

export interface Event {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_type: EventType | null;
  location: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  start_time: string;
  end_time: string;
  max_attendees: number | null;
  registration_deadline: string | null;
  image_url: string | null;
  status: EventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clubs?: Club;
}

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  registered_at: string;
  attended_at: string | null;
  notes: string | null;
  profiles?: Profile;
  events?: Event;
}

export interface BudgetItem {
  id: string;
  club_id: string;
  category: string;
  description: string | null;
  amount: number;
  type: BudgetType;
  date: string;
  receipt_url: string | null;
  approved_by: string | null;
  status: BudgetItemStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  club_id: string;
  name: string;
  type: BudgetType;
  budget_limit: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalClubs: number;
  activeEvents: number;
  totalMembers: number;
  upcomingEvents: number;
  pendingBudgets: number;
  unreadNotifications: number;
}

export interface EventSummary {
  id: string;
  club_id: string;
  club_name: string;
  title: string;
  event_type: EventType | null;
  start_time: string;
  status: EventStatus;
  total_registrations: number;
  attended_count: number;
}
