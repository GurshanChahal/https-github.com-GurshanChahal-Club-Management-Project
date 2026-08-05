import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Users, Shield, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import type { Club, Profile } from '../types';
import { formatDate, truncate, getMembershipRoleLabel } from '../utils/helpers';
import { CLUB_CATEGORIES } from '../utils/storage';

interface AdminClubRow {
  club: Club;
  memberCount: number;
  manager: Profile | null;
  managerRole: string | null;
}

export function AdminClubsPage() {
  const [clubs, setClubs] = useState<AdminClubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadClubs();
  }, [searchQuery, categoryFilter]);

  const loadClubs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('clubs').select('*').order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error || !data) {
        setClubs([]);
        return;
      }

      // Load all active memberships to compute counts and managers
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select('*, profiles(*)')
        .eq('status', 'active');

      const rows: AdminClubRow[] = data.map((club) => {
        const clubMemberships = (membershipsData || []).filter((m) => m.club_id === club.id);
        const managerMembership = clubMemberships.find((m) =>
          ['president', 'vice_president', 'manager'].includes(m.role)
        );
        return {
          club,
          memberCount: clubMemberships.length,
          manager: (managerMembership?.profiles as Profile) || null,
          managerRole: managerMembership?.role || null,
        };
      });

      setClubs(rows);
    } catch (err) {
      console.error('Error loading clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleClubStatus = async (club: Club) => {
    const { error } = await supabase
      .from('clubs')
      .update({ is_active: !club.is_active })
      .eq('id', club.id);

    if (!error) {
      loadClubs();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Club Management</h1>
        <p className="text-gray-500 mt-1">Manage all clubs in the system</p>
      </div>

      <div className="flex gap-4">
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
          className="w-48"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : clubs.length === 0 ? (
        <Card>
          <EmptyState title="No clubs found" icon={<Building2 className="h-12 w-12" />} />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Club</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Manager</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Members</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clubs.map(({ club, memberCount, manager, managerRole }) => (
                  <tr key={club.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/clubs/${club.id}`} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                          {club.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 hover:text-blue-600">{club.name}</p>
                          <p className="text-xs text-gray-500">{truncate(club.description || '', 50)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{club.category || '-'}</td>
                    <td className="px-4 py-3">
                      {manager ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-medium text-white">
                            {manager.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{manager.full_name}</p>
                            <p className="text-xs text-gray-500">
                              {getMembershipRoleLabel(managerRole || 'manager')}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{memberCount}</span>
                        <span className="text-gray-400">/ {club.max_members}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={club.is_active ? 'success' : 'default'}>
                        {club.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(club.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/clubs/${club.id}/edit`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleClubStatus(club)}
                        >
                          {club.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
