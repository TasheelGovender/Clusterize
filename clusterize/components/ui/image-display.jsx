"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import {
  X,
  Grid3X3,
  Grid2X2,
  LayoutGrid,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { ImageCard } from "@/components/ui/image-card";

export function ImageDisplay({
  data,
  setSelectedImage,
  tagValue,
  newCluster,
  handleChanges,
  setTagValue,
  setNewCluster,
  removeTag,
  error,
  setError,
  // Batch editing props
  selectedImages,
  batchMode,
  setBatchMode,
  batchTagValue,
  setBatchTagValue,
  batchNewCluster,
  setBatchNewCluster,
  handleBatchChanges,
  toggleImageSelection,
  clearBatchSelection,
  tags,
}) {
  // Size options: small, medium, large
  const [cardSize, setCardSize] = useState("medium");
  // Local error state for dialog-specific errors
  const [dialogError, setDialogError] = useState("");
  // Batch dialog state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTags, setFilteredTags] = useState([]);

  // Calculate pagination values
  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Get current page data
  const paginatedData = useMemo(() => {
    return data?.slice(startIndex, endIndex) || [];
  }, [data, startIndex, endIndex]);

  // Reset to first page when data changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const sizeConfigs = {
    small: {
      gridCols:
        "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10",
      maxWidth: "max-w-[200px]",
      gap: "gap-2",
      icon: Grid3X3,
      titleSize: "text-xs",
      padding: "p-2",
    },
    medium: {
      gridCols:
        "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
      maxWidth: "max-w-[280px]",
      gap: "gap-4",
      icon: Grid2X2,
      titleSize: "text-sm",
      padding: "p-4",
    },
    large: {
      gridCols:
        "grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
      maxWidth: "max-w-[380px]",
      gap: "gap-6",
      icon: LayoutGrid,
      titleSize: "text-base",
      padding: "p-6",
    },
  };

  const currentConfig = sizeConfigs[cardSize];

  // Error handling functions
  const clearErrors = () => {
    setDialogError("");
    if (setError) setError("");
  };

  // Clear batch dialog function
  const clearBatchDialog = () => {
    clearErrors();
    setBatchTagValue("");
    setBatchNewCluster("");
  };

  // Handle batch dialog state changes
  const handleBatchDialogOpenChange = (open) => {
    setBatchDialogOpen(open);
    if (!open) {
      // Clear batch dialog when it's closed
      clearBatchDialog();
    }
  };

  const handleAddTag = async () => {
    clearErrors();

    if (!tagValue || tagValue.trim() === "") {
      setDialogError("Please enter a tag before adding.");
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
      // Clear tag input on success
      setTagValue("");
    } catch (err) {
      setDialogError(err.message || "Failed to add tag. Please try again.");
    }
  };

  const handleSaveCluster = async () => {
    clearErrors();

    if (!newCluster || newCluster.trim() === "") {
      setDialogError("Please enter a cluster name before saving.");
      return;
    }

    try {
      // Create a synthetic event object if handleChanges expects one
      const syntheticEvent = { preventDefault: () => {} };
      await handleChanges(syntheticEvent);
      // Clear cluster input on success
      setNewCluster("");
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

  // Batch operation handlers
  const handleBatchAddTags = async () => {
    clearErrors();

    const validationError = validateTag(batchTagValue);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    // Check for whitespace in tags
    const tags = batchTagValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    for (const tag of tags) {
      if (tag.includes(" ") || tag.includes("\t") || tag.includes("\n")) {
        setDialogError(
          "Tags cannot contain whitespace characters. Please use underscores or hyphens instead."
        );
        return;
      }
    }

    try {
      const syntheticEvent = { preventDefault: () => {} };
      await handleBatchChanges(syntheticEvent);
      setBatchDialogOpen(false);
    } catch (err) {
      setDialogError(err.message || "Failed to add tags. Please try again.");
    }
  };

  const handleBatchChangeCluster = async () => {
    clearErrors();

    const validationError = validateCluster(batchNewCluster);
    if (validationError) {
      setDialogError(validationError);
      return;
    }

    try {
      const syntheticEvent = { preventDefault: () => {} };
      await handleBatchChanges(syntheticEvent);
      setBatchDialogOpen(false);
    } catch (err) {
      setDialogError(
        err.message || "Failed to update cluster. Please try again."
      );
    }
  };

  // Selection handlers
  const handleCardClick = (imageId, event) => {
    if (batchMode) {
      event.stopPropagation();
      toggleImageSelection(imageId);
    }
  };

  const handleSelectAll = () => {
    if (selectedImages?.length === data?.length) {
      clearBatchSelection();
    } else {
      // Select all images (across all pages, not just current page)
      data?.forEach((image) => {
        if (!selectedImages?.includes(image.id)) {
          toggleImageSelection(image.id);
        }
      });
    }
  };

  const handleSelectAllOnPage = () => {
    const pageImageIds = paginatedData.map((image) => image.id);
    const allPageImagesSelected = pageImageIds.every((id) =>
      selectedImages?.includes(id)
    );

    if (allPageImagesSelected) {
      // Deselect all images on current page
      pageImageIds.forEach((id) => {
        if (selectedImages?.includes(id)) {
          toggleImageSelection(id);
        }
      });
    } else {
      // Select all images on current page
      pageImageIds.forEach((id) => {
        if (!selectedImages?.includes(id)) {
          toggleImageSelection(id);
        }
      });
    }
  };

  const handleExitBatchMode = () => {
    setBatchMode(false);
    clearBatchSelection();
  };

  // fuzzy search tags
  useEffect(() => {
    if (!searchQuery || !tags || tags.length === 0) {
      setFilteredTags([]);
      return;
    }

    const fuse = new Fuse(tags, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(searchQuery);
    setFilteredTags(results.map((result) => result.item));
  }, [searchQuery, tags]);

  return (
    <div>
      {/* Size Control Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-600">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">
            Images ({totalItems})
          </h3>
          {totalPages > 1 && (
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
              {totalItems}
            </div>
          )}
          {selectedImages && selectedImages.length > 0 && (
            <div className="text-sm text-blue-400">
              {selectedImages.length} selected
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Batch Operation Controls */}
          {selectedImages && selectedImages.length > 0 && (
            <Dialog
              open={batchDialogOpen}
              onOpenChange={handleBatchDialogOpenChange}
            >
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setBatchDialogOpen(true)}
                  data-testid="edit-selected-button"
                >
                  Edit Selected ({selectedImages.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white max-w-md">
                <DialogHeader className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg font-bold">
                        {selectedImages.length}
                      </span>
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-white">
                        Batch Edit {selectedImages.length} Images
                      </DialogTitle>
                      <DialogDescription className="text-gray-400 text-sm">
                        Add tags or move multiple images to a different cluster
                        at once.
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
                        <p className="text-sm">{dialogError || error}</p>
                      </div>
                    </div>
                  )}

                  {/* Batch Add Tags Section */}
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <label className="text-sm font-semibold text-white">
                          Add Tags (comma-separated)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="tag1, tag2, tag3..."
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg flex-1"
                          value={batchTagValue}
                          onChange={(e) => {
                            setBatchTagValue(e.target.value);
                            clearErrors();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBatchAddTags();
                            }
                          }}
                        />
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg"
                          onClick={handleBatchAddTags}
                          disabled={
                            !batchTagValue || batchTagValue.trim() === ""
                          }
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Batch Change Cluster Section */}
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <label className="text-sm font-semibold text-white">
                          Move to Cluster
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="New cluster name..."
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500/20 rounded-lg flex-1"
                          value={batchNewCluster}
                          onChange={(e) => {
                            setBatchNewCluster(e.target.value);
                            clearErrors();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBatchChangeCluster();
                            }
                          }}
                        />
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
                          onClick={handleBatchChangeCluster}
                          disabled={
                            !batchNewCluster || batchNewCluster.trim() === ""
                          }
                        >
                          Move
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Selection Controls */}
          <div className="flex items-center gap-2">
            {!batchMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchMode(true)}
                className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Select
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllOnPage}
                  className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  {paginatedData.every((image) =>
                    selectedImages?.includes(image.id)
                  ) && paginatedData.length > 0
                    ? "Deselect Page"
                    : "Select Page"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  {selectedImages?.length === data?.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitBatchMode}
                  className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Size Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Card Size:</span>
            <div className="flex items-center border border-gray-600 rounded-lg p-1 bg-gray-800">
              {Object.entries(sizeConfigs).map(([size, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={size}
                    variant={cardSize === size ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCardSize(size)}
                    className={`h-8 px-3 ${
                      cardSize === size
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="ml-1 capitalize text-xs">{size}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const maxVisiblePages = 5;
                const halfVisible = Math.floor(maxVisiblePages / 2);
                let startPage = Math.max(1, currentPage - halfVisible);
                let endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1
                );

                // Adjust start if we're near the end
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={i === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                      className={`min-w-[2rem] ${
                        i === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      {i}
                    </Button>
                  );
                }
                return pages;
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}


      <div
        className={`grid ${currentConfig.gridCols} ${currentConfig.gap} p-4`}
      >
        {paginatedData &&
          paginatedData
            .filter((image) => image)
            .map((image, index) => (
              <ImageCard
                key={image.id || index}
                image={image}
                index={index}
                currentConfig={currentConfig}
                cardSize={cardSize}
                selectedImages={selectedImages}
                batchMode={batchMode}
                handleCardClick={handleCardClick}
                setSelectedImage={setSelectedImage}
                tagValue={tagValue}
                setTagValue={setTagValue}
                newCluster={newCluster}
                setNewCluster={setNewCluster}
                handleChanges={handleChanges}
                removeTag={removeTag}
                error={error}
                setError={setError}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredTags={filteredTags}
                tags={tags}
              />
            ))}
      </div>
    </div>
  );
}
