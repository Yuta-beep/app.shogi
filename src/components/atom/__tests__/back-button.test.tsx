import { render, screen } from '@testing-library/react-native';

import { BackButton } from '../back-button';

describe('BackButton', () => {
  it('renders with default label', () => {
    render(<BackButton onPress={jest.fn()} />);
    expect(screen.getByText('< 戻る')).toBeTruthy();
  });

  it('renders with custom label', () => {
    render(<BackButton onPress={jest.fn()} label="キャンセル" />);
    expect(screen.getByText('< キャンセル')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(<BackButton onPress={mockOnPress} />);
    const pressable = getByTestId('back-button');
    expect(pressable).toBeTruthy();
  });
});
