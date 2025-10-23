// filepath: /Users/tasheelgovender/Desktop/Dev/25002112-TG2-src/clusterize/components/analytics/analytics.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClusterAnalytics, TagAnalytics } from '@/components/analytics/analytics';

describe('ClusterAnalytics', () => {
  const mockStats = {
    clusters: [
      { name: 'A', frequency: 10 },
      { name: 'B', frequency: 5 },
    ],
    tags: [],
  };

  it('renders cluster names and frequencies', () => {
    render(<ClusterAnalytics statistics={mockStats} onCreateCluster={() => {}} onClusterClick={() => {}} />);
    expect(screen.getByText('Cluster Distribution')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('10 images')).toBeInTheDocument();
  });

  it('calls onCreateCluster when "+" button is clicked', () => {
    const onCreateCluster = jest.fn();
    render(<ClusterAnalytics statistics={mockStats} onCreateCluster={onCreateCluster} onClusterClick={() => {}} />);
    fireEvent.click(screen.getByText('+'));
    expect(onCreateCluster).toHaveBeenCalled();
  });

  it('calls onClusterClick when a cluster is clicked', () => {
    const onClusterClick = jest.fn();
    render(<ClusterAnalytics statistics={mockStats} onCreateCluster={() => {}} onClusterClick={onClusterClick} />);
    fireEvent.click(screen.getByText('A'));
    expect(onClusterClick).toHaveBeenCalledWith(mockStats.clusters[0]);
  });
});

describe('TagAnalytics', () => {
  const mockStats = {
    clusters: [],
    tags: [
      { name: 'tag1', frequency: 3 },
      { name: 'tag2', frequency: 2 },
    ],
  };

  it('renders tag analytics title', () => {
    render(<TagAnalytics statistics={mockStats} />);
    expect(screen.getByText('Tag Analytics')).toBeInTheDocument();
  });

  it('shows "No tags yet" when tags are empty', () => {
    render(<TagAnalytics statistics={{ clusters: [], tags: [] }} />);
    expect(screen.getByText('No tags yet')).toBeInTheDocument();
  });
});