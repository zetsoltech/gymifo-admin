import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Eye, EyeOff } from 'lucide-react';

// ─── Password Validation ────────────────────────────────────────────────────

export const passwordRules = [
  { key: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'number', label: 'One number (0-9)', test: (pw) => /\d/.test(pw) },
  {
    key: 'special',
    label: 'One special character (!@#$%…)',
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

export function isPasswordValid(password) {
  return passwordRules.every((rule) => rule.test(password));
}

function PasswordChecklist({ password }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 text-xs ${passed ? 'text-chart-1' : 'text-muted-foreground'}`}
          >
            {passed ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Create Admin Modal ─────────────────────────────────────────────────────

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'admin',
};

export function UserFormModal({ open, onOpenChange, onSave, saving }) {
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose(value) {
    if (!value) {
      setForm(emptyForm);
      setShowPassword(false);
    }
    onOpenChange(value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !isPasswordValid(form.password)) return;
    onSave({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    });
  }

  const canSubmit =
    form.fullName.trim() && form.email.trim() && isPasswordValid(form.password);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin account. The user will be able to log in with the credentials you
            set here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="user-fullName">Full Name *</Label>
            <Input
              id="user-fullName"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Jane Admin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="admin@gymifo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">Password *</Label>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Enter password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordChecklist password={form.password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => update('role', v)}>
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Admin Modal ───────────────────────────────────────────────────────

// canEditAll = caller is super-admin (name + password + role). Otherwise name only.
export function EditUserModal({ open, onOpenChange, user, canEditAll, onSave, saving }) {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);

  // Prime fields from the selected user each time the modal opens.
  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName || '');
      setRole(typeof user.role === 'object' ? user.role?.name || 'admin' : user.role || 'admin');
      setPassword('');
      setShowPassword(false);
    }
  }, [open, user]);

  const passwordOk = !password || isPasswordValid(password);
  const canSubmit = fullName.trim() && passwordOk && !saving;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const payload = { fullName: fullName.trim() };
    if (canEditAll) {
      if (password) payload.password = password;
      payload.role = role;
    }
    onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Admin User</DialogTitle>
          <DialogDescription>
            {canEditAll
              ? 'Update this admin’s name, role, or password. Leave password blank to keep it.'
              : 'Update your display name.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">Full Name *</Label>
            <Input
              id="edit-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Admin"
              required
            />
          </div>

          {canEditAll && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordChecklist password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
