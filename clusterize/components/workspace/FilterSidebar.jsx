import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";

export default function FilterSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  statistics,
  clusters,
  setClusters,
  labels,
  setLabels,
  tags,
  setTags,
  relocatedImages,
  setRelocatedImages,
  appliedClusters,
  setAppliedClusters,
  appliedLabels,
  setAppliedLabels,
  appliedTags,
  setAppliedTags,
  appliedRelocatedImages,
  setAppliedRelocatedImages,
  handleSearch,
  currentProject,
}) {
  // Collapsible states for sidebar sections
  const [clustersNumCollapsed, setClustersNumCollapsed] = useState(true);
  const [labelsCollapsed, setLabelsCollapsed] = useState(true);
  const [tagsCollapsed, setTagsCollapsed] = useState(true);

  // Handler for cluster checkbox changes
  const handleClusterChange = (clusterName, checked) => {
    if (checked) {
      setClusters((prev) => [...prev, clusterName]);
    } else {
      setClusters((prev) => prev.filter((cluster) => cluster !== clusterName));
    }
  };

  // Handler for tag checkbox changes
  const handleTagChange = (tagName, checked) => {
    if (checked) {
      setTags((prev) => [...prev, tagName]);
    } else {
      setTags((prev) => prev.filter((tag) => tag !== tagName));
    }
  };

  // Handler for label name checkbox changes
  const handleLabelChange = (labelName, checked) => {
    if (checked) {
      setLabels((prev) => [...prev, labelName]);
    } else {
      setLabels((prev) => prev.filter((label) => label !== labelName));
    }
  };

  return (
    <div
      className={`${
        sidebarCollapsed ? "w-16" : "w-80"
      } flex flex-col rounded-lg transition-all duration-300 ease-in-out bg-gradient-to-b from-gray-900 to-gray-800 border border-gray-700 ml-4 mt-8 mb-8`}
    >
      {/* Sidebar Toggle Button */}
       {sidebarCollapsed ? (
          <Button
        variant="ghost"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="mt-4 mx-auto h-10 w-10 p-0 self-center text-gray-300 hover:text-white hover:bg-gray-700"
      >
          <Filter className="h-5 w-5" />

      </Button>
        ) : (
          <Button
        variant="ghost"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="mt-8 ml-4 h-10 w-10 p-0 self-start text-gray-300 hover:text-white hover:bg-gray-700"
      >
          <ChevronLeft className="h-5 w-5" />
      </Button>
        )}
      

      {/* Sidebar Content */}
      {!sidebarCollapsed && (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-3">
              Workspace Filters
            </h2>
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4"></div>

            {/* Active Filters Display */}
            {(clusters.length > 0 ||
              labels.length > 0 ||
              tags.length > 0 || relocatedImages) && (
              <div className="mb-6 p-4 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl border border-gray-600 shadow-lg">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Active Filters
                </h3>
                {relocatedImages && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-block px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                        Relocated Images
                      </span>
                    </div>
                  </div>
                )}
                {clusters.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-blue-400 font-medium block mb-1">
                      Clusters:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {clusters.map((cluster) => (
                        <span
                          key={cluster}
                          className="inline-block px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-md border border-blue-500/30"
                        >
                          {cluster}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {labels.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-orange-400 font-medium block mb-1">
                      Labels:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {labels.map((label) => {
                        // Find the cluster names for this label
                        const clusterNames = statistics.clusters
                          ?.filter(cluster => cluster.label === label)
                          ?.map(cluster => cluster.name)
                          ?.sort((a, b) => parseInt(a) - parseInt(b)) || [];

                        return (
                          <span
                            key={label}
                            className="inline-block px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-md border border-orange-500/30"
                          >
                            {label} ({clusterNames.join(', ')})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {tags.length > 0 && (
                  <div>
                    <span className="text-xs text-green-400 font-medium block mb-1">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-md border border-green-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Sections */}
          <div className="space-y-6">
            <Separator className="border-gray-700" />

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="space-y-3">
                {statistics && (
                  <div
                    key="relocated_images"
                    className="flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
                    >
                    <Checkbox
                      id="relocated_images"
                      className="border-gray-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      checked={relocatedImages}
                      onCheckedChange={setRelocatedImages}
                    />
                    <Label className="flex-1 text-sm font-normal cursor-pointer text-gray-200 hover:text-white transition-colors">
                      Relocated Images
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Cluster Filter */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => setClustersNumCollapsed(!clustersNumCollapsed)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-white">
                    Cluster Selection
                  </label>
                </div>
                {clustersNumCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {!clustersNumCollapsed && (
                <div className="space-y-3">
                  {statistics.clusters?.length > 0 ? (
                    statistics.clusters.map((cluster) => (
                      <div
                        key={cluster.name}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
                      >
                        <Checkbox
                          id={`${cluster.name}-num`}
                          checked={clusters.includes(cluster.name)}
                          onCheckedChange={(checked) =>
                            handleClusterChange(cluster.name, checked)
                          }
                          className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label className="flex-1 text-sm font-normal cursor-pointer text-gray-200 hover:text-white transition-colors">
                          {cluster.name}
                        </Label>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md">
                          {cluster.frequency}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">
                        No clusters available
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Labels Filter */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => setLabelsCollapsed(!labelsCollapsed)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-white">
                    Label Selection
                  </label>
                </div>
                {labelsCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {!labelsCollapsed && (
                <div className="space-y-3">
                  {(() => {
                    // Group clusters by label name and collect cluster names + frequencies
                    const labelGroups = statistics.clusters
                      ?.filter(
                        (cluster) => cluster.label && cluster.label.trim()
                      )
                      ?.reduce((acc, cluster) => {
                        const labelName = cluster.label;
                        if (!acc[labelName]) {
                          acc[labelName] = {
                            label: labelName,
                            totalFrequency: 0,
                            clusterNames: [],
                            clusters: []
                          };
                        }
                        acc[labelName].totalFrequency += cluster.frequency;
                        acc[labelName].clusterNames.push(cluster.name);
                        acc[labelName].clusters.push({
                          name: cluster.name,
                          frequency: cluster.frequency
                        });
                        return acc;
                      }, {}) || {};

                    const uniqueLabels = Object.values(labelGroups);

                    return uniqueLabels.length > 0 ? (
                      uniqueLabels.map((labelGroup) => (
                        <div
                          key={labelGroup.label}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
                        >
                          <Checkbox
                            id={`${labelGroup.label}-label`}
                            checked={labels.includes(labelGroup.label)}
                            onCheckedChange={(checked) =>
                              handleLabelChange(labelGroup.label, checked)
                            }
                            className="border-gray-500 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                          />
                          <div className="flex-1">
                            <Label className="text-sm font-normal cursor-pointer text-gray-200 hover:text-white transition-colors block">
                              {labelGroup.label}
                            </Label>
                            <div className="text-xs text-gray-400 mt-1">
                              Clusters: {labelGroup.clusterNames.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md">
                            {labelGroup.totalFrequency}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">
                          No labels available
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Tags Filter */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div
                className="flex items-center justify-between cursor-pointer mb-3"
                onClick={() => setTagsCollapsed(!tagsCollapsed)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <label className="text-sm font-semibold text-white">
                    Tag Selection
                  </label>
                </div>
                {tagsCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {!tagsCollapsed && (
                <div className="space-y-3">
                  {statistics.tags?.length > 0 ? (
                    statistics.tags.map((tag) => (
                      <div
                        key={tag.name}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
                      >
                        <Checkbox
                          id={tag.name}
                          checked={tags.includes(tag.name)}
                          onCheckedChange={(checked) =>
                            handleTagChange(tag.name, checked)
                          }
                          className="border-gray-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <Label className="flex-1 text-sm font-normal cursor-pointer text-gray-200 hover:text-white transition-colors">
                          {tag.name}
                        </Label>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-md">
                          {tag.frequency}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">
                        No tags available
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
              
          </div>

          <Separator className="my-6 border-gray-700" />

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Clear Filters Button */}
            {(clusters.length > 0 ||
              labels.length > 0 ||
              tags.length > 0 ||
              appliedClusters.length > 0 ||
              appliedLabels.length > 0 ||
              appliedTags.length > 0 ||
              relocatedImages) && (
              <Button
                variant="outline"
                className="w-full bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200"
                onClick={() => {
                  setClusters([]);
                  setLabels([]);
                  setTags([]);
                  setAppliedClusters([]);
                  setAppliedLabels([]);
                  setAppliedTags([]);
                  setAppliedRelocatedImages(false);
                  setRelocatedImages(false);
                  setClustersNumCollapsed(true);
                  setLabelsCollapsed(true);
                  setTagsCollapsed(true);
                }}
              >
                Clear All Filters
              </Button>
            )}

            {/* Search Button */}
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => {
                console.log("Search button clicked!");
                console.log("Project:", currentProject);
                console.log("Search values:", {
                  selectedClusters: clusters,
                  selectedLabels: labels,
                  selectedTags: tags,
                  appliedClusters: appliedClusters,
                  appliedLabels: appliedLabels,
                  appliedTags: appliedTags,
                  relocatedImages: relocatedImages,
                });
                handleSearch();
              }}
              disabled={!currentProject}
            >
              <Search className="mr-2 h-4 w-4" />
              Search Images
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
