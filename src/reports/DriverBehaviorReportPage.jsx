import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableRow, TableBody, TableCell, Typography,
  TextField, FormControl, // Added TextField and FormControl for Driver ID filter
} from '@mui/material';
import { formatTime } from '../common/util/formatter'; // Needed for formatting dates/times
import ReportFilter from './components/ReportFilter'; // Essential for device/group/date/driver selection
// import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper'; // Keep for error handling
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport'; // Keep if scheduling is desired

// Define the fixed columns for the Driver Behavior Report based on the backend response
// Key: matches the data field from the backend DriverBehaviorReport object
// labelKey: translation key for the column header (using plain labels for now)
const fixedColumns = [
  { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Device Name' },
  { key: 'driverName', labelKey: 'reportDriverName', label: 'Driver Name' },
  // { key: 'tripDate', labelKey: 'reportTripDate', label: 'Trip Date' }, // Often redundant with filter range
  { key: 'harshAccelerationCount', labelKey: 'reportHarshAcceleration', label: 'Harsh Accel' },
  { key: 'harshBrakingCount', labelKey: 'reportHarshBraking', label: 'Harsh Brake' },
  { key: 'overspeedCount', labelKey: 'reportOverspeed', label: 'Overspeed' },
  { key: 'sharpTurnCount', labelKey: 'reportSharpTurn', label: 'Sharp Turn' },
  { key: 'idleMinutes', labelKey: 'reportIdleMinutes', label: 'Idle (min)' },
  // { key: 'accCycleCount', labelKey: 'reportAccCycles', label: 'ACC Cycles' }, // Less common metric
  { key: 'lastEventType', labelKey: 'reportLastEventType', label: 'Last Event Type' },
  { key: 'lastEventTime', labelKey: 'reportLastEventTime', label: 'Last Event Time' },
  // { key: 'lastEventLatitude', labelKey: 'reportLastEventLat', label: 'Last Event Lat' }, // Maybe for a detailed view
  // { key: 'lastEventLongitude', labelKey: 'reportLastEventLon', label: 'Last Event Lon' },
  // { key: 'speedAtEvent', labelKey: 'reportSpeedAtEvent', label: 'Speed at Event' },
  // { key: 'speedLimit', labelKey: 'reportSpeedLimit', label: 'Speed Limit' },
  { key: 'severity', labelKey: 'reportSeverity', label: 'Severity' }, // Useful summary
];

const DriverBehaviorReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  // const t = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState(''); // State for the optional driver ID filter

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, from, to, type }) => {
    // Get deviceIds, groupIds, from, to from ReportFilter callback
    // Type indicates if it's 'generate', 'export', or 'mail'

    // Construct query parameters
    const params = new URLSearchParams();
    deviceIds.forEach((id) => params.append('deviceId', id));

    // Backend expects a single groupId (Long), not a list.
    // Take the first one if provided by the filter.
    // A better solution might involve configuring ReportFilter for single group selection
    // or updating the backend API.
    if (groupIds.length > 0) {
      params.append('groupId', groupIds[0]);
    }

    // Add driverId if provided
    if (driverId) {
      params.append('driverId', driverId);
    }

    // Add date range (assuming JAX-RS backend handles ISO string parsing)
    // Based on previous discussion, ensure ReportFilter provides both 'from' and 'to'
    if (from) {
      params.append('from', from);
    }
    if (to) {
      params.append('to', to);
    }

    const query = params.toString();
    const reportPath = '/api/reports/behavior'; // Base path for behavior reports

    if (type === 'export') {
      // Assuming export endpoint follows convention: /api/reports/behavior/xlsx
      window.location.assign(`${reportPath}/xlsx?${query}`);
    } else if (type === 'mail') {
      // Assuming mail endpoint follows convention: /api/reports/behavior/mail
      const response = await fetch(`${reportPath}/mail?${query}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
      // Optionally show success message
    } else {
      // 'generate' report data
      setLoading(true);
      try {
        const response = await fetch(`${reportPath}?${query}`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          setItems(await response.json());
        } else {
          // Check for specific backend error messages if needed
          const errorText = await response.text();
          console.error('Backend Error:', errorText); // Log the raw error
          // Try to parse JSON error if backend sends structured errors
          try {
            const errorJson = JSON.parse(errorText);
            throw Error(errorJson.message || errorText);
          } catch (parseError) {
            throw Error(errorText); // Throw original text if not JSON
          }
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'behavior'; // Set report type for scheduler

    // Include driverId in attributes if the scheduler needs it
    const attributes = { ...report.attributes };
    if (driverId) {
      attributes.driverId = driverId;
    }
    // Handle single groupId for scheduler if necessary, similar to handleSubmit
    if (groupIds.length > 0) {
      attributes.groupId = groupIds[0]; // Assuming scheduler might also expect single ID
    }

    report.attributes = attributes;

    // Pass deviceIds and potentially the single groupId to scheduleReport
    // Adjust scheduleReport function signature or logic if it expects single groupId
    const error = await scheduleReport(deviceIds, groupIds.length > 0 ? [groupIds[0]] : [], report);

    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  // Format values for the driver behavior report table
  const formatValue = (item, key) => {
    const value = item[key];

    // Handle null or undefined values first
    if (value === null || typeof value === 'undefined') {
      return '-'; // Or return empty string ''
    }

    switch (key) {
      case 'tripDate': // If you decide to include it
      case 'lastEventTime':
        // Use formatTime, assuming it handles ISO strings with offsets correctly
        return formatTime(value, 'dateTime'); // Or 'date' or 'time' as needed
      case 'harshAccelerationCount':
      case 'harshBrakingCount':
      case 'overspeedCount':
      case 'sharpTurnCount':
      case 'accCycleCount': // If included
        // Format integers
        return Number(value).toLocaleString();
      case 'idleMinutes':
      case 'speedAtEvent': // If included
      case 'speedLimit': // If included
        // Format numbers potentially with decimals
        return Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case 'deviceName':
      case 'driverName':
      case 'lastEventType':
      case 'severity':
        return value; // Already strings or suitable representation
      case 'lastEventLatitude': // If included
      case 'lastEventLongitude': // If included
        // Format coordinates
        return Number(value).toFixed(5); // Example: 5 decimal places
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportDriverBehavior']}>
      <div className={classes.header}>
        {/*
          Configure ReportFilter:
          - handleSubmit: function to call when 'Show' is clicked
          - handleSchedule: function for scheduling
          - multiDevice: Allow selecting multiple devices
          - includeGroups: Allow selecting groups (Note: Backend takes single ID)
          - loading: Pass loading state
          - Date range is enabled by default
        */}
        <ReportFilter
          handleSubmit={handleSubmit}
          handleSchedule={handleSchedule}
          multiDevice
          includeGroups // Be mindful that only the first selected group ID will be used
          loading={loading}
          // No ignoreDateRange or ignorePeriod needed
        >
          {/* Add the custom filter specific to this report: Driver ID */}
          {/* A dropdown fetching drivers would be more user-friendly */}
          <div className={classes.filterItem}>
            <FormControl fullWidth>
              <TextField
                // label={t('reportDriver')} // Translation key needed
                label="Driver ID (Optional)"
                type="number" // Assuming driver IDs are numeric
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                size="small"
                InputProps={{ inputProps: { min: 1 } }} // Basic validation if IDs are positive
              />
            </FormControl>
          </div>
        </ReportFilter>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            {/* Render fixed columns */}
            {fixedColumns.map((column) => (
              // <TableCell key={column.key}>{t(column.labelKey)}</TableCell>
              <TableCell key={column.key}>{column.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
            // Show shimmer placeholder during loading
            <TableShimmer columns={fixedColumns.length} />
          )}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={fixedColumns.length} align="center">
                {/* <Typography>{t('sharedNoData')}</Typography> */}
                <Typography>No data</Typography>
              </TableCell>
            </TableRow>
          )}

          {!loading && items.length > 0 && (
            items.map((item, index) => (
              // Use deviceId + index as key in case multiple entries exist for the same device (unlikely based on sample)
              <TableRow key={`${item.deviceId}-${index}`}>
                {fixedColumns.map((column) => (
                  <TableCell key={column.key}>
                    {formatValue(item, column.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PageLayout>
  );
};

export default DriverBehaviorReportPage;
