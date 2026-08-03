/**
 * Inline provider address fields:
 * address, landmark, state, district, pincode + Use current location.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Select} from 'sapvt-ltd-app-packages';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  getGeographyMeta,
  hasWarmGeographyMeta,
  peekGeographyMeta,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import GeolocationService from '../services/geolocationService';

export interface ProviderServiceAddressValue {
  type?: 'home' | 'office';
  address?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  stateId?: string;
  districtId?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

interface ProviderServiceAddressFieldsProps {
  value: ProviderServiceAddressValue;
  onChange: (next: ProviderServiceAddressValue) => void;
  theme: {
    text: string;
    textSecondary: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
  editable?: boolean;
  showUseCurrentLocation?: boolean;
  labels?: {
    address?: string;
    landmark?: string;
    state?: string;
    district?: string;
    pincode?: string;
    useCurrent?: string;
    currentLocation?: string;
  };
}

function normalizeName(s?: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findState(
  states: GeographyState[],
  name?: string,
): GeographyState | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  return (
    states.find(s => normalizeName(s.name) === n) ||
    states.find(
      s =>
        normalizeName(s.name).includes(n) || n.includes(normalizeName(s.name)),
    )
  );
}

function findDistrict(
  districts: GeographyDistrict[],
  opts: {name?: string; pincode?: string; stateId?: string},
): GeographyDistrict | undefined {
  const {name, pincode, stateId} = opts;
  const scoped = stateId
    ? districts.filter(d => d.stateId === stateId)
    : districts;

  if (pincode && /^\d{6}$/.test(pincode)) {
    const byPin =
      scoped.find(d => d.pincode === pincode) ||
      districts.find(d => d.pincode === pincode);
    if (byPin) return byPin;
  }

  const n = normalizeName(name);
  if (!n) return undefined;
  return (
    scoped.find(d => normalizeName(d.name) === n) ||
    scoped.find(
      d =>
        normalizeName(d.name).includes(n) || n.includes(normalizeName(d.name)),
    ) ||
    districts.find(d => normalizeName(d.name) === n)
  );
}

export function ProviderServiceAddressFields({
  value,
  onChange,
  theme,
  editable = true,
  showUseCurrentLocation = true,
  labels = {},
}: ProviderServiceAddressFieldsProps) {
  const warm = peekGeographyMeta();
  const [states, setStates] = useState<GeographyState[]>(
    () => warm?.states || [],
  );
  const [districts, setDistricts] = useState<GeographyDistrict[]>(
    () => warm?.districts || [],
  );
  const [loadingMeta, setLoadingMeta] = useState(() => !hasWarmGeographyMeta());
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const showSpinner = !hasWarmGeographyMeta();
    if (showSpinner) setLoadingMeta(true);
    void getGeographyMeta().then(meta => {
      if (!cancelled) {
        setStates(meta.states);
        setDistricts(meta.districts);
        setLoadingMeta(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stateOptions = useMemo(
    () => states.map(s => ({value: s._id, label: s.name})),
    [states],
  );

  const districtOptions = useMemo(() => {
    const sid = value.stateId || '';
    return districts
      .filter(d => !sid || d.stateId === sid)
      .map(d => ({value: d._id, label: d.name}));
  }, [districts, value.stateId]);

  const patch = (partial: Partial<ProviderServiceAddressValue>) => {
    onChange({...value, ...partial});
  };

  const onStateChange = (stateId: string) => {
    const st = states.find(s => s._id === stateId);
    patch({
      stateId,
      state: st?.name || '',
      districtId: '',
      district: '',
      city: '',
      pincode: '',
    });
  };

  const onDistrictChange = (districtId: string) => {
    const d = districts.find(x => x._id === districtId);
    patch({
      districtId,
      district: d?.name || '',
      city: d?.name || value.city || '',
      pincode: d?.pincode || value.pincode || '',
      stateId: d?.stateId || value.stateId,
      state:
        d?.stateName ||
        states.find(s => s._id === (d?.stateId || value.stateId))?.name ||
        value.state,
    });
  };

  const useCurrentLocation = async () => {
    if (!editable) return;
    setDetecting(true);
    try {
      const permission = await GeolocationService.requestLocationPermission();
      if (permission !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to detect your address.',
        );
        return;
      }

      const [location, meta] = await Promise.all([
        GeolocationService.getCurrentLocation(),
        getGeographyMeta(),
      ]);
      setStates(meta.states);
      setDistricts(meta.districts);

      const nextPincode = (location.pincode || '').replace(/\D/g, '').slice(0, 6);
      let matchedState = findState(meta.states, location.state);
      let matchedDistrict = findDistrict(meta.districts, {
        name: location.city,
        pincode: nextPincode,
        stateId: matchedState?._id,
      });

      // If pincode matched a district in another state, prefer that state
      if (matchedDistrict && !matchedState) {
        matchedState = meta.states.find(s => s._id === matchedDistrict!.stateId);
      }
      if (
        matchedDistrict &&
        matchedState &&
        matchedDistrict.stateId !== matchedState._id
      ) {
        matchedState =
          meta.states.find(s => s._id === matchedDistrict!.stateId) ||
          matchedState;
      }

      const districtName =
        matchedDistrict?.name || location.city || value.district || '';
      const stateName =
        matchedState?.name ||
        matchedDistrict?.stateName ||
        location.state ||
        value.state ||
        '';

      onChange({
        ...value,
        type: value.type || 'home',
        address: location.address || value.address || '',
        city: districtName || value.city || '',
        district: districtName,
        state: stateName,
        stateId: matchedState?._id || matchedDistrict?.stateId || value.stateId || '',
        districtId: matchedDistrict?._id || '',
        pincode: nextPincode || matchedDistrict?.pincode || value.pincode || '',
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to detect location');
    } finally {
      setDetecting(false);
    }
  };

  const hasCoords =
    typeof value.latitude === 'number' && typeof value.longitude === 'number';

  return (
    <View style={styles.wrap}>
      {showUseCurrentLocation && editable ? (
        <TouchableOpacity
          style={[styles.currentBtn, {backgroundColor: theme.primary}]}
          onPress={() => void useCurrentLocation()}
          disabled={detecting}
          activeOpacity={0.85}>
          {detecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Icon name="my-location" size={18} color="#fff" />
          )}
          <Text style={styles.currentBtnText}>
            {labels.useCurrent || 'Use current location'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {hasCoords ? (
        <View style={[styles.coordsRow, {borderColor: theme.border}]}>
          <Icon name="place" size={16} color={theme.primary} />
          <Text style={[styles.coordsText, {color: theme.textSecondary}]}>
            {labels.currentLocation || 'Current location'}:{' '}
            {value.latitude!.toFixed(5)}, {value.longitude!.toFixed(5)}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.label, {color: theme.textSecondary}]}>
        {labels.address || 'Address'}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.address || ''}
        onChangeText={address => patch({address})}
        placeholder="House / street / area"
        placeholderTextColor={theme.textSecondary}
        editable={editable}
        multiline
      />

      <Text style={[styles.label, {color: theme.textSecondary}]}>
        {labels.landmark || 'Landmark (optional)'}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.landmark || ''}
        onChangeText={landmark => patch({landmark})}
        placeholder="Near park, temple, etc."
        placeholderTextColor={theme.textSecondary}
        editable={editable}
      />

      {loadingMeta ? (
        <ActivityIndicator style={{marginVertical: 8}} color={theme.primary} />
      ) : (
        <>
          <Text style={[styles.label, {color: theme.textSecondary}]}>
            {labels.state || 'State'}
          </Text>
          <Select
            options={stateOptions}
            value={value.stateId || ''}
            placeholder="Select state"
            disabled={!editable}
            onChange={onStateChange}
          />

          <Text style={[styles.label, {color: theme.textSecondary}]}>
            {labels.district || 'District'}
          </Text>
          <Select
            options={districtOptions}
            value={value.districtId || ''}
            placeholder="Select district"
            disabled={!editable || !value.stateId}
            onChange={onDistrictChange}
          />
        </>
      )}

      <Text style={[styles.label, {color: theme.textSecondary}]}>
        {labels.pincode || 'Pincode'}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.card,
          },
        ]}
        value={value.pincode || ''}
        onChangeText={pincode =>
          patch({pincode: pincode.replace(/\D/g, '').slice(0, 6)})
        }
        placeholder="6-digit pincode"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 4,
  },
  currentBtnText: {fontSize: 14, fontWeight: '700', color: '#fff'},
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  coordsText: {fontSize: 12, flex: 1},
});

export default ProviderServiceAddressFields;
