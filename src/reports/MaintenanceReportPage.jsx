// src/main/webapp/reports/MaintenanceReportPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableRow, TableBody, TableCell, TextField, Typography,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import { formatTime } from '../common/util/formatter'; // Keep for formatting dates
import ReportFilter from './components/ReportFilter'; // Essential for device/group selection
// import { useTranslation } from '../common/components/LocalizationProvider'; // Uncomment if using translations
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper'; // Keep for error handling
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport'; // Keep for scheduling functionality

// Define the fixed columns for the Maintenance Report based on requirements
// Key: matches the data field from the backend MaintenanceReportItem object
// labelKey: translation key for the column header (using placeholder labels for now)
const fixedColumns = [
  { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Vehicle Name' },
  { key: 'groupName', labelKey: 'groupDialogName', label: 'Group' },
  { key: 'maintenanceTask', labelKey: 'reportMaintenanceTask', label: 'Maintenance Task' },
  { key: 'scheduledDate', labelKey: 'reportScheduledDate', label: 'Scheduled Date' },
  { key: 'scheduledMileage', labelKey: 'reportScheduledMileage', label: 'Scheduled Mileage' },
  { key: 'currentMileage', labelKey: 'reportCurrentMileage', label: 'Current Mileage' },
  { key: 'status', labelKey: 'reportStatus', label: 'Status' },
  { key: 'daysRemaining', labelKey: 'reportDaysRemaining', label: 'Days Remaining' },
  { key: 'mileageRemaining', labelKey: 'reportMileageRemaining', label: 'Mileage Remaining' },
];

const MaintenanceReportPage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  // const t = useTranslation(); // Uncomment if using translations

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // State for maintenance-specific filters
  const [dueWithinDays, setDueWithinDays] = useState(30); // Default: due within 30 days
  const [dueWithinKm, setDueWithinKm] = useState(1000); // Default: due within 1000 km
  const [statusFilter, setStatusFilter] = useState(''); // Default: All statuses ('', 'Pending', 'Overdue')

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, type }) => {
    // Construct query parameters for maintenance report
    const params = new URLSearchParams();
    deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
    groupIds.forEach((groupId) => params.append('groupId', groupId));

    // Add maintenance-specific filters if they have valid values
    if (dueWithinDays !== null && dueWithinDays >= 0) {
      params.append('dueWithinDays', dueWithinDays);
    }
    if (dueWithinKm !== null && dueWithinKm >= 0) {
      params.append('dueWithinKm', dueWithinKm);
    }
    if (statusFilter && statusFilter !== '') { // Only add if not empty
      params.append('status', statusFilter);
    }

    const query = params.toString();
    const reportPath = '/api/reports/maintenance'; // Use maintenance endpoint

    if (type === 'export') {
      window.location.assign(`${reportPath}/xlsx?${query}`);
    } else if (type === 'mail') {
      const response = await fetch(`${reportPath}/mail?${query}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
      // Optionally show a success message for mail sending
      // e.g., showSnackbar(t('reportMailSent'), 'success');
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
    report.type = 'maintenance'; // Set report type for scheduler
    // Add maintenance-specific filter values to attributes
    report.attributes = {
      ...report.attributes,
      dueWithinDays,
      dueWithinKm,
      status: statusFilter,
    };
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  // Format values for the maintenance report table
  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'scheduledDate':
        return value ? formatTime(value, 'date') : ''; // Format as date
      case 'scheduledMileage':
      case 'currentMileage':
        // Format as number with locale string, handle null/undefined
        return value !== null && value !== undefined ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '';
      case 'deviceName':
      case 'groupName':
      case 'maintenanceTask':
      case 'status':
      case 'daysRemaining':
      case 'mileageRemaining':
        return value || ''; // Return value or empty string for null/undefined
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportMaintenance']}>
      {/* Use 'reportMaintenance' as the breadcrumb key */}
      <div className={classes.header}>
        <ReportFilter
          handleSubmit={handleSubmit}
          handleSchedule={handleSchedule} // Pass schedule handler
          multiDevice
          includeGroups
          loading={loading}
          ignoreDateRange // Hide From/To date pickers
          ignorePeriod // Hide Period dropdown
        >
          {/* Add the custom filters specific to the Maintenance report */}
          <div className={classes.filterItem}>
            <FormControl fullWidth size="small">
              <TextField
                // label={t('reportDueWithinDays')} // Translation key needed
                label="Due within (days)"
                type="number"
                value={dueWithinDays}
                onChange={(e) => setDueWithinDays(parseInt(e.target.value, 10) || 0)}
                size="small"
                InputProps={{ inputProps: { min: 0 } }} // Prevent negative numbers
              />
            </FormControl>
          </div>
          <div className={classes.filterItem}>
            <FormControl fullWidth size="small">
              <TextField
                // label={t('reportDueWithinKm')} // Translation key needed
                label="Due within (km)" // Assuming km, adjust label if needed
                type="number"
                value={dueWithinKm}
                onChange={(e) => setDueWithinKm(parseFloat(e.target.value) || 0)}
                size="small"
                InputProps={{ inputProps: { min: 0, step: 'any' } }} // Allow decimals if needed
              />
            </FormControl>
          </div>
          <div className={classes.filterItem}>
            <FormControl fullWidth size="small">
              {/* <InputLabel>{t('reportStatus')}</InputLabel> */}
              <InputLabel>Status</InputLabel>
              <Select
                label="Status" // Match InputLabel
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
              >
                {/* <MenuItem value="">{t('reportAll')}</MenuItem> */}
                {/* <MenuItem value="Pending">{t('reportPending')}</MenuItem> */}
                {/* <MenuItem value="Overdue">{t('reportOverdue')}</MenuItem> */}
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </div>
        </ReportFilter>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            {/* Render fixed columns */}
            {fixedColumns.map((column) => (
              // <TableCell key={column.key}>{t(column.labelKey)}</TableCell> // Use translation if available
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
                <Typography>No data available for the selected criteria.</Typography>
              </TableCell>
            </TableRow>
          )}

          {!loading && items.length > 0 && (
            items.map((item) => (
              // Use deviceId as the key for each row
              <TableRow key={item.deviceId}>
                {fixedColumns.map((column) => (
                  <TableCell key={column.key}>
                    {formatValue(item, column.key) || '-'}
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

export default MaintenanceReportPage;
