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

const MaintenanceReportPage = () => {
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

export default MaintenanceReportPage;

// import React, { useState, useEffect } from 'react'; // Import useEffect
// import { useNavigate } from 'react-router-dom';
// import {
//   Table, TableHead, TableRow, TableBody, TableCell, TextField, Typography,
//   FormControl, Select, MenuItem, InputLabel,
// } from '@mui/material';
// // Removed: formatTime import
// import ReportFilter from './components/ReportFilter';
// // import { useTranslation } from '../common/components/LocalizationProvider';
// import PageLayout from '../common/components/PageLayout';
// import ReportsMenu from './components/ReportsMenu';
// import { useCatch } from '../reactHelper';
// import useReportStyles from './common/useReportStyles';
// import TableShimmer from '../common/components/TableShimmer';
// import scheduleReport from './common/scheduleReport';

// // --- START: Mock Data Configuration ---
// // Set this to true to load mock data, false to use API
// const useMockData = true;

// // Mock data array (paste the mockMaintenanceData array from Step 1 here)
// const mockMaintenanceData = [
//   { deviceId: 101, deviceName: 'Truck ABC-123', groupName: 'Local Delivery', maintenanceTask: 'Oil Change (Mock)', scheduledMileage: 50000, currentMileage: 48500.5, status: 'Pending', mileageRemaining: '1499.5 km' },
//   { deviceId: 102, deviceName: 'Van XYZ-456', groupName: 'Long Haul', maintenanceTask: 'Brake Inspection (Mock)', scheduledMileage: 100000, currentMileage: 101500.0, status: 'Overdue', mileageRemaining: '1500.0 km overdue' },
//   { deviceId: 103, deviceName: 'Sedan QWE-789', groupName: 'Sales Team', maintenanceTask: 'Tire Rotation (Mock)', scheduledMileage: 85000, currentMileage: 75000.0, status: 'Pending', mileageRemaining: '10000.0 km' },
//   { deviceId: 104, deviceName: 'Pickup RTY-012', groupName: 'Maintenance Crew', maintenanceTask: 'Check Belts (Mock)', scheduledMileage: 60000, currentMileage: null, status: 'Pending', mileageRemaining: '' },
// ];
// // --- END: Mock Data Configuration ---

// // Define the fixed columns (same as before, without date/days)
// const fixedColumns = [
//   { key: 'deviceName', labelKey: 'deviceDialogName', label: 'Vehicle Name' },
//   { key: 'groupName', labelKey: 'groupDialogName', label: 'Group' },
//   { key: 'maintenanceTask', labelKey: 'reportMaintenanceTask', label: 'Maintenance Task' },
//   { key: 'scheduledMileage', labelKey: 'reportScheduledMileage', label: 'Scheduled Mileage' },
//   { key: 'currentMileage', labelKey: 'reportCurrentMileage', label: 'Current Mileage' },
//   { key: 'status', labelKey: 'reportStatus', label: 'Status' },
//   { key: 'mileageRemaining', labelKey: 'reportMileageRemaining', label: 'Mileage Remaining' },
// ];

// const MaintenanceReportPage = () => {
//   const navigate = useNavigate();
//   const classes = useReportStyles();
//   // const t = useTranslation();

//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [dueWithinKm, setDueWithinKm] = useState(1000);
//   const [statusFilter, setStatusFilter] = useState('');

//   // --- START: useEffect for Mock Data Loading ---
//   useEffect(() => {
//     if (useMockData) {
//       setLoading(true);
//       // Simulate network delay
//       const timer = setTimeout(() => {
//         setItems(mockMaintenanceData);
//         setLoading(false);
//       }, 500); // 0.5 second delay

//       // Cleanup timer on component unmount
//       return () => clearTimeout(timer);
//     }
//     // If useMockData is false, this effect does nothing,
//     // and data will be loaded via handleSubmit
//   }, []); // Empty dependency array ensures this runs only once on mount
//   // --- END: useEffect for Mock Data Loading ---

//   const handleSubmit = useCatch(async ({ deviceIds, groupIds, type }) => {
//     // --- START: Prevent fetch if using mock data ---
//     // If mock data is loaded via useEffect, don't proceed with API call
//     // Note: Filters won't apply to useEffect-loaded mock data without extra logic
//     if (useMockData && type === 'generate') {
//         console.log('Mock data is active, API fetch skipped. Filters will not apply to this view.');
//         // Optionally, you could implement mock filtering here if needed
//         return;
//     }
//     // --- END: Prevent fetch if using mock data ---

//     const params = new URLSearchParams();
//     deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
//     groupIds.forEach((groupId) => params.append('groupId', groupId));

//     if (dueWithinKm !== null && dueWithinKm >= 0) {
//       params.append('dueWithinKm', dueWithinKm);
//     }
//     if (statusFilter && statusFilter !== '') {
//       params.append('status', statusFilter);
//     }

//     const query = params.toString();
//     const reportPath = '/api/reports/maintenance';

//     if (type === 'export') {
//       // Allow export/mail even with mock data flag? Or disable buttons?
//       // For now, let it try the real API for export/mail.
//       window.location.assign(`${reportPath}/xlsx?${query}`);
//     } else if (type === 'mail') {
//       const response = await fetch(`${reportPath}/mail?${query}`);
//       if (!response.ok) {
//         throw Error(await response.text());
//       }
//     } else { // type === 'generate' (and useMockData is false)
//       setLoading(true);
//       try {
//         const response = await fetch(`${reportPath}?${query}`, {
//           headers: { Accept: 'application/json' },
//         });
//         if (response.ok) {
//           setItems(await response.json());
//         } else {
//           throw Error(await response.text());
//         }
//       } finally {
//         setLoading(false);
//       }
//     }
//   });

//   // handleSchedule remains the same, but attributes won't include dueWithinDays
//   const handleSchedule = useCatch(async (deviceIds, groupIds, report) => {
//     report.type = 'maintenance';
//     report.attributes = { ...report.attributes, dueWithinKm, status: statusFilter };
//     const error = await scheduleReport(deviceIds, groupIds, report);
//     if (error) throw Error(error); else navigate('/reports/scheduled');
//   });

//   // formatValue remains the same (already removed date/days cases)
//   const formatValue = (item, key) => {
//     const value = item[key];
//     switch (key) {
//       case 'scheduledMileage': case 'currentMileage':
//         return value !== null && value !== undefined ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '';
//       case 'deviceName': case 'groupName': case 'maintenanceTask': case 'status': case 'mileageRemaining':
//         return value || '';
//       default: return value;
//     }
//   };

//   return (
//     <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportMaintenance']}>
//       <div className={classes.header}>
//         {/* ReportFilter remains the same (already removed days filter) */}
//         <ReportFilter
//           handleSubmit={handleSubmit} handleSchedule={handleSchedule}
//           multiDevice includeGroups loading={loading}
//           ignoreDateRange ignorePeriod
//         >
//           <div className={classes.filterItem}>
//             <FormControl fullWidth size="small">
//               <TextField label="Due within (km)" type="number" value={dueWithinKm}
//                 onChange={(e) => setDueWithinKm(parseFloat(e.target.value) || 0)}
//                 size="small" InputProps={{ inputProps: { min: 0, step: 'any' } }}
//               />
//             </FormControl>
//           </div>
//           <div className={classes.filterItem}>
//             <FormControl fullWidth size="small">
//               <InputLabel>Status</InputLabel>
//               <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
//                 <MenuItem value="">All</MenuItem>
//                 <MenuItem value="Pending">Pending</MenuItem>
//                 <MenuItem value="Overdue">Overdue</MenuItem>
//               </Select>
//             </FormControl>
//           </div>
//         </ReportFilter>
//       </div>
//       <Table>
//         <TableHead>
//           <TableRow>
//             {fixedColumns.map((column) => ( <TableCell key={column.key}>{column.label}</TableCell> ))}
//           </TableRow>
//         </TableHead>
//         <TableBody>
//           {loading && ( <TableShimmer columns={fixedColumns.length} /> )}
//           {!loading && items.length === 0 && (
//             <TableRow> <TableCell colSpan={fixedColumns.length} align="center"> <Typography>No data available for the selected criteria.</Typography> </TableCell> </TableRow>
//           )}
//           {!loading && items.length > 0 && (
//             // Use a combination key for mock data as deviceId might not be unique across tasks
//             items.map((item) => (
//               <TableRow key={`${item.deviceId}-${item.maintenanceTask}`}>
//                 {fixedColumns.map((column) => ( <TableCell key={column.key}> {formatValue(item, column.key) || '-'} </TableCell> ))}
//               </TableRow>
//             ))
//           )}
//         </TableBody>
//       </Table>
//     </PageLayout>
//   );
// };

// export default MaintenanceReportPage;
