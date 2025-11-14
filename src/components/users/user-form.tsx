// src/components/users/user-form.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type RoleOption = { id: string; title: string };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role_title?: string;
  is_active: boolean;
};

export type UserInput = {
  name: string;
  email: string;
  roleId: string;
  password?: string;
  is_active: boolean;
};

type Props = {
  mode: "create" | "edit";
  roles: RoleOption[];
  initial?: Partial<UserRow>;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (data: UserInput) => void;
};

export default function UserForm({
  mode,
  roles,
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = React.useState<UserInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    roleId: initial?.roleId ?? "",
    password: "",
    is_active: initial?.is_active ?? true,
  });
  const [showPassword, setShowPassword] = React.useState(false);

  function update<K extends keyof UserInput>(key: K, val: UserInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.roleId) return;
    if (mode === "create" && !form.password?.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="Enter full name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Role *</Label>
        <Select
          value={form.roleId}
          onValueChange={(v) => update("roleId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pick a role for this user
        </p>
      </div>

      {/* Password: required in create, optional in edit */}
      <div className="grid gap-2">
        <Label htmlFor="password">
          {mode === "create" ? "Password *" : "Password (optional)"}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={mode === "create" ? "Enter password" : "Leave blank to keep same"}
            value={form.password ?? ""}
            onChange={(e) => update("password", e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showPassword ? (
              // Eye-off icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12s3.5-6 10-6c2.2 0 4.1.6 5.6 1.4M22 12s-3.5 6-10 6c-2.2 0-4.1-.6-5.6-1.4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            ) : (
              // Eye icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="font-medium">Active Status</div>
          <p className="text-xs text-muted-foreground">
            Active users can log in to the system
          </p>
        </div>
        <Switch
          checked={form.is_active}
          onCheckedChange={(v) => update("is_active", v)}
          aria-label="Active status"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
