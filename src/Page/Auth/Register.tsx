// src/pages/Register.tsx  (updated)
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';

const ROLES = [
  'Admin',
  'Managing Director',
  'Director Logistics',
  'HR Manager',
  'Finance Manager',
  'Operations Manager',
  'Supervisor',
  'Guard',
] as const;

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'Guard' as string,
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = formData;
      await api.post('/auth/register', payload);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-8">
      <div className="glass-card rounded-xl p-8 w-full max-w-md border border-border/50">
        <h1 className="text-2xl font-bold mb-6">Register for ISMS</h1>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" value={formData.name} required
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={formData.email} required
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input type="tel" value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <input type="text" value={formData.department}
              placeholder="e.g. Operations, Finance, HR"
              onChange={e => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input type="password" value={formData.password} required
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input type="password" value={formData.confirmPassword} required
              onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border bg-secondary" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
            {loading ? 'Registering…' : 'Register'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};