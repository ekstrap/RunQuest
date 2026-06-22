const React = require('react');
const { View } = require('react-native');

const MapView = React.forwardRef(function MapView({ children, testID, style }, ref) {
  return React.createElement(View, { testID, style, ref }, children);
});
MapView.Animated = MapView;

const Marker = function Marker({ children }) {
  return React.createElement(View, null, children);
};

module.exports = {
  __esModule: true,
  default: MapView,
  MapView,
  Marker,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
};
