import { useState, useEffect } from 'react';
import { Send, Users, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import { Input } from '../components/common/Input';
import type { Club, Event, Profile } from '../types';
import { formatDateTime } from '../utils/helpers';

type RecipientType = 'all_members' | 'club_members' | 'event_attendees' | 'all_managers' | 'specific_users';

export function SendNotificationsPage() {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [recipientType, setRecipientType] = useState<RecipientType>('all_members');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const isAdmin = profile.role === 'admin';

      if (isAdmin) {
        // Admin can see all clubs and events
        const { data: clubsData } = await supabase
          .from('clubs')
          .select('*')
          .eq('is_active', true);
        setClubs(clubsData || []);

        const { data: eventsData } = await supabase
          .from('events')
          .select('*, clubs(name)')
          .order('start_time', { ascending: false });
        setEvents(eventsData || []);

        // Load all users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_active', true)
          .order('full_name');
        setUsers(usersData || []);
      } else {
        // Manager can only see their clubs
        const { data: membershipsData } = await supabase
          .from('memberships')
          .select('*, clubs(*)')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .in('role', ['president', 'vice_president', 'treasurer', 'manager']);

        const managedClubs = membershipsData?.map(m => m.clubs as Club).filter(Boolean) || [];
        setClubs(managedClubs);

        // Load events for managed clubs
        if (managedClubs.length > 0) {
          const clubIds = managedClubs.map(c => c.id);
          const { data: eventsData } = await supabase
            .from('events')
            .select('*, clubs(name)')
            .in('club_id', clubIds)
            .order('start_time', { ascending: false });
          setEvents(eventsData || []);
        }

        // Load users for managed clubs
        if (managedClubs.length > 0) {
          const { data: membersData } = await supabase
            .from('memberships')
            .select('profiles(*)')
            .in('club_id', managedClubs.map(c => c.id))
            .eq('status', 'active');

          const uniqueUsers = new Map<string, Profile>();
          membersData?.forEach((m) => {
            const p = m.profiles as Profile | Profile[] | null;
            if (p && !Array.isArray(p) && !uniqueUsers.has(p.id)) {
              uniqueUsers.set(p.id, p);
            }
          });
          setUsers(Array.from(uniqueUsers.values()));
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !title || !message) return;

    setSending(true);
    setError(null);

    try {
      let recipientUserIds: string[] = [];
      const isAdmin = profile.role === 'admin';

      switch (recipientType) {
        case 'all_members':
          if (!isAdmin) {
            setError('Only administrators can send to all members');
            setSending(false);
            return;
          }
          recipientUserIds = users.map(u => u.id);
          break;

        case 'all_managers':
          if (!isAdmin) {
            setError('Only administrators can send to all managers');
            setSending(false);
            return;
          }
          recipientUserIds = users.filter(u => u.role === 'manager').map(u => u.id);
          break;

        case 'club_members':
          if (!selectedClubId) {
            setError('Please select a club');
            setSending(false);
            return;
          }
          // Check if user can access this club (for managers)
          if (!isAdmin) {
            const hasAccess = clubs.some(c => c.id === selectedClubId);
            if (!hasAccess) {
              setError('You do not have access to this club');
              setSending(false);
              return;
            }
          }
          {
            const { data: clubMembers } = await supabase
              .from('memberships')
              .select('user_id')
              .eq('club_id', selectedClubId)
              .eq('status', 'active');
            recipientUserIds = clubMembers?.map(m => m.user_id) || [];
          }
          break;

        case 'event_attendees':
          if (!selectedEventId) {
            setError('Please select an event');
            setSending(false);
            return;
          }
          // Check if user can access this event (for managers)
          if (!isAdmin) {
            const eventData = events.find(e => e.id === selectedEventId);
            if (!eventData || !clubs.some(c => c.id === eventData.club_id)) {
              setError('You do not have access to this event');
              setSending(false);
              return;
            }
          }
          {
            const { data: eventAttendees } = await supabase
              .from('event_attendance')
              .select('user_id')
              .eq('event_id', selectedEventId)
              .neq('status', 'cancelled');
            recipientUserIds = eventAttendees?.map(a => a.user_id) || [];
          }
          break;

        case 'specific_users':
          if (selectedUserIds.length === 0) {
            setError('Please select at least one user');
            setSending(false);
            return;
          }
          recipientUserIds = selectedUserIds;
          break;
      }

      // Remove duplicates and current user
      recipientUserIds = [...new Set(recipientUserIds)].filter(id => id !== profile.id);

      if (recipientUserIds.length === 0) {
        setError('No recipients found');
        setSending(false);
        return;
      }

      // Create notifications
      const notifications = recipientUserIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type: 'announcement' as const,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess(`Notification sent to ${recipientUserIds.length} recipients`);
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-gray-500 mt-1">
          {isAdmin
            ? 'Send announcements to members and managers across all clubs'
            : 'Send announcements to members of your managed clubs'}
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSendNotification} className="space-y-6">
          {/* Recipient Type */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Send to <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {isAdmin && (
                <>
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="recipientType"
                      value="all_members"
                      checked={recipientType === 'all_members'}
                      onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">All Members</p>
                      <p className="text-xs text-gray-500">Send to all registered members</p>
                    </div>
                    <Users className="h-5 w-5 text-gray-400 ml-auto" />
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="recipientType"
                      value="all_managers"
                      checked={recipientType === 'all_managers'}
                      onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">All Managers</p>
                      <p className="text-xs text-gray-500">Send to all club managers</p>
                    </div>
                    <Users className="h-5 w-5 text-gray-400 ml-auto" />
                  </label>
                </>
              )}

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="recipientType"
                  value="club_members"
                  checked={recipientType === 'club_members'}
                  onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Club Members</p>
                  <p className="text-xs text-gray-500">Send to members of a specific club</p>
                </div>
                <Building2 className="h-5 w-5 text-gray-400 ml-auto" />
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="recipientType"
                  value="event_attendees"
                  checked={recipientType === 'event_attendees'}
                  onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Event Attendees</p>
                  <p className="text-xs text-gray-500">Send to people registered for an event</p>
                </div>
                <Users className="h-5 w-5 text-gray-400 ml-auto" />
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="recipientType"
                  value="specific_users"
                  checked={recipientType === 'specific_users'}
                  onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Specific Users</p>
                  <p className="text-xs text-gray-500">Select individual recipients</p>
                </div>
                <Users className="h-5 w-5 text-gray-400 ml-auto" />
              </label>
            </div>
          </div>

          {/* Club Selection */}
          {recipientType === 'club_members' && (
            <Select
              label="Select Club"
              required
              options={clubs.map(c => ({ value: c.id, label: c.name }))}
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              placeholder="Choose a club"
            />
          )}

          {/* Event Selection */}
          {recipientType === 'event_attendees' && (
            <Select
              label="Select Event"
              required
              options={events.map(e => ({
                value: e.id,
                label: `${e.title} (${e.clubs?.name || 'Unknown Club'} - ${formatDateTime(e.start_time)})`,
              }))}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              placeholder="Choose an event"
            />
          )}

          {/* User Selection */}
          {recipientType === 'specific_users' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Recipients
              </label>
              <div className="max-h-60 overflow-y-auto rounded-lg border p-2">
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 p-2">No users available</p>
                ) : (
                  users.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-medium text-white">
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  {selectedUserIds.length} recipient(s) selected
                </p>
              )}
            </div>
          )}

          {/* Notification Content */}
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />

          <Textarea
            label="Message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your notification message..."
            rows={4}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitle('');
                setMessage('');
                setSelectedUserIds([]);
              }}
            >
              Clear
            </Button>
            <Button type="submit" loading={sending} disabled={!title || !message}>
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
