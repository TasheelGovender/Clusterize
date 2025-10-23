"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
  error,
  setError,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const validationError = validateProjectName(inputValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/proxy/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_name: inputValue,
          project_description: `Project ${inputValue} created by user`,
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setInputValue("");
        onClose();
        toast.success("Project created successfully!");
        if (onProjectCreated) {
          onProjectCreated(newProject);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to create project: ${response.status}`;
        setError(errorMessage);
        return; // Exit early, don't throw
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setInputValue("");
    setError(null); // Clear errors when closing
    onClose();
  };

  function validateProjectName(name) {
    if (!name.trim()) return "Project name is required.";
    if (name.length < 3) return "Project name must be at least 3 characters.";
    if (name.length > 50) return "Project name must be less than 50 characters.";
    if (/[^a-zA-Z0-9 _-]/.test(name)) return "Project name contains invalid characters.";
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 shadow-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter a name for your new project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-slate-300 font-medium">
                Project Name
              </Label>
              <Input
                id="name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                placeholder="Enter project name"
                disabled={isCreating}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!inputValue.trim() || isCreating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
            >
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
