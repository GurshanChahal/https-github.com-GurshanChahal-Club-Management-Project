import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import type { Membership, Club } from '../types';
import { EVENT_TYPES } from '../utils/storage';

export function CreateEventPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [managedClubs, setManagedClubs] = useState<(Membership & { clubs: Club })[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    club_id: '',
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
    status: 'draft',
  });

  useEffect(() => {
    loadManagedClubs();
  }, [profile]);

  const loadManagedClubs = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('memberships')
      .select('*, clubs(*)')
      .eq('user_id', profile.id)
      .in('role', ['president', 'vice_president', 'manager']);

    if (data) {
      setManagedClubs(data);
      if (data.length === 1) {
        setFormData((prev) => ({ ...prev, club_id: data[0].club_id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const eventData = {
        club_id: formData.club_id,
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type || null,
        location: formData.location || null,
        is_virtual: formData.is_virtual,
        virtual_link: formData.is_virtual ? formData.virtual_link : null,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        registration_deadline: formData.registration_deadline
          ? new Date(formData.registration_deadline).toISOString()
          : null,
        status: formData.status as 'draft' | 'published',
        created_by: profile.id,
      };

      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (!error && data) {
        navigate(`/events/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/events')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Button>

      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
          <p className="text-gray-500 mt-1">Schedule a new event for your club</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Club"
            required
            options={managedClubs.map((m) => ({
              value: m.club_id,
              label: m.clubs?.name || '',
            }))}
            value={formData.club_id}
            onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
            placeholder="Select a club"
          />

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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Publish Status</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === 'draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Save as Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Publish Now</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" type="button" onClick={() => navigate('/events')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Event
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
