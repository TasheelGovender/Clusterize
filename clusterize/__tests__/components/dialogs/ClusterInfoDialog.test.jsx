/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClusterInfoDialog from "../../../components/dialogs/ClusterInfoDialog";

const updateClusterMock = jest.fn().mockResolvedValue();
const resetClusterMock = jest.fn().mockResolvedValue();
const setErrorMock = jest.fn();

// Mock dependencies
jest.mock("../../../hooks", () => ({
  useCluster: () => ({
    updateCluster: updateClusterMock,
    resetCluster: resetClusterMock,
    loading: false,
    error: null,
    setError: setErrorMock,
  }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockCluster = {
  cluster_name: "A",
  label_name: "LabelA",
  image_count: 5,
  total_size: 100,
};  

const baseCluster = {
  cluster_name: "A",
  label_name: "LabelA",
  image_count: 5,
  total_size: 100,
};
const stringLabels = ["LabelA", "LabelB", "LabelC"];
const objectLabels = [{ name: "LabelA" }, { name: "LabelB" }, { name: "LabelC" }];
const mockLabels = ["LabelA", "LabelB", "LabelC"];

beforeEach(() => {
  updateClusterMock.mockClear();
  resetClusterMock.mockClear();
  setErrorMock.mockClear();
});

describe("ClusterInfoDialog", () => {
  it("renders cluster info and label", () => {
    render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={jest.fn()}
        cluster={mockCluster}
        projectId={1}
        onClusterUpdated={jest.fn()}
        labels={mockLabels}
      />
    );
    expect(screen.getByText("Cluster A")).toBeInTheDocument();
    expect(screen.getByText("LabelA")).toBeInTheDocument();
    expect(screen.getByText("Total Images")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Cluster Management")).toBeInTheDocument();
  });

  it("shows editable label input when edit is clicked", () => {
    render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={jest.fn()}
        cluster={mockCluster}
        projectId={1}
        onClusterUpdated={jest.fn()}
        labels={mockLabels}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit label" }));
    expect(screen.getByPlaceholderText("Enter label name...")).toBeInTheDocument();
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={onClose}
        cluster={mockCluster}
        projectId={1}
        onClusterUpdated={jest.fn()}
        labels={mockLabels}
      />
    );
    fireEvent.click(screen.getByTestId("close-button"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows reset cluster dialog when Reset Cluster is clicked", () => {
    render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={jest.fn()}
        cluster={mockCluster}
        projectId={1}
        onClusterUpdated={jest.fn()}
        labels={mockLabels}
      />
    );
    fireEvent.click(screen.getByTestId("reset-cluster-button"));
    expect(screen.getByText(/Are you sure you want to reset the cluster/)).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders nothing if cluster is null", () => {
    const { container } = render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={jest.fn()}
        cluster={null}
        projectId={1}
        onClusterUpdated={jest.fn()}
        labels={mockLabels}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("ClusterInfoDialog - Save flow", () => {
  it("calls updateCluster with correct args, updates label, exits edit mode, and calls onClusterUpdated", async () => {
    const onClusterUpdated = jest.fn();

    render(
      <ClusterInfoDialog
        isOpen={true}
        onClose={jest.fn()}
        cluster={{ ...baseCluster }}
        projectId={123}
        onClusterUpdated={onClusterUpdated}
        labels={stringLabels}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: "Edit label" }));

    // Type new label
    const input = screen.getByPlaceholderText("Enter label name...");
    fireEvent.change(input, { target: { value: "NewLabel" } });

    // Save
    fireEvent.click(screen.getByText("Save"));

    // updateCluster called with projectId, cluster_name, new label
    await waitFor(() => {
      expect(updateClusterMock).toHaveBeenCalledWith(123, "A", "NewLabel");
    });

    // UI updated: input gone, new label shown, edit mode exited
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Enter label name...")).toBeNull();
      expect(screen.getByText("NewLabel")).toBeInTheDocument();
    });

    // Callback invoked
    expect(onClusterUpdated).toHaveBeenCalled();
  });
});
