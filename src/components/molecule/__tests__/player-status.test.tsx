import { render, screen, waitFor } from '@testing-library/react-native';

import { PlayerStatus } from '../player-status';

jest.mock('@/components/atom/exp-progress-bar', () => ({
  ExpProgressBar: jest.fn(() => null),
}));

jest.mock('@/components/atom/header-label', () => ({
  HeaderLabel: ({ text }: { text: string }) => {
    const MockText = jest.requireActual('react-native').Text;
    return <MockText testID="header-label">{text}</MockText>;
  },
}));

describe('PlayerStatus', () => {
  const baseProps = {
    userName: 'Player 1',
    rating: 1500,
  };

  it('renders player name', () => {
    render(<PlayerStatus {...baseProps} />);
    expect(screen.getByText('Player 1')).toBeTruthy();
  });

  it('displays pvp rating', () => {
    render(<PlayerStatus {...baseProps} />);
    expect(screen.getByText('◆レート1500')).toBeTruthy();
  });

  it('floors fractional rating', () => {
    render(<PlayerStatus {...baseProps} rating={1499.8} />);
    expect(screen.getByText('◆レート1499')).toBeTruthy();
  });

  it('handles zero rating', () => {
    render(<PlayerStatus {...baseProps} rating={0} />);
    expect(screen.getByText('◆レート0')).toBeTruthy();
  });

  it('handles negative rating as zero', () => {
    render(<PlayerStatus {...baseProps} rating={-50} />);
    expect(screen.getByText('◆レート0')).toBeTruthy();
  });

  it('displays stamina with defaults', () => {
    render(<PlayerStatus {...baseProps} />);
    expect(screen.getByText('スタミナ 50/50')).toBeTruthy();
  });

  it('displays custom stamina values', () => {
    render(<PlayerStatus {...baseProps} stamina={25} maxStamina={50} />);
    expect(screen.getByText('スタミナ 25/50')).toBeTruthy();
  });

  it('handles zero stamina', () => {
    render(<PlayerStatus {...baseProps} stamina={0} maxStamina={50} />);
    expect(screen.getByText('スタミナ 0/50')).toBeTruthy();
  });

  it('handles negative stamina as zero', () => {
    render(<PlayerStatus {...baseProps} stamina={-10} maxStamina={50} />);
    expect(screen.getByText('スタミナ 0/50')).toBeTruthy();
  });

  it('handles max stamina of 0 as 1', () => {
    render(<PlayerStatus {...baseProps} stamina={0} maxStamina={0} />);
    expect(screen.getByText(/スタミナ 0/)).toBeTruthy();
  });

  it('does not show recovery countdown when stamina is full', () => {
    render(
      <PlayerStatus
        {...baseProps}
        stamina={50}
        maxStamina={50}
        nextRecoveryAt="2099-12-31T23:59:59Z"
      />,
    );
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeTruthy();
  });

  it('shows recovery countdown when stamina is not full', async () => {
    const futureTime = new Date(Date.now() + 125000).toISOString();
    render(
      <PlayerStatus {...baseProps} stamina={25} maxStamina={50} nextRecoveryAt={futureTime} />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/\d{2}:\d{2}/)).toBeTruthy();
    });
  });
});
