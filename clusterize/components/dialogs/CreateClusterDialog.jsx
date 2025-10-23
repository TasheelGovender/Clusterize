"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useCluster } from "@/hooks";
import { toast } from "sonner";
import Fuse from "fuse.js";

export default function CreateClusterDialog({
  isOpen,
  onClose,
  projectId,
  nextClusterNumber,
  onClusterCreated,
  labels = [], // Provide a default empty array
}) {
  const [clusterName, setClusterName] = useState("");
  const [clusterLabel, setClusterLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLabels, setFilteredLabels] = useState([]);
  const [labelError, setLabelError] = useState("");

  const { createCluster, loading, error } = useCluster();

  // Set default cluster name when dialog opens
  useEffect(() => {
    if (isOpen && nextClusterNumber) {
      setClusterName(nextClusterNumber);
    }
  }, [isOpen, nextClusterNumber]);

  const handleClose = () => {
    setClusterName("");
    setClusterLabel("");
    onClose(false);
  };

  const handleCreate = async () => {
    if (!clusterName.trim()) return;

    // Validate label
    const validationError = validateClusterLabel(clusterLabel);
    if (validationError) {
      setLabelError(validationError);
      return;
    } else {
      setLabelError("");
    }

    console.log("=== CREATE CLUSTER DEBUG ===");
    console.log("ProjectId:", projectId);
    console.log("ClusterName:", clusterName);
    console.log("ClusterLabel:", clusterLabel);
    console.log("NextClusterNumber:", nextClusterNumber);

    try {
      console.log("Calling createCluster API...");
      const result = await createCluster(projectId, clusterName, clusterLabel);
      console.log("Create cluster success:", result);
      toast.success("Cluster created successfully!");

      // Successfully created cluster - close dialog first
      handleClose();

      // Then trigger silent background refresh
      if (onClusterCreated) {
        console.log("Triggering background project data refresh...");
        onClusterCreated();
      }
    } catch (err) {
      // Error is handled by the hook and stored in the error state
      console.error("Failed to create cluster:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
      });
    }
  };

  function validateClusterLabel(label) {
    if (label && label.length > 0) {
      if (label.length < 3) return "Label must be at least 3 characters.";
      if (label.length > 50) return "Label must be less than 50 characters.";
      if (/[^a-zA-Z0-9 _-]/.test(label)) return "Label contains invalid characters.";
    }
    return null;
  }

  // fuzzy search labels
  useEffect(() => {
    if (!searchQuery) {
      setFilteredLabels([]);
      return;
    }
    // Make sure labels is an array of objects with name property
    let searchableLabels = labels;
    
    // If labels is an array of strings, convert to objects with name property
    if (labels && labels.length > 0 && typeof labels[0] === 'string') {
      searchableLabels = labels.map(label => ({ name: label }));
    }
    
    // If no labels, exit early
    if (!searchableLabels || searchableLabels.length === 0) {
      setFilteredLabels([]);
      return;
    }

    console.log("Searching labels...", searchQuery, searchableLabels);

    const fuse = new Fuse(searchableLabels, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    console.log("Search results:", results);
    setFilteredLabels(results.map((result) => result.item));
  }, [searchQuery, labels]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                Create New Cluster
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-gray-400 text-base leading-relaxed">
            Create a new cluster to organize your images. The cluster number is
            automatically assigned. You can also add a label to help identify it
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Display */}
          {error || labelError ? (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg">
              <p className="text-sm">{error || labelError}</p>
            </div>
          ) : null}

          {/* Cluster Number Input */}
          <div className="space-y-2">
            <Label
              htmlFor="clusterNumber"
              className="text-sm font-medium text-gray-300"
            >
              Cluster Number *
            </Label>
            <Input
              id="clusterNumber"
              type="text"
              placeholder="e.g., 1, 2, 3..."
              value={clusterName}
              onChange={(e) => setClusterName(e.target.value)}
              readOnly
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-xl cursor-not-allowed"
            />
          </div>

          {/* Cluster Label Input */}
          <div className="space-y-2 relative flex-1">
            <Label
              htmlFor="clusterLabel"
              className="text-sm font-medium text-gray-300"
            >
              Label (Optional)
            </Label>
            <div className="relative">
              <Input
                id="clusterLabel"
                type="text"
                placeholder="Label to identify this cluster..."
                value={clusterLabel}
                onChange={(e) => {
                  setClusterLabel(e.target.value);
                  setSearchQuery(e.target.value); // Update search query when typing
                }}
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setClusterLabel("");
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

              {/* Display filtered label suggestions */}
              {searchQuery && filteredLabels.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-40 overflow-auto bg-gray-800 border border-gray-700 rounded-md shadow-lg">
                  {filteredLabels.map((label, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200"
                      onClick={() => {
                        // Handle both cases where label could be an object with name property or just a string
                        const labelValue = typeof label === 'object' && label.name ? label.name : label;
                        setClusterLabel(labelValue);
                        setSearchQuery("");
                      }}
                    >
                      {/* Display the label name or the label itself if it's a string */}
                      {typeof label === 'object' && label.name ? label.name : label}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-400 text-xs">ℹ</span>
              </div>
              <div className="flex-1">
                <p className="text-blue-300 text-sm font-medium mb-1">
                  Cluster Organization
                </p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Once created, you can assign images to this cluster through
                  the workspace or by uploading new images with cluster
                  assignments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-gray-500 rounded-xl py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!clusterName.trim() || loading}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-emerald-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Cluster"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
