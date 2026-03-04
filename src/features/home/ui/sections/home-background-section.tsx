import { Text, View } from 'react-native';

const floatingPieces = [
  { text: '玉', top: '12%', left: '6%' },
  { text: '飛', top: '23%', left: '82%' },
  { text: '角', top: '36%', left: '9%' },
  { text: '忍', top: '47%', left: '76%' },
  { text: '鳳', top: '62%', left: '12%' },
  { text: '星', top: '80%', left: '81%' },
] as const;

export function HomeBackgroundSection() {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      {floatingPieces.map((piece) => (
        <Text
          key={`${piece.text}-${piece.top}-${piece.left}`}
          className="absolute text-4xl font-black text-white/25"
          style={{ top: piece.top, left: piece.left }}
        >
          {piece.text}
        </Text>
      ))}
    </View>
  );
}
