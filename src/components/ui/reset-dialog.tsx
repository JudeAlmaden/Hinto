import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, TextField } from '@/components/ui/controls';
import { strings } from '@/constants/strings';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';

/** The word the user must type to confirm a destructive reset (plan D6). */
export const RESET_CONFIRMATION_WORD = 'RESET';

export function ResetStorageDialog({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState('');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={() => setText('')}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.card}>
          <ThemedText style={styles.title}>{strings.settings.resetTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.settings.resetBody}
          </ThemedText>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={RESET_CONFIRMATION_WORD}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <AppButton
            label={strings.settings.resetLocal}
            variant="danger"
            disabled={text.trim() !== RESET_CONFIRMATION_WORD}
            onPress={onConfirm}
          />
          <AppButton label={strings.common.cancel} variant="ghost" onPress={onCancel} />
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Radii.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
