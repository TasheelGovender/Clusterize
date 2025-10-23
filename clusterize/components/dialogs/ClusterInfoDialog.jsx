"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, RefreshCw, Hash, Tag, Check, X } from "lucide-react";
import { useCluster } from "@/hooks";
import Fuse from "fuse.js";

export default function ClusterInfoDialog({
  isOpen,
  onClose,
  cluster,
  projectId,
  onClusterUpdated,
  labels = [],
  silentRefetch,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState("");
  const [displayedLabel, setDisplayedLabel] = useState(cluster?.label_name || "");
  const { updateCluster, resetCluster, loading, error, setError } = useCluster();
  const [searchQuery, setSearchQuery] = useState("");
  const [resetClusterDialogOpen, setResetClusterDialogOpen] = useState(false);
  const [filteredLabels, setFilteredLabels] = useState([]);
  const [labelError, setLabelError] = useState("");

  // Update displayed label when cluster prop changes
  useEffect(() => {
    setDisplayedLabel(cluster?.label_name || "");
  }, [cluster?.label_name]);

  const handleClose = () => {
    // Always clean up editing state when closing
    if (isEditing) {
      handleCancel();
    }
    setError(null);
    onClose();
  };

  const handleEdit = () => {
    setIsEditing(true);
    setLabelValue(displayedLabel || "");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLabelValue("");
    setSearchQuery(""); // Clear search query when canceling
  };

  const handleSave = async () => {
    // Validate label before saving
    const validationError = validateClusterLabel(labelValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    console.log("Saving label:", labelValue);

    try {
      await updateCluster(projectId, cluster.cluster_name, labelValue);
      
      // Update the displayed label immediately with the new value
      setDisplayedLabel(labelValue);
      setIsEditing(false);
      setSearchQuery(""); // Clear search query after saving

      // Trigger refresh if callback provided
      if (onClusterUpdated) {
        onClusterUpdated();
      }

      // Optional: Close dialog after successful update
      // onClose();
    } catch (error) {
      console.error("Failed to update cluster:", error);
    }
  };

  // fuzzy search labels
  useEffect(() => {
    // Don't search if query is empty or too short
    if (!searchQuery || searchQuery.trim().length < 1) {
      setFilteredLabels([]);
      return;
    }

    // If no labels are provided, exit early
    if (!labels || labels.length === 0) {
      setFilteredLabels([]);
      return;
    }
    
    // Make sure labels is an array of objects with name property
    let searchableLabels = labels;
    
    // If labels is an array of strings, convert to objects with name property
    if (labels.length > 0 && typeof labels[0] === 'string') {
      searchableLabels = labels.map(label => ({ name: label }));
    }

    console.log("Searching labels...", searchQuery, searchableLabels);

    try {
      const fuse = new Fuse(searchableLabels, {
        keys: ["name"],
        includeScore: true,
        threshold: 0.3, // 0.0 = exact match, 1.0 = match anything
        minMatchCharLength: 1,
      });

      const results = fuse.search(searchQuery);
      console.log("Search results:", results);
      setFilteredLabels(results.map((result) => result.item));
    } catch (error) {
      console.error("Error in fuzzy search:", error);
      setFilteredLabels([]);
    }
  }, [searchQuery, labels]); 
  
  if (!cluster) {
    return null;
  }
  function validateClusterLabel(label) {
    if (label && label.length > 0) {
      if (label.length < 3) return "Label must be at least 3 characters.";
      if (label.length > 50) return "Label must be less than 50 characters.";
      if (/[^a-zA-Z0-9 _-]/.test(label)) return "Label contains invalid characters.";
    }
    return null;
  }

  const handleResetCluster = async () => {
    console.log("Resetting cluster...");
    try {
      await resetCluster(projectId, cluster.cluster_name);
      toast.success("Cluster reset successfully");
      // Trigger refresh if callback provided
      if (silentRefetch) {
        await silentRefetch();
      }
    } catch (error) {
      console.error("Failed to reset cluster:", error);
      toast.error("Failed to reset cluster");
    } finally {
      setResetClusterDialogOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Hash className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                Cluster {cluster.cluster_name}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-gray-400 text-base leading-relaxed">
            View and manage information about this cluster and its contents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Display */}
          {error || labelError ? (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg">
              <p className="text-sm">{error || labelError}</p>
            </div>
          ) : null}

          {/* Basic Information Section */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Cluster Name</span>
                <div className="bg-gray-700/50 px-3 py-1 rounded-lg">
                  <span className="text-white font-mono text-sm">
                    {cluster.cluster_name}
                  </span>
                </div>
              </div>

              {/* Editable Label Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm font-medium flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Label
                  </span>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEdit}
                      className="h-6 w-6 p-0 hover:bg-gray-700/50"
                      aria-label="Edit label"
                      data-testid="edit-label-button"
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-2 relative flex-1">
                    <div className="relative">
                      <Input
                        value={labelValue}
                        onChange={(e) => {
                          setLabelValue(e.target.value);
                          setSearchQuery(e.target.value); // Update search query to trigger fuzzy search
                        }}
                        onBlur={() => setSearchQuery("")}
                        placeholder="Enter label name..."
                        className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
                        disabled={loading}
                      />
                      {searchQuery && (
                      <Button
                          variant="ghost"
                          onClick={() => {
                            setSearchQuery("");
                            setLabelValue("");
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
                        const selectedLabel = typeof label === 'object' && label.name ? label.name : label;
                        setLabelValue(selectedLabel);
                        setSearchQuery(""); // Clear search query to hide suggestions
                      }}
                    >
                      {/* Display the label name or the label itself if it's a string */}
                      {typeof label === 'object' && label.name ? label.name : label}
                    </div>
                  ))}
                </div>
              )}
               </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={loading}
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700/50 px-3 py-1 h-7 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-lg">
                    <span className="text-purple-200 text-sm">
                      {displayedLabel || "No label set"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          {(cluster.image_count || cluster.total_size) && (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
              <div className="space-y-3">
                {cluster.image_count && (
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Total Images</span>
                    <div className="bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-lg">
                      <span className="text-green-200 text-sm font-medium">
                        {cluster.image_count}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-blue-400 text-xs">ℹ</span>
              </div>
              <div className="flex-1">
                <p className="text-blue-300 text-sm font-medium mb-1">
                  Cluster Management
                </p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Use the workspace to view, organize, and manage images within
                  this cluster. You can also edit cluster properties or reassign
                  images as needed.
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
            className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-gray-500 rounded-xl py-2.5"
            data-testid="close-button"
          >
            Close
          </Button>
          {!isEditing && (
            <Button
              onClick={() => setResetClusterDialogOpen(true)}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium rounded-xl py-2.5"
              data-testid="reset-cluster-button"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Cluster
            </Button>
          )}
        </div>

        {/* Reset Cluster Dialog */}
          <AlertDialog
            open={resetClusterDialogOpen}
            onOpenChange={setResetClusterDialogOpen}
          >
            <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 text-white sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Reset Cluster</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>
                Are you sure you want to reset the cluster? This will set all images in this cluster to their original state. This action cannot be undone.
              </AlertDialogDescription>
                <div className="flex justify-end">
                  <AlertDialogCancel variant="outline"
                    className="mr-2"
                    onClick={() => setResetClusterDialogOpen(false)}>
                      Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction  className="bg-red-600 hover:bg-red-700"
                    onClick={handleResetCluster}>
                      Continue
                  </AlertDialogAction>
                </div>
            </AlertDialogContent>
          </AlertDialog>
          
      </DialogContent>
    </Dialog>
  );
}
