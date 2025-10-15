import React, { useState } from 'react';
import { Paper, Title, Text, Group, Select, Stack } from '@mantine/core';
import { IconGlobe, IconSatellite, IconRadar } from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { DesignSolution } from '../types/models';
import { calculateGroundTrack, calculateCurrentSatellitePosition } from '../utils/flightDynamics';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VisualizationTabProps {
  missionId: string;
  solutions: DesignSolution[];
}

const VisualizationTab: React.FC<VisualizationTabProps> = ({ missionId, solutions }) => {
  const [selectedSolution, setSelectedSolution] = useState<string>('');

  const splitTrackAtDateline = (trackPoints: { latitude: number; longitude: number }[]) => {
    const segments: LatLngExpression[][] = [];
    let currentSegment: LatLngExpression[] = [];
    
    for (let i = 0; i < trackPoints.length; i++) {
      const point = trackPoints[i];
      const prevPoint = trackPoints[i - 1];
      
      // Check for dateline crossing (longitude jump > 180°)
      if (prevPoint && Math.abs(point.longitude - prevPoint.longitude) > 180) {
        // End current segment
        if (currentSegment.length > 0) {
          segments.push([...currentSegment]);
        }
        // Start new segment
        currentSegment = [[point.latitude, point.longitude]];
      } else {
        currentSegment.push([point.latitude, point.longitude]);
      }
    }
    
    // Add final segment
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    
    return segments;
  };

  const getGroundTracksForSolution = (solution: DesignSolution) => {
    if (!solution.orbit) return [];
    
    return solution.spacecraft.map((spacecraft, index) => {
      const raanOffset = (360 / solution.spacecraft.length) * index;
      const phaseOffset = (360 / solution.spacecraft.length) * index;
      
      const trackPoints = calculateGroundTrack(
        solution.orbit!.altitude,
        solution.orbit!.inclination,
        solution.orbit!.eccentricity || 0,
        raanOffset,
        0,
        phaseOffset,
        120,
        2
      );
      
      const trackSegments = splitTrackAtDateline(trackPoints);
      
      return {
        spacecraft,
        trackSegments,
        currentPosition: trackPoints[0] ? { latitude: trackPoints[0].latitude, longitude: trackPoints[0].longitude } : null,
        color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
      };
    });
  };

  const groundStationIcon = L.divIcon({
    html: '<div style="background: #ff6d00; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><div style="width: 6px; height: 6px; background: white; border-radius: 50%; margin: 4px auto; margin-top: 7px;"></div></div>',
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const satelliteIcon = L.divIcon({
    html: '<div style="background: #11998e; width: 16px; height: 16px; transform: rotate(45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative;"><div style="position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border: 1px solid #11998e; transform: rotate(45deg);"></div></div>',
    className: 'custom-div-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const renderMap = (solution: DesignSolution) => {
    const satelliteTracks = getGroundTracksForSolution(solution);
    const center: LatLngExpression = [20, 0];

    return (
      <Paper className="glass-card" p="md" radius="md">
        <Title order={5} c="white" mb="md">Mission Ground Track & Coverage</Title>
        <Group mb="sm" gap="md">
          <Group gap="xs">
            <div style={{ width: '16px', height: '16px', background: '#11998e', transform: 'rotate(45deg)', border: '2px solid white' }}></div>
            <Text size="xs" c="white">Satellites</Text>
          </Group>
          <Group gap="xs">
            <div style={{ width: '16px', height: '16px', background: '#ff6d00', borderRadius: '50%', border: '2px solid white' }}></div>
            <Text size="xs" c="white">Ground Stations</Text>
          </Group>
        </Group>
        <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={center}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Ground Stations */}
            {solution.groundStations.map((station, idx) => (
              <Marker
                key={idx}
                position={[station.latitude, station.longitude]}
                icon={groundStationIcon}
              >
                <Popup>
                  <div>
                    <strong>{station.name}</strong><br />
                    Location: {station.location}<br />
                    Coordinates: {station.latitude.toFixed(2)}°, {station.longitude.toFixed(2)}°<br />
                    Max Data Rate: {station.maxDataRate} Mbps<br />
                    Monthly Fee: ${station.monthlyFee}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Multiple Satellite Tracks */}
            {satelliteTracks.map((satTrack, index) => (
              <React.Fragment key={index}>
                {/* Render each track segment separately */}
                {satTrack.trackSegments.map((segment, segIndex) => (
                  <Polyline
                    key={`${index}-${segIndex}`}
                    positions={segment}
                    color={satTrack.color}
                    weight={3}
                    opacity={0.8}
                  />
                ))}
                {satTrack.currentPosition && (
                  <Marker 
                    position={[satTrack.currentPosition.latitude, satTrack.currentPosition.longitude]} 
                    icon={satelliteIcon}
                  >
                    <Popup>
                      <div>
                        <strong>{satTrack.spacecraft.name}</strong><br />
                        Position: {satTrack.currentPosition.latitude.toFixed(2)}°, {satTrack.currentPosition.longitude.toFixed(2)}°<br />
                        Altitude: {solution.orbit?.altitude} km<br />
                        Mass: {satTrack.spacecraft.dryMass} kg<br />
                        Components: {satTrack.spacecraft.components.length}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
        
        {/* Mission Summary */}
        <Group mt="md" justify="space-between">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">Mission Coverage</Text>
            <Text size="xs" c="white">{solution.spacecraft.length} Satellites</Text>
            <Text size="xs" c="white">{solution.groundStations.length} Ground Stations</Text>
            {solution.spacecraft.length > 1 && (
              <Text size="xs" c="cyan">Constellation</Text>
            )}
          </Stack>
          {solution.orbit && (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">Orbital Parameters</Text>
              <Text size="xs" c="white">Alt: {solution.orbit.altitude} km</Text>
              <Text size="xs" c="white">Inc: {solution.orbit.inclination}°</Text>
              <Text size="xs" c="white">Period: {solution.orbit.period} min</Text>
            </Stack>
          )}
        </Group>
      </Paper>
    );
  };

  const solutionOptions = solutions.map(solution => ({
    value: solution.id,
    label: solution.name
  }));

  const selectedSolutionData = solutions.find(s => s.id === selectedSolution);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group>
          <IconGlobe size={24} color="#11998e" />
          <Title order={3} c="white">Mission Visualization</Title>
        </Group>
        
        {solutions.length > 0 && (
          <Select
            placeholder="Select a design solution"
            data={solutionOptions}
            value={selectedSolution}
            onChange={(value) => setSelectedSolution(value || '')}
            style={{ minWidth: 200 }}
          />
        )}
      </Group>

      {solutions.length === 0 ? (
        <Paper className="glass-card" p="xl" radius="md" ta="center">
          <IconSatellite size={48} color="#666" style={{ margin: '0 auto 16px' }} />
          <Title order={4} c="dimmed" mb="sm">No Design Solutions Available</Title>
          <Text c="dimmed">
            Create design solutions in the Solutions tab to visualize spacecraft orbits and ground stations.
          </Text>
        </Paper>
      ) : !selectedSolution ? (
        <Paper className="glass-card" p="xl" radius="md" ta="center">
          <IconRadar size={48} color="#666" style={{ margin: '0 auto 16px' }} />
          <Title order={4} c="dimmed" mb="sm">Select a Solution to Visualize</Title>
          <Text c="dimmed">
            Choose a design solution from the dropdown above to see the mission on the map.
          </Text>
        </Paper>
      ) : selectedSolutionData ? (
        renderMap(selectedSolutionData)
      ) : null}
    </Stack>
  );
};

export default VisualizationTab;