import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({compact = false}) => {
  const {isDarkMode, language, setLanguage} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const handleLanguageChange = async (itemValue: 'en' | 'hi') => {
    try {
      // setLanguage already calls changeLanguage internally
      await setLanguage(itemValue);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  if (compact) {
    // Compact version for headers
    return (
      <View style={[styles.compactContainer, {backgroundColor: theme.card, borderColor: theme.border}]}>
        <Picker
          selectedValue={language}
          onValueChange={handleLanguageChange}
          style={[styles.compactPicker, {color: theme.text}]}
          dropdownIconColor={theme.text}
          mode="dropdown"
        >
          <Picker.Item label="EN" value="en" />
          <Picker.Item label="HI" value="hi" />
        </Picker>
      </View>
    );
  }

  // Full version for settings
  return (
    <View style={[styles.container, {backgroundColor: theme.card, borderColor: theme.border}]}>
      <Picker
        selectedValue={language}
        onValueChange={handleLanguageChange}
        style={[styles.picker, {color: theme.text}]}
        dropdownIconColor={theme.textSecondary}
      >
        <Picker.Item label={String(t('settings.english') || 'English')} value="en" />
        <Picker.Item label={String(t('settings.hindi') || 'Hindi')} value="hi" />
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 150,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  compactContainer: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    width: 80,
  },
  compactPicker: {
    height: 36,
    width: '100%',
    fontSize: 14,
  },
});

export default LanguageSwitcher;

