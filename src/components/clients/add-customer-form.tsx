"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClientsFormValues = {
  company: string;
  email: string;
  phone: string;
  address: string;
};

type Props = {
  onSubmit: (values: ClientsFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
  className?: string;
};

export function AddClientsForm({
  onSubmit,
  submitting,
  submitLabel = "Add Clients",
  className,
}: Props) {
  const [values, setValues] = useState<ClientsFormValues>({
    company: "",
    email: "",
    phone: "",
    address: "",
  });

  function handleChange<K extends keyof ClientsFormValues>(
    key: K,
    val: ClientsFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // basic required validation
    if (!values.company || !values.email) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company Name</Label>
          <Input
            id="company"
            placeholder="Enter company name"
            value={values.company}
            onChange={(e) => handleChange("company", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@company.com"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="+1 234 567 8900"
            value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Street address, City, State"
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
