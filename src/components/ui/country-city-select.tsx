"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Minimal demo data – zarurat ho to badha lo
const DATA: Record<string, string[]> = {
  "United States": ["New York", "Los Angeles", "Chicago", "San Francisco"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds"],
  India: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad"],
  Pakistan: ["Karachi", "Lahore", "Islamabad", "Faisalabad"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary"],
};

type Props = {
  country?: string;
  city?: string;
  onChange?: (value: { country: string; city: string }) => void;
  className?: string;
};

export function CountryCitySelect({ country, city, onChange, className }: Props) {
  const [selectedCountry, setSelectedCountry] = React.useState<string>(country ?? "");
  const [selectedCity, setSelectedCity] = React.useState<string>(city ?? "");

  React.useEffect(() => {
    // agar country change ho jaye to city reset karo
    if (selectedCountry && !DATA[selectedCountry]?.includes(selectedCity)) {
      setSelectedCity("");
    }
  }, [selectedCountry, selectedCity]);

  React.useEffect(() => {
    onChange?.({ country: selectedCountry, city: selectedCity });
  }, [selectedCountry, selectedCity, onChange]);

  const countries = Object.keys(DATA);
  const cities = selectedCountry ? DATA[selectedCountry] : [];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Country */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Country</Label>
          <Select
            value={selectedCountry}
            onValueChange={(v) => setSelectedCountry(v)}
          >
            <SelectTrigger className="bg-background/50 border-border hover:bg-background transition-colors">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">City</Label>
          <Select
            disabled={!selectedCountry}
            value={selectedCity}
            onValueChange={(v) => setSelectedCity(v)}
          >
            <SelectTrigger className="bg-background/50 border-border hover:bg-background transition-colors">
              <SelectValue
                placeholder={
                  selectedCountry ? "Select a city" : "Select a country first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cities.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default CountryCitySelect;
