import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import type { Event } from '../types';
import { EVENT_TYPES } from '../utils/storage';

function toLocalDateTimeInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    location: '',
    is_virtual: false,
    virtual_link: '',
    start_time: '',
    end_time: '',
    max_attendees: '',
    registration_deadline: '',
    status: 'published' as 'draft' | 'published' | 'cancelled' | 'completed',
  });

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id, profile]);

  const loadEvent = async () => {
    if (!profile || !id) return;

    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (eventError || !eventData) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent(eventData);
      setFormData({
        title: eventData.title || '',
        description: eventData.description || '',
        event_type: eventData.event_type || '',
        location: eventData.location || '',
        is_virtual: eventData.is_virtual || false,
        virtual_link: eventData.virtual_link || '',
        start_time: toLocalDateTimeInput(eventData.start_time),
        end_time: toLocalDateTimeInput(eventData.end_time),
        max_attendees: eventData.max_attendees ? String(eventData.max_attendees) : '',
        registration_deadline: eventData.registration_deadline
          ? toLocalDateTimeInput(eventData.registration_deadline)
          : '',
        status: eventData.status,
      });

      // Verify permission
      const isAdmin = profile.role === 'admin';
      if (!isAdmin) {
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('*')
          .eq('club_id', eventData.club_id)
          .eq('user_id', profile.id)
          .maybeSingle();

        const canManage =
          membershipData &&
          ['president', 'vice_president', 'manager'].includes(membershipData.role) &&
          membershipData.status === 'active';

        if (!canManage) {
          setError('You do not have permission to edit this event');
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !event) return;

    if (!formData.start_time || !formData.end_time) {
      setError('Start and end times are required');
      return;
    }

    if (new Date(formData.end_time) < new Date(formData.start_time)) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updateData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type || null,
        location: formData.location || null,
        is_virtual: formData.is_virtual,
        virtual_link: formData.is_virtual ? formData.virtual_link || null : null,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_deadline: formData.registration_deadline
          ? new Date(formData.registration_deadline).toISOString()
          : null,
        status: formData.status,
      };

      const { error: updateError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Event updated successfully');
        setTimeout(() => {
          navigate(`/events/${id}`);
        }, 1000);
      }
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        <Card>
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/events/${id}`)}>
        <ArrowLeft className="h-4 w-4" />
        Back to Event
      </Button>

      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-gray-500 mt-1">Update event details, schedule, and status</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Event Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter event title"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your event"
            rows={4}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Event Type"
              options={EVENT_TYPES}
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              placeholder="Select type"
            />
            <Input
              label="Max Attendees"
              type="number"
              min={1}
              value={formData.max_attendees}
              onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Date & Time</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            <div className="space-y-4">
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Room/Building/Address"
              />

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_virtual"
                  checked={formData.is_virtual}
                  onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_virtual" className="text-sm text-gray-700">
                  This is a virtual event
                </label>
              </div>

              {formData.is_virtual && (
                <Input
                  label="Virtual Event Link"
                  type="url"
                  value={formData.virtual_link}
                  onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                  placeholder="https://zoom.us/..."
                />
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Status</h3>
            <Select
              label="Status"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'completed', label: 'Completed' },
              ]}
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as typeof formData.status })
              }
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" type="button" onClick={() => navigate(`/events/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
