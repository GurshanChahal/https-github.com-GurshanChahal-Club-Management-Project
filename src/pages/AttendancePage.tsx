import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Users, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge, StatCard, EmptyState, Modal } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import type { EventAttendance, Event, Club } from '../types';
import { formatDateTime, cn } from '../utils/helpers';

type AttendanceType = 'registered' | 'attended' | 'late' | 'absent' | 'cancelled';

export function AttendancePage() {
  const { profile } = useAuth();
  const [clubFilter, setClubFilter] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ registered: 0, attended: 0, late: 0, absent: 0, cancelled: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markAllStatus, setMarkAllStatus] = useState<'attended' | 'absent'>('attended');

  useEffect(() => {
    loadManagedClubs();
  }, [profile]);

  useEffect(() => {
    if (clubFilter) {
      loadEventsForClub();
    }
  }, [clubFilter]);

  useEffect(() => {
    if (selectedEvent) {
      loadAttendance();
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadManagedClubs = async () => {
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
        setClubFilter(managedClubs[0].id);
      }
    } catch (err) {
      console.error('Error loading clubs:', err);
      setError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const loadEventsForClub = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('club_id', clubFilter)
      .order('start_time', { ascending: false });

    if (data) {
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0]);
      }
    }
  };

  const loadAttendance = async () => {
    if (!selectedEvent) return;

    const { data } = await supabase
      .from('event_attendance')
      .select('*, profiles(*)')
      .eq('event_id', selectedEvent.id)
      .order('registered_at', { ascending: false });

    if (data) {
      setAttendance(data);
      calculateStats(data);
    }
  };

  const calculateStats = (data: EventAttendance[]) => {
    setStats({
      registered: data.filter((a) => a.status === 'registered').length,
      attended: data.filter((a) => a.status === 'attended').length,
      late: data.filter((a) => a.status === 'late').length,
      absent: data.filter((a) => a.status === 'absent').length,
      cancelled: data.filter((a) => a.status === 'cancelled').length,
    });
  };

  const updateAttendanceStatus = async (recordId: string, status: AttendanceType) => {
    setError(null);
    try {
      const updateData: { status: string; attended_at?: string | null } = { status };

      if (status === 'attended' || status === 'late') {
        updateData.attended_at = new Date().toISOString();
      } else if (status === 'absent' || status === 'registered') {
        updateData.attended_at = null;
      }

      const { error: updateError } = await supabase
        .from('event_attendance')
        .update(updateData)
        .eq('id', recordId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(`Marked as ${status}`);
        loadAttendance();
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError('Failed to update attendance');
    }
  };

  const handleMarkAll = async () => {
    if (!selectedEvent) return;

    setMarkingAll(true);
    setError(null);
    try {
      const registeredIds = attendance
        .filter((a) => a.status === 'registered')
        .map((a) => a.id);

      if (registeredIds.length === 0) {
        setError('No registered members to mark');
        setMarkingAll(false);
        return;
      }

      const updateData = {
        status: markAllStatus,
        attended_at: markAllStatus === 'attended' ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from('event_attendance')
        .update(updateData)
        .in('id', registeredIds);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowExportModal(false);
        setSuccess(`Marked ${registeredIds.length} members as ${markAllStatus}`);
        loadAttendance();
      }
    } catch (err) {
      console.error('Error marking all:', err);
      setError('Failed to mark all attendance');
    } finally {
      setMarkingAll(false);
    }
  };

  const exportToCSV = () => {
    if (!selectedEvent || attendance.length === 0) return;

    const headers = ['Name', 'Email', 'Status', 'Registered At', 'Attended At'];
    const rows = attendance.map((a) => [
      a.profiles?.full_name || '',
      a.profiles?.email || '',
      a.status,
      formatDateTime(a.registered_at),
      a.attended_at ? formatDateTime(a.attended_at) : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${selectedEvent.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setSuccess('Attendance exported successfully');
  };

  const attendanceRate = stats.attended + stats.late + stats.absent > 0
    ? Math.round(((stats.attended + stats.late) / (stats.attended + stats.late + stats.absent)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
        <Card>
          <EmptyState
            title="No managed clubs"
            description="You don't have permission to manage any clubs."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-500 mt-1">Track and manage event attendance</p>
        </div>
        {selectedEvent && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        )}
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
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Select
          options={clubs.map((c) => ({ value: c.id, label: c.name }))}
          value={clubFilter}
          onChange={(e) => {
            setClubFilter(e.target.value);
            setSelectedEvent(null);
          }}
          className="w-64"
          placeholder="Select Club"
        />
        <Select
          options={events.map((e) => ({
            value: e.id,
            label: `${e.title} (${formatDateTime(e.start_time)})`,
          }))}
          value={selectedEvent?.id || ''}
          onChange={(e) => {
            const event = events.find((ev) => ev.id === e.target.value);
            setSelectedEvent(event || null);
          }}
          className="flex-1"
          placeholder="Select Event"
        />
      </div>

      {selectedEvent && (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Registered"
              value={stats.registered}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title="Present"
              value={stats.attended}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <StatCard
              title="Late"
              value={stats.late}
              icon={<Clock className="h-5 w-5 text-orange-500" />}
            />
            <StatCard
              title="Absent"
              value={stats.absent}
              icon={<XCircle className="h-5 w-5" />}
            />
            <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
              <div className="text-center">
                <p className="text-3xl font-bold">{attendanceRate}%</p>
                <p className="text-sm text-white/80">Attendance Rate</p>
              </div>
            </Card>
          </div>

          {/* Attendance Summary Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Attendance Summary" subtitle={`Total: ${attendance.filter(a => a.status !== 'cancelled').length} registrations`} />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">Present</span>
                  </div>
                  <span className="text-sm font-medium">{stats.attended}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-sm text-gray-600">Late</span>
                  </div>
                  <span className="text-sm font-medium">{stats.late}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm text-gray-600">Absent</span>
                  </div>
                  <span className="text-sm font-medium">{stats.absent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-600">Not Recorded</span>
                  </div>
                  <span className="text-sm font-medium">{stats.registered}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-4 w-full rounded-full bg-gray-200 overflow-hidden flex">
                  {attendance.filter(a => a.status !== 'cancelled').length > 0 && (
                    <>
                      <div
                        className="bg-green-500"
                        style={{ width: `${(stats.attended / (attendance.filter(a => a.status !== 'cancelled').length)) * 100}%` }}
                      />
                      <div
                        className="bg-orange-500"
                        style={{ width: `${(stats.late / (attendance.filter(a => a.status !== 'cancelled').length)) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${(stats.absent / (attendance.filter(a => a.status !== 'cancelled').length)) * 100}%` }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Mark All Buttons */}
              {stats.registered > 0 && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMarkAllStatus('attended');
                      setShowExportModal(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark All Present
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMarkAllStatus('absent');
                      setShowExportModal(true);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Mark All Absent
                  </Button>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Event Details" />
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{selectedEvent.title}</p>
                <p className="text-sm text-gray-500">{formatDateTime(selectedEvent.start_time)}</p>
                {selectedEvent.location && (
                  <p className="text-sm text-gray-500">{selectedEvent.location}</p>
                )}
                {selectedEvent.max_attendees && (
                  <p className="text-sm text-gray-500">
                    <Users className="h-4 w-4 inline mr-1" />
                    {attendance.filter(a => a.status !== 'cancelled').length} / {selectedEvent.max_attendees} registered
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader title="Attendance Records" />
            {attendance.length === 0 ? (
              <EmptyState
                title="No registrations"
                description="No one has registered for this event yet."
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Member</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Registered</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Attended</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.filter(a => a.status !== 'cancelled').map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-medium text-white">
                            {record.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <span className="text-gray-900">{record.profiles?.full_name}</span>
                            <p className="text-xs text-gray-500">{record.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          record.status === 'attended' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        )}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateTime(record.registered_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {record.attended_at ? formatDateTime(record.attended_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {record.status === 'registered' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateAttendanceStatus(record.id, 'attended')}
                                title="Mark Present"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateAttendanceStatus(record.id, 'late')}
                                title="Mark Late"
                              >
                                <Clock className="h-4 w-4 text-orange-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateAttendanceStatus(record.id, 'absent')}
                                title="Mark Absent"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {(record.status === 'attended' || record.status === 'late' || record.status === 'absent') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateAttendanceStatus(record.id, 'registered')}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {!selectedEvent && clubFilter && events.length === 0 && (
        <Card>
          <EmptyState title="No events" description="This club has no events yet." />
        </Card>
      )}

      {/* Export/Mark All Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={stats.registered > 0 ? `Mark All as ${markAllStatus === 'attended' ? 'Present' : 'Absent'}` : "Export Attendance"}
      >
        <div className="space-y-4">
          {stats.registered > 0 ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  This will mark all {stats.registered} registered members as {markAllStatus}.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkAll}
                  loading={markingAll}
                  variant={markAllStatus === 'absent' ? 'danger' : 'primary'}
                >
                  Confirm
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Export attendance data for <strong>{selectedEvent?.title}</strong> as CSV.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>
                  Cancel
                </Button>
                <Button onClick={exportToCSV}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
