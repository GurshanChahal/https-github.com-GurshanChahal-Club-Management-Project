import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Lock, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Modal } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    // Note: In production, you would want server-side deletion with proper auth
    setShowDeleteAccount(false);
    // This is a simplified version - real deletion should be done via edge function
    alert('Account deletion would be handled server-side in production.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader
          title="Notifications"
          subtitle="Configure how you receive updates"
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive email updates about events and memberships</p>
              </div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive in-app notifications</p>
              </div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader
          title="Security"
          subtitle="Manage your account security"
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">Change your account password</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Sign Out</p>
                <p className="text-sm text-gray-500">Sign out from all devices</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader
          title="Danger Zone"
          subtitle="Irreversible actions"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteAccount(true)}>
            Delete
          </Button>
        </div>
      </Card>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <Input
            label="New Password"
            type="password"
            required
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
          />
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowChangePassword(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </div>
          <p className="text-gray-600">
            Are you sure you want to delete your account? This will remove all your memberships, event registrations, and other data.
          </p>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
