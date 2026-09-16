import React, {useRef} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {WEB} from '../../fromWebCss/loginFromWeb.styles';

type Props = {
  value: string;
  length?: number;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
  secure?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Maps `.login-layout .hs-otp` / `.hs-otp__cell` from LoginPage.css */
export function WebCodeBoxes({
  value,
  length = 6,
  onChange,
  onComplete,
  editable = true,
  autoFocus,
  secure = false,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.replace(/\D/g, '').slice(0, length);
  const focusedIndex = Math.min(digits.length, length - 1);

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) {
      onComplete?.(next);
    }
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.wrap}
      disabled={!editable}
      accessibilityRole="none"
      accessible={false}>
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        editable={editable}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        style={styles.hiddenInput}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{disabled: !editable}}
      />
      <View
        style={styles.row}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants">
        {Array.from({length}, (_, i) => {
          const filled = Boolean(digits[i]);
          const isFocused = editable && i === focusedIndex;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                isFocused && styles.cellFocused,
              ]}>
              <Text style={styles.digit}>
                {filled ? (secure ? '•' : digits[i]) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginVertical: 4,
    marginBottom: 8,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    color: 'transparent',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WEB.border,
    backgroundColor: WEB.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocused: {
    borderColor: WEB.primary,
    shadowColor: WEB.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },
  digit: {
    fontSize: 20,
    fontWeight: '700',
    color: WEB.text,
  },
});
