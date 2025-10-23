/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WordFrequencyCloud from "../../../components/ui/word-frequency-graph";

// Mock UI components
jest.mock("../../../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver;

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 400,
  left: 0,
  top: 0,
  right: 800,
  bottom: 400,
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Mock getBoundingClientRect for container size calculations
  Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
  
  // Mock window.addEventListener and removeEventListener
  jest.spyOn(window, 'addEventListener');
  jest.spyOn(window, 'removeEventListener');
});

afterEach(() => {
  jest.restoreAllMocks();
});

const mockData = [
  { name: "react", frequency: 100 },
  { name: "javascript", frequency: 80 },
  { name: "testing", frequency: 60 },
  { name: "component", frequency: 40 },
  { name: "development", frequency: 20 },
];

const mockLargeData = Array.from({ length: 100 }, (_, i) => ({
  name: `word${i}`,
  frequency: 100 - i,
}));

describe("WordFrequencyCloud", () => {
  describe("rendering", () => {
    it("renders the card container", () => {
      render(<WordFrequencyCloud data={mockData} />);
      
      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("renders words from data", async () => {
      render(<WordFrequencyCloud data={mockData} />);
      
      await waitFor(() => {
        expect(screen.getByText("react")).toBeInTheDocument();
        expect(screen.getByText("javascript")).toBeInTheDocument();
        expect(screen.getByText("testing")).toBeInTheDocument();
      });
    });

    it("renders words sorted by frequency (highest first)", async () => {
      const unsortedData = [
        { name: "low", frequency: 10 },
        { name: "high", frequency: 100 },
        { name: "medium", frequency: 50 },
      ];
      
      render(<WordFrequencyCloud data={unsortedData} />);
      
      await waitFor(() => {
        const words = screen.getAllByText(/high|medium|low/);
        expect(words[0]).toHaveTextContent("high");
      });
    });

    it("applies custom height", () => {
      render(<WordFrequencyCloud data={mockData} height={600} />);
      
      // Find the container div that has the height style
      const container = screen.getByTestId("card-content").querySelector('div[style*="height"]');
      expect(container).toHaveStyle({ height: "600px" });
    });

    it("shows no data message when data is empty", async () => {
      render(<WordFrequencyCloud data={[]} />);
      
      await waitFor(() => {
        expect(screen.getByText("No data to display")).toBeInTheDocument();
      });
    });
  });

  describe("props handling", () => {
    it("respects maxWords limit", async () => {
      render(<WordFrequencyCloud data={mockData} maxWords={3} />);
      
      await waitFor(() => {
        expect(screen.getByText("react")).toBeInTheDocument();
        expect(screen.getByText("javascript")).toBeInTheDocument();
        expect(screen.getByText("testing")).toBeInTheDocument();
        expect(screen.queryByText("development")).not.toBeInTheDocument();
      });
    });

    it("uses default maxWords when not specified", async () => {
      render(<WordFrequencyCloud data={mockLargeData} />);
      
      await waitFor(() => {
        // Should limit to 50 words by default
        expect(screen.getByText("word0")).toBeInTheDocument();
        expect(screen.getByText("word49")).toBeInTheDocument();
        expect(screen.queryByText("word50")).not.toBeInTheDocument();
      });
    });

    it("applies custom color scheme", async () => {
      const customColors = ["#ff0000", "#00ff00", "#0000ff"];
      render(<WordFrequencyCloud data={mockData} colorScheme={customColors} />);
      
      await waitFor(() => {
        const wordElement = screen.getByText("react");
        // Browsers convert hex colors to RGB format, so check for RGB value of #ff0000
        expect(wordElement).toHaveStyle({ color: "rgb(255, 0, 0)" });
      });
    });

    it("uses default props correctly", async () => {
      render(<WordFrequencyCloud data={mockData} />);
      
      await waitFor(() => {
        // Find the container div that has the height style
        const container = screen.getByTestId("card-content").querySelector('div[style*="height"]');
        expect(container).toHaveStyle({ height: "400px" });
      });
    });
  });

});