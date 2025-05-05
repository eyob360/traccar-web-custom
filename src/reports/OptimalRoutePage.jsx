// src/main/webapp/reports/MaintenanceReportPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableRow, TableBody, TableCell, TextField, Typography,
  FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
// Removed: formatTime import as it's no longer needed for this report
import ReportFilter from './components/ReportFilter';
// import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport';

// Define the fixed columns - REMOVED scheduledDate and daysRemaining
const fixedColumns = [
  { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Vehicle Name' },
  { key: 'groupName', labelKey: 'groupDialogName', label: 'Group' },
  { key: 'maintenanceTask', labelKey: 'reportMaintenanceTask', label: 'Maintenance Task' },
  { key: 'scheduledMileage', labelKey: 'reportScheduledMileage', label: 'Scheduled Mileage' },
  { key: 'currentMileage', labelKey: 'reportCurrentMileage', label: 'Current Mileage' },
  { key: 'status', labelKey: 'reportStatus', label: 'Status' },
  { key: 'mileageRemaining', labelKey: 'reportMileageRemaining', label: 'Mileage Remaining' },
  // Consider adding 'Scheduled Hours', 'Current Hours', 'Hours Remaining' if needed
];

const OptimalRoutePage = () => {
  const navigate = useNavigate();
  const classes = useReportStyles();
  // const t = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // State for maintenance-specific filters - REMOVED dueWithinDays
  const [dueWithinKm, setDueWithinKm] = useState(1000); // Default: due within 1000 km
  const [statusFilter, setStatusFilter] = useState(''); // Default: All statuses ('', 'Pending', 'Overdue')

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, type }) => {
    const params = new URLSearchParams();
    deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
    groupIds.forEach((groupId) => params.append('groupId', groupId));

    // Add maintenance-specific filters - REMOVED dueWithinDays parameter
    if (dueWithinKm !== null && dueWithinKm >= 0) {
      params.append('dueWithinKm', dueWithinKm);
    }
    if (statusFilter && statusFilter !== '') {
      params.append('status', statusFilter);
    }

    const query = params.toString();
    const reportPath = '/api/reports/maintenance';

    if (type === 'export') {
      window.location.assign(`${reportPath}/xlsx?${query}`);
    } else if (type === 'mail') {
      const response = await fetch(`${reportPath}/mail?${query}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
      // Optionally show success message
    } else {
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
    report.type = 'maintenance';
    // Add maintenance-specific filter values to attributes - REMOVED dueWithinDays
    report.attributes = {
      ...report.attributes,
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

  // Format values for the maintenance report table - REMOVED cases for date/days
  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'scheduledMileage':
      case 'currentMileage':
        return value !== null && value !== undefined ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '';
      case 'deviceName':
      case 'groupName':
      case 'maintenanceTask':
      case 'status':
      case 'mileageRemaining':
        // Add cases for hours if those columns are added
        return value || '';
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportMaintenance']}>
      <div className={classes.header}>
        <ReportFilter
          handleSubmit={handleSubmit}
          handleSchedule={handleSchedule}
          multiDevice
          includeGroups
          loading={loading}
          ignoreDateRange
          ignorePeriod
        >
          {/* Custom filters - REMOVED the "Due within (days)" TextField */}
          <div className={classes.filterItem}>
            <FormControl fullWidth size="small">
              <TextField
                // label={t('reportDueWithinKm')}
                label="Due within (km)"
                type="number"
                value={dueWithinKm}
                onChange={(e) => setDueWithinKm(parseFloat(e.target.value) || 0)}
                size="small"
                InputProps={{ inputProps: { min: 0, step: 'any' } }}
              />
            </FormControl>
          </div>
          <div className={classes.filterItem}>
            <FormControl fullWidth size="small">
              {/* <InputLabel>{t('reportStatus')}</InputLabel> */}
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
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
          {/* Consider adding filter for 'Due within (hours)' if needed */}
        </ReportFilter>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            {fixedColumns.map((column) => (
              // <TableCell key={column.key}>{t(column.labelKey)}</TableCell>
              <TableCell key={column.key}>{column.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && (
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
              <TableRow key={`${item.deviceId}-${item.maintenanceTask}`}>
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

export default OptimalRoutePage;
