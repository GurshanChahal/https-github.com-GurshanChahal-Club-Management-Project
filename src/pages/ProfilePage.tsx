import { useState, useEffect } from 'react';
import { User, Mail, Hash, Phone, Calendar, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatDate } from '../utils/helpers';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    student_id: '',
    phone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        student_id: profile.student_id || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          student_id: formData.student_id || null,
          phone: formData.phone || null,
        })
        .eq('id', profile.id);

      if (!error) {
        await refreshProfile();
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return null;
  }

  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    member: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your personal information</p>
      </div>

      {/* Profile Header */}
      <Card>
        <div className="flex items-start gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-3xl font-bold text-white">
            {profile.full_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile.full_name}</h2>
            <p className="text-gray-500">{profile.email}</p>
            <div className="mt-4 flex items-center gap-4">
              <Badge className={roleBadgeColor[profile.role]}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Badge>
              {profile.student_id && (
                <span className="text-sm text-gray-500">ID: {profile.student_id}</span>
              )}
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader title="Personal Information" />
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
            <Input
              label="Student ID"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            />
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div className="flex gap-3 border-t pt-4">
              <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-gray-900">{profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{profile.email}</p>
              </div>
            </div>
            {profile.student_id && (
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="text-gray-900">{profile.student_id}</p>
                </div>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{profile.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="text-gray-900">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
