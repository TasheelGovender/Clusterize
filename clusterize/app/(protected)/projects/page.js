"use client";

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Lazy load dialog components
const CreateProjectDialog = dynamic(
  () => import("@/components/dialogs/CreateProjectDialog"),
  {
    ssr: false,
  }
);

const DeleteConfirmDialog = dynamic(
  () => import("@/components/dialogs/DeleteConfirmDialog"),
  {
    ssr: false,
  }
);

// Lazy load table component with skeleton loading
const ProjectsTable = dynamic(
  () => import("@/components/projects/ProjectsTable"),
  {
    loading: () => (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-700">
            <Skeleton className="h-6 w-32 bg-gray-700" />
            <Skeleton className="h-6 w-24 bg-gray-700" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 bg-gray-700" />
                  <Skeleton className="h-3 w-32 bg-gray-700" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16 rounded-lg bg-gray-700" />
                <Skeleton className="h-8 w-16 rounded-lg bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function ProfileClient() {
  const { user, error, isLoading } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [createError, setCreateError] = useState(null);

  const handleOpenDialog = () => {
    setCreateError(null); // Clear any previous errors
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCreateError(null);
    setIsDialogOpen(false);
  };

  const handleProjectCreated = (newProject) => {
    setCreateError(null); // Clear any errors on successful creation
    fetchProjects();
    setIsDialogOpen(false); // Close dialog on success
  };

  async function fetchProjects() {
    try {
      const response = await fetch("/api/proxy/projects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }

      const data = await response.json();
      setProjects(data.data.data);
      console.log("projects", data.data.data);
      return data;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return null;
    }
  }

  const handleDeleteClick = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    setProjectToDelete(project);
    setDeleteError(null); // Clear any previous delete errors
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete?.id) return;

    setDeleteError(null); // Clear any previous errors

    try {
      const response = await fetch(`/api/proxy/project/${projectToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Delete response:", response);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to delete project: ${response.status}`;
        setDeleteError(errorMessage);
        return; // Exit early, don't throw
      }

      console.log("Project deleted successfully");
      toast.success("Project deleted successfully!");

      // Close dialog and clear state on successful deletion
      setConfirmDeleteOpen(false);
      setProjectToDelete(null);

      await fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      setDeleteError("Failed to delete project. Please try again.");
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteOpen(false);
    setProjectToDelete(null);
    setDeleteError(null); // Clear any errors when canceling
  };

  useEffect(() => {
    async function loadProjects() {
      await fetchProjects();
    }
    loadProjects();
  }, [user]);

  if (isLoading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center">
              <div className="space-y-4">
                <Skeleton className="h-12 w-64 bg-gray-700" />
                <Skeleton className="h-6 w-96 bg-gray-700" />
              </div>
              <Skeleton className="h-12 w-32 rounded-xl bg-gray-700" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-full bg-gray-700" />
              <Skeleton className="h-6 w-full bg-gray-700" />
              <Skeleton className="h-6 w-full bg-gray-700" />
              <Skeleton className="h-6 w-full bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-8">
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-700 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h3 className="text-red-300 text-lg font-semibold mb-2">
            Error Loading Projects
          </h3>
          <p className="text-red-400/80">{error.message}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8" data-testid="main-container">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-white text-3xl">📋</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Projects</h1>
                <p className="text-gray-400">
                  Manage your image clustering projects and access workspaces
                </p>
              </div>
            </div>

            <Button
              onClick={handleOpenDialog}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0"
            >
              <SquarePen className="mr-2 h-5 w-5" />
              <span>Create Project</span>
            </Button>
          </div>
        </div>

        {/* Projects Table Container */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <ProjectsTable
            projects={projects}
            onDeleteClick={handleDeleteClick}
          />
        </div>
      </div>

      {/* Lazy-loaded Dialog Components */}
      <CreateProjectDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onProjectCreated={handleProjectCreated}
        error={createError}
        setError={setCreateError}
      />

      <DeleteConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.project_name || ""}
        error={deleteError}
        setError={setDeleteError}
      />
    </div>
  );
}
