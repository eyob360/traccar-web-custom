import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { useCatch } from '../reactHelper';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';

import {
  GoogleMap,
  LoadScript,
  DirectionsRenderer,
  Autocomplete,
  Marker,
  Polyline,
  TrafficLayer,
} from '@react-google-maps/api';
import axios from 'axios';

const containerStyle = {
  width: '100%',
  height: '500px',
};

const center = {
  lat: 9.03,
  lng: 38.74,
};

const OptimalRoutePage = () => {
  const [loading, setLoading] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [routeType, setRouteType] = useState('fastest');
  const [routeData, setRouteData] = useState([]);
  const [directions, setDirections] = useState([]);
  const [mapType, setMapType] = useState('roadmap');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devicePosition, setDevicePosition] = useState({
    lat: 9.03,
    lng: 38.74,
  });
  const originAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);

  const backend_url = 'http://localhost:3000';

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await axios.get(`${backend_url}/api/devices`);
        const deviceData = res.data; // Ensure we have the correct response structure
        setDevices(deviceData); // Store devices in the state

        if (deviceData.length > 0) {
          setSelectedDeviceId(deviceData[0].id); // Set the first device's ID
          setSelectedDevice(deviceData[0]); // Store the first device as the selected device
          setDevicePosition(deviceData[0].position); // Set the device's position
        }
      } catch (error) {
        console.error('Failed to fetch devices', error);
      }
    };

    fetchDevices();
  }, []);

  const calculateRoutes = async ({ startLocation, endLocation, routeType }) => {
    if (!startLocation || !endLocation || !isLoaded) return;

    const baseUrl = '/api/route';
    const deviceId = selectedDeviceId;

    const params = new URLSearchParams();
    params.append('deviceId', deviceId);
    params.append('start', startLocation);
    params.append('end', endLocation);

    setLoading(true);

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || errorText);
      } catch {
        throw new Error(errorText);
      }
    }

    const data = await response.json();

    console.log('API Route Data:', data);

    const enrichedRoutes = data.map((route) => {
      const distanceKm = route.distanceKm;
      const durationMin = route.durationMin;

      // Use the fuelConsumptionRate from the selected device
      const estimatedFuel = selectedDevice
        ? ((distanceKm * selectedDevice.fuelConsumptionRate) / 100).toFixed(2)
        : 'N/A';

      const polylinePath = google.maps.geometry.encoding.decodePath(
        route.polyline
      );

      return {
        type: route.routeType,
        result: route,
        distance: distanceKm.toFixed(1),
        time: durationMin.toFixed(1),
        fuel: estimatedFuel,
        polylinePath,
      };
    });

    console.log('Enriched Routes:', enrichedRoutes);

    setDirections(enrichedRoutes);
    setRouteData(enrichedRoutes);
    setLoading(false);
  };

  const onStartLocationLoad = (autocomplete) => {
    originAutocompleteRef.current = autocomplete;
  };

  const onDestinationLocationLoad = (autocomplete) => {
    destinationAutocompleteRef.current = autocomplete;
  };

  const extractPlaceName = (place) => {
    return place.name || place.formatted_address || place.vicinity || '';
  };

  const getMarkerIcon = (status) => {
    if (status === 'online') {
      return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    } else if (status === 'offline') {
      return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
    return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'; // Default icon
  };

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={['Plan Route', 'Optimal Route']}
    >
      <Box display="flex" gap={2} flexWrap="wrap" p={2}>
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['places', 'geometry']}
          onLoad={() => setIsLoaded(true)}
        >
          {isLoaded && (
            <>
              <Autocomplete
                onLoad={onStartLocationLoad}
                onPlaceChanged={() => {
                  const place = originAutocompleteRef.current.getPlace();
                  if (place) setStartLocation(extractPlaceName(place));
                }}
              >
                <TextField
                  label="Start Location"
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Autocomplete>

              <Autocomplete
                onLoad={onDestinationLocationLoad}
                onPlaceChanged={() => {
                  const place = destinationAutocompleteRef.current.getPlace();
                  if (place) setEndLocation(extractPlaceName(place));
                }}
              >
                <TextField
                  label="Destination Location"
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Autocomplete>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Device</InputLabel>
                <Select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setSelectedDeviceId(selectedId);
                    const foundDevice = devices.find(
                      (d) => d.id === selectedId
                    );
                    setSelectedDevice(foundDevice || null);
                    setDevicePosition(
                      foundDevice?.position || { lat: 9.03, lng: 38.74 }
                    ); // Update device position
                  }}
                  label="Device"
                >
                  {devices.map((device) => (
                    <MenuItem key={device.id} value={device.id}>
                      {device.name || `Device ${device.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Route Type</InputLabel>
                <Select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value)}
                  label="Route Type"
                >
                  <MenuItem value="fastest">Fastest</MenuItem>
                  <MenuItem value="shortest">Shortest</MenuItem>
                  <MenuItem value="fuel">Fuel-Optimal</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Map Type</InputLabel>
                <Select
                  value={mapType}
                  onChange={(e) => setMapType(e.target.value)}
                  label="Map Type"
                >
                  <MenuItem value="roadmap">Standard</MenuItem>
                  <MenuItem value="satellite">Satellite</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                onClick={() => setShowTraffic(!showTraffic)}
              >
                {showTraffic ? 'Hide Traffic' : 'Show Traffic'}
              </Button>

              <Button
                variant="contained"
                onClick={() =>
                  calculateRoutes({
                    startLocation,
                    endLocation,
                    routeType,
                  })
                }
                disabled={
                  loading ||
                  !startLocation ||
                  !endLocation ||
                  !isLoaded ||
                  !selectedDeviceId
                }
              >
                {loading ? 'Loading...' : 'Plan Route'}
              </Button>
            </>
          )}
        </LoadScript>
      </Box>

      <Box p={2}>
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={13}
            mapTypeId={mapType}
          >
            {directions.map((route, index) => (
              <Polyline
                key={index}
                path={route.polylinePath}
                options={{
                  strokeColor:
                    route.type === 'fastest'
                      ? '#007FFF'
                      : route.type === 'shortest'
                      ? '#009900'
                      : '#FF0000',
                  strokeWeight: 5,
                }}
              />
            ))}
            {selectedDevice && (
              <Marker
                position={devicePosition}
                icon={getMarkerIcon(selectedDevice.status)}
                title={selectedDevice.name}
              />
            )}
            {showTraffic && <TrafficLayer />}
          </GoogleMap>
        )}
      </Box>
      <Typography variant="h6">Route Summary</Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>Destination</TableCell>
            <TableCell>Route Type</TableCell>
            <TableCell>Distance (km)</TableCell>
            <TableCell>Estimated Time (min)</TableCell>
            <TableCell>Estimated Fuel (L)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {routeData.map((route, index) => (
            <TableRow key={index}>
              <TableCell>{selectedDevice?.name}</TableCell>
              <TableCell>{startLocation}</TableCell>
              <TableCell>{endLocation}</TableCell>
              <TableCell>
                {{
                  fastest: 'Fastest',
                  shortest: 'Shortest',
                  fuel: 'Fuel-Optimal',
                }[route.type] || route.type}
              </TableCell>
              <TableCell>{route.distance}</TableCell>
              <TableCell>{route.time}</TableCell>
              <TableCell>{route.fuel}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageLayout>
  );
};

export default OptimalRoutePage;
