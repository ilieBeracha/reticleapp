const { createRunOncePlugin, withAndroidStyles } = require('@expo/config-plugins');

const MATERIAL3_THEME_DYNAMIC = 'Theme.Material3.DynamicColors.DayNight.NoActionBar';
const MATERIAL3_THEME = 'Theme.Material3.DayNight.NoActionBar';
const MATERIAL2_THEME = 'Theme.MaterialComponents.DayNight.NoActionBar';
const MATERIAL3_EXPRESSIVE_THEME = 'Theme.Material3Expressive.DayNight.NoActionBar';

const withBottomTabsTheme = (config, options = {}) => {
  const theme = options.theme;

  return withAndroidStyles(config, (stylesConfig) => {
    const styles = stylesConfig.modResults.resources.style ?? [];

    stylesConfig.modResults.resources.style = styles.map((style) => {
      if (style.$.name !== 'AppTheme') return style;

      if (theme === 'material3-dynamic') {
        style.$.parent = MATERIAL3_THEME_DYNAMIC;
      } else if (theme === 'material2') {
        style.$.parent = MATERIAL2_THEME;
      } else if (theme === 'material3-expressive') {
        style.$.parent = MATERIAL3_EXPRESSIVE_THEME;
      } else {
        style.$.parent = MATERIAL3_THEME;
      }

      return style;
    });

    return stylesConfig;
  });
};

module.exports = createRunOncePlugin(
  withBottomTabsTheme,
  'with-bottom-tabs-theme',
  '1.0.0'
);
