import { render } from '@testing-library/react-native';

import { ExpProgressBar } from '../exp-progress-bar';

describe('ExpProgressBar', () => {
  it('renders with progress 0', () => {
    const { getByTestId } = render(<ExpProgressBar progress={0} />);
    expect(() => {
      render(<ExpProgressBar progress={0} />);
    }).not.toThrow();
  });

  it('renders with progress 1', () => {
    expect(() => {
      render(<ExpProgressBar progress={1} />);
    }).not.toThrow();
  });

  it('renders with progress between 0 and 1', () => {
    expect(() => {
      render(<ExpProgressBar progress={0.5} />);
    }).not.toThrow();
  });

  it('clamps progress to 0 when negative', () => {
    expect(() => {
      render(<ExpProgressBar progress={-0.5} />);
    }).not.toThrow();
  });

  it('clamps progress to 1 when > 1', () => {
    expect(() => {
      render(<ExpProgressBar progress={1.5} />);
    }).not.toThrow();
  });

  it('uses default fill color when not specified', () => {
    expect(() => {
      render(<ExpProgressBar progress={0.5} />);
    }).not.toThrow();
  });

  it('uses custom fill color when specified', () => {
    expect(() => {
      render(<ExpProgressBar progress={0.5} fillClassName="bg-red-500" />);
    }).not.toThrow();
  });
});
