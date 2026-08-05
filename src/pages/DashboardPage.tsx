import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Building2,
  Shield,
  Edit,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, Badge, StatCard } from '../components/common/Card';
import { Button } from '../components/common/Button';
import type { Event, Membership, Club, Profile, DashboardStats } from '../types';
import {
  formatDateTime,
  getStatusColor,
  getEventTypeLabel,
  getRoleColor,
  getMembershipRoleLabel,
  cn,
} from '../utils/helpers';

interface AdminClubInfo {
  club: Club;
  memberCount: number;
  manager: Profile | null;
  managerRole: string | null;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClubs: 0,
    activeEvents: 0,
    totalMembers: 0,
    upcomingEvents: 0,
    pendingBudgets: 0,
    unreadNotifications: 0,
  });
  const [myClubs, setMyClubs] = useState<Membership[]>([]);
  const [pendingClubs, setPendingClubs] = useState<Membership[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [adminClubs, setAdminClubs] = useState<AdminClubInfo[]>([]);
  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const isAdmin = profile.role === 'admin';

      if (isAdmin) {
        await loadAdminDashboard();
        return;
      }

      // Load user's active clubs
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select('*, clubs(*)')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (membershipsData) {
        setMyClubs(membershipsData);
      }

      // Load user's pending club requests
      const { data: pendingData } = await supabase
        .from('memberships')
        .select('*, clubs(*)')
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (pendingData) {
        setPendingClubs(pendingData);
      }

      // Load upcoming events for user's clubs
      const clubIds = membershipsData?.map((m) => m.club_id) || [];
      if (clubIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, clubs(*)')
          .in('club_id', clubIds)
          .eq('status', 'published')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (eventsData) {
          setUpcomingEvents(eventsData);
        }
      }

      setStats({
        totalClubs: membershipsData?.length || 0,
        activeEvents: upcomingEvents.length,
        totalMembers: 0,
        upcomingEvents: upcomingEvents.length,
        pendingBudgets: 0,
        unreadNotifications: 0,
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminDashboard = async () => {
    try {
      // Load all clubs
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('*')
        .order('created_at', { ascending: false });

      // Load all memberships with profiles to compute member counts and find managers
      const { data: allMemberships } = await supabase
        .from('memberships')
        .select('*, profiles(*)')
        .eq('status', 'active');

      const clubInfos: AdminClubInfo[] = (clubsData || []).map((club) => {
        const clubMemberships = (allMemberships || []).filter((m) => m.club_id === club.id);
        const managerMembership = clubMemberships.find((m) =>
          ['president', 'vice_president', 'manager'].includes(m.role)
        );
        return {
          club,
          memberCount: clubMemberships.length,
          manager: (managerMembership?.profiles as Profile) || null,
          managerRole: managerMembership?.role || null,
        };
      });

      setAdminClubs(clubInfos);

      // Load all upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, clubs(*)')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      setAdminEvents(eventsData || []);

      // Load stats
      const [{ count: totalClubs }, { count: activeEvents }, { count: totalMembers }] =
        await Promise.all([
          supabase.from('clubs').select('*', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .gte('start_time', new Date().toISOString()),
          supabase
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ]);

      setStats({
        totalClubs: totalClubs || 0,
        activeEvents: activeEvents || 0,
        totalMembers: totalMembers || 0,
        upcomingEvents: eventsData?.length || 0,
        pendingBudgets: 0,
        unreadNotifications: 0,
      });
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const hasManagerRole = myClubs.some((m) =>
    ['president', 'vice_president', 'treasurer', 'manager'].includes(m.role)
  );

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">System-wide overview of all clubs and events</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-200 px-4 py-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Administrator</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clubs"
            value={stats.totalClubs}
            icon={<Building2 className="h-6 w-6" />}
          />
          <StatCard
            title="Total Members"
            value={stats.totalMembers}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            icon={<Calendar className="h-6 w-6" />}
          />
          <StatCard
            title="Active Events"
            value={stats.activeEvents}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* All Clubs */}
          <Card>
            <CardHeader
              title="All Clubs"
              subtitle={`${adminClubs.length} clubs in the system`}
              action={
                <Link
                  to="/admin/clubs"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage all <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {adminClubs.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No clubs have been created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminClubs.slice(0, 6).map(({ club, memberCount, manager, managerRole }) => (
                  <Link
                    key={club.id}
                    to={`/clubs/${club.id}`}
                    className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">
                      {club.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{club.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {memberCount} members
                        </span>
                        {manager ? (
                          <span className="text-xs text-gray-500 truncate">
                            {getMembershipRoleLabel(managerRole || 'manager')}: {manager.full_name}
                          </span>
                        ) : (
                          <span className="text-xs text-orange-600">No manager assigned</span>
                        )}
                      </div>
                    </div>
                    <Badge className={club.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {club.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* All Upcoming Events */}
          <Card>
            <CardHeader
              title="All Upcoming Events"
              subtitle="Across all clubs"
              action={
                <Link
                  to="/events"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {adminEvents.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adminEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-start gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-center">
                      <span className="text-xs font-medium uppercase text-blue-600">
                        {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold text-blue-700">
                        {new Date(event.start_time).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.clubs?.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(event.start_time)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                      {event.event_type && (
                        <Badge variant="info" className="text-xs">
                          {getEventTypeLabel(event.event_type)}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Admin Quick Actions */}
        <Card>
          <CardHeader title="Admin Actions" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/admin/users"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Manage Users</span>
            </Link>
            <Link
              to="/admin/clubs"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Manage Clubs</span>
            </Link>
            <Link
              to="/reports"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">View Reports</span>
            </Link>
            <Link
              to="/notifications/send"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Edit className="h-5 w-5" />
              <span className="font-medium">Send Notification</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name}</p>
        </div>
        <Link to="/clubs">
          <Button>Browse Clubs</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Clubs" value={stats.totalClubs} icon={<Users className="h-6 w-6" />} />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatCard
          title="Active Events"
          value={stats.activeEvents}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Budget Items"
          value={stats.pendingBudgets}
          icon={<DollarSign className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Clubs */}
        <Card>
          <CardHeader
            title="My Clubs"
            subtitle={`${myClubs.length} active memberships`}
            action={
              <Link
                to="/clubs"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {myClubs.length === 0 && pendingClubs.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">You haven't joined any clubs yet</p>
              <Link to="/clubs" className="mt-4 inline-block">
                <Button size="sm">Browse Clubs</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myClubs.map((membership) => (
                <Link
                  key={membership.id}
                  to={`/clubs/${membership.club_id}`}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">
                    {membership.clubs?.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{membership.clubs?.name}</p>
                    <p className="text-sm text-gray-500">{membership.clubs?.category}</p>
                  </div>
                  <Badge className={getRoleColor(membership.role)}>
                    {getMembershipRoleLabel(membership.role)}
                  </Badge>
                </Link>
              ))}

              {pendingClubs.length > 0 && (
                <>
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                      Pending Requests
                    </p>
                  </div>
                  {pendingClubs.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center gap-4 rounded-lg border border-orange-100 bg-orange-50 p-3"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 text-white font-semibold">
                        {membership.clubs?.name?.charAt(0) || 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {membership.clubs?.name}
                        </p>
                        <p className="text-sm text-orange-600">Request pending approval</p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader
            title="Upcoming Events"
            subtitle="Your scheduled events"
            action={
              <Link
                to="/events"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-start gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-center">
                    <span className="text-xs font-medium uppercase text-blue-600">
                      {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      {new Date(event.start_time).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-sm text-gray-500">{event.clubs?.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(event.start_time)}
                    </div>
                  </div>
                  {event.event_type && (
                    <Badge variant="info" className={cn('text-xs', getStatusColor(event.event_type))}>
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions - Only show for managers */}
      {hasManagerRole && (
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/events/new"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Create Event</span>
            </Link>
            <Link
              to="/members"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Manage Members</span>
            </Link>
            <Link
              to="/budget"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Track Budget</span>
            </Link>
            <Link
              to="/reports"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">View Reports</span>
            </Link>
          </div>
        </Card>
      )}

      {/* Member Quick Actions */}
      {!hasManagerRole && !isAdmin && (
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/events"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Browse Events</span>
            </Link>
            <Link
              to="/clubs"
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Explore Clubs</span>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
