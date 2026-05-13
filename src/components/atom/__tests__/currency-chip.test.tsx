import { render, screen } from '@testing-library/react-native';

import { CurrencyChip } from '../currency-chip';

jest.mock('expo-image', () => ({
  Image: require('react-native').Image,
}));

describe('CurrencyChip', () => {
  const mockIconSource = require('react-native/jest/assetFileTransformer').default;

  it('renders with correct value', () => {
    render(<CurrencyChip iconSource={mockIconSource} value={1000} />);
    expect(screen.getByText('1000')).toBeTruthy();
  });

  it('renders with different values', () => {
    const { unmount } = render(<CurrencyChip iconSource={mockIconSource} value={999} />);
    expect(screen.getByText('999')).toBeTruthy();
    unmount();

    render(<CurrencyChip iconSource={mockIconSource} value={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders with large values', () => {
    render(<CurrencyChip iconSource={mockIconSource} value={999999} />);
    expect(screen.getByText('999999')).toBeTruthy();
  });
});
