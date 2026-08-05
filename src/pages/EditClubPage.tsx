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
import type { Club } from '../types';
import { CLUB_CATEGORIES } from '../utils/storage';

export function EditClubPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    meeting_schedule: '',
    contact_email: '',
    website_url: '',
    founded_date: '',
    max_members: 100,
    is_active: true,
  });

  useEffect(() => {
    if (id) {
      loadClub();
    }
  }, [id, profile]);

  const loadClub = async () => {
    if (!profile || !id) return;

    setLoading(true);
    try {
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clubError || !clubData) {
        setError('Club not found');
        setLoading(false);
        return;
      }

      setClub(clubData);
      setFormData({
        name: clubData.name || '',
        description: clubData.description || '',
        category: clubData.category || '',
        meeting_schedule: clubData.meeting_schedule || '',
        contact_email: clubData.contact_email || '',
        website_url: clubData.website_url || '',
        founded_date: clubData.founded_date || '',
        max_members: clubData.max_members || 100,
        is_active: clubData.is_active,
      });

      // Check user's permission to edit
      const isAdmin = profile.role === 'admin';
      if (!isAdmin) {
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('*')
          .eq('club_id', id)
          .eq('user_id', profile.id)
          .maybeSingle();

        const canManage =
          membershipData &&
          ['president', 'vice_president', 'treasurer', 'manager'].includes(membershipData.role) &&
          membershipData.status === 'active';

        if (!canManage) {
          setError('You do not have permission to edit this club');
        }
      }
    } catch (err) {
      console.error('Error loading club:', err);
      setError('Failed to load club');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !club) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: updateError } = await supabase
        .from('clubs')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          meeting_schedule: formData.meeting_schedule || null,
          contact_email: formData.contact_email || null,
          website_url: formData.website_url || null,
          founded_date: formData.founded_date || null,
          max_members: formData.max_members,
          is_active: formData.is_active,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Club updated successfully');
        setTimeout(() => {
          navigate(`/clubs/${id}`);
        }, 1000);
      }
    } catch (err) {
      console.error('Error updating club:', err);
      setError('Failed to update club');
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

  if (error && !club) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/clubs')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Clubs
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
      <Button variant="ghost" onClick={() => navigate(`/clubs/${id}`)}>
        <ArrowLeft className="h-4 w-4" />
        Back to Club
      </Button>

      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Club</h1>
          <p className="text-gray-500 mt-1">Update club information and settings</p>
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
            label="Club Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter club name"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your club's purpose and activities"
            rows={3}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              options={CLUB_CATEGORIES.map((c) => ({ value: c, label: c }))}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Select a category"
            />
            <Input
              label="Max Members"
              type="number"
              min={1}
              value={formData.max_members}
              onChange={(e) =>
                setFormData({ ...formData, max_members: parseInt(e.target.value) || 100 })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Meeting Schedule"
              value={formData.meeting_schedule}
              onChange={(e) => setFormData({ ...formData, meeting_schedule: e.target.value })}
              placeholder="e.g., Every Tuesday 5PM"
            />
            <Input
              label="Founded Date"
              type="date"
              value={formData.founded_date}
              onChange={(e) => setFormData({ ...formData, founded_date: e.target.value })}
            />
          </div>

          <Input
            label="Contact Email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="club@university.edu"
          />

          <Input
            label="Website URL"
            type="url"
            value={formData.website_url}
            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            placeholder="https://club.example.com"
          />

          {profile?.role === 'admin' && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Club is active (visible to members)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button variant="outline" type="button" onClick={() => navigate(`/clubs/${id}`)}>
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
