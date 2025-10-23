"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function WordFrequencyCloud({
  data,
  title = "Word Frequency Cloud",
  maxWords = 50,
  height = 400,
  minFontSize = 16,
  maxFontSize = 64,
  colorScheme = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ],
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredWord, setHoveredWord] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [height]);

  const wordPositions = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return [];

    // Sort and limit data
    const sortedData = data
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxWords);

    if (sortedData.length === 0) return [];

    const maxFreq = sortedData[0].frequency;
    const minFreq = sortedData[sortedData.length - 1].frequency;
    const freqRange = maxFreq - minFreq || 1;

    const positions = [];
    const occupiedAreas = [];

    // Helper function to estimate text dimensions more accurately
    const getTextDimensions = (text, fontSize) => {
      return {
        width: fontSize * 0.65 * text.length, // Slightly more accurate width estimation
        height: fontSize * 1.1, // Tighter height estimation
      };
    };

    // Optimized collision detection
    const hasCollision = (x, y, width, height) => {
      const margin = 2; // Reduced margin for tighter packing
      return occupiedAreas.some(
        (area) =>
          x - width / 2 - margin < area.x + area.width / 2 &&
          x + width / 2 + margin > area.x - area.width / 2 &&
          y - height / 2 - margin < area.y + area.height / 2 &&
          y + height / 2 + margin > area.y - area.height / 2
      );
    };

    // Enhanced position finding with multiple strategies
    const findPosition = (width, height, priority) => {
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;

      // Strategy 1: Try center first (only for highest priority words)
      if (priority === 0 && !hasCollision(centerX, centerY, width, height)) {
        return { x: centerX, y: centerY };
      }

      // Strategy 2: Dense spiral search with variable step size
      const maxRadius =
        Math.min(containerSize.width, containerSize.height) / 2 -
        Math.max(width, height) / 2;
      const stepSize = priority < 5 ? 3 : 5; // Smaller steps for high priority words

      for (let radius = stepSize; radius < maxRadius; radius += stepSize) {
        // Variable number of angle steps based on radius for better distribution
        const angleSteps = Math.max(8, Math.floor(radius / 4));
        const angleStep = (Math.PI * 2) / angleSteps;

        for (let i = 0; i < angleSteps; i++) {
          const angle = i * angleStep + priority * 0.1; // Slight offset per word
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          // Check bounds with padding
          const padding = 5;
          if (
            x - width / 2 >= padding &&
            x + width / 2 <= containerSize.width - padding &&
            y - height / 2 >= padding &&
            y + height / 2 <= containerSize.height - padding
          ) {
            if (!hasCollision(x, y, width, height)) {
              return { x, y };
            }
          }
        }
      }

      // Strategy 3: Grid-based fallback for remaining words
      const gridSize = Math.max(width, height) + 4;
      const cols = Math.floor(containerSize.width / gridSize);
      const rows = Math.floor(containerSize.height / gridSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col + 0.5) * gridSize;
          const y = (row + 0.5) * gridSize;

          if (
            x - width / 2 >= 0 &&
            x + width / 2 <= containerSize.width &&
            y - height / 2 >= 0 &&
            y + height / 2 <= containerSize.height
          ) {
            if (!hasCollision(x, y, width, height)) {
              return { x, y };
            }
          }
        }
      }

      return null; // No position found
    };

    // Place words with adaptive font sizing
    sortedData.forEach((item, index) => {
      // Calculate initial font size based on frequency
      const normalizedFreq = (item.frequency - minFreq) / freqRange;
      let fontSize = minFontSize + (maxFontSize - minFontSize) * normalizedFreq;

      let position = null;
      let attempts = 0;
      const maxAttempts = 4; // Increased attempts for better placement

      // Try to place word, gradually reducing font size if needed
      while (
        !position &&
        attempts < maxAttempts &&
        fontSize >= minFontSize * 0.7
      ) {
        const dimensions = getTextDimensions(item.name, fontSize);
        position = findPosition(dimensions.width, dimensions.height, index);

        if (!position) {
          fontSize *= 0.85; // Smaller reduction to preserve readability
          attempts++;
        }
      }

      // If still no position, try with minimum size at any available spot
      if (!position && fontSize >= minFontSize * 0.6) {
        fontSize = Math.max(minFontSize * 0.7, fontSize);
        const dimensions = getTextDimensions(item.name, fontSize);

        // Try a few random positions as last resort
        for (let i = 0; i < 20; i++) {
          const x =
            dimensions.width / 2 +
            Math.random() * (containerSize.width - dimensions.width);
          const y =
            dimensions.height / 2 +
            Math.random() * (containerSize.height - dimensions.height);

          if (!hasCollision(x, y, dimensions.width, dimensions.height)) {
            position = { x, y };
            break;
          }
        }
      }

      if (position) {
        const dimensions = getTextDimensions(item.name, fontSize);

        positions.push({
          name: item.name,
          frequency: item.frequency,
          x: position.x,
          y: position.y,
          fontSize,
          color: colorScheme[index % colorScheme.length],
        });

        // Mark area as occupied
        occupiedAreas.push({
          x: position.x,
          y: position.y,
          width: dimensions.width,
          height: dimensions.height,
        });
      }
    });

    return positions;
  }, [data, containerSize, maxWords, minFontSize, maxFontSize, colorScheme]);

  return (
    <Card className="w-full bg-gray-900 border-0">
      <CardContent>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-lg"
          style={{ height }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
        >
          {wordPositions.map((word, index) => (
            <div
              key={`${word.name}-${index}`}
              className="absolute select-none cursor-pointer transition-all duration-300 hover:scale-110 hover:opacity-80 font-semibold"
              style={{
                left: word.x,
                top: word.y,
                fontSize: word.fontSize,
                color: word.color,
                transform: "translate(-50%, -50%)",
                textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
              }}
              onMouseEnter={() => setHoveredWord(word)}
              onMouseLeave={() => setHoveredWord(null)}
            >
              {word.name}
            </div>
          ))}

          {/* Custom Tooltip */}
          {hoveredWord && (
            <div
              className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-600 rounded-lg shadow-lg pointer-events-none"
              style={{
                left: mousePos.x + 10,
                top: mousePos.y - 10,
                transform:
                  mousePos.x > containerSize.width / 2
                    ? "translate(-100%, -100%)"
                    : "translate(0, -100%)",
              }}
            >
              <div className="flex flex-col items-center">
                <span className="font-semibold">{hoveredWord.name}</span>
                <span className="text-xs text-gray-300">
                  {hoveredWord.frequency} occurrence
                  {hoveredWord.frequency !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {wordPositions.length === 0 && containerSize.width > 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              No data to display
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
