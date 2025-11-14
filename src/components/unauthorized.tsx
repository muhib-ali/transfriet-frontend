// src/components/unauthorized.tsx
"use client";

export default function Unauthorized({
  msg = "You don't have access to this page.",
}: {
  msg?: string;
}) {
  return (
    <div className="m-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {msg}
    </div>
  );
}
