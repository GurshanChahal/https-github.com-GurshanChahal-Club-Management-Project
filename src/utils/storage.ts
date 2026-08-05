export const APP_NAME = 'COSC Club Event Management';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/clubs', label: 'Clubs', icon: 'Users' },
  { path: '/events', label: 'Events', icon: 'Calendar' },
  { path: '/members', label: 'Members', icon: 'UserCheck' },
  { path: '/attendance', label: 'Attendance', icon: 'ClipboardCheck' },
  { path: '/budget', label: 'Budget', icon: 'DollarSign' },
  { path: '/reports', label: 'Reports', icon: 'BarChart3' },
  { path: '/notifications/send', label: 'Send Notification', icon: 'Send' },
];

export const ADMIN_NAV_ITEMS = [
  { path: '/admin/users', label: 'User Management', icon: 'Settings' },
  { path: '/admin/clubs', label: 'Club Management', icon: 'Building2' },
  { path: '/admin/leave-requests', label: 'Leave & Role Requests', icon: 'LogOut' },
];

export const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social Event' },
  { value: 'competition', label: 'Competition' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'other', label: 'Other' },
];

export const MEMBERSHIP_ROLES = [
  { value: 'president', label: 'President' },
  { value: 'vice_president', label: 'Vice President' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
];

export const BUDGET_CATEGORIES = {
  income: [
    'Membership Fees',
    'Fundraising',
    'Sponsorships',
    'Grants',
    'Sales',
    'Donations',
    'Other Income',
  ],
  expense: [
    'Event Expenses',
    'Equipment',
    'Supplies',
    'Venue',
    'Marketing',
    'Travel',
    'Food & Refreshments',
    'Awards & Prizes',
    'Other Expenses',
  ],
};

export const CLUB_CATEGORIES = [
  'Academic',
  'Professional',
  'Cultural',
  'Sports',
  'Arts',
  'Technology',
  'Community Service',
  'Religious',
  'Political',
  'Other',
];
