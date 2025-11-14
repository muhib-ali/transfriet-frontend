// src/app/dashboard/categories/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import JobFileFormModal from "@/components/job-files/job-file-form-modal";
import JobFileEditModal from "@/components/job-files/job-file-edit-modal";  

import {
  listJobFiles,
  getJobFileById,
  createJobFile,
  updateJobFile,
  deleteJobFile,
  type JobFileItem,
} from "@/lib/job_files.api";

import { ENTITY_PERMS } from "@/rbac/permissions-map";
import { useHasPermission } from "@/hooks/use-permission";

type Row = {
  id: string;
  title: string;
  description: string;
  created_at?: string;
  is_active?: boolean;
};

export default function JobFilesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);

  // pagination (simple)
  const [page] = useState(1);
  const [limit] = useState(10);

  // --- Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const current = rows.find((r) => r.id === editId) || null;

  // RBAC
  const canList   = useHasPermission(ENTITY_PERMS.jobFiles.list);
  const canCreate = useHasPermission(ENTITY_PERMS.jobFiles.create);
  const canRead   = useHasPermission(ENTITY_PERMS.jobFiles.read);
  const canUpdate = useHasPermission(ENTITY_PERMS.jobFiles.update);
  const canDelete = useHasPermission(ENTITY_PERMS.jobFiles.delete);



  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // initial load + search
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        if (!canList) {
          setRows([]);
          return;
        }
        const { rows } = await listJobFiles(page, limit, debouncedQ || undefined, { signal: ac.signal });
        setRows(
          rows.map((c: JobFileItem) => ({ 
            id: c.id,
            title: c.title,
            description: c.description ?? "",
            created_at: c.created_at,
            is_active: c.is_active,
          }))
        );
      } catch (e: any) {
        if (e?.code === "ERR_CANCELED" || e?.message === "canceled") return;
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load job files");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [page, limit, canList, debouncedQ]);

  const filtered = useMemo(() => rows, [rows]);

  // CREATE
  const addJobFile = async (c: { title: string; description: string }) => {
    if (!canCreate) return;
    try {
      await createJobFile({ title: c.title, description: c.description });
      toast.success("Job file created");

      const { rows } = await listJobFiles(page, limit, q.trim() || undefined);
      setRows(
        rows.map((cc) => ({
          id: cc.id,
          title: cc.title,
          description: cc.description ?? "",
          created_at: cc.created_at,
          is_active: cc.is_active,
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  // EDIT OPEN (guarded)
  const openEdit = async (id: string) => {
    if (!canUpdate) return; // hard stop
    try {
      const c = await getJobFileById(id);
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                id: c.id,
                title: c.title,
                description: c.description ?? "",
                created_at: c.created_at,
                is_active: c.is_active,
              }
            : r
        )
      );
      setEditId(id);
      setEditOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to open category");
    }
  };

  // UPDATE
  const applyEdit = async (updated: { title: string; description: string }) => {
    if (!canUpdate || !editId) return;
    try {
      await updateJobFile({ id: editId, title: updated.title, description: updated.description });
      toast.success("Job file updated");

      const { rows } = await listJobFiles(page, limit, q.trim() || undefined);
      setRows(
        rows.map((cc) => ({
          id: cc.id,
          title: cc.title,
          description: cc.description ?? "",
          created_at: cc.created_at,
          is_active: cc.is_active,
        }))
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Update failed");
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteJobFile(id);
      toast.success("Job file deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6 scrollbar-stable">
      {/* Header (same styling) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Files</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage product and service Job Files
          </p>
        </div>

        <JobFileFormModal
          onCreate={addJobFile}
          trigger={
            <Button className="gap-2" disabled={!canCreate}>
              <Plus className="h-4 w-4" />
              Add Job file
            </Button>
          }
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-2xl">All Job Files</CardTitle>
            <div className="relative w-[350px] max-w-[50vw]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                className="h-9 pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6">
          <div className="mt-1 rounded-xl border overflow-hidden [&_tbody_tr:hover]:bg-transparent [&_thead_tr:hover]:bg-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-200">
                  <TableHead className="w-[30%] rounded-tl-xl">Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[20%]">Created At</TableHead>
                  <TableHead className="w-[110px] text-right rounded-tr-xl">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      Loading categories…
                    </TableCell>
                  </TableRow>
                ) : !canList ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                      You don’t have permission to view categories.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filtered.map((r, idx) => {
                      const isLast = idx === filtered.length - 1;
                      return (
                        <TableRow key={r.id} className="odd:bg-muted/30 even:bg-white hover:bg-transparent">
                          <TableCell className={`font-medium ${isLast ? "rounded-bl-xl" : ""}`}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="rounded-md">
                                {r.title.slice(0, 1).toUpperCase()}
                              </Badge>
                              {r.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.description}</TableCell>
                          <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className={`text-right ${isLast ? "rounded-br-xl" : ""}`}>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  {canUpdate && (
                                    <DropdownMenuItem className="gap-2" onClick={() => openEdit(r.id)}>
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="gap-2 text-destructive focus:text-destructive"
                                      onClick={() => handleDelete(r.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">
                          No categories found.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls (UI only; logic unchanged) */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {`Showing ${filtered.length ? 1 : 0} to ${filtered.length} of ${filtered.length} categories`}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
              </div>
              <Button variant="outline" size="sm" disabled className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal — force closed when no permission */}
      <JobFileEditModal
        open={canUpdate ? editOpen : false}
        onOpenChange={(next) => {
          if (!canUpdate) return; // ignore external open attempts
          setEditOpen(next);
          if (!next) setEditId(null);
        }}
        initial={
          current
            ? { title: current.title, description: current.description ?? "" }
            : null
        }
        onUpdate={applyEdit}
      />
    </div>
  );
}
