export const Colors = {
  // Blues
  blueLight: '#c8e6fd',
  blueMid: '#81bfee',
  blueDark: '#003c6a',
  blueVeryDark: '#08263c',

  // Accent Colors
  red: '#bf2025',
  green: '#2e9b64',
  yellow: '#d1c246',

  // Neutrals
  silver: '#ececec',
  grayLight: '#dddddd',
  white: '#ffffff',
  black: '#000000',
  charcoal: '#333333',
} as const;

export const Typography = {
  // Font Families
  bold: 'MavenPro-Bold',
  regular: 'MavenPro-Regular',
  medium: 'MavenPro-Medium',

  // Common Text Styles
  header: {
    fontFamily: 'MavenPro-Bold',
    color: Colors.blueVeryDark,
  },
  body: {
    fontFamily: 'MavenPro-Regular',
    color: Colors.charcoal,
  },
  button: {
    fontFamily: 'MavenPro-Medium',
  },
} as const;

export const CommonStyles = {
  // Button Styles
  primaryButton: {
    backgroundColor: Colors.blueMid,
    color: Colors.white,
    fontFamily: Typography.medium,
    padding: 12,
    borderRadius: 6,
  },
  secondaryButton: {
    backgroundColor: Colors.blueLight,
    color: Colors.blueDark,
    fontFamily: Typography.medium,
    padding: 12,
    borderRadius: 6,
  },

  // Alert Styles
  alerts: {
    error: {
      backgroundColor: Colors.red,
      color: Colors.white,
    },
    success: {
      backgroundColor: Colors.green,
      color: Colors.white,
    },
    warning: {
      backgroundColor: Colors.yellow,
      color: Colors.charcoal,
    },
  },
} as const; 