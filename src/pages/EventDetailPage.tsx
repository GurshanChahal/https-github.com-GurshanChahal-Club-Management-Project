import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Edit,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Lock,
  Star,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Tabs } from '../components/common/Table';
import { Textarea } from '../components/common/Textarea';
import type { Event, EventAttendance, Membership, EventFeedback } from '../types';
import { formatDateTime, formatDate, formatTime, getStatusColor, getEventTypeLabel, getRelativeTime, cn } from '../utils/helpers';

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [userAttendance, setUserAttendance] = useState<EventAttendance | null>(null);
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCloseRegModal, setShowCloseRegModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<EventFeedback | null>(null);
  const [allFeedback, setAllFeedback] = useState<EventFeedback[]>([]);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (id) {
      loadEventData();
    }
  }, [id, profile]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadEventData = async () => {
    if (!profile || !id) return;

    setLoading(true);
    try {
      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*, clubs(*)')
        .eq('id', id)
        .maybeSingle();

      if (eventData) {
        setEvent(eventData);
      }

      // Check user's membership status
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('*')
        .eq('club_id', eventData?.club_id)
        .eq('user_id', profile.id)
        .maybeSingle();

      setUserMembership(membershipData);

      // Load attendance records
      const { data: attendanceData } = await supabase
        .from('event_attendance')
        .select('*, profiles(*)')
        .eq('event_id', id)
        .order('registered_at', { ascending: false });

      if (attendanceData) {
        setAttendance(attendanceData);
      }

      // Check user's registration
      const { data: userAttendanceData } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('event_id', id)
        .eq('user_id', profile.id)
        .maybeSingle();

      setUserAttendance(userAttendanceData);

      // Load feedback data
      if (profile) {
        // Check if user has submitted feedback
        const { data: userFeedbackData } = await supabase
          .from('event_feedback')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', profile.id)
          .maybeSingle();

        setUserFeedback(userFeedbackData);
      }

      // Load all feedback for managers
      const { data: feedbackData } = await supabase
        .from('event_feedback')
        .select('*, profiles(*)')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (feedbackData) {
        setAllFeedback(feedbackData);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!profile || !id || !event) return;

    // Check if already registered
    if (userAttendance) {
      setError('You are already registered for this event');
      setShowRegisterModal(false);
      return;
    }

    // Check capacity
    const currentRegistrations = attendance.filter(a => a.status === 'registered' || a.status === 'attended').length;
    if (event.max_attendees && currentRegistrations >= event.max_attendees) {
      setError('This event has reached its maximum capacity');
      setShowRegisterModal(false);
      return;
    }

    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      setError('Registration deadline has passed');
      setShowRegisterModal(false);
      return;
    }

    setRegistering(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('event_attendance').insert({
        event_id: id,
        user_id: profile.id,
        status: 'registered',
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You are already registered for this event');
        } else {
          setError(insertError.message);
        }
      } else {
        setShowRegisterModal(false);
        setSuccess('Successfully registered for the event!');
        loadEventData();
      }
    } catch (err) {
      console.error('Error registering:', err);
      setError('Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!userAttendance) return;

    setRegistering(true);
    try {
      const { error: updateError } = await supabase
        .from('event_attendance')
        .update({ status: 'cancelled' })
        .eq('id', userAttendance.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowCancelModal(false);
        setSuccess('Registration cancelled successfully');
        loadEventData();
      }
    } catch (err) {
      console.error('Error cancelling registration:', err);
      setError('Failed to cancel registration');
    } finally {
      setRegistering(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!event) return;

    setRegistering(true);
    try {
      // Set registration deadline to now to close registration
      const { error: updateError } = await supabase
        .from('events')
        .update({ registration_deadline: new Date().toISOString() })
        .eq('id', event.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowCloseRegModal(false);
        setSuccess('Registration closed successfully');
        loadEventData();
      }
    } catch (err) {
      console.error('Error closing registration:', err);
      setError('Failed to close registration');
    } finally {
      setRegistering(false);
    }
  };

  const handleMarkAttendance = async (recordId: string, status: 'attended' | 'absent' | 'late' | 'registered') => {
    try {
      const updateData: { status: string; attended_at?: string } = { status };
      if (status === 'attended' || status === 'late') {
        updateData.attended_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('event_attendance')
        .update(updateData)
        .eq('id', recordId);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(`Marked as ${status}`);
        loadEventData();
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError('Failed to update attendance');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;

    setSubmittingFeedback(true);
    setError(null);
    try {
      const { error: feedbackError } = await supabase
        .from('event_feedback')
        .insert({
          event_id: id,
          user_id: profile.id,
          rating: feedbackRating,
          comment: feedbackComment || null,
        });

      if (feedbackError) {
        if (feedbackError.code === '23505') {
          setError('You have already submitted feedback for this event');
        } else {
          setError(feedbackError.message);
        }
      } else {
        setShowFeedbackModal(false);
        setSuccess('Thank you for your feedback!');
        setFeedbackComment('');
        setFeedbackRating(5);
        loadEventData();
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const canManage = userMembership && ['president', 'vice_president', 'manager'].includes(userMembership.role);
  const isAdmin = profile?.role === 'admin';
  const isPast = event ? new Date(event.end_time) < new Date() : false;
  const currentRegistrations = attendance.filter(a => a.status === 'registered' || a.status === 'attended' || a.status === 'late').length;
  const remainingSeats = event?.max_attendees ? event.max_attendees - currentRegistrations : null;
  const isRegistrationClosed = event?.registration_deadline ? new Date(event.registration_deadline) < new Date() : false;
  const canRegister = !isPast && event?.status === 'published' && !userAttendance && !isRegistrationClosed && (remainingSeats === null || remainingSeats > 0);
  const canSubmitFeedback = userAttendance && (userAttendance.status === 'attended' || userAttendance.status === 'late') && !userFeedback;
  const hasSubmittedFeedback = !!userFeedback;
  const avgRating = allFeedback.length > 0
    ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <Card>
          <EmptyState title="Event not found" description="The event you're looking for doesn't exist." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
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

      <Button variant="ghost" onClick={() => navigate('/events')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Button>

      {/* Event Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center justify-center rounded-lg bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              <span className="text-lg font-medium uppercase">
                {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-4xl font-bold">
                {new Date(event.start_time).getDate()}
              </span>
              <span className="text-sm">
                {new Date(event.start_time).getFullYear()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{event.title}</h1>
                <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
              </div>
              <p className="mt-2 text-white/80">{event.clubs?.name}</p>
              <div className="flex items-center gap-2 mt-2">
                {event.event_type && (
                  <Badge className="bg-white/20 text-white">{getEventTypeLabel(event.event_type)}</Badge>
                )}
                {isRegistrationClosed && event.status === 'published' && (
                  <Badge className="bg-orange-500/80 text-white">Registration Closed</Badge>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate(`/events/${id}/edit`)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Registration Card */}
      {event.status === 'published' && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Capacity Info */}
              {event.max_attendees && (
                <div className="text-center">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{currentRegistrations}</p>
                      <p className="text-xs text-gray-500">of {event.max_attendees} registered</p>
                    </div>
                  </div>
                  {remainingSeats !== null && remainingSeats <= 5 && remainingSeats > 0 && (
                    <p className="text-xs text-orange-600 font-medium mt-1">Only {remainingSeats} seats left!</p>
                  )}
                  {remainingSeats !== null && remainingSeats <= 0 && (
                    <p className="text-xs text-red-600 font-medium mt-1">Sold Out</p>
                  )}
                </div>
              )}

              {/* User Registration Status */}
              <div className="border-l pl-6">
                {userAttendance ? (
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">You're registered</p>
                      <p className="text-sm text-gray-500">
                        Status: <Badge className={getStatusColor(userAttendance.status)}>{userAttendance.status}</Badge>
                      </p>
                    </div>
                  </div>
                ) : isPast ? (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <p className="text-gray-500">This event has ended</p>
                  </div>
                ) : isRegistrationClosed ? (
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-orange-500" />
                    <p className="text-gray-600">Registration is closed</p>
                  </div>
                ) : remainingSeats !== null && remainingSeats <= 0 ? (
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <p className="text-gray-600">Event is full</p>
                  </div>
                ) : userMembership?.status === 'active' ? (
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Registration is open</p>
                      <p className="text-sm text-gray-500">Register now to attend this event.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <p className="text-gray-600">Join the club to register for events</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Manager Actions */}
              {canManage && !isPast && !isRegistrationClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseRegModal(true)}
                >
                  <Lock className="h-4 w-4" />
                  Close Registration
                </Button>
              )}

              {/* User Actions */}
              {userAttendance && userAttendance.status !== 'cancelled' && !isPast && (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                >
                  <UserX className="h-4 w-4" />
                  Cancel Registration
                </Button>
              )}
              {canRegister && userMembership?.status === 'active' && (
                <Button onClick={() => setShowRegisterModal(true)}>
                  <UserCheck className="h-4 w-4" />
                  Register Now
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'details', label: 'Details' },
          { key: 'attendees', label: 'Attendees', count: attendance.filter((a) => a.status !== 'cancelled').length },
          { key: 'summary', label: 'Attendance Summary' },
          { key: 'feedback', label: 'Feedback', count: allFeedback.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Event Information" />
            <div className="space-y-4">
              {event.description && (
                <p className="text-gray-700">{event.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(event.start_time)}</p>
                    <p className="text-sm text-gray-500">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{event.location}</span>
                  </div>
                )}

                {event.is_virtual && event.virtual_link && (
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-gray-400" />
                    <a href={event.virtual_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Join Virtual Event
                    </a>
                  </div>
                )}

                {event.max_attendees && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">
                      {currentRegistrations} / {event.max_attendees} registered
                      {remainingSeats !== null && remainingSeats > 0 && (
                        <span className="text-blue-600 ml-2">({remainingSeats} seats remaining)</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">Created {getRelativeTime(event.created_at)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Schedule" />
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  <p className="font-medium">Start</p>
                  <p className="mt-1">{formatDateTime(event.start_time)}</p>
                </div>
                <div className="h-px flex-1 bg-gray-300 mx-4" />
                <div className="text-right text-gray-600">
                  <p className="font-medium">End</p>
                  <p className="mt-1">{formatDateTime(event.end_time)}</p>
                </div>
              </div>
            </div>

            {event.registration_deadline && (
              <div className={cn(
                "mt-4 rounded-lg p-4",
                isRegistrationClosed ? "bg-gray-100" : "bg-blue-50"
              )}>
                <p className={cn(
                  "text-sm font-medium",
                  isRegistrationClosed ? "text-gray-600" : "text-blue-600"
                )}>
                  {isRegistrationClosed ? 'Registration closed:' : 'Registration deadline:'}{' '}
                  {formatDateTime(event.registration_deadline)}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'attendees' && (
        <Card padding="none">
          {attendance.filter(a => a.status !== 'cancelled').length === 0 ? (
            <div className="py-12 text-center text-gray-500">No registrations yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Registered</th>
                  {canManage && !isPast && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                  )}
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
                        <span className="text-gray-900">{record.profiles?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDateTime(record.registered_at)}
                    </td>
                    {canManage && !isPast && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {record.status === 'registered' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAttendance(record.id, 'attended')}
                                title="Mark as Present"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAttendance(record.id, 'late')}
                                title="Mark as Late"
                              >
                                <Timer className="h-4 w-4 text-orange-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAttendance(record.id, 'absent')}
                                title="Mark as Absent"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {(record.status === 'attended' || record.status === 'late' || record.status === 'absent') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAttendance(record.id, 'registered')}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'summary' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {attendance.filter(a => a.status === 'attended').length}
              </p>
              <p className="text-sm text-gray-500">Present</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto mb-3">
                <Timer className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {attendance.filter(a => a.status === 'late').length}
              </p>
              <p className="text-sm text-gray-500">Late</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {attendance.filter(a => a.status === 'absent').length}
              </p>
              <p className="text-sm text-gray-500">Absent</p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Feedback submission for attendees */}
          {canSubmitFeedback && (
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Share Your Experience</p>
                    <p className="text-sm text-gray-600">We'd love to hear your feedback about this event</p>
                  </div>
                </div>
                <Button onClick={() => setShowFeedbackModal(true)}>
                  <Star className="h-4 w-4" />
                  Leave Feedback
                </Button>
              </div>
            </Card>
          )}

          {/* Already submitted feedback */}
          {hasSubmittedFeedback && (
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Thank you for your feedback!</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-gray-600">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= userFeedback!.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Average rating */}
          {avgRating && (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= Math.round(parseFloat(avgRating))
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{avgRating}</span>
                    <span className="text-sm text-gray-500">({allFeedback.length} reviews)</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Feedback list - visible to managers and admin */}
          {(canManage || isAdmin) && allFeedback.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">All Feedback</h3>
              {allFeedback.map((fb) => (
                <Card key={fb.id} className="hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-medium text-white">
                      {fb.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{fb.profiles?.full_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= fb.rating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(fb.created_at)}</p>
                      {fb.comment && (
                        <p className="text-sm text-gray-700 mt-2">{fb.comment}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* No feedback yet */}
          {allFeedback.length === 0 && !canSubmitFeedback && (
            <Card>
              <EmptyState
                title="No feedback yet"
                description="Feedback will appear here after attendees share their experience."
                icon={<MessageSquare className="h-12 w-12" />}
              />
            </Card>
          )}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register for Event"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You're registering for <strong>{event.title}</strong>.
          </p>
          {event.max_attendees && remainingSeats && (
            <p className="text-sm text-gray-500">
              {remainingSeats} seats remaining after your registration.
            </p>
          )}
          {event.registration_deadline && (
            <p className="text-sm text-gray-500">
              Registration deadline: {formatDateTime(event.registration_deadline)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} loading={registering}>
              Confirm Registration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Registration"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel your registration for <strong>{event.title}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            You may not be able to re-register if the event is full.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Registration
            </Button>
            <Button variant="danger" onClick={handleCancelRegistration} loading={registering}>
              Cancel Registration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Registration Modal */}
      <Modal
        isOpen={showCloseRegModal}
        onClose={() => setShowCloseRegModal(false)}
        title="Close Registration"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              This action will prevent any new registrations. Existing registrations will remain.
            </p>
          </div>
          <p className="text-gray-600">
            Close registration for <strong>{event.title}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCloseRegModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCloseRegistration} loading={registering}>
              Close Registration
            </Button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Share Your Feedback"
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <p className="text-gray-600">
            How would you rate your experience at <strong>{event.title}</strong>?
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= feedbackRating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {feedbackRating === 5 ? 'Excellent!' : feedbackRating === 4 ? 'Good!' : feedbackRating === 3 ? 'Average' : feedbackRating === 2 ? 'Poor' : 'Very Poor'}
              </span>
            </div>
          </div>

          <Textarea
            label="Comments (optional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={4}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowFeedbackModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingFeedback}>
              <Star className="h-4 w-4" />
              Submit Feedback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
