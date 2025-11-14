"use client";

 import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClientFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
};

type Props = {
  onSubmit: (values: ClientFormValues) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  className?: string;
  initialValues?: Partial<ClientFormValues>;
};

export function AddClientForm({
  onSubmit,
  submitting,
  submitLabel = "Add Client",
  className,
  initialValues,
}: Props) {
  const [values, setValues] = useState<ClientFormValues>({
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    address: initialValues?.address ?? "",
    country: initialValues?.country ?? "",
  });

  // Update form when initial values change (e.g., edit dialog opens)
  // Only apply provided fields to avoid clobbering user typing unexpectedly.
  // Note: runs when initialValues reference changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initialValues) {
      setValues((v) => ({
        name: initialValues.name ?? v.name,
        email: initialValues.email ?? v.email,
        phone: initialValues.phone ?? v.phone,
        address: initialValues.address ?? v.address,
        country: initialValues.country ?? v.country,
      }));
    }
  }, [initialValues]);

  function handleChange<K extends keyof ClientFormValues>(key: K, val: ClientFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name || !values.email) return;
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-name">Company Name</Label>
          <Input
            id="client-name"
            placeholder="Enter company name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            type="email"
            placeholder="email@company.com"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-phone">Phone</Label>
          <Input
            id="client-phone"
            placeholder="+92-300-1234567"
            value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-country">Country</Label>
          <Input
            id="client-country"
            placeholder="Pakistan"
            value={values.country}
            onChange={(e) => handleChange("country", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-address">Address</Label>
          <Input
            id="client-address"
            placeholder="Street, City"
            value={values.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
