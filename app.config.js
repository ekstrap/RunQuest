const { withInfoPlist } = require('@expo/config-plugins');

/** @type {(ctx: import('@expo/config').ConfigContext) => import('@expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  // Android reads the key from android.config.googleMaps.apiKey (→ AndroidManifest.xml).
  // iOS reads it from Info.plist GMSApiKey (Google Maps iOS SDK 8.4+).
  let result = {
    ...config,
    android: {
      ...config.android,
      config: {
        googleMaps: { apiKey: mapsApiKey },
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'RunQuest uses your location to track distance and show your position on the map.',
        },
      ],
    ],
  };

  result = withInfoPlist(result, (c) => {
    c.modResults.GMSApiKey = mapsApiKey;
    return c;
  });

  return result;
};
