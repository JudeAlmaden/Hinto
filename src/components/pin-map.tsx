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
  pin?: PinPoint | null;
  /** Tap-to-place mode (journey pin picker). */
  onPick?: (point: PinPoint) => void;
  /** Fixed-centre mode: reports the map centre after every gesture. */
  onCenterChange?: (point: PinPoint) => void;
  centerPin?: boolean;
  onFailure: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * An empty style: every tile comes from the OSM raster source below, so no
 * provider key or hosted style is involved.
 */
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };

/**
 * Keyless pin picker (plan D19). In tap mode the marker follows the press; in
 * centre mode the pin is painted by the screen and the camera reports where it
 * landed. Remounting via `key` moves the camera.
 */
export function PinMap({
  center,
  pin,
  onPick,
  onCenterChange,
  centerPin = false,
  onFailure,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Map
        mapStyle={EMPTY_STYLE}
        style={styles.map}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ bottom: 6, right: 6 }}
        onPress={
          onPick
            ? (event) => {
                const [longitude, latitude] = event.nativeEvent.lngLat;
                onPick({ latitude, longitude });
              }
            : undefined
        }
        onRegionDidChange={
          onCenterChange
            ? (event) => {
                const [longitude, latitude] = event.nativeEvent.center;
                onCenterChange({ latitude, longitude });
              }
            : undefined
        }
        onDidFailLoadingMap={() => onFailure()}>
        <Camera
          initialViewState={{
            center: [center.longitude, center.latitude],
            zoom: centerPin ? 16 : 15,
          }}
        />
        <RasterSource
          id="osm"
          tiles={[PIN_MAP_TILE_URL]}
          tileSize={256}
          maxzoom={19}
          attribution={PIN_MAP_ATTRIBUTION}>
          <Layer id="osm-raster" type="raster" source="osm" />
        </RasterSource>
        {!centerPin && pin ? (
          <ViewAnnotation lngLat={[pin.longitude, pin.latitude]} anchor="center">
            <View style={styles.pin}>
              <View style={styles.pinDot} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

      {centerPin ? (
        <View pointerEvents="none" style={styles.crosshair}>
          <View style={styles.pin}>
            <View style={styles.pinDot} />
          </View>
        </View>
      ) : null}

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
    backgroundColor: '#D99A43',
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
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -13,
    marginLeft: -13,
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
