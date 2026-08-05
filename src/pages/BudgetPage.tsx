import { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, Trash2, Edit, AlertCircle, Check, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge, StatCard, Modal, EmptyState } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Tabs } from '../components/common/Table';
import type { BudgetItem, Club } from '../types';
import { formatCurrency, formatDate, getStatusColor, cn } from '../utils/helpers';
import { BUDGET_CATEGORIES } from '../utils/storage';

export function BudgetPage() {
  const { profile } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubFilter, setClubFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState({
    club_id: '',
    category: '',
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadManagedClubs();
  }, [profile]);

  useEffect(() => {
    if (clubFilter) {
      loadBudgetItems();
    }
  }, [clubFilter, typeFilter, statusFilter, categoryFilter, activeTab, searchQuery]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadManagedClubs = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const isAdmin = profile.role === 'admin';

      let managedClubs: Club[] = [];

      if (isAdmin) {
        const { data } = await supabase.from('clubs').select('*').eq('is_active', true);
        managedClubs = data || [];
      } else {
        const { data } = await supabase
          .from('memberships')
          .select('*, clubs(*)')
          .eq('user_id', profile.id)
          .in('role', ['president', 'vice_president', 'treasurer', 'manager']);

        managedClubs = data?.map((m) => m.clubs as Club).filter(Boolean) || [];
      }

      setClubs(managedClubs);
      if (managedClubs.length === 1) {
        setClubFilter(managedClubs[0].id);
        setFormData((prev) => ({ ...prev, club_id: managedClubs[0].id }));
      }
    } catch (err) {
      console.error('Error loading clubs:', err);
      setError('Failed to load clubs');
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetItems = async () => {
    let query = supabase
      .from('budget_items')
      .select('*, clubs(*)')
      .eq('club_id', clubFilter)
      .order('date', { ascending: false });

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    if (searchQuery) {
      query = query.ilike('description', `%${searchQuery}%`);
    }

    const { data } = await query;
    let filtered = data || [];

    // Apply tab filter
    if (activeTab === 'income') {
      filtered = filtered.filter((item) => item.type === 'income');
    } else if (activeTab === 'expense') {
      filtered = filtered.filter((item) => item.type === 'expense');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter((item) => item.status === 'pending');
    }

    setBudgetItems(filtered);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('budget_items').insert({
        club_id: formData.club_id || clubFilter,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: formData.type,
        date: formData.date,
        created_by: profile.id,
        status: 'pending',
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setShowAddModal(false);
        setFormData({
          club_id: clubFilter,
          category: '',
          description: '',
          amount: '',
          type: 'expense',
          date: new Date().toISOString().split('T')[0],
        });
        setSuccess('Budget item added successfully');
        loadBudgetItems();
      }
    } catch (err) {
      console.error('Error adding budget item:', err);
      setError('Failed to add budget item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('budget_items')
        .update({
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          type: formData.type,
          date: formData.date,
        })
        .eq('id', selectedItem.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowEditModal(false);
        setSelectedItem(null);
        setSuccess('Budget item updated successfully');
        loadBudgetItems();
      }
    } catch (err) {
      console.error('Error updating budget item:', err);
      setError('Failed to update budget item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', selectedItem.id);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        setShowDeleteModal(false);
        setSelectedItem(null);
        setSuccess('Budget item deleted successfully');
        loadBudgetItems();
      }
    } catch (err) {
      console.error('Error deleting budget item:', err);
      setError('Failed to delete budget item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveItem = async (item: BudgetItem) => {
    if (!profile) return;

    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('budget_items')
        .update({ status: 'approved', approved_by: profile.id })
        .eq('id', item.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Budget item approved');
        loadBudgetItems();
      }
    } catch (err) {
      console.error('Error approving item:', err);
      setError('Failed to approve budget item');
    }
  };

  const handleRejectItem = async (item: BudgetItem) => {
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('budget_items')
        .update({ status: 'rejected' })
        .eq('id', item.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Budget item rejected');
        loadBudgetItems();
      }
    } catch (err) {
      console.error('Error rejecting item:', err);
      setError('Failed to reject budget item');
    }
  };

  const openEditModal = (item: BudgetItem) => {
    setSelectedItem(item);
    setFormData({
      club_id: item.club_id,
      category: item.category,
      description: item.description || '',
      amount: item.amount.toString(),
      type: item.type,
      date: item.date,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (item: BudgetItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  // Calculate totals
  const totalIncome = budgetItems
    .filter((item) => item.type === 'income' && item.status === 'approved')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = budgetItems
    .filter((item) => item.type === 'expense' && item.status === 'approved')
    .reduce((sum, item) => sum + item.amount, 0);

  const pendingExpenses = budgetItems
    .filter((item) => item.type === 'expense' && item.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);

  const budgetBalance = totalIncome - totalExpenses;
  const availableBudget = budgetBalance - pendingExpenses;

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Budget & Expenses</h1>
        <Card>
          <EmptyState
            title="No access"
            description="You don't have permission to manage budgets."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget & Expenses</h1>
          <p className="text-gray-500 mt-1">Track club financials</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <Select
        options={clubs.map((c) => ({ value: c.id, label: c.name }))}
        value={clubFilter}
        onChange={(e) => setClubFilter(e.target.value)}
        className="w-64"
        placeholder="Select Club"
      />

      {clubFilter && (
        <>
          {/* Budget Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Income"
              value={formatCurrency(totalIncome)}
              icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses)}
              icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            />
            <StatCard
              title="Current Balance"
              value={formatCurrency(budgetBalance)}
              icon={<DollarSign className="h-5 w-5 text-blue-600" />}
            />
            <StatCard
              title="Pending Expenses"
              value={formatCurrency(pendingExpenses)}
              icon={<DollarSign className="h-5 w-5 text-orange-600" />}
            />
            <Card className={cn(
              "bg-gradient-to-br",
              availableBudget >= 0 ? "from-green-600 to-emerald-600" : "from-red-600 to-rose-600"
            )}>
              <div className="text-white text-center">
                <p className="text-xs text-white/80">Available Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(availableBudget)}</p>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-40"
            />
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            />
          </div>

          {/* Tabs */}
          <Tabs
            tabs={[
              { key: 'all', label: 'All', count: budgetItems.length },
              { key: 'income', label: 'Income', count: budgetItems.filter((i) => i.type === 'income').length },
              { key: 'expense', label: 'Expenses', count: budgetItems.filter((i) => i.type === 'expense').length },
              { key: 'pending', label: 'Pending', count: budgetItems.filter((i) => i.status === 'pending').length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Budget Items Table */}
          <Card padding="none">
            {budgetItems.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No transactions found. Add your first transaction to get started.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {budgetItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.type === 'income' ? 'success' : 'error'}>
                          {item.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'font-medium',
                            item.type === 'income' ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {item.status === 'pending' && isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveItem(item)}
                                title="Approve"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectItem(item)}
                                title="Reject"
                              >
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(item)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteModal(item)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Monthly Summary */}
          <Card>
            <CardHeader title="Monthly Summary" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-600">Income This Month</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(
                    budgetItems
                      .filter((i) => {
                        const itemDate = new Date(i.date);
                        const now = new Date();
                        return i.type === 'income' &&
                          i.status === 'approved' &&
                          itemDate.getMonth() === now.getMonth() &&
                          itemDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, i) => sum + i.amount, 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">Expenses This Month</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(
                    budgetItems
                      .filter((i) => {
                        const itemDate = new Date(i.date);
                        const now = new Date();
                        return i.type === 'expense' &&
                          i.status === 'approved' &&
                          itemDate.getMonth() === now.getMonth() &&
                          itemDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, i) => sum + i.amount, 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-600">Net This Month</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(
                    budgetItems
                      .filter((i) => {
                        const itemDate = new Date(i.date);
                        const now = new Date();
                        return i.status === 'approved' &&
                          itemDate.getMonth() === now.getMonth() &&
                          itemDate.getFullYear() === now.getFullYear();
                      })
                      .reduce((sum, i) => sum + (i.type === 'income' ? i.amount : -i.amount), 0)
                  )}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Budget Item"
        size="lg"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          {clubs.length > 1 && (
            <Select
              label="Club"
              required
              options={clubs.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.club_id || clubFilter}
              onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={() => setFormData({ ...formData, type: 'income' })}
                    className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Income</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={() => setFormData({ ...formData, type: 'expense' })}
                    className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Expense</span>
                </label>
              </div>
            </div>

            <Select
              label="Category"
              required
              options={(BUDGET_CATEGORIES[formData.type] || []).map((c) => ({ value: c, label: c }))}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Select category"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Budget Item"
        size="lg"
      >
        <form onSubmit={handleEditItem} className="space-y-4">
          {selectedItem && selectedItem.status !== 'pending' && (
            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                This item has already been {selectedItem.status}. Editing may affect your reports.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit_type"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={() => setFormData({ ...formData, type: 'income' })}
                    className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Income</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit_type"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={() => setFormData({ ...formData, type: 'expense' })}
                    className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Expense</span>
                </label>
              </div>
            </div>

            <Select
              label="Category"
              required
              options={(BUDGET_CATEGORIES[formData.type] || []).map((c) => ({ value: c, label: c }))}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Budget Item"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">
              This action cannot be undone. This will permanently delete this budget item.
            </p>
          </div>
          {selectedItem && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{selectedItem.description}</p>
              <p className="text-sm text-gray-500">
                {selectedItem.type === 'income' ? '+' : '-'}{formatCurrency(selectedItem.amount)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteItem} loading={submitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
