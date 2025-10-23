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

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  error,
  setError,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null); // Clear any previous errors
    try {
      await onConfirm();
      // Don't close here - let the parent component handle closing on success
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 shadow-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Delete Project
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you sure you want to delete "{projectName}"? This action cannot
            be undone.
          </DialogDescription>
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg mt-4">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </DialogHeader>
        <DialogFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
