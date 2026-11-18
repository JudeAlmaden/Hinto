import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  RasterSource,
  ViewAnnotation,
  type CameraRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { PIN_MAP_ATTRIBUTION, PIN_MAP_TILE_URL, type PinPoint } from '@/modules/maps';

function makeCirclePolygon(lng: number, lat: number, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const d = radiusM / earthRadius;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing),
    );
    const pLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(pLat),
      );
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Bounding box of the alert circle, so the camera can frame the chosen radius
 * instead of sitting at a fixed zoom whatever the user picks.
 */
function circleBounds(lat: number, lng: number, radiusM: number): [number, number, number, number] {
  const latDelta = radiusM / 111_320;
  const lngDelta = radiusM / (111_320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

/** Room around the circle so its edge never touches the map frame. */
const CIRCLE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

interface Props {
  center: PinPoint;
  pin?: PinPoint | null;
  radiusM?: number;
  /** Tap-to-place mode (journey pin picker). */
  onPick?: (point: PinPoint) => void;
  /** Fixed-centre mode: reports the map centre after every gesture. */
  onCenterChange?: (point: PinPoint) => void;
  /** Optional handler when user taps the map surface (e.g. to dismiss keyboard). */
  onPress?: () => void;
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
  radiusM,
  onPick,
  onCenterChange,
  onPress,
  centerPin = false,
  onFailure,
  style,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);

  // The radius always belongs to the pin. In centre mode the camera sits still
  // and only the reported point moves, so `center` must not win here — that is
  // what left the circle behind while the pin slid across the map.
  const target = pin ?? center;

  const circleData = useMemo(
    () => (radiusM ? makeCirclePolygon(target.longitude, target.latitude, radiusM) : null),
    [radiusM, target],
  );

  // The first view already frames the circle via `initialViewState`; afterwards,
  // changing the radius re-frames so 500 m and 5 km look like different places.
  // Panning changes `target`, so the guard keys off the radius: a drag must never
  // be undone by a re-fit.
  const framedRadiusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!radiusM) {
      framedRadiusRef.current = null;
      return;
    }
    if (framedRadiusRef.current === null) {
      framedRadiusRef.current = radiusM;
      return;
    }
    if (framedRadiusRef.current === radiusM) return;
    framedRadiusRef.current = radiusM;
    cameraRef.current?.fitBounds(circleBounds(target.latitude, target.longitude, radiusM), {
      padding: CIRCLE_PADDING,
      duration: 300,
    });
  }, [radiusM, target]);

  return (
    <View style={[styles.wrap, style]}>
      <Map
        mapStyle={EMPTY_STYLE}
        style={styles.map}
        logo={false}
        compass={false}
        /* The credit overlay below stays visible without interaction; the
           built-in control would duplicate it. */
        attribution={false}
        onPress={(event) => {
          onPress?.();
          if (onPick) {
            const [longitude, latitude] = event.nativeEvent.lngLat;
            onPick({ latitude, longitude });
          }
        }}
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
          ref={cameraRef}
          initialViewState={
            radiusM
              ? {
                  bounds: circleBounds(target.latitude, target.longitude, radiusM),
                  padding: CIRCLE_PADDING,
                }
              : { center: [center.longitude, center.latitude], zoom: 15 }
          }
        />
        <RasterSource
          id="osm"
          tiles={[PIN_MAP_TILE_URL]}
          tileSize={256}
          maxzoom={19}
          attribution={PIN_MAP_ATTRIBUTION}>
          <Layer id="osm-raster" type="raster" source="osm" />
        </RasterSource>
        {circleData ? (
          <GeoJSONSource id="radius-source" data={circleData}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                'fill-color': '#D99A43',
                'fill-opacity': 0.18,
              }}
            />
            <Layer
              id="radius-line"
              type="line"
              paint={{
                'line-color': '#D99A43',
                'line-width': 2,
                'line-dasharray': [2, 2],
              }}
            />
          </GeoJSONSource>
        ) : null}
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
          {/* Tip lands on the coordinate the map reports, so the marker reads
              as a pin rather than a dot floating over the target. */}
          <View style={styles.pinTip} />
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
    width: 26,
    marginTop: -36,
    marginLeft: -13,
    alignItems: 'center',
  },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D99A43',
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
