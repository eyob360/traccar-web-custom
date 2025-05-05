import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableRow, TableBody, TableCell, Typography,
} from '@mui/material';
// Removed unused TextField and FormControl
// formatTime might not be needed directly in the table, but keep if used elsewhere
// import { formatTime } from '../common/util/formatter';
import ReportFilter from './components/ReportFilter'; // Essential for device/group/date selection
// import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper'; // Keep for error handling
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport'; // Keep if scheduling is desired

// Define the fixed columns for the Fuel Report based on the backend FuelUsageReport model
// Key: matches the data field from the backend FuelUsageReport object
// labelKey: translation key for the column header (using plain labels for now)
const fixedColumns = [
  { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Device Name' },
  { key: 'groupName', labelKey: 'groupDialogName', label: 'Group' },
  { key: 'totalMileage', labelKey: 'reportDistance', label: 'Distance (km)' }, // Assuming km
  { key: 'averageSpeed', labelKey: 'reportAverageSpeed', label: 'Avg Speed (km/h)' }, // Assuming km/h
  { key: 'totalFuelUsed', labelKey: 'reportFuelUsed', label: 'Fuel Used (L)' }, // Assuming Liters
  { key: 'avgFuelPer100Km', labelKey: 'reportFuelAvg', label: 'Avg Fuel (L/100km)' }, // Assuming L/100km
  { key: 'fuelRefillEvents', labelKey: 'reportRefillEvents', label: 'Refill Events' },
  { key: 'fuelRefilled', labelKey: 'reportFuelRefilled', label: 'Fuel Refilled (L)' }, // Assuming Liters
  { key: 'fuelTheftEvents', labelKey: 'reportTheftEvents', label: 'Theft Events' },
  { key: 'fuelStolen', labelKey: 'reportFuelStolen', label: 'Fuel Stolen (L)' }, // Assuming Liters
];

const FuelReportPage = () => {
  const navigate = useNavigate(); // Keep for scheduling navigation
  const classes = useReportStyles();
  // const t = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // Removed expiryWithinDays state - Fuel report uses date range from ReportFilter

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, from, to, type }) => {
    // Get deviceIds, groupIds, from, to from ReportFilter callback
    // Type indicates if it's 'generate', 'export', or 'mail'

    // Construct query parameters: device/group IDs and date range
    const params = new URLSearchParams();
    deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
    groupIds.forEach((groupId) => params.append('groupId', groupId));
    // Backend expects ISO format: yyyy-MM-dd'T'HH:mm:ss'Z'
    if (from) {
      console.log('from', from);
      console.log('typeof from', typeof from);
      params.append('from', new Date(from).toISOString());
    }
    if (to) {
      console.log('to', to);
      params.append('to', new Date(to).toISOString());
    }

    const query = params.toString();
    const reportPath = '/api/reports/fuel'; // Base path for fuel reports

    if (type === 'export') {
      // Assuming export endpoint follows convention: /api/reports/fuel/xlsx
      window.location.assign(`${reportPath}/xlsx?${query}`);
    } else if (type === 'mail') {
      // Assuming mail endpoint follows convention: /api/reports/fuel/mail
      const response = await fetch(`${reportPath}/mail?${query}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
      // Optionally show a success message for mail sending
      // e.g., using a snackbar notification
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
          throw Error(await response.text());
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'fuel'; // Set report type for scheduler
    // Date range (from/to) is typically handled by the scheduler's own mechanism
    // or passed within the 'report' object if needed, remove specific attribute logic
    // report.attributes = { ...report.attributes }; // No extra attributes needed here
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  // Format values for the fuel report table
  const formatValue = (item, key) => {
    const value = item[key];

    // Handle null or undefined values first
    if (value === null || typeof value === 'undefined') {
      return '-'; // Or return empty string ''
    }

    switch (key) {
      case 'distance':
      case 'averageSpeed':
      case 'totalFuelUsed':
      case 'fuelRefilled':
      case 'fuelStolen':
      case 'avgFuelPer100Km':
        // Format numbers with 2 decimal places and locale string
        return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'fuelRefillEvents':
      case 'fuelTheftEvents':
        // Format integers
        return Number(value).toLocaleString();
      case 'deviceName':
      case 'groupName':
        return value; // Already strings
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportFuel']}>
      <div className={classes.header}>
        {/*
          Configure ReportFilter:
          - handleSubmit: function to call when 'Show' is clicked
          - handleSchedule: function for scheduling
          - multiDevice: Allow selecting multiple devices
          - includeGroups: Allow selecting groups
          - loading: Pass loading state
          - Date range is enabled by default (do NOT use ignoreDateRange/ignorePeriod)
        */}
        <ReportFilter
          handleSubmit={handleSubmit}
          handleSchedule={handleSchedule}
          multiDevice
          includeGroups
          loading={loading}
          // No ignoreDateRange or ignorePeriod needed
        >
          {/* No custom filter inputs needed for this report */}
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
            items.map((item) => (
              // Use device ID (item.deviceId) as the key for each row
              <TableRow key={item.deviceId}>
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

export default FuelReportPage;
