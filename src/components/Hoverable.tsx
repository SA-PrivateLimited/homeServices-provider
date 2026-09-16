import React, {type ReactNode} from 'react';
import {
  Platform,
  Pressable,
  UIManager,
  requireNativeComponent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type HoverableProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  collapsable?: boolean;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
};

const NATIVE_HOVERABLE = 'HoverableView';
const hasNativeHoverable =
  Platform.OS === 'android' &&
  typeof UIManager.getViewManagerConfig === 'function' &&
  Boolean(UIManager.getViewManagerConfig(NATIVE_HOVERABLE));

const NativeHoverable = hasNativeHoverable
  ? requireNativeComponent<HoverableProps>(NATIVE_HOVERABLE)
  : null;

/**
 * Mouse/stylus hover without treating a tap as hover.
 * Android uses a native hover listener; elsewhere Pressable onHoverIn.
 */
export function Hoverable({
  children,
  style,
  onHoverIn,
  onHoverOut,
}: HoverableProps) {
  if (NativeHoverable) {
    return (
      <NativeHoverable
        collapsable={false}
        style={style}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}>
        {children}
      </NativeHoverable>
    );
  }

  return (
    <Pressable
      style={style}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}>
      {children}
    </Pressable>
  );
}
