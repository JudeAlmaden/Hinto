import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * The Hinto guide. Poses are transparent PNGs in `assets/mascot/main_poses/`;
 * expressions are head-and-shoulders crops in `assets/mascot/expressions/`.
 * Placement rules live in Design.md §12: one per screen, and only when there is
 * something to explain or celebrate.
 */
const POSES = {
  friendly: require('@/assets/mascot/main_poses/friendly_guide.png'),
  onTheGo: require('@/assets/mascot/main_poses/on_the_go.png'),
  alert: require('@/assets/mascot/main_poses/alert_mode.png'),
  navigator: require('@/assets/mascot/main_poses/navigator.png'),
  ready: require('@/assets/mascot/main_poses/ready_to_go.png'),
} as const;

const EXPRESSIONS = {
  happy: require('@/assets/mascot/expressions/happy.png'),
  sleepy: require('@/assets/mascot/expressions/sleepy.png'),
  thinking: require('@/assets/mascot/expressions/thinking.png'),
  surprised: require('@/assets/mascot/expressions/surprised.png'),
  worried: require('@/assets/mascot/expressions/worried.png'),
  annoyed: require('@/assets/mascot/expressions/annoyed.png'),
} as const;

export type MascotPose = keyof typeof POSES;
export type MascotExpression = keyof typeof EXPRESSIONS;

/** Size ladder from Design.md §12. Keep within a band for a consistent crop. */
export const MascotSizes = {
  inline: 36,
  small: 56,
  medium: 88,
  large: 132,
  hero: 168,
  full: 240,
} as const;

export type MascotSize = keyof typeof MascotSizes;

export function Mascot({
  pose,
  expression,
  size,
  height,
  style,
}: {
  pose?: MascotPose;
  expression?: MascotExpression;
  size?: MascotSize;
  height?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const source = expression ? EXPRESSIONS[expression] : POSES[pose ?? 'onTheGo'];
  const box = height ?? (size ? MascotSizes[size] : MascotSizes.medium);

  return (
    <Image
      source={source}
      style={[{ height: box, width: box * 0.86 }, style]}
      resizeMode="contain"
      accessible={false}
    />
  );
}
