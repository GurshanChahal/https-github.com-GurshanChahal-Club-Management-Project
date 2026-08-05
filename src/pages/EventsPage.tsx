import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import type { Event, Membership } from '../types';
import { formatDateTime, getStatusColor, getEventTypeLabel } from '../utils/helpers';
import { EVENT_TYPES } from '../utils/storage';

export function EventsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [userClubs, setUserClubs] = useState<Membership[]>([]);

  useEffect(() => {
    loadEvents();
  }, [profile, searchQuery, statusFilter, typeFilter]);

  const loadEvents = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const isAdmin = profile.role === 'admin';

      // Get user's club memberships first
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select('*, clubs(*)')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      setUserClubs(membershipsData || []);

      // Build query for events - RLS handles access control
      let query = supabase
        .from('events')
        .select('*, clubs(*)')
        .order('start_time', { ascending: true });

      // Non-admins only see events from their clubs
      if (!isAdmin) {
        const clubIds = membershipsData?.map((m) => m.club_id) || [];
        if (clubIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }
        query = query.in('club_id', clubIds);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter) {
        query = query.eq('event_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading events:', error);
      } else if (data) {
        setEvents(data);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const canCreateEvent = userClubs.some((m) =>
    ['president', 'vice_president', 'manager'].includes(m.role)
  );

  const EventCard = ({ event }: { event: Event }) => {
    return (
      <Link to={`/events/${event.id}`}>
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-center min-w-[60px]">
                <span className="text-xs font-medium uppercase text-blue-600">
                  {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-2xl font-bold text-blue-700">
                  {new Date(event.start_time).getDate()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-500">{event.clubs?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{formatDateTime(event.start_time)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{event.location}</span>
              </div>
            )}
            {event.is_virtual && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-gray-400" />
                <span>Virtual Event</span>
              </div>
            )}
            {event.max_attendees && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>Max: {event.max_attendees} attendees</span>
              </div>
            )}
          </div>

          {event.event_type && (
            <Badge variant="info" className="mt-3">{getEventTypeLabel(event.event_type)}</Badge>
          )}
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Browse and manage club events</p>
        </div>
        {canCreateEvent && (
          <Button onClick={() => navigate('/events/new')}>
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <Select
          options={[
            { value: '', label: 'All Status' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'completed', label: 'Completed' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          options={[{ value: '', label: 'All Types' }, ...EVENT_TYPES]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <EmptyState
            title="No events found"
            description={userClubs.length === 0 ? "Join a club to see upcoming events." : "Try adjusting your filters or create a new event."}
            icon={<Calendar className="h-12 w-12" />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
