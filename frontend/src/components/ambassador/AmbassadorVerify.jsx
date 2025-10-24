import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { downloadContract, uploadSignedContract, getAmbassadorStatusById } from '../../services/api';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// Fully rebuilt verification section using MUI Accordion (RTL ready)
const AmbassadorVerify = () => {
  const [ambassadorId, setAmbassadorId] = useState(null);
  const [status, setStatus] = useState('not_verified'); // 'not_verified' | 'pending' | 'verified'
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Derive a friendly chip color/status
  const statusChip = useMemo(() => {
    switch (status) {
      case 'verified':
        return { color: 'success', label: 'تأیید شده', icon: <CheckCircleIcon /> };
      case 'pending':
        return { color: 'warning', label: 'در انتظار تأیید', icon: <HourglassTopIcon /> };
      default:
        return { color: 'default', label: 'احراز هویت نشده', icon: null };
    }
  }, [status]);

  useEffect(() => {
    const id = Number(localStorage.getItem('userId'));
    setAmbassadorId(id || null);
  }, []);

  useEffect(() => {
    let interval;
    const syncStatus = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!ambassadorId) return;
        const resp = await getAmbassadorStatusById(token, ambassadorId);
        const newStatus = resp?.status || (resp?.verified ? 'verified' : 'not_verified');
        setStatus(newStatus);
      } catch (err) {
        // ignore transient errors
      }
    };

    // initial fetch
    syncStatus();
    // poll every 30s while not verified
    interval = setInterval(syncStatus, 30000);
    return () => interval && clearInterval(interval);
  }, [ambassadorId]);

  const handleDownload = async () => {
    try {
      if (!ambassadorId) {
        toast.error('شناسه کاربر یافت نشد');
        return;
      }
      setIsDownloading(true);
      const token = localStorage.getItem('authToken');
      const blob = await downloadContract(token, ambassadorId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      // Open the blob directly for a more native experience
      window.open(url, '_blank', 'noopener');
      toast.success('قرارداد دانلود شد');
      // best-effort revoke after short delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error(err?.message || 'خطا در دانلود قرارداد');
    } finally {
      setIsDownloading(false);
    }
  };

  const openVinsign = () => {
    window.open('https://vinsign.ir', '_blank', 'noopener');
  };

  const handleUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf') {
        toast.error('لطفاً فایل PDF بارگذاری کنید');
        return;
      }
      if (!ambassadorId) {
        toast.error('شناسه کاربر یافت نشد');
        return;
      }
      setIsUploading(true);
      const token = localStorage.getItem('authToken');
      const resp = await uploadSignedContract(token, ambassadorId, file, (evt) => {
        if (evt && evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });
      toast.success('فایل با موفقیت بارگذاری شد');
      setStatus(resp?.status || 'pending');
    } catch (err) {
      toast.error(err?.message || 'خطا در بارگذاری فایل');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (e?.target) e.target.value = '';
    }
  };

  return (
    <Box dir="rtl" sx={{ maxWidth: 900, mx: 'auto' }}>
      <Box className="bg-white rounded-xl p-6 shadow-md mb-4">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" className="font-vazir" sx={{ fontWeight: 'bold', color: '#1f2937' }}>
              احراز هویت سفیر
            </Typography>
            <Typography variant="body2" className="font-vazir" sx={{ color: '#4b5563' }}>
              برای دسترسی کامل مراحل زیر را انجام دهید.
            </Typography>
          </Box>
          <Chip
            color={statusChip.color}
            icon={statusChip.icon}
            label={statusChip.label}
            className="font-vazir"
          />
        </Stack>
      </Box>

      <Box className="bg-white rounded-xl p-2 sm:p-4 shadow-md">
        {/* Step 1: Download */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className="font-vazir" sx={{ fontWeight: 700, color: '#111827' }}>
              گام ۱: دانلود قرارداد
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" className="font-vazir" sx={{ color: '#4b5563' }}>
                قرارداد شامل اطلاعات شما است. پس از دانلود، آن را مطالعه کنید.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading || !ambassadorId}
                  variant="contained"
                  startIcon={<CloudDownloadIcon />}
                  sx={{
                    bgcolor: '#2563eb',
                    '&:hover': { bgcolor: '#1d4ed8' },
                    fontFamily: 'Vazir, sans-serif'
                  }}
                >
                  {isDownloading ? 'در حال دانلود...' : 'دانلود PDF قرارداد'}
                </Button>
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Step 2: Digital Signature */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className="font-vazir" sx={{ fontWeight: 700, color: '#111827' }}>
              گام ۲: امضای دیجیتال در vinsign.ir
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" className="font-vazir" sx={{ color: '#4b5563' }}>
                ابتدا قرارداد را دانلود کنید، سپس در وب‌سایت {""}
                <strong>vinsign.ir</strong> آن را امضا کرده و به این صفحه بازگردید.
              </Typography>
              <Button
                onClick={openVinsign}
                variant="contained"
                startIcon={<EditIcon />}
                endIcon={<OpenInNewIcon />}
                sx={{
                  bgcolor: '#7c3aed',
                  '&:hover': { bgcolor: '#6d28d9' },
                  fontFamily: 'Vazir, sans-serif',
                  alignSelf: 'flex-start'
                }}
              >
                باز کردن vinsign.ir
              </Button>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Step 3: Upload */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className="font-vazir" sx={{ fontWeight: 700, color: '#111827' }}>
              گام ۳: بارگذاری قرارداد امضاشده
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography variant="body2" className="font-vazir" sx={{ color: '#4b5563' }}>
                فقط فایل با فرمت PDF پذیرفته می‌شود.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  disabled={isUploading || !ambassadorId}
                  sx={{
                    bgcolor: '#059669',
                    '&:hover': { bgcolor: '#047857' },
                    fontFamily: 'Vazir, sans-serif'
                  }}
                >
                  {isUploading ? 'در حال آپلود...' : 'انتخاب و بارگذاری PDF'}
                  <input hidden type="file" accept="application/pdf" onChange={handleUpload} />
                </Button>
                {isUploading && (
                  <Stack spacing={1} sx={{ minWidth: 220 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                    <Typography variant="caption" className="font-vazir" sx={{ color: '#374151' }}>
                      %{uploadProgress}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Status panel */}
        <Box sx={{ p: 2 }}>
          {status === 'pending' && (
            <Stack direction="row" spacing={2} alignItems="center" className="font-vazir" sx={{ bgcolor: '#fffbeb', p: 2, borderRadius: 2 }}>
              <CircularProgress size={22} sx={{ color: '#d97706' }} />
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#92400e' }}>در انتظار تأیید ادمین</Typography>
                <Typography variant="body2" sx={{ color: '#b45309' }}>وضعیت هر ۳۰ ثانیه به‌روزرسانی می‌شود.</Typography>
              </Box>
            </Stack>
          )}
          {status === 'verified' && (
            <Stack direction="row" spacing={1.5} alignItems="center" className="font-vazir" sx={{ bgcolor: '#ecfdf5', p: 2, borderRadius: 2 }}>
              <CheckCircleIcon sx={{ color: '#047857' }} />
              <Typography sx={{ fontWeight: 700, color: '#065f46' }}>تأیید شده</Typography>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AmbassadorVerify;
