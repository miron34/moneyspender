import { Platform, View, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PHONE_WIDTH = 390;
export const PHONE_HEIGHT = 844;

export function PhoneFrame({ children }: PhoneFrameProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={pageStyle}>
      <View style={frameStyle}>
        <View style={innerStyle}>
          <StatusBarMock />
          <View style={contentStyle}>{children}</View>
        </View>
        <View style={[sideButton, { left: -3, top: 188, height: 60 }]} />
        <View style={[sideButton, { left: -3, top: 260, height: 60 }]} />
        <View style={[sideButton, { right: -3, top: 195, height: 76, borderRadius: 0 }]} />
        <View style={homeIndicator} />
      </View>
    </View>
  );
}

function StatusBarMock() {
  return (
    <View style={statusBarStyle}>
      <View style={notchStyle} />
    </View>
  );
}

const pageStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#04060f',
  minHeight: '100%' as unknown as number,
};

const frameStyle: ViewStyle = {
  position: 'relative',
  width: PHONE_WIDTH,
  height: PHONE_HEIGHT,
  borderRadius: 54,
  backgroundColor: '#161616',
  boxShadow:
    '0 0 0 1.5px #2e2e2e, 0 0 0 3px #0a0a0a, 0 40px 100px rgba(0,0,0,0.9)',
  overflow: 'visible',
};

const innerStyle: ViewStyle = {
  position: 'absolute',
  top: 2,
  left: 2,
  right: 2,
  bottom: 2,
  borderRadius: 52,
  overflow: 'hidden',
  backgroundColor: Colors.bg,
};

const statusBarStyle: ViewStyle = {
  height: 52,
  backgroundColor: Colors.bg,
  zIndex: 50,
  position: 'relative',
};

const notchStyle: ViewStyle = {
  position: 'absolute',
  top: 12,
  left: '50%',
  marginLeft: -60,
  width: 120,
  height: 34,
  borderRadius: 20,
  backgroundColor: '#000',
};

const contentStyle: ViewStyle = {
  flex: 1,
};

const sideButton: ViewStyle = {
  position: 'absolute',
  width: 4,
  backgroundColor: '#2a2a2a',
  borderRadius: 2,
};

const homeIndicator: ViewStyle = {
  position: 'absolute',
  bottom: 9,
  left: '50%',
  marginLeft: -65,
  width: 130,
  height: 5,
  borderRadius: 3,
  backgroundColor: 'rgba(255,255,255,0.2)',
};
