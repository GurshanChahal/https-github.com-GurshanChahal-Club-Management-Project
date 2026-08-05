import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Mail,
  Globe,
  Clock,
  ArrowLeft,
  Edit,
  UserPlus,
  Check,
  X,
  Shield,
  Star,
  Send,
  Hourglass,
  LogOut,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Tabs } from '../components/common/Table';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import type { Club, Membership, Event, Profile, RoleRequest, EventFeedback, LeaveRequest, EventAttendance } from '../types';
import { formatDateTime, formatDate, getRoleColor, getStatusColor, getMembershipRoleLabel } from '../utils/helpers';
import { MEMBERSHIP_ROLES } from '../utils/storage';

export function ClubDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showRequestRoleModal, setShowRequestRoleModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('manager');
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [userRoleRequest, setUserRoleRequest] = useState<RoleRequest | null>(null);
  const [userLeaveRequest, setUserLeaveRequest] = useState<LeaveRequest | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    if (id) {
      loadClubData();
    }
  }, [id, profile]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadClubData = async () => {
    setLoading(true);
    try {
      // Load club
      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clubData) {
        setClub(clubData);
      }

      // Load members
      const { data: membersData } = await supabase
        .from('memberships')
        .select('*, profiles(*)')
        .eq('club_id', id)
        .order('role', { ascending: true });

      if (membersData) {
        setMembers(membersData);
      }

      // Load events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('club_id', id)
        .order('start_time', { ascending: true });

      if (eventsData) {
        setEvents(eventsData);
      }

      // Check user's membership
      if (profile) {
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('*')
          .eq('club_id', id)
          .eq('user_id', profile.id)
          .maybeSingle();

        setUserMembership(membershipData);

        // Check for user's pending role request
        const { data: roleRequestData } = await supabase
          .from('role_requests')
          .select('*')
          .eq('club_id', id)
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .maybeSingle();

        setUserRoleRequest(roleRequestData);

        // Check for user's pending leave request
        const { data: leaveRequestData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('club_id', id)
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .maybeSingle();

        setUserLeaveRequest(leaveRequestData);
      }

      // Load role requests for admin
      if (profile?.role === 'admin') {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name');
        setAllUsers(usersData || []);

        // Load all pending role requests for this club
        const { data: requestsData } = await supabase
          .from('role_requests')
          .select('*, profiles(*), clubs(*)')
          .eq('club_id', id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setRoleRequests(requestsData || []);

        // Load all pending leave requests for this club
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*, profiles(*), clubs(*)')
          .eq('club_id', id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false });
        setLeaveRequests(leaveData || []);
      }

      // Load leave requests for club managers
      const isManager = userMembership && ['president', 'vice_president', 'treasurer', 'manager'].includes(userMembership.role);
      if (isManager) {
        const { data: leaveData } = await supabase
          .from('leave_requests')
          .select('*, profiles(*), clubs(*)')
          .eq('club_id', id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false });
        setLeaveRequests(leaveData || []);
      }
    } catch (err) {
      console.error('Error loading club:', err);
      setError('Failed to load club data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!profile || !id) return;

    setJoining(true);
    try {
      const { error: insertError } = await supabase.from('memberships').insert({
        user_id: profile.id,
        club_id: id,
        role: 'member',
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setShowJoinModal(false);
        setSuccess('You have joined this club!');
        loadClubData();
      }
    } catch (err) {
      console.error('Error joining club:', err);
      setError('Failed to submit request');
    } finally {
      setJoining(false);
    }
  };

  const handleRequestRole = async () => {
    if (!profile || !id || !selectedRole) return;

    setAdding(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('role_requests').insert({
        user_id: profile.id,
        club_id: id,
        requested_role: selectedRole,
        status: 'pending',
        notes: requestNotes || null,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You already have a pending request for this role');
        } else {
          setError(insertError.message);
        }
      } else {
        // Notify all admins AND club managers about the role request
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        const { data: clubManagers } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('club_id', id)
          .eq('status', 'active')
          .in('role', ['president', 'vice_president', 'treasurer', 'manager']);

        const recipientIds = new Set<string>();
        (admins || []).forEach(a => recipientIds.add(a.id));
        (clubManagers || []).forEach(m => recipientIds.add(m.user_id));
        // Don't notify yourself
        recipientIds.delete(profile.id);

        if (recipientIds.size > 0) {
          const notifications = Array.from(recipientIds).map(uid => ({
            user_id: uid,
            title: 'Role Request',
            message: `${profile.full_name} has requested to become ${getMembershipRoleLabel(selectedRole)} of ${club?.name}. Approval required.`,
            type: 'role_request',
            reference_id: id,
            reference_type: 'role_request',
          }));

          await supabase.from('notifications').insert(notifications);
        }

        setShowRequestRoleModal(false);
        setSuccess('Role request submitted successfully. An admin will review your request.');
        setRequestNotes('');
        setSelectedRole('manager');
        loadClubData();
      }
    } catch (err) {
      console.error('Error requesting role:', err);
      setError('Failed to submit role request');
    } finally {
      setAdding(false);
    }
  };

  const handleAddManager = async () => {
    if (!selectedUserId || !id) return;

    setAdding(true);
    setError(null);
    try {
      const existing = members.find(m => m.user_id === selectedUserId);

      if (existing) {
        const { error: updateError } = await supabase
          .from('memberships')
          .update({ role: selectedRole, status: 'active' })
          .eq('id', existing.id);

        if (updateError) {
          setError(updateError.message);
        } else {
          setSuccess(`User role updated to ${selectedRole}`);
          setShowAddManagerModal(false);
          loadClubData();
        }
      } else {
        const { error: insertError } = await supabase.from('memberships').insert({
          user_id: selectedUserId,
          club_id: id,
          role: selectedRole,
          status: 'active',
          joined_date: new Date().toISOString().split('T')[0],
        });

        if (insertError) {
          setError(insertError.message);
        } else {
          setSuccess(`${selectedRole} added successfully`);
          setShowAddManagerModal(false);
          loadClubData();
        }
      }
    } catch (err) {
      console.error('Error adding manager:', err);
      setError('Failed to assign role');
    } finally {
      setAdding(false);
    }
  };

  const handleApproveRoleRequest = async (request: RoleRequest) => {
    setAdding(true);
    setError(null);
    try {
      // Check if user already has membership
      const existing = members.find(m => m.user_id === request.user_id);

      if (existing) {
        // Update existing membership role
        const { error: updateError } = await supabase
          .from('memberships')
          .update({ role: request.requested_role, status: 'active' })
          .eq('id', existing.id);

        if (updateError) {
          setError(updateError.message);
        } else {
          // Update role request status
          await supabase
            .from('role_requests')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: profile?.id,
            })
            .eq('id', request.id);

          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: request.user_id,
            title: 'Role Request Approved',
            message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${club?.name} has been approved!`,
            type: 'role_request',
            reference_id: request.id,
            reference_type: 'role_request',
          });

          setSuccess(`Role request approved for ${request.profiles?.full_name}`);
          loadClubData();
        }
      } else {
        // Create new membership
        const { error: insertError } = await supabase.from('memberships').insert({
          user_id: request.user_id,
          club_id: id,
          role: request.requested_role,
          status: 'active',
          joined_date: new Date().toISOString().split('T')[0],
        });

        if (insertError) {
          setError(insertError.message);
        } else {
          // Update role request status
          await supabase
            .from('role_requests')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: profile?.id,
            })
            .eq('id', request.id);

          // Send notification to user
          await supabase.from('notifications').insert({
            user_id: request.user_id,
            title: 'Role Request Approved',
            message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${club?.name} has been approved!`,
            type: 'role_request',
            reference_id: request.id,
            reference_type: 'role_request',
          });

          setSuccess(`Role request approved for ${request.profiles?.full_name}`);
          loadClubData();
        }
      }
    } catch (err) {
      console.error('Error approving role request:', err);
      setError('Failed to approve role request');
    } finally {
      setAdding(false);
    }
  };

  const handleRejectRoleRequest = async (request: RoleRequest) => {
    setAdding(true);
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

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Role Request Update',
        message: `Your request to become ${getMembershipRoleLabel(request.requested_role)} of ${club?.name} was not approved at this time.`,
        type: 'role_request',
        reference_id: request.id,
        reference_type: 'role_request',
      });

      setSuccess(`Role request rejected for ${request.profiles?.full_name}`);
      loadClubData();
    } catch (err) {
      console.error('Error rejecting role request:', err);
      setError('Failed to reject role request');
    } finally {
      setAdding(false);
    }
  };

  const handleQuickApprove = async (member: Membership) => {
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        status: 'active',
        joined_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', member.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(`${member.profiles?.full_name} approved`);
      loadClubData();
    }
  };

  const handleQuickReject = async (member: Membership) => {
    const { error: updateError } = await supabase
      .from('memberships')
      .update({ status: 'rejected' })
      .eq('id', member.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(`${member.profiles?.full_name} rejected`);
      loadClubData();
    }
  };

  const handleRequestLeave = async () => {
    if (!profile || !id || !userMembership) return;

    setAdding(true);
    setError(null);
    try {
      const isManagerLeave = ['president', 'vice_president', 'treasurer', 'manager'].includes(userMembership.role);

      if (isManagerLeave) {
        // Managers must request admin approval before leaving
        const { error: insertError } = await supabase.from('leave_requests').insert({
          user_id: profile.id,
          club_id: id,
          reason: leaveReason || null,
          status: 'pending',
        });

        if (insertError) {
          if (insertError.code === '23505') {
            setError('You already have a pending leave request for this club');
          } else {
            setError(insertError.message);
          }
          return;
        }

        // Notify all admins AND other club managers about the leave request
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        const { data: clubManagers } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('club_id', id)
          .eq('status', 'active')
          .in('role', ['president', 'vice_president', 'treasurer', 'manager']);

        const recipientIds = new Set<string>();
        (admins || []).forEach(a => recipientIds.add(a.id));
        (clubManagers || []).forEach(m => recipientIds.add(m.user_id));
        // Don't notify yourself
        recipientIds.delete(profile.id);

        if (recipientIds.size > 0) {
          const notifications = Array.from(recipientIds).map(uid => ({
            user_id: uid,
            title: 'Manager Leave Request',
            message: `${profile.full_name} (${getMembershipRoleLabel(userMembership.role)}) has requested to leave ${club?.name}. Approval required.`,
            type: 'leave_request',
            reference_id: id,
            reference_type: 'leave_request',
          }));

          await supabase.from('notifications').insert(notifications);
        }

        // Cancel any pending role requests from this user for this club
        await supabase
          .from('role_requests')
          .update({ status: 'cancelled', reviewed_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('club_id', id)
          .eq('status', 'pending');

        setShowLeaveModal(false);
        setSuccess('Leave request submitted. An administrator will review it.');
        setLeaveReason('');
        loadClubData();
      } else {
        // Members leave instantly, no approval needed
        const { error: updateError } = await supabase
          .from('memberships')
          .update({ status: 'inactive' })
          .eq('id', userMembership.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }

        // Cancel any pending role requests from this user for this club
        await supabase
          .from('role_requests')
          .update({ status: 'cancelled', reviewed_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('club_id', id)
          .eq('status', 'pending');

        setShowLeaveModal(false);
        setSuccess('You have left this club.');
        setLeaveReason('');
        loadClubData();
      }
    } catch (err) {
      console.error('Error leaving club:', err);
      setError('Failed to leave club');
    } finally {
      setAdding(false);
    }
  };

  const handleApproveLeaveRequest = async (request: LeaveRequest) => {
    setAdding(true);
    setError(null);
    try {
      // Update leave request status
      await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      // Update membership status to inactive
      await supabase
        .from('memberships')
        .update({ status: 'inactive' })
        .eq('user_id', request.user_id)
        .eq('club_id', request.club_id);

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Leave Request Approved',
        message: `Your request to leave ${club?.name} has been approved.`,
        type: 'leave_request',
        reference_id: request.id,
        reference_type: 'leave_request',
      });

      setSuccess(`Leave request approved for ${request.profiles?.full_name}`);
      loadClubData();
    } catch (err) {
      console.error('Error approving leave request:', err);
      setError('Failed to approve leave request');
    } finally {
      setAdding(false);
    }
  };

  const handleRejectLeaveRequest = async (request: LeaveRequest) => {
    setAdding(true);
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

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: 'Leave Request Update',
        message: `Your request to leave ${club?.name} was not approved.`,
        type: 'leave_request',
        reference_id: request.id,
        reference_type: 'leave_request',
      });

      setSuccess(`Leave request rejected for ${request.profiles?.full_name}`);
      loadClubData();
    } catch (err) {
      console.error('Error rejecting leave request:', err);
      setError('Failed to reject leave request');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/clubs')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Clubs
        </Button>
        <Card>
          <EmptyState title="Club not found" description="The club you're looking for doesn't exist." />
        </Card>
      </div>
    );
  }

  const canManage = userMembership && ['president', 'vice_president', 'treasurer', 'manager'].includes(userMembership.role) && userMembership.status === 'active';
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const pendingMembers = members.filter(m => m.status === 'pending');
  const activeMembers = members.filter(m => m.status === 'active');

  // User can request role if they're a manager on the system level but don't have club access, or are a member wanting to upgrade

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/clubs')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Clubs
      </Button>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3 animate-fade-in">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3 animate-fade-in">
          <X className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Club Header */}
      <div className="relative rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/10 text-3xl font-bold backdrop-blur-sm">
                {club.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{club.name}</h1>
                {club.category && (
                  <Badge className="mt-2 bg-white/20 text-white">{club.category}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={() => setShowAddManagerModal(true)}
                >
                  <Shield className="h-4 w-4" />
                  Assign Role
                </Button>
              )}
              {(canManage || isAdmin) && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/clubs/${id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{activeMembers.length} members</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span>{events.length} events</span>
            </div>
            {club.meeting_schedule && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{club.meeting_schedule}</span>
              </div>
            )}
            {pendingMembers.length > 0 && (canManage || isAdmin) && (
              <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full">
                <span>{pendingMembers.length} pending members</span>
              </div>
            )}
            {roleRequests.length > 0 && isAdmin && (
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
                <span>{roleRequests.length} role requests</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar - Only show for non-admins who are not members */}
      {!userMembership && !isAdmin && !isManager && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Interested in joining this club?</p>
              <p className="text-sm text-gray-500">Request membership to participate in events and activities.</p>
            </div>
            <Button onClick={() => setShowJoinModal(true)}>
              <UserPlus className="h-4 w-4" />
              Join Club
            </Button>
          </div>
        </Card>
      )}

      {/* Manager wanting to request role access */}
      {(isManager && !userMembership) && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Want to manage this club?</p>
              <p className="text-sm text-gray-500">Request a management role to help run this club.</p>
            </div>
            {userRoleRequest ? (
              <div className="flex items-center gap-2 text-orange-600">
                <Hourglass className="h-5 w-5" />
                <span className="text-sm font-medium">Request Pending</span>
              </div>
            ) : (
              <Button onClick={() => setShowRequestRoleModal(true)}>
                <Shield className="h-4 w-4" />
                Request Role Access
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Member wanting to upgrade role */}
      {userMembership && userMembership.status === 'active' && userMembership.role === 'member' && !canManage && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Want to take on a leadership role?</p>
              <p className="text-sm text-gray-500">Request a management position to help run this club.</p>
            </div>
            {userRoleRequest ? (
              <div className="flex items-center gap-2 text-orange-600">
                <Hourglass className="h-5 w-5" />
                <span className="text-sm font-medium">Request Pending</span>
              </div>
            ) : (
              <Button onClick={() => setShowRequestRoleModal(true)}>
                <Shield className="h-4 w-4" />
                Request Role Access
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Admin Info */}
      {isAdmin && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-700">
              You are viewing this club as an administrator. You can assign roles, approve members, and manage all club data.
            </p>
          </div>
        </Card>
      )}

      {/* User's pending role request info */}
      {userRoleRequest && !isAdmin && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <Hourglass className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm text-orange-700">
                Your request to become <strong>{getMembershipRoleLabel(userRoleRequest.requested_role)}</strong> is pending approval.
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Submitted on {formatDate(userRoleRequest.created_at)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {userMembership && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(userMembership.status)}>{userMembership.status}</Badge>
              <Badge className={getRoleColor(userMembership.role)}>{getMembershipRoleLabel(userMembership.role)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {(canManage || isAdmin) && (
                <Link to={`/clubs/${id}/events/new`}>
                  <Button size="sm">Create Event</Button>
                </Link>
              )}
              {userMembership.status === 'active' && !isAdmin && !userLeaveRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLeaveModal(true)}
                >
                  <LogOut className="h-4 w-4" />
                  {canManage ? 'Request Leave' : 'Leave Club'}
                </Button>
              )}
              {userLeaveRequest && !isAdmin && (
                <Badge className="bg-orange-100 text-orange-700">
                  <Hourglass className="h-3 w-3 mr-1" />
                  Leave Pending
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'members', label: 'Members', count: members.length },
          { key: 'events', label: 'Events', count: events.length },
          { key: 'attendance', label: 'Attendance' },
          ...((canManage || isAdmin) && roleRequests.length > 0 ? [{ key: 'role_requests', label: 'Role Requests', count: roleRequests.length }] : []),
          ...((canManage || isAdmin) && leaveRequests.length > 0 ? [{ key: 'leave_requests', label: 'Leave Requests', count: leaveRequests.length }] : []),
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="About" />
            <div className="space-y-4">
              {club.description ? (
                <p className="text-gray-700">{club.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description available.</p>
              )}

              <div className="space-y-2 text-sm">
                {club.founded_date && (
                  <p className="text-gray-600">
                    <span className="font-medium">Founded:</span> {formatDate(club.founded_date)}
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium">Max Members:</span> {club.max_members}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact Information" />
            <div className="space-y-3">
              {club.contact_email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{club.contact_email}</span>
                </div>
              )}
              {club.website_url && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <a
                    href={club.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {club.website_url}
                  </a>
                </div>
              )}
              {club.meeting_schedule && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">{club.meeting_schedule}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'members' && (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Joined</th>
                {(canManage || isAdmin) && (
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-medium text-white">
                        {member.profiles?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.profiles?.full_name}</p>
                        <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getRoleColor(member.role)}>{getMembershipRoleLabel(member.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.joined_date ? formatDate(member.joined_date) : '-'}
                  </td>
                  {(canManage || isAdmin) && (
                    <td className="px-4 py-3 text-right">
                      {member.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickApprove(member)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickReject(member)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <Card>
              <EmptyState title="No events" description="This club has no scheduled events yet." />
            </Card>
          ) : (
            events.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{formatDateTime(event.start_time)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                      {event.event_type && (
                        <Badge variant="info">{event.event_type}</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {events.filter(e => e.status === 'completed' || e.status === 'published').length === 0 ? (
            <Card>
              <EmptyState title="No attendance data" description="Attendance will appear after events are held." />
            </Card>
          ) : (
            events
              .filter(e => e.status === 'completed' || e.status === 'published')
              .map((event) => (
                <AttendanceCard key={event.id} event={event} isAdmin={!!isAdmin} canManage={!!canManage} />
              ))
          )}
        </div>
      )}

      {activeTab === 'role_requests' && (canManage || isAdmin) && (
        <div className="space-y-4">
          {roleRequests.length === 0 ? (
            <Card>
              <EmptyState title="No role requests" description="There are no pending role requests for this club." />
            </Card>
          ) : (
            <Card padding="none">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Requested Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notes</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Submitted</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roleRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-medium text-white">
                            {request.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                            <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getRoleColor(request.requested_role)}>
                          {getMembershipRoleLabel(request.requested_role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {request.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRoleRequest(request)}
                            disabled={adding}
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRoleRequest(request)}
                            disabled={adding}
                          >
                            <X className="h-4 w-4 text-red-600" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'leave_requests' && (canManage || isAdmin) && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <Card>
              <EmptyState title="No leave requests" description="There are no pending leave requests for this club." />
            </Card>
          ) : (
            <Card padding="none">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Submitted</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaveRequests.map((request) => {
                    const memberInfo = members.find(m => m.user_id === request.user_id);
                    const isManagerRequest = memberInfo && ['president', 'vice_president', 'treasurer', 'manager'].includes(memberInfo.role);

                    return (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-sm font-medium text-white">
                              {request.profiles?.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{request.profiles?.full_name}</p>
                              <p className="text-xs text-gray-500">{request.profiles?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {memberInfo && (
                            <Badge className={getRoleColor(memberInfo.role)}>
                              {getMembershipRoleLabel(memberInfo.role)}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {request.reason || 'No reason provided'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(request.requested_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* Members need manager approval, Managers need admin approval */}
                          {(isManagerRequest && isAdmin) || (!isManagerRequest && (canManage || isAdmin)) ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveLeaveRequest(request)}
                                disabled={adding}
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectLeaveRequest(request)}
                                disabled={adding}
                              >
                                <X className="h-4 w-4 text-red-600" />
                                Reject
                              </Button>
                            </div>
                          ) : isManagerRequest ? (
                            <span className="text-xs text-gray-500">Admin approval required</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Join Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Club"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You are joining <strong>{club.name}</strong>. You'll be added as a member immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinClub} loading={joining}>
              Send Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Request Role Modal */}
      <Modal
        isOpen={showRequestRoleModal}
        onClose={() => setShowRequestRoleModal(false)}
        title="Request Role Access"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Request a management role for <strong>{club.name}</strong>. An administrator will review your request.
          </p>

          <Select
            label="Requested Role"
            options={MEMBERSHIP_ROLES.filter(r => r.value !== 'member')}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          />

          <Textarea
            label="Notes (optional)"
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="Explain why you'd like this role..."
            rows={3}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowRequestRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestRole} loading={adding}>
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Manager Modal */}
      <Modal
        isOpen={showAddManagerModal}
        onClose={() => setShowAddManagerModal(false)}
        title="Assign Club Role"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Assign a user to a management role for <strong>{club.name}</strong>.
          </p>

          <Select
            label="Select User"
            options={[
              { value: '', label: 'Select a user...' },
              ...allUsers.map(u => ({ value: u.id, label: `${u.full_name} (${u.email})` })),
            ]}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          />

          <Select
            label="Role"
            options={MEMBERSHIP_ROLES.filter(r => r.value !== 'member')}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowAddManagerModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManager} loading={adding} disabled={!selectedUserId}>
              Assign Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Club Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title={canManage ? 'Request Leave from Club' : 'Leave Club'}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {canManage ? (
              <>
                As a <strong>{getMembershipRoleLabel(userMembership?.role || 'manager')}</strong>, your leave request will need to be approved by an administrator.
              </>
            ) : (
              <>
                You will be removed from <strong>{club.name}</strong> immediately. This action cannot be undone.
              </>
            )}
          </p>

          <Textarea
            label="Reason (optional)"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="Tell us why you'd like to leave..."
            rows={3}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestLeave} loading={adding} variant="danger">
              <LogOut className="h-4 w-4" />
              {canManage ? 'Submit Request' : 'Leave Club'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Attendance Card Component with Feedback
function AttendanceCard({ event, isAdmin, canManage }: { event: Event; isAdmin: boolean; canManage: boolean }) {
  const [attendees, setAttendees] = useState<EventAttendance[]>([]);
  const [feedback, setFeedback] = useState<EventFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [event.id]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const { data: attendeesData } = await supabase
        .from('event_attendance')
        .select('*, profiles(*)')
        .eq('event_id', event.id);
      setAttendees(attendeesData || []);

      // Load feedback for managers/admins
      if (isAdmin || canManage) {
        const { data: feedbackData } = await supabase
          .from('event_feedback')
          .select('*, profiles(*)')
          .eq('event_id', event.id);
        setFeedback(feedbackData || []);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      </Card>
    );
  }

  const attendedCount = attendees.filter(a => a.status === 'attended' || a.status === 'late').length;
  const registeredCount = attendees.length;
  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : null;

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{event.title}</h3>
          <p className="text-sm text-gray-500">{formatDateTime(event.start_time)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-green-600">{attendedCount}</span> attended
          </p>
          <p className="text-xs text-gray-500">{registeredCount} registered</p>
          {avgRating && (
            <div className="flex items-center gap-1 justify-end mt-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{avgRating}</span>
              <span className="text-xs text-gray-500">({feedback.length})</span>
            </div>
          )}
        </div>
      </div>

      {attendees.length > 0 && (isAdmin || canManage) && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Attendees:</p>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs text-white font-medium">
                  {a.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm">{a.profiles?.full_name}</span>
                {(a.status === 'attended' || a.status === 'late') && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.length > 0 && (isAdmin || canManage) && (
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Feedback ({feedback.length} responses):</p>
          <div className="space-y-3">
            {feedback.map((f) => (
              <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white font-medium">
                    {f.profiles?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm font-medium">{f.profiles?.full_name}</span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= f.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {f.comment && (
                  <p className="text-sm text-gray-600">{f.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
