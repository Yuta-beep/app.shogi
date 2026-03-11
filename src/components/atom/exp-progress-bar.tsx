import { View } from 'react-native';

type ExpProgressBarProps = {
  progress: number;
  fillClassName?: string;
};

export function ExpProgressBar({ progress, fillClassName = 'bg-[#9bdf6b]' }: ExpProgressBarProps) {
  const normalized = Math.max(0, Math.min(1, progress));
  return (
    <View className="h-2 flex-1 overflow-hidden rounded-full border border-[#8a6328] bg-[#2f1b14]/25">
      <View
        className={`h-full ${fillClassName}`}
        style={{ width: `${Math.max(4, Math.round(normalized * 100))}%` }}
      />
    </View>
  );
}
