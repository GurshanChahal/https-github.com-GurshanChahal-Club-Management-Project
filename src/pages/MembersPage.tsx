import { useState, useEffect } from 'react';
import { Search, Users, Check, Bell, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Tabs } from '../components/common/Table';
import type { Membership, Club } from '../types';
import { formatDate, getRoleColor, getStatusColor, getMembershipRoleLabel } from '../utils/helpers';
import { MEMBERSHIP_ROLES } from '../utils/storage';

export function MembersPage() {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null);
  const [updateFormData, setUpdateFormData] = useState({ role: '', status: '' });
  const [updating, setUpdating] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<{ type: 'all' | 'event'; eventId?: string; eventName?: string } | null>(null);
  const [notifyMessage, setNotifyMessage] = useState({ title: '', message: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemberships();
  }, [profile, searchQuery, statusFilter, clubFilter, activeTab]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadMemberships = async () => {
    if (!profile) return;

    setLoading(true);
    console.log('Loading memberships for profile:', profile.email, 'role:', profile.role);

    try {
      const isAdmin = profile.role === 'admin';
      console.log('Is admin:', isAdmin);

      // Load clubs user can manage
      let managedClubs: Club[] = [];

      if (isAdmin) {
        // Admin can see all clubs
        const { data: allClubs, error: clubsError } = await supabase
          .from('clubs')
          .select('*');

        console.log('All clubs:', allClubs, 'Error:', clubsError);
        managedClubs = allClubs || [];
      } else {
        // Get clubs where user is a manager
        const { data: managerMemberships, error: mmError } = await supabase
          .from('memberships')
          .select('*, clubs(*)')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .in('role', ['president', 'vice_president', 'treasurer', 'secretary', 'manager']);

        console.log('Manager memberships:', managerMemberships, 'Error:', mmError);
        managedClubs = managerMemberships?.map((m) => m.clubs as Club).filter(Boolean) || [];
      }

      setClubs(managedClubs);
      console.log('Managed clubs count:', managedClubs.length);

      if (managedClubs.length === 0 && !isAdmin) {
        setMemberships([]);
        setLoading(false);
        return;
      }

      // Query memberships
      let query = supabase
        .from('memberships')
        .select('*, profiles(*), clubs(*)')
        .order('created_at', { ascending: false });

      // For non-admins, filter to only their managed clubs
      if (!isAdmin && managedClubs.length > 0) {
        const clubIds = managedClubs.map((c) => c.id);
        query = query.in('club_id', clubIds);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (clubFilter) {
        query = query.eq('club_id', clubFilter);
      }

      // Filter by tab
      if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeTab === 'active') {
        query = query.eq('status', 'active');
      }

      const { data, error: queryError } = await query;

      console.log('Memberships query result:', data, 'Error:', queryError);

      if (queryError) {
        console.error('Query error:', queryError);
        setError('Failed to load members: ' + queryError.message);
      } else if (data) {
        // Client-side search filter
        let filtered = data;
        if (searchQuery) {
          filtered = data.filter(
            (m) =>
              m.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        console.log('Filtered memberships:', filtered.length);
        setMemberships(filtered);
      }
    } catch (err) {
      console.error('Error loading memberships:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setUpdating(true);
    setError(null);
    try {
      const updateData: { role: string; status: string; joined_date?: string } = {
        role: updateFormData.role,
        status: updateFormData.status,
      };

      if (updateFormData.status === 'active' && !selectedMember.joined_date) {
        updateData.joined_date = new Date().toISOString().split('T')[0];
      }

      const { error: updateError } = await supabase
        .from('memberships')
        .update(updateData)
        .eq('id', selectedMember.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowUpdateModal(false);
        setSelectedMember(null);
        setSuccess(updateFormData.status === 'active' && selectedMember.status === 'pending'
          ? 'Membership approved successfully'
          : 'Member updated successfully');
        loadMemberships();

        // Create notification for the user
        if (selectedMember.user_id) {
          const actionText = updateFormData.status === 'active' && selectedMember.status === 'pending'
            ? 'approved' : updateFormData.status === 'rejected' ? 'rejected' : 'updated';

          await supabase.from('notifications').insert({
            user_id: selectedMember.user_id,
            title: 'Membership Update',
            message: `Your membership in ${selectedMember.clubs?.name} has been ${actionText}.`,
            type: 'membership',
            reference_id: selectedMember.id,
            reference_type: 'membership',
          });
        }
      }
    } catch (err) {
      console.error('Error updating member:', err);
      setError('Failed to update member');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (member: Membership) => {
    setSelectedMember(member);
    setUpdateFormData({ role: member.role, status: member.status });
    setShowUpdateModal(true);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTarget || !notifyMessage.title || !notifyMessage.message) return;

    setSending(true);
    setError(null);
    try {
      // Get target users based on notification type
      let targetUserIds: string[] = [];

      if (notifyTarget.type === 'all') {
        // Get all active members of the selected club
        const { data: clubMembers } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('club_id', clubFilter)
          .eq('status', 'active');
        targetUserIds = clubMembers?.map(m => m.user_id).filter(Boolean) || [];
      } else if (notifyTarget.type === 'event' && notifyTarget.eventId) {
        // Get all registered users for the event
        const { data: eventAttendees } = await supabase
          .from('event_attendance')
          .select('user_id')
          .eq('event_id', notifyTarget.eventId)
          .neq('status', 'cancelled');
        targetUserIds = eventAttendees?.map(a => a.user_id).filter(Boolean) || [];
      }

      if (targetUserIds.length === 0) {
        setError('No recipients found');
        setSending(false);
        return;
      }

      // Create notifications for all recipients
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: notifyMessage.title,
        message: notifyMessage.message,
        type: 'announcement' as const,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        setError(insertError.message);
      } else {
        setShowNotifyModal(false);
        setNotifyMessage({ title: '', message: '' });
        setNotifyTarget(null);
        setSuccess(`Notification sent to ${targetUserIds.length} members`);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const activeCount = memberships.filter((m) => m.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-500 mt-1">Manage club memberships and roles</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'banned', label: 'Banned' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          options={[{ value: '', label: 'All Clubs' }, ...clubs.map((c) => ({ value: c.id, label: c.name }))]}
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        {clubFilter && (
          <Button
            variant="outline"
            onClick={() => {
              setNotifyTarget({ type: 'all' });
              setShowNotifyModal(true);
            }}
          >
            <Bell className="h-4 w-4" />
            Notify All
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All Members', count: memberships.length },
          { key: 'active', label: 'Active', count: activeCount },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : memberships.length === 0 ? (
        <Card>
          <EmptyState
            title="No members found"
            description={clubs.length === 0 ? "You don't manage any clubs." : "No club memberships match your criteria."}
            icon={<Users className="h-12 w-12" />}
          />
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Member</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Club</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberships.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 font-medium text-white">
                        {member.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{member.profiles?.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{member.clubs?.name}</td>
                  <td className="px-4 py-3">
                    <Badge className={getRoleColor(member.role)}>{getMembershipRoleLabel(member.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.joined_date ? formatDate(member.joined_date) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openUpdateModal(member)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Update Member Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Update Member"
        size="md"
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          {selectedMember && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{selectedMember.profiles?.full_name}</p>
              <p className="text-sm text-gray-500">{selectedMember.profiles?.email}</p>
              <p className="text-sm text-gray-500">{selectedMember.clubs?.name}</p>
            </div>
          )}

          <Select
            label="Role"
            options={MEMBERSHIP_ROLES}
            value={updateFormData.role}
            onChange={(e) => setUpdateFormData({ ...updateFormData, role: e.target.value })}
          />

          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'banned', label: 'Banned' },
            ]}
            value={updateFormData.status}
            onChange={(e) => setUpdateFormData({ ...updateFormData, status: e.target.value })}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updating}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        isOpen={showNotifyModal}
        onClose={() => {
          setShowNotifyModal(false);
          setNotifyTarget(null);
          setNotifyMessage({ title: '', message: '' });
        }}
        title="Send Notification"
        size="lg"
      >
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              <strong>Recipients:</strong>{' '}
              {notifyTarget?.type === 'all'
                ? `All active members of ${clubs.find(c => c.id === clubFilter)?.name}`
                : notifyTarget?.eventName
                  ? `All registered attendees of ${notifyTarget.eventName}`
                  : 'No recipients selected'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={notifyMessage.title}
              onChange={(e) => setNotifyMessage({ ...notifyMessage, title: e.target.value })}
              placeholder="Notification title"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={notifyMessage.message}
              onChange={(e) => setNotifyMessage({ ...notifyMessage, message: e.target.value })}
              placeholder="Enter your message..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowNotifyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={sending}>
              <Bell className="h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
