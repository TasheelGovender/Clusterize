"use client";

import { useMemo, memo } from "react";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";

// Memoized table cell components for performance - OUTSIDE the function
const ProjectNameCell = memo(function ProjectNameCell({ value }) {
  return <div className="font-medium">{value}</div>;
});

const OwnerCell = memo(function OwnerCell({ value }) {
  return <div>{value}</div>;
});

const IdCell = memo(function IdCell({ value }) {
  return <div>{value}</div>;
});

const ActionButton = memo(function ActionButton({ projectId, onDelete }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onDelete) {
          onDelete(projectId);
        }
      }}
      className="p-0.5 hover:text-red-800 focus:outline-none bg-transparent border-none"
      title="Delete Project"
      type="button"
    >
      <Trash2 size={20} />
    </button>
  );
});

const SortableHeader = memo(function SortableHeader({ column, children }) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
});

// Main ProjectsTable component
export default function ProjectsTable({ projects, onDeleteClick }) {
  // Memoized columns definition - INSIDE the function because it depends on props
  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div data-no-row-click="true">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "project_name",
        header: ({ column }) => (
          <SortableHeader column={column}>Name</SortableHeader>
        ),
        cell: ({ row }) => (
          <ProjectNameCell value={row.getValue("project_name")} />
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const projectId = row.original.id;
          return (
            <ActionButton projectId={projectId} onDelete={onDeleteClick} />
          );
        },
      },
    ],
    [onDeleteClick]
  );

  // Memoized getRowHref function
  const getRowHref = useMemo(() => {
    return (row) => `/projects/${row.id}`;
  }, []);

  return (
    <div className="p-10 rounded-md mt-4">
      <DataTable columns={columns} data={projects} getRowHref={getRowHref} />
    </div>
  );
}
