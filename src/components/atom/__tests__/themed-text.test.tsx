import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '../themed-text';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#000000',
}));

describe('ThemedText', () => {
  it('renders text content', () => {
    render(<ThemedText>Hello World</ThemedText>);
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders with default type', () => {
    render(<ThemedText>Default</ThemedText>);
    expect(screen.getByText('Default')).toBeTruthy();
  });

  it('renders with title type', () => {
    render(<ThemedText type="title">Title</ThemedText>);
    expect(screen.getByText('Title')).toBeTruthy();
  });

  it('renders with subtitle type', () => {
    render(<ThemedText type="subtitle">Subtitle</ThemedText>);
    expect(screen.getByText('Subtitle')).toBeTruthy();
  });

  it('renders with defaultSemiBold type', () => {
    render(<ThemedText type="defaultSemiBold">Semi Bold</ThemedText>);
    expect(screen.getByText('Semi Bold')).toBeTruthy();
  });

  it('renders with link type', () => {
    render(<ThemedText type="link">Link</ThemedText>);
    expect(screen.getByText('Link')).toBeTruthy();
  });

  it('renders with custom colors', () => {
    render(
      <ThemedText lightColor="#ff0000" darkColor="#00ff00">
        Colored Text
      </ThemedText>,
    );
    expect(screen.getByText('Colored Text')).toBeTruthy();
  });

  it('renders with children elements', () => {
    render(<ThemedText>Multiple words in text</ThemedText>);
    expect(screen.getByText('Multiple words in text')).toBeTruthy();
  });
});
