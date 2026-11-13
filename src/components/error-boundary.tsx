import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { capture } from '@/modules/diagnostics';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors and records a local breadcrumb (plan D10).
 * Truncated text only — never coordinates or user data.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    capture('crash', 'react_error', {
      message: error.message.slice(0, 200),
      componentStack: (info.componentStack ?? '').slice(0, 500),
    });
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText type="subtitle">{strings.common.errorTitle}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.body}>
            {strings.common.errorBody}
          </ThemedText>
          <Pressable onPress={this.handleRetry} style={styles.retry}>
            <ThemedText type="smallBold">{strings.common.retry}</ThemedText>
          </Pressable>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  body: {
    textAlign: 'center',
  },
  retry: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8A8F98',
  },
});
