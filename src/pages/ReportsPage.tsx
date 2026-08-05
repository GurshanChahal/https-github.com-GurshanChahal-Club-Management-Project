import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, Download, FileText, AlertCircle, Check, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, StatCard, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Tabs } from '../components/common/Table';
import type { Club, Event, Membership } from '../types';
import { formatCurrency, formatDate, formatDateTime, cn } from '../utils/helpers';

type ReportType = 'club' | 'event' | 'attendance' | 'budget';

export function ReportsPage() {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportType>('club');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Report data
  const [clubStats, setClubStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalEvents: 0,
    publishedEvents: 0,
  });
  const [membersList, setMembersList] = useState<Membership[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ event: Event; stats: { registered: number; attended: number; late: number; absent: number } }[]>([]);
  const [budgetData, setBudgetData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    byCategory: [] as { category: string; income: number; expense: number }[],
    monthly: [] as { month: string; income: number; expense: number }[],
  });

  useEffect(() => {
    loadClubs();
  }, [profile]);

  useEffect(() => {
    if (selectedClub) {
      loadReportData();
    }
  }, [selectedClub, selectedReport, dateRange]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadClubs = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const isAdmin = profile.role === 'admin';

      let managedClubs: Club[] = [];

      if (isAdmin) {
        const { data } = await supabase.from('clubs').select('*').eq('is_active', true);
        managedClubs = data || [];
      } else {
        const { data } = await supabase
          .from('memberships')
          .select('*, clubs(*)')
          .eq('user_id', profile.id)
          .in('role', ['president', 'vice_president', 'treasurer', 'secretary', 'manager']);

        managedClubs = data?.map((m) => m.clubs as Club).filter(Boolean) || [];
      }

      setClubs(managedClubs);
      if (managedClubs.length === 1) {
        setSelectedClub(managedClubs[0].id);
      }
    } catch (err) {
      console.error('Error loading clubs:', err);
      setError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load club stats
      const { count: totalMembers } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', selectedClub);

      const { count: activeMembers } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', selectedClub)
        .eq('status', 'active');

      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', selectedClub);

      const { count: publishedEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', selectedClub)
        .eq('status', 'published');

      setClubStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        totalEvents: totalEvents || 0,
        publishedEvents: publishedEvents || 0,
      });

      // Load members list
      const { data: membersData } = await supabase
        .from('memberships')
        .select('*, profiles(*)')
        .eq('club_id', selectedClub)
        .order('joined_date', { ascending: false });
      setMembersList(membersData || []);

      // Load events
      let eventsQuery = supabase
        .from('events')
        .select('*')
        .eq('club_id', selectedClub)
        .order('start_time', { ascending: false });

      if (dateRange.start) {
        eventsQuery = eventsQuery.gte('start_time', dateRange.start);
      }
      if (dateRange.end) {
        eventsQuery = eventsQuery.lte('end_time', dateRange.end);
      }

      const { data: eventsData } = await eventsQuery;
      setEvents(eventsData || []);

      // Load attendance data by event
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: attendanceRecords } = await supabase
          .from('event_attendance')
          .select('event_id, status')
          .in('event_id', eventIds);

        const eventStats = eventsData.map(event => {
          const eventAttendance = attendanceRecords?.filter(a => a.event_id === event.id) || [];
          return {
            event,
            stats: {
              registered: eventAttendance.filter(a => a.status === 'registered').length,
              attended: eventAttendance.filter(a => a.status === 'attended').length,
              late: eventAttendance.filter(a => a.status === 'late').length,
              absent: eventAttendance.filter(a => a.status === 'absent').length,
            },
          };
        });
        setAttendanceData(eventStats);
      } else {
        setAttendanceData([]);
      }

      // Load budget data
      const { data: budgetItems } = await supabase
        .from('budget_items')
        .select('*')
        .eq('club_id', selectedClub)
        .eq('status', 'approved');

      if (budgetItems) {
        const totalIncome = budgetItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = budgetItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);

        // By category
        const categories = new Map<string, { income: number; expense: number }>();
        budgetItems.forEach(item => {
          const current = categories.get(item.category) || { income: 0, expense: 0 };
          if (item.type === 'income') {
            current.income += item.amount;
          } else {
            current.expense += item.amount;
          }
          categories.set(item.category, current);
        });

        const byCategory = Array.from(categories.entries()).map(([category, amounts]) => ({
          category,
          ...amounts,
        }));

        // Monthly breakdown
        const monthly = new Map<string, { income: number; expense: number }>();
        budgetItems.forEach(item => {
          const month = item.date.substring(0, 7); // YYYY-MM
          const current = monthly.get(month) || { income: 0, expense: 0 };
          if (item.type === 'income') {
            current.income += item.amount;
          } else {
            current.expense += item.amount;
          }
          monthly.set(month, current);
        });

        const monthlyData = Array.from(monthly.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, amounts]) => ({ month, ...amounts }));

        setBudgetData({
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          byCategory,
          monthly: monthlyData,
        });
      }
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (reportType: ReportType) => {
    setExporting(true);
    try {
      let csvContent = '';
      let filename = '';

      switch (reportType) {
        case 'club':
          filename = 'club_report';
          csvContent = [
            ['Metric', 'Value'].join(','),
            ['Total Members', clubStats.totalMembers].join(','),
            ['Active Members', clubStats.activeMembers].join(','),
            ['Total Events', clubStats.totalEvents].join(','),
            ['Published Events', clubStats.publishedEvents].join(','),
            '',
            ['Member List'],
            ['Name', 'Email', 'Role', 'Status', 'Joined Date'].join(','),
            ...membersList.map(m => [
              m.profiles?.full_name || '',
              m.profiles?.email || '',
              m.role,
              m.status,
              m.joined_date || '',
            ].join(',')),
          ].join('\n');
          break;

        case 'event':
          filename = 'event_report';
          csvContent = [
            ['Event Report', clubs.find(c => c.id === selectedClub)?.name || ''].join(','),
            '',
            ['Title', 'Type', 'Status', 'Start Time', 'End Time', 'Location'].join(','),
            ...events.map(e => [
              e.title,
              e.event_type || 'N/A',
              e.status,
              formatDateTime(e.start_time),
              formatDateTime(e.end_time),
              e.location || 'N/A',
            ].join(',')),
          ].join('\n');
          break;

        case 'attendance':
          filename = 'attendance_report';
          csvContent = [
            ['Attendance Report', clubs.find(c => c.id === selectedClub)?.name || ''].join(','),
            '',
            ['Event', 'Date', 'Registered', 'Attended', 'Late', 'Absent', 'Attendance Rate'].join(','),
            ...attendanceData.map(a => {
              const total = a.stats.attended + a.stats.late + a.stats.absent;
              const rate = total > 0 ? Math.round(((a.stats.attended + a.stats.late) / total) * 100) : 0;
              return [
                a.event.title,
                formatDate(a.event.start_time),
                a.stats.registered,
                a.stats.attended,
                a.stats.late,
                a.stats.absent,
                `${rate}%`,
              ].join(',');
            }),
          ].join('\n');
          break;

        case 'budget':
          filename = 'budget_report';
          csvContent = [
            ['Budget Report', clubs.find(c => c.id === selectedClub)?.name || ''].join(','),
            '',
            ['Summary'],
            ['Total Income', formatCurrency(budgetData.totalIncome)].join(','),
            ['Total Expenses', formatCurrency(budgetData.totalExpenses)].join(','),
            ['Balance', formatCurrency(budgetData.balance)].join(','),
            '',
            ['By Category'],
            ['Category', 'Income', 'Expense'].join(','),
            ...budgetData.byCategory.map(c => [
              c.category,
              formatCurrency(c.income),
              formatCurrency(c.expense),
            ].join(',')),
            '',
            ['Monthly Breakdown'],
            ['Month', 'Income', 'Expense', 'Net'].join(','),
            ...budgetData.monthly.map(m => [
              m.month,
              formatCurrency(m.income),
              formatCurrency(m.expense),
              formatCurrency(m.income - m.expense),
            ].join(',')),
          ].join('\n');
          break;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('Report exported successfully');
    } catch (err) {
      console.error('Error exporting:', err);
      setError('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  if (loading && clubs.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <Card>
          <EmptyState title="No access" description="You don't have permission to view reports." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">View and export club performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToCSV(selectedReport)} loading={exporting}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Select
          options={clubs.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
          className="w-64"
          placeholder="Select Club"
        />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Date Range:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs
        tabs={[
          { key: 'club', label: 'Club Report' },
          { key: 'event', label: 'Event Report' },
          { key: 'attendance', label: 'Attendance Report' },
          { key: 'budget', label: 'Budget Report' },
        ]}
        activeTab={selectedReport}
        onChange={(key) => setSelectedReport(key as ReportType)}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : !selectedClub ? (
        <Card>
          <EmptyState title="Select a club" description="Choose a club to view reports." />
        </Card>
      ) : (
        <>
          {/* Club Report */}
          {selectedReport === 'club' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Members" value={clubStats.totalMembers} icon={<Users className="h-5 w-5" />} />
                <StatCard title="Active Members" value={clubStats.activeMembers} icon={<Users className="h-5 w-5 text-green-600" />} />
                <StatCard title="Total Events" value={clubStats.totalEvents} icon={<Calendar className="h-5 w-5" />} />
                <StatCard title="Published Events" value={clubStats.publishedEvents} icon={<Calendar className="h-5 w-5 text-blue-600" />} />
              </div>

              <Card>
                <CardHeader title="Member List" subtitle={`${membersList.length} members`} />
                {membersList.length === 0 ? (
                  <EmptyState title="No members" />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {membersList.slice(0, 10).map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium text-gray-900">{member.profiles?.full_name}</p>
                            <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{member.role}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              member.status === 'active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            )}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {member.joined_date ? formatDate(member.joined_date) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}

          {/* Event Report */}
          {selectedReport === 'event' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard title="Total Events" value={events.length} icon={<Calendar className="h-5 w-5" />} />
                <StatCard title="Published" value={events.filter(e => e.status === 'published').length} icon={<Calendar className="h-5 w-5 text-green-600" />} />
                <StatCard title="Drafts" value={events.filter(e => e.status === 'draft').length} icon={<FileText className="h-5 w-5" />} />
                <StatCard title="Completed" value={events.filter(e => e.status === 'completed').length} icon={<Check className="h-5 w-5 text-blue-600" />} />
              </div>

              <Card>
                <CardHeader title="Event List" subtitle={`${events.length} events`} />
                {events.length === 0 ? (
                  <EmptyState title="No events" />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{event.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{event.event_type || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(event.start_time)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              event.status === 'published' ? "bg-green-100 text-green-800" :
                              event.status === 'draft' ? "bg-gray-100 text-gray-800" :
                              event.status === 'cancelled' ? "bg-red-100 text-red-800" :
                              "bg-blue-100 text-blue-800"
                            )}>
                              {event.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}

          {/* Attendance Report */}
          {selectedReport === 'attendance' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                {(() => {
                  const totals = attendanceData.reduce((acc, a) => ({
                    registered: acc.registered + a.stats.registered,
                    attended: acc.attended + a.stats.attended,
                    late: acc.late + a.stats.late,
                    absent: acc.absent + a.stats.absent,
                  }), { registered: 0, attended: 0, late: 0, absent: 0 });
                  const totalMarked = totals.attended + totals.late + totals.absent;
                  const rate = totalMarked > 0 ? Math.round(((totals.attended + totals.late) / totalMarked) * 100) : 0;

                  return (
                    <>
                      <StatCard title="Avg Attendance Rate" value={`${rate}%`} icon={<BarChart3 className="h-5 w-5" />} />
                      <StatCard title="Total Attended" value={totals.attended} icon={<Check className="h-5 w-5 text-green-600" />} />
                      <StatCard title="Total Late" value={totals.late} icon={<Calendar className="h-5 w-5 text-orange-600" />} />
                      <StatCard title="Total Absent" value={totals.absent} icon={<AlertCircle className="h-5 w-5 text-red-600" />} />
                    </>
                  );
                })()}
              </div>

              <Card>
                <CardHeader title="Attendance by Event" subtitle={`${attendanceData.length} events`} />
                {attendanceData.length === 0 ? (
                  <EmptyState title="No attendance data" />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Event</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Registered</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Attended</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Late</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Absent</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendanceData.map((a) => {
                        const total = a.stats.attended + a.stats.late + a.stats.absent;
                        const rate = total > 0 ? Math.round(((a.stats.attended + a.stats.late) / total) * 100) : 0;
                        return (
                          <tr key={a.event.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.event.title}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(a.event.start_time)}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{a.stats.registered}</td>
                            <td className="px-4 py-3 text-sm text-center text-green-600">{a.stats.attended}</td>
                            <td className="px-4 py-3 text-sm text-center text-orange-600">{a.stats.late}</td>
                            <td className="px-4 py-3 text-sm text-center text-red-600">{a.stats.absent}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                rate >= 80 ? "bg-green-100 text-green-800" :
                                rate >= 60 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}

          {/* Budget Report */}
          {selectedReport === 'budget' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard title="Total Income" value={formatCurrency(budgetData.totalIncome)} icon={<DollarSign className="h-5 w-5 text-green-600" />} />
                <StatCard title="Total Expenses" value={formatCurrency(budgetData.totalExpenses)} icon={<DollarSign className="h-5 w-5 text-red-600" />} />
                <StatCard title="Balance" value={formatCurrency(budgetData.balance)} icon={<DollarSign className="h-5 w-5 text-blue-600" />} />
                <Card className={cn(
                  "bg-gradient-to-br",
                  budgetData.balance >= 0 ? "from-green-600 to-emerald-600" : "from-red-600 to-rose-600"
                )}>
                  <div className="text-white text-center">
                    <p className="text-xs text-white/80">Financial Health</p>
                    <p className="text-xl font-bold">{budgetData.balance >= 0 ? 'Positive' : 'Warning'}</p>
                  </div>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card>
                <CardHeader title="Expenses by Category" />
                {budgetData.byCategory.filter(c => c.expense > 0).length === 0 ? (
                  <EmptyState title="No expense data" />
                ) : (
                  <div className="space-y-3">
                    {budgetData.byCategory.filter(c => c.expense > 0).map((cat) => (
                      <div key={cat.category} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-600">{cat.category}</div>
                        <div className="flex-1">
                          <div className="h-3 w-full rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{
                                width: `${budgetData.totalExpenses > 0 ? (cat.expense / budgetData.totalExpenses) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-28 text-right text-sm font-medium text-red-600">
                          {formatCurrency(cat.expense)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Monthly Breakdown */}
              <Card>
                <CardHeader title="Monthly Summary" />
                {budgetData.monthly.length === 0 ? (
                  <EmptyState title="No monthly data" />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Month</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Income</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Expenses</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {budgetData.monthly.map((m) => (
                        <tr key={m.month}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.month}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(m.income)}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(m.expense)}</td>
                          <td className={cn(
                            "px-4 py-3 text-sm text-right font-medium",
                            m.income - m.expense >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(m.income - m.expense)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
