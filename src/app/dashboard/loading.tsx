// src/app/dashboard/loading.tsx
"use client";

import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center p-4">
      <Spinner className="size-24 text-blue-500" />
    </div>
  );
}
