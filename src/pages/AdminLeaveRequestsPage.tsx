import { useState, useEffect } from 'react';
import { Check, X, Users, Building2, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import type { LeaveRequest, Membership, RoleRequest } from '../types';
import { formatDate, getRoleColor, getMembershipRoleLabel } from '../utils/helpers';

type TabType = 'leave' | 'role';

export function AdminLeaveRequestsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('leave');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [memberships, setMemberships] = useState<Record<string, Membership>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
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

  const loadRequests = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Load pending leave requests
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*, profiles(*), clubs(*)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      setLeaveRequests(leaveData || []);

      // Load pending role requests
      const { data: roleData } = await supabase
        .from('role_requests')
        .select('*, profiles(*), clubs(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setRoleRequests(roleData || []);

      // Load membership info for each request to determine role
      const { data: allMemberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('status', 'active');

      if (allMemberships) {
        const membershipMap: Record<string, Membership> = {};
        allMemberships.forEach(m => {
          membershipMap[`${m.user_id}_${m.club_id}`] = m;
        });
        setMemberships(membershipMap);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (request: LeaveRequest) => {
    setProcessing(true);
    setError(null);
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

      setSuccess(`Leave request approved for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error approving leave:', err);
      setError('Failed to approve leave request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectLeave = async (request: LeaveRequest) => {
    setProcessing(true);
    setError(null);
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

      setSuccess(`Leave request rejected for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setError('Failed to reject leave request');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRole = async (request: RoleRequest) => {
    setProcessing(true);
    setError(null);
    try {
      // Update role request status
      await supabase
        .from('role_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      // Update the membership role
      await supabase
        .from('memberships')
        .update({ role: request.requested_role })
        .eq('user_id', request.user_id)
        .eq('club_id', request.club_id);

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Role Request Approved',
        message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${request.clubs?.name} has been approved.`,
        type: 'role_request',
        reference_id: request.id,
        reference_type: 'role_request',
      });

      setSuccess(`Role request approved for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error approving role request:', err);
      setError('Failed to approve role request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRole = async (request: RoleRequest) => {
    setProcessing(true);
    setError(null);
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

      setSuccess(`Role request rejected for ${request.profiles?.full_name}`);
      loadRequests();
    } catch (err) {
      console.error('Error rejecting role request:', err);
      setError('Failed to reject role request');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave & Role Requests</h1>
        <p className="text-gray-500 mt-1">
          Review and approve leave requests and role elevation requests
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('leave')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'leave'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          Leave Requests
          {leaveRequests.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-700">
              {leaveRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('role')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'role'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCog className="h-4 w-4" />
          Role Requests
          {roleRequests.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-100 px-1.5 text-xs font-semibold text-purple-700">
              {roleRequests.length}
            </span>
          )}
        </button>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leave' && (
        <>
          {leaveRequests.length === 0 ? (
            <Card>
              <EmptyState
                title="No pending leave requests"
                description="There are no pending manager leave requests to review."
                icon={<Users className="h-12 w-12" />}
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Club</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Reason</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Requested</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaveRequests.map((request) => {
                      const membership = memberships[`${request.user_id}_${request.club_id}`];
                      return (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-medium text-white">
                                {request.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                                <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {membership && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(membership.role)}`}>
                                {getMembershipRoleLabel(membership.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{request.clubs?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                            {request.reason || 'No reason provided'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(request.requested_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveLeave(request)}
                                disabled={processing}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectLeave(request)}
                                disabled={processing}
                              >
                                <X className="h-4 w-4 text-red-600" />
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
        </>
      )}

      {/* Role Requests Tab */}
      {activeTab === 'role' && (
        <>
          {roleRequests.length === 0 ? (
            <Card>
              <EmptyState
                title="No pending role requests"
                description="There are no pending role elevation requests to review."
                icon={<UserCog className="h-12 w-12" />}
              />
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Current Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Requested Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Club</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notes</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Requested</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roleRequests.map((request) => {
                      const membership = memberships[`${request.user_id}_${request.club_id}`];
                      return (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-medium text-white">
                                {request.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                                <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {membership && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(membership.role)}`}>
                                {getMembershipRoleLabel(membership.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(request.requested_role)}`}>
                              {getMembershipRoleLabel(request.requested_role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{request.clubs?.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                            {request.notes || 'No notes provided'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveRole(request)}
                                disabled={processing}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRole(request)}
                                disabled={processing}
                              >
                                <X className="h-4 w-4 text-red-600" />
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
        </>
      )}
    </div>
  );
}
