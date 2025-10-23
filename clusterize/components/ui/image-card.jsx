"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  X,
  EllipsisVertical,
  Check,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ImageCard({
  image,
  index,
  currentConfig,
  cardSize,
  selectedImages,
  batchMode,
  handleCardClick,
  setSelectedImage,
  tagValue,
  setTagValue,
  newCluster,
  setNewCluster,
  handleChanges,
  removeTag,
  error,
  setError,
  searchQuery,
  setSearchQuery,
  filteredTags,
  tags,
}) {
  // Local error state for dialog-specific errors
  const [dialogError, setDialogError] = useState("");
  // Dialog open state to track when dialog is opened/closed
  const [dialogOpen, setDialogOpen] = useState(false);

  // Error handling functions
  const clearErrors = () => {
    setDialogError("");
    if (setError) setError("");
  };

  // Clear dialog function - resets all dialog state
  const clearDialog = () => {
    clearErrors();
    setTagValue("");
    setNewCluster("");
  };

  // Handle dialog state changes
  const handleDialogOpenChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      // Clear dialog when it's closed
      clearDialog();
    }
  };

  function validateTag(tag) {
    if (!tag || tag.trim() === "") return "Tag cannot be empty.";
    if (tag.length < 2) return "Tag must be at least 2 characters.";
    if (tag.length > 30) return "Tag must be less than 30 characters.";
    if (/[^a-zA-Z0-9_-]/.test(tag)) return "Tag contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.";
    if (/\s/.test(tag)) return "Tags cannot contain spaces. Use underscores or hyphens.";
    return null;
  }

  function validateCluster(cluster) {
    if (!cluster || cluster.trim() === "") return "Cluster name cannot be empty.";
    if (cluster.length < 1) return "Cluster name must be at least 1 character.";
    if (cluster.length > 20) return "Cluster name must be less than 20 characters.";
    if (/[^a-zA-Z0-9_-]/.test(cluster)) return "Cluster name contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.";
    if (/\s/.test(cluster)) return "Cluster name cannot contain spaces.";
    return null;
  }

  const handleAddTag = async () => {
    clearErrors();

    const validationError = validateTag(tagValue);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    // Check for whitespace in tag
    if (
      tagValue.includes(" ") ||
      tagValue.includes("\t") ||
      tagValue.includes("\n")
    ) {
      setDialogError(
        "Tags cannot contain whitespace characters. Please use underscores or hyphens instead."
      );
      return;
    }

    try {
      // Create a synthetic event object if handleChanges expects one
      const syntheticEvent = { preventDefault: () => {} };
      await handleChanges(syntheticEvent);
      // Clear tag input on success and close dialog
      setTagValue("");
      setDialogOpen(false);
    } catch (err) {
      setDialogError(err.message || "Failed to add tag. Please try again.");
    }
  };

  const handleSaveCluster = async () => {
    clearErrors();

    const validationError = validateCluster(newCluster);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    try {
      // Create a synthetic event object if handleChanges expects one
      const syntheticEvent = { preventDefault: () => {} };
      await handleChanges(syntheticEvent);
      // Clear cluster input on success and close dialog
      setNewCluster("");
      setDialogOpen(false);
    } catch (err) {
      setDialogError(
        err.message || "Failed to update cluster. Please try again."
      );
    }
  };

  const handleRemoveTag = async (imageId, tag) => {
    clearErrors();

    try {
      await removeTag(imageId, tag);
    } catch (err) {
      setDialogError(err.message || "Failed to remove tag. Please try again.");
    }
  };

  return (
    <Card
      className={`w-full ${
        currentConfig.maxWidth
      } mx-auto cursor-pointer transition-all duration-200 ${
        image.cluster_id !== undefined &&
        image.original_cluster !== undefined &&
        image.cluster_id !== image.original_cluster
          ? "border-2 border-orange-500"
          : "border border-gray-700 hover:border-gray-600"
      } ${
        selectedImages && selectedImages.includes(image.id)
          ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 border-blue-500"
          : batchMode
          ? "hover:ring-2 hover:ring-gray-400 hover:ring-offset-2 hover:ring-offset-gray-900"
          : ""
      }`}
      style={{ backgroundColor: "#1f2937" }}
      key={image.id || index}
      onClick={(e) => handleCardClick(image.id, e)}
    >
      <CardHeader
        className={`flex justify-between items-center ${currentConfig.padding}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {batchMode && (
            <div
              className={`${
                cardSize === "small" ? "w-3 h-3" : "w-4 h-4"
              } rounded border-2 flex items-center justify-center flex-shrink-0 ${
                selectedImages && selectedImages.includes(image.id)
                  ? "bg-blue-600 border-blue-600"
                  : "border-gray-400"
              }`}
            >
              {selectedImages &&
                selectedImages.includes(image.id) && (
                  <Check
                    className={`${
                      cardSize === "small"
                        ? "h-2 w-2"
                        : "h-2.5 w-2.5"
                    } text-white`}
                  />
                )}
            </div>
          )}
          <CardTitle
            className={`text-white truncate ${currentConfig.titleSize} min-w-0`}
          >
            {image.name || "Untitled"}
          </CardTitle>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
        >
          <DialogTrigger asChild>
            <EllipsisVertical
              data-testid="image-card-ellipsis"
              aria-label="Open image dialog"
              className={`text-white cursor-pointer flex-shrink-0 ${
                cardSize === "small" ? "h-4 w-4" : "h-5 w-5"
              }`}
              onClick={() => {
                setSelectedImage(image.id);
                setDialogOpen(true);
              }}
            />
          </DialogTrigger>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <EllipsisVertical className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    Image Details
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-sm">
                    View image, add tags or change the cluster assignment for
                    this image.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Error Display */}
              {(dialogError || error) && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm">
                      {dialogError || error}
                    </p>
                  </div>
                </div>
              )}

                {/* Replace the image in your dialog with: */}
                <div className="max-h-96 bg-gray-900 rounded-lg overflow-hidden">
                    <TransformWrapper
                        initialScale={1}
                        minScale={0.5}
                        maxScale={3}
                        wheel={{ step: 0.1 }}
                        pinch={{ step: 5 }}
                        doubleClick={{ mode: "reset" }}
                    >
                        <TransformComponent>
                            <img
                                src={image.url}
                                alt={image.name || `Image ${index}`}
                                className="w-full h-auto object-contain"
                                draggable={false}
                            />
                        </TransformComponent>
                    </TransformWrapper>
                </div>

              {/* Add Tag Section */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <label className="text-sm font-semibold text-white">
                      Add Tag
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Add a tag..."
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg w-full pr-8"
                          value={tagValue}
                          onChange={(e) => {
                            setTagValue(e.target.value);
                            setSearchQuery(e.target.value);
                            clearErrors();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSearchQuery("");
                              setTagValue("");
                            }}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {/* Display filtered tag suggestions */}
                      {searchQuery && filteredTags.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full max-h-40 overflow-auto bg-gray-800 border border-gray-700 rounded-md shadow-lg">
                          {filteredTags.map((tag, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200"
                              onClick={() => {
                                setTagValue(tag.name);
                                setSearchQuery("");
                              }}
                            >
                              {tag.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
                      onClick={handleAddTag}
                      disabled={!tagValue || tagValue.trim() === ""}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Change Cluster Section */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <label className="text-sm font-semibold text-white">
                      Change Cluster
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Set new cluster..."
                      className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-lg flex-1"
                      value={newCluster}
                      onChange={(e) => {
                        setNewCluster(e.target.value);
                        clearErrors();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveCluster();
                        }
                      }}
                    />
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
                      onClick={handleSaveCluster}
                      disabled={
                        !newCluster || newCluster.trim() === ""
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div>
          <img
            src={image.url}
            alt={image.name || `Image ${index}`}
            className="w-full h-auto object-contain rounded-lg"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {image.tags &&
              image.tags.length > 0 &&
              image.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 flex items-center gap-1 px-1.5 py-0.5 text-xs"
                >
                  <span className="text-[10px]">{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(image.id, tag)}
                    className="ml-0.5 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:ring-offset-1"
                    title="Remove tag"
                  >
                    <X size={8} className="text-gray-500" />
                  </button>
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
