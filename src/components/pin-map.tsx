import {
  Camera,
  Layer,
  Map,
  RasterSource,
  ViewAnnotation,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { PIN_MAP_ATTRIBUTION, PIN_MAP_TILE_URL, type PinPoint } from '@/modules/maps';

interface Props {
  center: PinPoint;
  pin: PinPoint | null;
  onPick: (point: PinPoint) => void;
  onFailure: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * An empty style: every tile comes from the OSM raster source below, so no
 * provider key or hosted style is involved.
 */
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

/**
 * Keyless pin picker (plan D19). Tap the map to place the marker; the screen
 * remounts this component (key) to move the camera.
 */
export function PinMap({ center, pin, onPick, onFailure, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Map
        mapStyle={EMPTY_STYLE}
        style={styles.map}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ bottom: 6, right: 6 }}
        onPress={(event) => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          onPick({ latitude, longitude });
        }}
        onDidFailLoadingMap={() => onFailure()}
      >
        <Camera
          initialViewState={{
            center: [center.longitude, center.latitude],
            zoom: 15,
          }}
        />
        <RasterSource
          id="osm"
          tiles={[PIN_MAP_TILE_URL]}
          tileSize={256}
          maxzoom={19}
          attribution={PIN_MAP_ATTRIBUTION}
        >
          <Layer id="osm-raster" type="raster" source="osm" />
        </RasterSource>
        {pin ? (
          <ViewAnnotation lngLat={[pin.longitude, pin.latitude]} anchor="center">
            <View style={styles.pin}>
              <View style={styles.pinDot} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

      {/* OSM attribution must stay visible without interaction. */}
      <View pointerEvents="none" style={styles.credit}>
        <ThemedText type="small" themeColor="textSecondary">
          {PIN_MAP_ATTRIBUTION}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radii.large,
    overflow: 'hidden',
    backgroundColor: '#101214',
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#208AEF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  credit: {
    position: 'absolute',
    left: 8,
    bottom: 4,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(16, 18, 20, 0.65)',
  },
});
