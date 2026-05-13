import { Pressable } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

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
    const { UNSAFE_getByType } = render(<BackButton onPress={mockOnPress} />);
    const pressable = UNSAFE_getByType(Pressable);
    fireEvent.press(pressable);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { UNSAFE_getByType } = render(<BackButton onPress={mockOnPress} disabled={true} />);
    const pressable = UNSAFE_getByType(Pressable);
    fireEvent.press(pressable);
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('has disabled state when disabled prop is true', () => {
    const { UNSAFE_getByType } = render(<BackButton onPress={jest.fn()} disabled={true} />);
    const pressable = UNSAFE_getByType(Pressable);
    expect(pressable.props.disabled).toBe(true);
  });

  it('does not have disabled state when disabled prop is false', () => {
    const { UNSAFE_getByType } = render(<BackButton onPress={jest.fn()} disabled={false} />);
    const pressable = UNSAFE_getByType(Pressable);
    expect(pressable.props.disabled).toBe(false);
  });
});
