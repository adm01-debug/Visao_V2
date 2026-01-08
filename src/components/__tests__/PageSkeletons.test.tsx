import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  DashboardSkeleton,
  CamerasSkeleton,
  AlertsSkeleton,
  PeopleSkeleton,
  ZonesSkeleton,
  RecordingsSkeleton,
  AnalyticsSkeleton,
  SecuritySkeleton,
  SettingsSkeleton,
  CardSkeleton,
  TableSkeleton,
  PageSkeleton,
  PageSkeletons,
} from '../PageSkeletons';

describe('PageSkeletons', () => {
  it('should render DashboardSkeleton', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render CamerasSkeleton', () => {
    const { container } = render(<CamerasSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render AlertsSkeleton', () => {
    const { container } = render(<AlertsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render PeopleSkeleton', () => {
    const { container } = render(<PeopleSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render ZonesSkeleton', () => {
    const { container } = render(<ZonesSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render RecordingsSkeleton', () => {
    const { container } = render(<RecordingsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render AnalyticsSkeleton', () => {
    const { container } = render(<AnalyticsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render SecuritySkeleton', () => {
    const { container } = render(<SecuritySkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render SettingsSkeleton', () => {
    const { container } = render(<SettingsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render CardSkeleton with className', () => {
    const { container } = render(<CardSkeleton className="test-class" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render TableSkeleton with custom rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render PageSkeleton with type', () => {
    const { container } = render(<PageSkeleton type="cameras" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should export PageSkeletons namespace', () => {
    expect(PageSkeletons.Dashboard).toBe(DashboardSkeleton);
    expect(PageSkeletons.Cameras).toBe(CamerasSkeleton);
    expect(PageSkeletons.Alerts).toBe(AlertsSkeleton);
    expect(PageSkeletons.People).toBe(PeopleSkeleton);
    expect(PageSkeletons.Zones).toBe(ZonesSkeleton);
    expect(PageSkeletons.Recordings).toBe(RecordingsSkeleton);
    expect(PageSkeletons.Analytics).toBe(AnalyticsSkeleton);
    expect(PageSkeletons.Security).toBe(SecuritySkeleton);
    expect(PageSkeletons.Settings).toBe(SettingsSkeleton);
  });
});
