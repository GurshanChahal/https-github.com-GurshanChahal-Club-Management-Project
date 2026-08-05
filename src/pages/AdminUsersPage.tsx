import { useState, useEffect } from 'react';
import { Search, Shield, Users, Building2, Check, X, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import type { Profile, LeaveRequest, RoleRequest, Membership } from '../types';
import { formatDate, getRoleColor, getMembershipRoleLabel } from '../utils/helpers';

export function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState('');
  const [updating, setUpdating] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [memberships, setMemberships] = useState<Record<string, Membership>>({});
  const [processing, setProcessing] = useState(false);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadRequests();
  }, [searchQuery, roleFilter, profile]);

  useEffect(() => {
    if (reqSuccess || reqError) {
      const timer = setTimeout(() => {
        setReqSuccess(null);
        setReqError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reqSuccess, reqError]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        let filtered = data;
        if (searchQuery) {
          filtered = data.filter(
            (u) =>
              u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        if (roleFilter) {
          filtered = filtered.filter((u) => u.role === roleFilter);
        }
        setUsers(filtered);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    if (!profile) return;
    try {
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*, profiles(*), clubs(*)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      setLeaveRequests(leaveData || []);

      const { data: roleData } = await supabase
        .from('role_requests')
        .select('*, profiles(*), clubs(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setRoleRequests(roleData || []);

      const { data: allMemberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('status', 'active');

      if (allMemberships) {
        const membershipMap: Record<string, Membership> = {};
        allMemberships.forEach((m: Membership) => {
          membershipMap[`${m.user_id}_${m.club_id}`] = m;
        });
        setMemberships(membershipMap);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole })
        .eq('id', selectedUser.id);

      if (!error) {
        setShowEditModal(false);
        loadUsers();
      }
    } catch (err) {
      console.error('Error updating role:', err);
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setShowEditModal(true);
  };

  const handleApproveLeave = async (request: LeaveRequest) => {
    setProcessing(true);
    setReqError(null);
    try {
      await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      await supabase
        .from('memberships')
        .update({ status: 'inactive' })
        .eq('user_id', request.user_id)
        .eq('club_id', request.club_id);

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Leave Request Approved',
        message: `Your request to leave ${request.clubs?.name} has been approved.`,
        type: 'leave_request',
        reference_id: request.id,
        reference_type: 'leave_request',
      });

      setReqSuccess(`Leave request approved for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error approving leave:', err);
      setReqError('Failed to approve leave request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectLeave = async (request: LeaveRequest) => {
    setProcessing(true);
    setReqError(null);
    try {
      await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Leave Request Update',
        message: `Your request to leave ${request.clubs?.name} was not approved.`,
        type: 'leave_request',
        reference_id: request.id,
        reference_type: 'leave_request',
      });

      setReqSuccess(`Leave request rejected for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setReqError('Failed to reject leave request');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRole = async (request: RoleRequest) => {
    setProcessing(true);
    setReqError(null);
    try {
      await supabase
        .from('role_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      await supabase
        .from('memberships')
        .update({ role: request.requested_role })
        .eq('user_id', request.user_id)
        .eq('club_id', request.club_id);

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Role Request Approved',
        message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${request.clubs?.name} has been approved.`,
        type: 'role_request',
        reference_id: request.id,
        reference_type: 'role_request',
      });

      setReqSuccess(`Role request approved for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error approving role request:', err);
      setReqError('Failed to approve role request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRole = async (request: RoleRequest) => {
    setProcessing(true);
    setReqError(null);
    try {
      await supabase
        .from('role_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Role Request Update',
        message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${request.clubs?.name} was not approved.`,
        type: 'role_request',
        reference_id: request.id,
        reference_type: 'role_request',
      });

      setReqSuccess(`Role request rejected for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error rejecting role request:', err);
      setReqError('Failed to reject role request');
    } finally {
      setProcessing(false);
    }
  };

  const hasPendingRequests = leaveRequests.length > 0 || roleRequests.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage user accounts, permissions, and pending requests</p>
      </div>

      {reqSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{reqSuccess}</p>
        </div>
      )}
      {reqError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{reqError}</p>
        </div>
      )}

      {/* Pending Requests Section */}
      {hasPendingRequests && (
        <div className="space-y-4">
          {leaveRequests.length > 0 && (
            <Card padding="none">
              <div className="border-b border-gray-200 bg-orange-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <h3 className="text-sm font-semibold text-orange-900">
                    Pending Leave Requests ({leaveRequests.length})
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">User</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Club</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaveRequests.map((request) => {
                      const membership = memberships[`${request.user_id}_${request.club_id}`];
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                            <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                          </td>
                          <td className="px-4 py-2">
                            {membership && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(membership.role)}`}>
                                {getMembershipRoleLabel(membership.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-700">{request.clubs?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">
                            {request.reason || 'No reason provided'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" onClick={() => handleApproveLeave(request)} disabled={processing}>
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectLeave(request)} disabled={processing}>
                                <X className="h-3 w-3 text-red-600" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {roleRequests.length > 0 && (
            <Card padding="none">
              <div className="border-b border-gray-200 bg-purple-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900">
                    Pending Role Requests ({roleRequests.length})
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">User</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Current</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Requested</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Club</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roleRequests.map((request) => {
                      const membership = memberships[`${request.user_id}_${request.club_id}`];
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                            <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                          </td>
                          <td className="px-4 py-2">
                            {membership && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(membership.role)}`}>
                                {getMembershipRoleLabel(membership.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(request.requested_role)}`}>
                              {getMembershipRoleLabel(request.requested_role)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-700">{request.clubs?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" onClick={() => handleApproveRole(request)} disabled={processing}>
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectRole(request)} disabled={processing}>
                                <X className="h-3 w-3 text-red-600" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* User Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All Roles' },
            { value: 'admin', label: 'Administrator' },
            { value: 'manager', label: 'Manager' },
            { value: 'member', label: 'Member' },
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-40"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState title="No users found" icon={<Users className="h-12 w-12" />} />
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Student ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.student_id || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>
                      <Shield className="h-4 w-4" />
                      Edit Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User Role"
      >
        <div className="space-y-4">
          {selectedUser && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
          )}

          <Select
            label="Role"
            options={[
              { value: 'admin', label: 'Administrator' },
              { value: 'manager', label: 'Manager' },
              { value: 'member', label: 'Member' },
            ]}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} loading={updating}>
              Update Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
