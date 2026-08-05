import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Calendar,
  Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import type { Club } from '../types';
import { CLUB_CATEGORIES } from '../utils/storage';
import { truncate } from '../utils/helpers';

export function ClubsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    category: '',
    meeting_schedule: '',
    contact_email: '',
    website_url: '',
    max_members: 100,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadClubs();
  }, [searchQuery, categoryFilter]);

  const loadClubs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clubs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (!error && data) {
        setClubs(data);
      }
    } catch (err) {
      console.error('Error loading clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('clubs')
        .insert({
          ...createFormData,
          created_by: profile.id,
        })
        .select()
        .single();

      if (!error && data) {
        // Also create a membership for the creator as president
        await supabase.from('memberships').insert({
          user_id: profile.id,
          club_id: data.id,
          role: 'president',
          status: 'active',
          joined_date: new Date().toISOString().split('T')[0],
        });

        setShowCreateModal(false);
        setCreateFormData({
          name: '',
          description: '',
          category: '',
          meeting_schedule: '',
          contact_email: '',
          website_url: '',
          max_members: 100,
        });
        loadClubs();
        navigate(`/clubs/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating club:', err);
    } finally {
      setCreating(false);
    }
  };

  const canCreateClub = profile?.role === 'admin' || profile?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clubs</h1>
          <p className="text-gray-500 mt-1">Browse and manage student organizations</p>
        </div>
        {canCreateClub && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Club
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <Select
          options={[{ value: '', label: 'All Categories' }, ...CLUB_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : clubs.length === 0 ? (
        <Card>
          <EmptyState
            title="No clubs found"
            description="Try adjusting your search or filters"
            icon={<Building2 className="h-12 w-12" />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} to={`/clubs/${club.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-bold text-white">
                    {club.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{club.name}</h3>
                    {club.category && (
                      <Badge variant="info" className="mt-1">{club.category}</Badge>
                    )}
                  </div>
                </div>
                {club.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {truncate(club.description, 120)}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{club.max_members} max</span>
                  </div>
                  {club.meeting_schedule && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span className="truncate">{club.meeting_schedule}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Club"
        size="lg"
      >
        <form onSubmit={handleCreateClub} className="space-y-4">
          <Input
            label="Club Name"
            required
            value={createFormData.name}
            onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
            placeholder="Enter club name"
          />

          <Textarea
            label="Description"
            value={createFormData.description}
            onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
            placeholder="Describe your club's purpose and activities"
            rows={3}
          />

          <Select
            label="Category"
            required
            options={CLUB_CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={createFormData.category}
            onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
            placeholder="Select a category"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Meeting Schedule"
              value={createFormData.meeting_schedule}
              onChange={(e) => setCreateFormData({ ...createFormData, meeting_schedule: e.target.value })}
              placeholder="e.g., Every Tuesday 5PM"
            />
            <Input
              label="Max Members"
              type="number"
              min={1}
              value={createFormData.max_members}
              onChange={(e) => setCreateFormData({ ...createFormData, max_members: parseInt(e.target.value) || 100 })}
            />
          </div>

          <Input
            label="Contact Email"
            type="email"
            value={createFormData.contact_email}
            onChange={(e) => setCreateFormData({ ...createFormData, contact_email: e.target.value })}
            placeholder="club@university.edu"
          />

          <Input
            label="Website URL"
            type="url"
            value={createFormData.website_url}
            onChange={(e) => setCreateFormData({ ...createFormData, website_url: e.target.value })}
            placeholder="https://club.example.com"
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Club
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
