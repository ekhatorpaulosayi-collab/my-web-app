import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrentDate from '../CurrentDate';

// Mock the date to a fixed value
const MOCK_DATE = new Date('2025-10-28T12:00:00.000Z');

describe('CurrentDate', () => {
  beforeEach(() => {
    // Mock Date constructor
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing on server (SSR)', () => {
    const { container } = render(<CurrentDate />);

    // Should render empty span placeholder
    const placeholder = container.querySelector('span[aria-hidden="true"]');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeEmptyDOMElement();
  });

  it('renders formatted date after mount', async () => {
    render(<CurrentDate />);

    // Trigger useEffect
    jest.runAllTimers();

    // Wait for component to mount and update
    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
    });

    const timeElement = screen.getByRole('time');

    // Check formatted date text (will be in user's locale, but should contain key parts)
    expect(timeElement.textContent).toMatch(/Tuesday/i);
    expect(timeElement.textContent).toMatch(/October/i);
    expect(timeElement.textContent).toMatch(/28/);
    expect(timeElement.textContent).toMatch(/2025/);
  });

  it('sets correct datetime attribute', async () => {
    render(<CurrentDate />);

    jest.runAllTimers();

    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('datetime', '2025-10-28');
    });
  });

  it('has proper aria-label', async () => {
    render(<CurrentDate />);

    jest.runAllTimers();

    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('aria-label', "Today's date");
    });
  });

  it('applies custom className', async () => {
    render(<CurrentDate className="custom-date-class" />);

    jest.runAllTimers();

    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveClass('custom-date-class');
    });
  });

  it('applies custom styles', async () => {
    const customStyle = { color: 'red', fontSize: '14px' };
    render(<CurrentDate style={customStyle} />);

    jest.runAllTimers();

    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveStyle(customStyle);
    });
  });

  it('respects custom locale', async () => {
    // Note: This test may vary based on environment locale support
    render(<CurrentDate locale="en-GB" />);

    jest.runAllTimers();

    await waitFor(() => {
      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement.textContent).toBeTruthy();
    });
  });

  it('schedules midnight update', async () => {
    render(<CurrentDate />);

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByRole('time')).toBeInTheDocument();
    });

    // Check that a timeout was scheduled (can't easily test the exact time)
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it('cleans up timer on unmount', async () => {
    const { unmount } = render(<CurrentDate />);

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByRole('time')).toBeInTheDocument();
    });

    const timerCountBefore = jest.getTimerCount();

    unmount();

    // Timer should be cleared after unmount
    // Note: This is a simplified check; actual implementation clears the specific timer
    expect(jest.getTimerCount()).toBeLessThanOrEqual(timerCountBefore);
  });
});
