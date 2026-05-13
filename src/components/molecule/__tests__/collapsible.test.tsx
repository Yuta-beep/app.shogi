import { fireEvent, render, screen } from '@testing-library/react-native';

import { Collapsible } from '../collapsible';

jest.mock('@/components/atom/icon-symbol', () => ({
  IconSymbol: jest.fn(() => null),
}));

jest.mock('@/components/atom/themed-text', () => ({
  ThemedText: jest.fn(({ children, ...props }: any) => {
    const MockText = jest.requireActual('react-native').Text;
    return (
      <MockText {...props} testID="themed-text">
        {children}
      </MockText>
    );
  }),
}));

jest.mock('@/components/atom/themed-view', () => ({
  ThemedView: jest.fn(({ children, ...props }: any) => {
    const MockText = jest.requireActual('react-native').Text;
    return (
      <MockText {...props} testID="themed-view">
        {children}
      </MockText>
    );
  }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('Collapsible', () => {
  it('renders with title', () => {
    render(<Collapsible title="テスト">Content</Collapsible>);
    expect(screen.getByText('テスト')).toBeTruthy();
  });

  it('does not show children initially', () => {
    render(<Collapsible title="テスト">Hidden Content</Collapsible>);
    expect(screen.queryByText('Hidden Content')).not.toBeTruthy();
  });

  it('shows children when pressed', () => {
    render(<Collapsible title="テスト">Visible Content</Collapsible>);
    const heading = screen.getByTestId('themed-text');
    fireEvent.press(heading);
    expect(screen.getByText('Visible Content')).toBeTruthy();
  });

  it('hides children when pressed again', () => {
    render(<Collapsible title="テスト">Toggled Content</Collapsible>);
    const heading = screen.getByTestId('themed-text');
    fireEvent.press(heading);
    expect(screen.getByText('Toggled Content')).toBeTruthy();
    fireEvent.press(heading);
    expect(screen.queryByText('Toggled Content')).not.toBeTruthy();
  });

  it('toggles multiple times', () => {
    render(<Collapsible title="テスト">Multi Toggle</Collapsible>);
    const heading = screen.getByTestId('themed-text');

    // Open
    fireEvent.press(heading);
    expect(screen.getByText('Multi Toggle')).toBeTruthy();

    // Close
    fireEvent.press(heading);
    expect(screen.queryByText('Multi Toggle')).not.toBeTruthy();

    // Open again
    fireEvent.press(heading);
    expect(screen.getByText('Multi Toggle')).toBeTruthy();
  });
});
