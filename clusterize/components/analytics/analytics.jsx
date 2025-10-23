import { ScrollArea } from "@/components/ui/scroll-area";
import WordFrequencyCloud from "@/components/ui/word-frequency-graph";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Custom colors for visualization
const customColors = [
  "#ff6b6b", // Red
  "#4ecdc4", // Teal
  "#45b7d1", // Blue
  "#96ceb4", // Green
  "#ffeaa7", // Yellow
  "#dda0dd", // Plum
  "#98d8c8", // Mint
];

// Cluster Analytics Component
export function ClusterAnalytics({ 
  statistics, 
  onCreateCluster, 
  onClusterClick 
}) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Cluster Distribution
            </h3>
            <p className="text-gray-400 text-sm">
              Overview of your image clusters
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600/20 p-3 rounded-xl">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {statistics.clusters.length}
                </span>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="bg-green-600/20 hover:bg-green-600/30 p-3 rounded-xl transition-colors duration-200 group"
                  onClick={onCreateCluster}
                >
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-400">
                    <span className="text-white text-lg font-bold">
                      +
                    </span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create Cluster</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ScrollArea className="h-80 w-full">
          <div className="space-y-4">
            {statistics.clusters.length > 0 ? (
              statistics.clusters.map((cluster, index) => (
                <div
                  key={cluster.name}
                  className="group p-4 bg-gray-800/30 hover:bg-gray-700/30 rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 cursor-pointer"
                  onClick={() => onClusterClick(cluster)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            customColors[index % customColors.length],
                        }}
                      />
                      <span className="text-white font-medium group-hover:text-blue-300 transition-colors">
                        {cluster.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">
                        {cluster.frequency} images
                      </span>
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: `${Math.min(
                              (cluster.frequency /
                                Math.max(
                                  ...statistics.clusters.map(
                                    (c) => c.frequency
                                  )
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">📊</span>
                </div>
                <p className="text-gray-400">
                  No clusters available yet
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Upload images to see cluster analytics
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Tag Analytics Component
export function TagAnalytics({ statistics }) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Tag Analytics
            </h3>
            <p className="text-gray-400 text-sm">
              Visual representation of tag frequency
            </p>
          </div>
          <div className="bg-purple-600/20 p-3 rounded-xl">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {statistics.tags.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 flex items-center justify-center">
        {statistics.tags.length > 0 ? (
          <div className="w-full">
            <WordFrequencyCloud
              data={statistics.tags}
              title=""
              maxWords={30}
              height={325}
              minFontSize={12}
              maxFontSize={48}
              colorScheme={customColors}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-gray-400 text-3xl">🏷️</span>
            </div>
            <h4 className="text-gray-300 text-lg font-medium mb-2">
              No tags yet
            </h4>
            <p className="text-gray-400 text-sm max-w-xs">
              Start adding tags to your images to see the tag cloud
              visualization
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
