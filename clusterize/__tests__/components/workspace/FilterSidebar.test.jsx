/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FilterSidebar from "../../../components/workspace/FilterSidebar";

// Mock UI components
jest.mock("../../../components/ui/button", () => ({
  Button: ({ children, onClick, variant, className, disabled, ...props }) => (
    <button 
      onClick={onClick} 
      data-variant={variant} 
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("../../../components/ui/separator", () => ({
  Separator: ({ className }) => <div data-testid="separator" className={className} />,
}));

jest.mock("../../../components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id, className, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      id={id}
      className={className}
      {...props}
    />
  ),
}));

jest.mock("../../../components/ui/label", () => ({
  Label: ({ children, className, ...props }) => (
    <label className={className} {...props}>
      {children}
    </label>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  ChevronLeft: ({ className }) => <span className={className} data-testid="chevron-left-icon">←</span>,
  Filter: ({ className }) => <span className={className} data-testid="filter-icon">⚹</span>,
  ChevronDown: ({ className }) => <span className={className} data-testid="chevron-down-icon">↓</span>,
  ChevronRight: ({ className }) => <span className={className} data-testid="chevron-right-icon">→</span>,
  Search: ({ className }) => <span className={className} data-testid="search-icon">🔍</span>,
}));

const mockStatistics = {
  clusters: [
    { name: "1", frequency: 15, label: "Animals" },
    { name: "2", frequency: 10, label: "Vehicles" },
    { name: "3", frequency: 8, label: "Animals" },
    { name: "4", frequency: 5, label: "Food" },
  ],
  tags: [
    { name: "outdoor", frequency: 20 },
    { name: "indoor", frequency: 12 },
    { name: "nature", frequency: 8 },
  ],
};

const defaultProps = {
  sidebarCollapsed: false,
  setSidebarCollapsed: jest.fn(),
  statistics: mockStatistics,
  clusters: [],
  setClusters: jest.fn(),
  labels: [],
  setLabels: jest.fn(),
  tags: [],
  setTags: jest.fn(),
  relocatedImages: false,
  setRelocatedImages: jest.fn(),
  appliedClusters: [],
  setAppliedClusters: jest.fn(),
  appliedLabels: [],
  setAppliedLabels: jest.fn(),
  appliedTags: [],
  setAppliedTags: jest.fn(),
  appliedRelocatedImages: false,
  setAppliedRelocatedImages: jest.fn(),
  handleSearch: jest.fn(),
  currentProject: { id: 1, name: "Test Project" },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FilterSidebar", () => {
  describe("rendering", () => {
    it("renders expanded sidebar correctly", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      expect(screen.getByText("Workspace Filters")).toBeInTheDocument();
      expect(screen.getByText("Cluster Selection")).toBeInTheDocument();
      expect(screen.getByText("Label Selection")).toBeInTheDocument();
      expect(screen.getByText("Tag Selection")).toBeInTheDocument();
      expect(screen.getByText("Search Images")).toBeInTheDocument();
    });

    it("renders collapsed sidebar correctly", () => {
      render(<FilterSidebar {...defaultProps} sidebarCollapsed={true} />);
      
      expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
      expect(screen.queryByText("Workspace Filters")).not.toBeInTheDocument();
    });

    it("shows relocates images checkbox", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      expect(screen.getByText("Relocated Images")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("displays correct toggle icons when collapsed/expanded", () => {
      render(<FilterSidebar {...defaultProps} sidebarCollapsed={false} />);
      expect(screen.getByTestId("chevron-left-icon")).toBeInTheDocument();
      
      render(<FilterSidebar {...defaultProps} sidebarCollapsed={true} />);
      expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
    });
  });

  describe("sidebar toggle functionality", () => {
    it("calls setSidebarCollapsed when toggle button is clicked (expanded)", () => {
      const setSidebarCollapsed = jest.fn();
      render(<FilterSidebar {...defaultProps} setSidebarCollapsed={setSidebarCollapsed} />);
      
      const toggleButton = screen.getByTestId("chevron-left-icon").closest("button");
      fireEvent.click(toggleButton);
      
      expect(setSidebarCollapsed).toHaveBeenCalledWith(true);
    });

    it("calls setSidebarCollapsed when toggle button is clicked (collapsed)", () => {
      const setSidebarCollapsed = jest.fn();
      render(<FilterSidebar {...defaultProps} sidebarCollapsed={true} setSidebarCollapsed={setSidebarCollapsed} />);
      
      const toggleButton = screen.getByTestId("filter-icon").closest("button");
      fireEvent.click(toggleButton);
      
      expect(setSidebarCollapsed).toHaveBeenCalledWith(false);
    });
  });

  describe("active filters display", () => {
    it("shows active filters section when filters are applied", () => {
      render(<FilterSidebar {...defaultProps} clusters={["1", "2"]} />);
      
      expect(screen.getByText("Active Filters")).toBeInTheDocument();
      expect(screen.getByText("Clusters:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("shows relocated images in active filters", () => {
      render(<FilterSidebar {...defaultProps} relocatedImages={true} />);
      
      expect(screen.getByText("Active Filters")).toBeInTheDocument();
      
      // Find the active filters section and check for "Relocated Images" within it
      const activeFiltersSection = screen.getByText("Active Filters").closest("div");
      expect(within(activeFiltersSection).getByText("Relocated Images")).toBeInTheDocument();
    });

    it("shows active labels with cluster names", () => {
      render(<FilterSidebar {...defaultProps} labels={["Animals"]} />);
      
      expect(screen.getByText("Active Filters")).toBeInTheDocument();
      expect(screen.getByText("Labels:")).toBeInTheDocument();
      expect(screen.getByText("Animals (1, 3)")).toBeInTheDocument();
    });

    it("shows active tags", () => {
      render(<FilterSidebar {...defaultProps} tags={["outdoor", "nature"]} />);
      
      expect(screen.getByText("Active Filters")).toBeInTheDocument();
      expect(screen.getByText("Tags:")).toBeInTheDocument();
      expect(screen.getByText("outdoor")).toBeInTheDocument();
      expect(screen.getByText("nature")).toBeInTheDocument();
    });

    it("hides active filters section when no filters are applied", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      expect(screen.queryByText("Active Filters")).not.toBeInTheDocument();
    });
  });

  describe("cluster selection", () => {
    it("renders cluster checkboxes with correct data", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      // Click to expand cluster section
      fireEvent.click(screen.getByText("Cluster Selection"));
      
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument(); // frequency
      expect(screen.getByText("10")).toBeInTheDocument(); // frequency
    });

    it("handles cluster checkbox changes", () => {
      const setClusters = jest.fn();
      render(<FilterSidebar {...defaultProps} setClusters={setClusters} />);
      
      // Expand cluster section
      fireEvent.click(screen.getByText("Cluster Selection"));
      
      // Find the first cluster checkbox by its ID (component uses pattern: ${cluster.name}-num)
      const clusterCheckbox = document.getElementById("1-num");
      fireEvent.click(clusterCheckbox);
      
      expect(setClusters).toHaveBeenCalledWith(expect.any(Function));
    });

    it("expands and collapses cluster section", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      // Initially collapsed - check that cluster content is not visible
      expect(screen.queryByText("15")).not.toBeInTheDocument();
      
      // Click to expand cluster section
      fireEvent.click(screen.getByText("Cluster Selection"));
      
      // After expansion - cluster content should be visible
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("shows 'No clusters available' when no clusters exist", () => {
      const statsWithNoClusters = { ...mockStatistics, clusters: [] };
      render(<FilterSidebar {...defaultProps} statistics={statsWithNoClusters} />);
      
      fireEvent.click(screen.getByText("Cluster Selection"));
      expect(screen.getByText("No clusters available")).toBeInTheDocument();
    });
  });

  describe("label selection", () => {
    it("renders label checkboxes grouped by label name", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      // Click to expand label section
      fireEvent.click(screen.getByText("Label Selection"));
      
      expect(screen.getByText("Animals")).toBeInTheDocument();
      expect(screen.getByText("Vehicles")).toBeInTheDocument();
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Clusters: 1, 3")).toBeInTheDocument(); // Animals clusters
    });

    it("handles label checkbox changes", () => {
      const setLabels = jest.fn();
      render(<FilterSidebar {...defaultProps} setLabels={setLabels} />);
      
      // Expand label section
      fireEvent.click(screen.getByText("Label Selection"));
      
      // Find the Animals label checkbox by its ID (component uses pattern: ${label}-label)
      const labelCheckbox = document.getElementById("Animals-label");
      fireEvent.click(labelCheckbox);
      
      expect(setLabels).toHaveBeenCalledWith(expect.any(Function));
    });

    it("shows 'No labels available' when no labels exist", () => {
      const statsWithNoLabels = { 
        ...mockStatistics, 
        clusters: mockStatistics.clusters.map(c => ({ ...c, label: "" }))
      };
      render(<FilterSidebar {...defaultProps} statistics={statsWithNoLabels} />);
      
      fireEvent.click(screen.getByText("Label Selection"));
      expect(screen.getByText("No labels available")).toBeInTheDocument();
    });
  });

  describe("tag selection", () => {
    it("renders tag checkboxes with correct data", () => {
      render(<FilterSidebar {...defaultProps} />);
      
      // Click to expand tag section
      fireEvent.click(screen.getByText("Tag Selection"));
      
      expect(screen.getByText("outdoor")).toBeInTheDocument();
      expect(screen.getByText("indoor")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument(); // frequency
      expect(screen.getByText("12")).toBeInTheDocument(); // frequency
    });

    it("handles tag checkbox changes", () => {
      const setTags = jest.fn();
      render(<FilterSidebar {...defaultProps} setTags={setTags} />);
      
      // Expand tag section
      fireEvent.click(screen.getByText("Tag Selection"));
      
      // Find the outdoor tag checkbox by its ID (component uses tag name as ID)
      const tagCheckbox = document.getElementById("outdoor");
      fireEvent.click(tagCheckbox);
      
      expect(setTags).toHaveBeenCalledWith(expect.any(Function));
    });

    it("shows 'No tags available' when no tags exist", () => {
      const statsWithNoTags = { ...mockStatistics, tags: [] };
      render(<FilterSidebar {...defaultProps} statistics={statsWithNoTags} />);
      
      fireEvent.click(screen.getByText("Tag Selection"));
      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });
  });

//   describe("relocated images functionality", () => {
//     it("handles relocated images checkbox change", () => {
//       const setRelocatedImages = jest.fn();
//       render(<FilterSidebar {...defaultProps} setRelocatedImages={setRelocatedImages} />);
      
//       const relocatedCheckbox = screen.getByRole("checkbox", { name: /relocated images/i });
//       fireEvent.click(relocatedCheckbox);
      
//       expect(setRelocatedImages).toHaveBeenCalledWith(true);
//     });

//     it("shows checked state when relocated images is true", () => {
//       render(<FilterSidebar {...defaultProps} relocatedImages={true} />);
      
//       const relocatedCheckbox = screen.getByRole("checkbox", { name: /relocated images/i });
//       expect(relocatedCheckbox).toBeChecked();
//     });
//   });

//   describe("action buttons", () => {
//     it("shows clear filters button when filters are applied", () => {
//       render(<FilterSidebar {...defaultProps} clusters={["1"]} />);
      
//       expect(screen.getByText("Clear All Filters")).toBeInTheDocument();
//     });

//     it("hides clear filters button when no filters are applied", () => {
//       render(<FilterSidebar {...defaultProps} />);
      
//       expect(screen.queryByText("Clear All Filters")).not.toBeInTheDocument();
//     });

//     it("clears all filters when clear button is clicked", () => {
//       const setClusters = jest.fn();
//       const setLabels = jest.fn();
//       const setTags = jest.fn();
//       const setAppliedClusters = jest.fn();
//       const setAppliedLabels = jest.fn();
//       const setAppliedTags = jest.fn();
//       const setAppliedRelocatedImages = jest.fn();
//       const setRelocatedImages = jest.fn();
      
//       render(<FilterSidebar 
//         {...defaultProps} 
//         clusters={["1"]}
//         setClusters={setClusters}
//         setLabels={setLabels}
//         setTags={setTags}
//         setAppliedClusters={setAppliedClusters}
//         setAppliedLabels={setAppliedLabels}
//         setAppliedTags={setAppliedTags}
//         setAppliedRelocatedImages={setAppliedRelocatedImages}
//         setRelocatedImages={setRelocatedImages}
//       />);
      
//       fireEvent.click(screen.getByText("Clear All Filters"));
      
//       expect(setClusters).toHaveBeenCalledWith([]);
//       expect(setLabels).toHaveBeenCalledWith([]);
//       expect(setTags).toHaveBeenCalledWith([]);
//       expect(setAppliedClusters).toHaveBeenCalledWith([]);
//       expect(setAppliedLabels).toHaveBeenCalledWith([]);
//       expect(setAppliedTags).toHaveBeenCalledWith([]);
//       expect(setAppliedRelocatedImages).toHaveBeenCalledWith(false);
//       expect(setRelocatedImages).toHaveBeenCalledWith(false);
//     });

//     it("calls handleSearch when search button is clicked", () => {
//       const handleSearch = jest.fn();
//       render(<FilterSidebar {...defaultProps} handleSearch={handleSearch} />);
      
//       fireEvent.click(screen.getByText("Search Images"));
      
//       expect(handleSearch).toHaveBeenCalled();
//     });

//     it("disables search button when no current project", () => {
//       render(<FilterSidebar {...defaultProps} currentProject={null} />);
      
//       const searchButton = screen.getByText("Search Images").closest("button");
//       expect(searchButton).toBeDisabled();
//     });

//     it("enables search button when current project exists", () => {
//       render(<FilterSidebar {...defaultProps} />);
      
//       const searchButton = screen.getByText("Search Images").closest("button");
//       expect(searchButton).not.toBeDisabled();
//     });
//   });

//   describe("edge cases", () => {
//     it("handles undefined statistics gracefully", () => {
//       render(<FilterSidebar {...defaultProps} statistics={undefined} />);
      
//       expect(screen.getByText("Workspace Filters")).toBeInTheDocument();
//       expect(screen.queryByText("Relocated Images")).not.toBeInTheDocument();
//     });

//     it("handles empty statistics gracefully", () => {
//       const emptyStats = { clusters: [], tags: [] };
//       render(<FilterSidebar {...defaultProps} statistics={emptyStats} />);
      
//       fireEvent.click(screen.getByText("Cluster Selection"));
//       expect(screen.getByText("No clusters available")).toBeInTheDocument();
      
//       fireEvent.click(screen.getByText("Tag Selection"));
//       expect(screen.getByText("No tags available")).toBeInTheDocument();
//     });

//     it("handles clusters without labels", () => {
//       const statsWithoutLabels = {
//         ...mockStatistics,
//         clusters: [
//           { name: "1", frequency: 15, label: null },
//           { name: "2", frequency: 10, label: "" },
//         ]
//       };
      
//       render(<FilterSidebar {...defaultProps} statistics={statsWithoutLabels} />);
      
//       fireEvent.click(screen.getByText("Label Selection"));
//       expect(screen.getByText("No labels available")).toBeInTheDocument();
//     });

//     it("sorts cluster names numerically in label display", () => {
//       const statsWithMixedNumbers = {
//         ...mockStatistics,
//         clusters: [
//           { name: "10", frequency: 15, label: "Test" },
//           { name: "2", frequency: 10, label: "Test" },
//           { name: "1", frequency: 8, label: "Test" },
//         ]
//       };
      
//       render(<FilterSidebar {...defaultProps} statistics={statsWithMixedNumbers} />);
      
//       fireEvent.click(screen.getByText("Label Selection"));
//       expect(screen.getByText("Clusters: 1, 2, 10")).toBeInTheDocument();
//     });
//   });

//   describe("accessibility", () => {
//     it("provides proper labeling for checkboxes", () => {
//       render(<FilterSidebar {...defaultProps} />);
      
//       expect(screen.getByRole("checkbox", { name: /relocated images/i })).toBeInTheDocument();
//     });

//     it("provides proper button labeling", () => {
//       render(<FilterSidebar {...defaultProps} clusters={["1"]} />);
      
//       expect(screen.getByRole("button", { name: "Clear All Filters" })).toBeInTheDocument();
//       expect(screen.getByRole("button", { name: "Search Images" })).toBeInTheDocument();
//     });

//     it("uses proper heading structure", () => {
//       render(<FilterSidebar {...defaultProps} />);
      
//       expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Workspace Filters");
//     });
//   });
});