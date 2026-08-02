/**
 * Six separate digit boxes for PIN entry.
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputKeyPressEventData,
  NativeSyntheticEvent,
} from 'react-native';

const LENGTH = 6;

interface PinBoxesInputProps {
  value: string;
  onChange: (pin: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
  secure?: boolean;
  cellBackground?: string;
  cellBorder?: string;
  textColor?: string;
  focusedBorder?: string;
}

export default function PinBoxesInput({
  value,
  onChange,
  editable = true,
  autoFocus = false,
  secure = false,
  cellBackground = '#fff',
  cellBorder = '#ddd',
  textColor = '#111',
  focusedBorder,
}: PinBoxesInputProps) {
  const digits = Array.from({length: LENGTH}, (_, i) => value[i] || '');
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (autoFocus && editable) {
      const idx = Math.min(value.length, LENGTH - 1);
      requestAnimationFrame(() => refs.current[idx]?.focus());
    }
    // only on mount / autoFocus toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, editable]);

  const emit = (nextDigits: string[]) => {
    onChange(nextDigits.join('').replace(/\D/g, '').slice(0, LENGTH));
  };

  const handleChange = (index: number, text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) {
      const next = digits.slice();
      next[index] = '';
      emit(next);
      return;
    }

    // Paste / autofill of multiple digits
    if (cleaned.length > 1) {
      const full = cleaned.slice(0, LENGTH).split('');
      const next = Array.from({length: LENGTH}, (_, i) => full[i] || '');
      emit(next);
      const focusAt = Math.min(full.length, LENGTH - 1);
      requestAnimationFrame(() => refs.current[focusAt]?.focus());
      return;
    }

    const next = digits.slice();
    next[index] = cleaned;
    emit(next);
    if (index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key !== 'Backspace') return;
    if (digits[index]) return;
    if (index <= 0) return;
    const next = digits.slice();
    next[index - 1] = '';
    emit(next);
    refs.current[index - 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => {
        const isActive = index === Math.min(value.length, LENGTH - 1);
        return (
          <TextInput
            key={index}
            ref={el => {
              refs.current[index] = el;
            }}
            style={[
              styles.box,
              {
                backgroundColor: cellBackground,
                borderColor: isActive && focusedBorder ? focusedBorder : cellBorder,
                color: textColor,
                borderWidth: isActive && focusedBorder ? 2 : 1.5,
              },
            ]}
            value={digit}
            onChangeText={text => handleChange(index, text)}
            onKeyPress={e => handleKeyPress(index, e)}
            onFocus={() => {
              const empty = value.length < LENGTH ? value.length : LENGTH - 1;
              if (index !== empty) {
                refs.current[empty]?.focus();
              }
            }}
            keyboardType="number-pad"
            maxLength={LENGTH}
            secureTextEntry={secure}
            editable={editable}
            selectTextOnFocus
            caretHidden
            textContentType="oneTimeCode"
            importantForAutofill="yes"
            accessibilityLabel={`PIN digit ${index + 1}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    padding: 0,
  },
});
