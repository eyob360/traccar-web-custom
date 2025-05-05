import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableHead, TableRow, TableBody, TableCell, TextField, Typography,
  FormControl,
} from '@mui/material';
import { formatTime } from '../common/util/formatter'; // Keep for formatting dates
import ReportFilter from './components/ReportFilter'; // Essential for device/group selection
// import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import { useCatch } from '../reactHelper'; // Keep for error handling
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import scheduleReport from './common/scheduleReport'; // Keep if scheduling is desired

// Define the fixed columns for the Insurance Report based on requirements
// Key: matches the data field from the backend Device object
// labelKey: translation key for the column header
const fixedColumns = [
  { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Device Name' },
  { key: 'groupName', labelKey: 'groupDialogName', label: 'Group' }, // Assuming provider adds this based on device.groupId
  { key: 'insuranceCompany', labelKey: 'reportInsuranceCompany', label: 'Insurance Company' },
  { key: 'insurancePolicyNumber', labelKey: 'reportPolicyNumber', label: 'Policy Number' },
  { key: 'insuranceAmount', labelKey: 'reportInsuranceAmount', label: 'Insurance Amount' },
  { key: 'insuranceExpiryDate', labelKey: 'reportExpiryDate', label: 'Expiry Date' },
  { key: 'daysRemaining', labelKey: 'reportDaysRemaining', label: 'Days Remaining' }, // Provided by InsuranceReportItem
];

const InsuranceReportPage = () => {
  const navigate = useNavigate(); // Keep for scheduling navigation
  const classes = useReportStyles();
  // const t = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expiryWithinDays, setExpiryWithinDays] = useState(30); // Default to 30 days

  // Removed state for dynamic columns

  const handleSubmit = useCatch(async ({ deviceIds, groupIds, type }) => {
    // Get deviceIds and groupIds from ReportFilter callback
    // Type indicates if it's 'generate', 'export', or 'mail'

    // Construct query parameters: only device/group IDs and expiry filter
    const params = new URLSearchParams();
    deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
    groupIds.forEach((groupId) => params.append('groupId', groupId));
    if (expiryWithinDays !== null && expiryWithinDays >= 0) {
      // Only add the filter if it has a non-negative value
      params.append('expiryWithinDays', expiryWithinDays);
    }

    const query = params.toString();

    if (type === 'export') {
      window.location.assign(`/api/reports/insurance/xlsx?${query}`);
    } else if (type === 'mail') {
      const response = await fetch(`/api/reports/insurance/mail?${query}`);
      if (!response.ok) {
        throw Error(await response.text());
      }
      // Optionally show a success message for mail sending
    } else {
      // 'generate' report data
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/insurance?${query}`, {
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
    report.type = 'insurance';
    // Add expiryWithinDays to attributes if the scheduler needs it
    report.attributes = { ...report.attributes, expiryWithinDays };
    const error = await scheduleReport(deviceIds, groupIds, report);
    if (error) {
      throw Error(error);
    } else {
      navigate('/reports/scheduled');
    }
  });

  // Format values for the insurance report table
  const formatValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'insuranceExpiryDate':
        // Ensure value exists before formatting
        return value ? formatTime(value, 'date') : '';
      case 'insuranceAmount':
        // Format as number with locale string, handle null/undefined
        // Consider adding currency symbol (e.g., ETB) if needed globally or via config
        return value !== null && value !== undefined ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      case 'name': // Already device name
      case 'groupName': // Provided by provider
      case 'insuranceCompany':
      case 'insurancePolicyNumber':
      case 'daysRemaining': // Already formatted string
        return value || ''; // Return empty string for null/undefined values
      default:
        return value;
    }
  };

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportInsurance']}>
      <div className={classes.header}>
        {/*
          Configure ReportFilter:
          - handleSubmit: function to call when 'Show' is clicked
          - handleSchedule: function for scheduling
          - multiDevice: Allow selecting multiple devices
          - includeGroups: Allow selecting groups
          - loading: Pass loading state
          - ignoreDateRange: Tell filter to hide From/To date pickers (IMPORTANT)
        */}
        <ReportFilter
          handleSubmit={handleSubmit}
          handleSchedule={handleSchedule}
          multiDevice
          includeGroups
          loading={loading}
          ignoreDateRange // Assuming ReportFilter supports this prop to hide date fields
          ignorePeriod
        >
          {/* Add the custom filter specific to this report */}
          <div className={classes.filterItem}>
            <FormControl fullWidth>
              <TextField
                // label={t('reportExpiresWithin')} // Translation key needed
                label="Expires within (days)"
                type="number"
                value={expiryWithinDays}
                onChange={(e) => setExpiryWithinDays(parseInt(e.target.value, 10) || 0)}
                size="small"
                InputProps={{ inputProps: { min: 0 } }} // Prevent negative numbers
              />
            </FormControl>
          </div>
          {/* ColumnSelect removed */}
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
              // Use device ID (item.id) as the key for each row
              <TableRow key={item.id}>
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

export default InsuranceReportPage;
