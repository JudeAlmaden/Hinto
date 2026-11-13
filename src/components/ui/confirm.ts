import { Alert } from 'react-native';

import { strings } from '@/constants/strings';

/** Destructive actions are named plainly and confirm what is removed (§6). */
export function confirmAction({
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  Alert.alert(title, body, [
    { text: strings.common.cancel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
