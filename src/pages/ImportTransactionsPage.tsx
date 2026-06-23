import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyStore } from '@/stores/company-store';
import { useCustomerStore } from '@/stores/customer-store';
import { CustomerCombobox } from '@/components/customer-combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, Globe2, ChevronDown, ChevronRight, Search, Layers, Sliders 
} from 'lucide-react';
import { 
  groupExcelRows, 
  cleanTaxId, 
  getRowValue,
  type ImportTransaction 
} from '@/lib/import-helpers';

interface RowSetting {
  customerId: string;
  submissionDate: string;
  exchangeRate: string;
  rateDate: string;
  duplicateAction: 'skip' | 'overwrite';
  rateLoading: boolean;
  rateError: string | null;
  botRateFound: boolean;
  botActualDate: string | null;
}

const SYSTEM_FIELDS = [
  { key: 'declarationNumber', label: 'เลขที่ใบขนสินค้า (Declaration Number)', required: true },
  { key: 'invoiceNumber', label: 'เลขที่ใบกำกับสินค้า (Invoice Number)', required: true },
  { key: 'invoiceDate', label: 'วันที่ใบกำกับสินค้า (Invoice Date)', required: true },
  { key: 'exporterTaxNo', label: 'เลขผู้เสียภาษีผู้ส่งออก (Exporter Tax ID)', required: true },
  { key: 'exporterName', label: 'ชื่อผู้ส่งออก (Exporter Name)', required: true },
  { key: 'currencyCode', label: 'รหัสสกุลเงิน (Currency Code)', required: true },
  { key: 'goodsNameTH', label: 'ชื่อสินค้าภาษาไทย (Goods Name TH)', required: false },
  { key: 'goodsNameEN', label: 'ชื่อสินค้าภาษาอังกฤษ (Goods Name EN)', required: false },
  { key: 'netWeight', label: 'น้ำหนักสุทธิ (Net Weight)', required: false },
  { key: 'quantity', label: 'จำนวนสินค้า (Quantity)', required: true },
  { key: 'price', label: 'ราคาต่อหน่วย (Unit Price)', required: false },
  { key: 'totalPrice', label: 'ราคารวมสินค้า FOB (Total FOB Price)', required: true },
  { key: 'itemNo', label: 'ลำดับรายการสินค้า (Item Number)', required: false },
  { key: 'status', label: 'สถานะรายการ (Status)', required: false },
  { key: 'notes', label: 'หมายเหตุ / อ้างอิง (Notes/Remark)', required: false },
];

export default function ImportTransactionsPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  const navigate = useNavigate();

  // Store actions
  const { companies, fetchCompanies } = useCompanyStore();
  const { fetchCustomers } = useCustomerStore();

  const activeCompany = companies.find(c => c.id === cId);

  // Tab control
  const [activeTab, setActiveTab] = useState<'standard' | 'custom' | 'settings'>('standard');

  // Page States
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);
  const [groupedTxns, setGroupedTxns] = useState<ImportTransaction[]>([]);
  const [productLang, setProductLang] = useState<'TH' | 'EN'>('TH');

  // Settings States
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);

  // Sync mapping state with active company
  useEffect(() => {
    if (activeCompany?.excelMapping) {
      setMappingState(activeCompany.excelMapping as Record<string, string>);
      // Seed headers with any existing mapped values so they show up
      const existingValues = Object.values(activeCompany.excelMapping) as string[];
      setHeaders(prev => Array.from(new Set([...prev, ...existingValues])));
    }
  }, [activeCompany]);
  
  // Exporter Tax Mismatch Block State
  const [taxMismatchData, setTaxMismatchData] = useState<{ fileTax: string; companyTax: string } | null>(null);
  const [taxMismatchBlocked, setTaxMismatchBlocked] = useState(false);

  // Validation & Row Settings States
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [rowSettings, setRowSettings] = useState<Record<string, RowSetting>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Search & Batch Config States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchCustomerId, setBatchCustomerId] = useState<string>('none');
  const [batchSubmissionDate, setBatchSubmissionDate] = useState<string>('');

  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Filtered transactions based on search query
  const filteredTxns = groupedTxns.filter(tx => 
    tx.declarationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initial Fetches
  useEffect(() => {
    if (cId) {
      fetchCompanies();
      fetchCustomers(cId);
    }
  }, [cId]);

  // Re-run grouping if language choice or tab changes
  useEffect(() => {
    if (rawExcelRows.length > 0) {
      const mapping = activeTab === 'custom' ? (activeCompany?.excelMapping as Record<string, string>) : null;
      const grouped = groupExcelRows(rawExcelRows, productLang, mapping);
      setGroupedTxns(grouped);
      validateGroupedData(grouped);
    }
  }, [productLang, activeTab]);

  // Grouped rows expand/collapse
  const toggleRowExpand = (declNo: string) => {
    const next = new Set(expandedRows);
    if (next.has(declNo)) next.delete(declNo);
    else next.add(declNo);
    setExpandedRows(next);
  };

  // 1. Parse Excel on drop/change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploadedFile = files[0];
    setFile(uploadedFile);

    setIsParsing(true);
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rows = XLSX.utils.sheet_to_json<any>(ws);

          if (rows.length === 0) {
            setIsParsing(false);
            toast.error('ไม่พบข้อมูลในไฟล์ Excel', { position: 'top-center' });
            return;
          }

          setRawExcelRows(rows);

          const mapping = activeTab === 'custom' ? (activeCompany?.excelMapping as Record<string, string>) : null;
          const taxField = mapping?.exporterTaxNo || 'Exporter Tax No';

          // Get Exporter Tax No from Excel (check first row that has it)
          const firstRowWithTax = rows.find(r => getRowValue(r, taxField));
          const rawFileTax = firstRowWithTax ? String(getRowValue(firstRowWithTax, taxField)) : '';
          const cleanedFileTax = cleanTaxId(rawFileTax);
          const cleanedCompanyTax = cleanTaxId(activeCompany?.taxId || '');

          // Verify Exporter Tax ID as the CRITICAL FIRST STEP
          if (cleanedFileTax && cleanedCompanyTax && cleanedFileTax !== cleanedCompanyTax) {
            setTaxMismatchData({ fileTax: rawFileTax, companyTax: activeCompany?.taxId || '' });
            setTaxMismatchBlocked(true);
            setIsParsing(false);
            toast.warning('เลขประจำตัวผู้เสียภาษีผู้ส่งออกไม่ตรงกัน', { position: 'top-center' });
          } else {
            setTaxMismatchBlocked(false);
            setTaxMismatchData(null);
            
            // Proceed to group rows
            const grouped = groupExcelRows(rows, productLang, mapping);
            setGroupedTxns(grouped);
            await validateGroupedData(grouped);
            setIsParsing(false);
            toast.success(`โหลดข้อมูลใบขนสำเร็จ: ตรวจพบ ${grouped.length} ใบขน`, { position: 'top-center' });
          }
        } catch (err) {
          console.error(err);
          setIsParsing(false);
          toast.error('เกิดข้อผิดพลาดในการอ่านชีต Excel', { position: 'top-center' });
        }
      };

      reader.readAsBinaryString(uploadedFile);
    } catch (err) {
      console.error(err);
      setIsParsing(false);
      toast.error('เกิดข้อผิดพลาดในการนำเข้า XLSX parser', { position: 'top-center' });
    }
  };

  // 2. Validate grouped transactions on backend
  const validateGroupedData = async (transactions: ImportTransaction[]) => {
    setIsValidating(true);
    try {
      const res = await fetch(`/api/transactions/validate-import?companyId=${cId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactions }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to validate');

      // Update validation results state
      const resultsMap: Record<string, any> = {};
      const initialSettings: Record<string, RowSetting> = { ...rowSettings };

      json.data.forEach((tx: any) => {
        resultsMap[tx.declarationNumber] = tx.validation;

        // Populate initial settings for this declaration if not already set
        if (!initialSettings[tx.declarationNumber]) {
          const needsRate = tx.currencyCode !== 'THB' && tx.declarationDate;
          initialSettings[tx.declarationNumber] = {
            customerId: tx.customerId ? String(tx.customerId) : 'none',
            submissionDate: tx.declarationDate || '',
            exchangeRate: tx.currencyCode === 'THB' ? '1' : '',
            rateDate: '',
            duplicateAction: tx.validation.duplicateStatus === 'duplicate_eligible' ? 'skip' : 'skip',
            rateLoading: needsRate ? true : false,
            rateError: null,
            botRateFound: tx.currencyCode === 'THB' ? true : false,
            botActualDate: null
          };
        }
      });

      setValidationResults(resultsMap);
      setRowSettings(initialSettings);

      // Trigger automatic BOT rate checks for initial dates
      Object.keys(initialSettings).forEach((declNo) => {
        const setting = initialSettings[declNo];
        const txn = transactions.find(t => t.declarationNumber === declNo);
        if (txn && setting.submissionDate && txn.currencyCode !== 'THB') {
          fetchBotRate(declNo, txn.currencyCode, setting.submissionDate, true);
        }
      });

    } catch (err) {
      toast.error((err as Error).message, { position: 'top-center' });
    } finally {
      setIsValidating(false);
    }
  };

  // 3. Fetch BOT Rate on Date Change with lookback fallback
  const fetchBotRate = async (declNo: string, currency: string, submissionDate: string, skipStartLoading = false) => {
    if (!submissionDate || currency === 'THB') return;

    if (!skipStartLoading) {
      setRowSettings(prev => ({
        ...prev,
        [declNo]: { ...prev[declNo], rateLoading: true, rateError: null }
      }));
    }

    try {
      const res = await fetch(`/api/rates/bot-fallback/${currency}/${submissionDate}`, { credentials: 'include' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'ไม่พบอัตราแลกเปลี่ยน');
      }

      const rate = json.data;
      setRowSettings(prev => ({
        ...prev,
        [declNo]: {
          ...prev[declNo],
          exchangeRate: rate.buyingTransfer,
          rateDate: rate.period,
          rateLoading: false,
          botRateFound: true,
          botActualDate: rate.period,
          rateError: null
        }
      }));
    } catch (err) {
      setRowSettings(prev => ({
        ...prev,
        [declNo]: {
          ...prev[declNo],
          rateLoading: false,
          botRateFound: false,
          rateError: (err as Error).message
        }
      }));
    }
  };

  // Handler for row submission date change
  const handleSubmissionDateChange = (declNo: string, dateStr: string) => {
    setRowSettings(prev => ({
      ...prev,
      [declNo]: { ...prev[declNo], submissionDate: dateStr }
    }));

    const txn = groupedTxns.find(t => t.declarationNumber === declNo);
    if (txn && txn.currencyCode !== 'THB') {
      fetchBotRate(declNo, txn.currencyCode, dateStr);
    }
  };

  // Batch customer assign
  const handleBatchCustomerApply = () => {
    if (batchCustomerId === 'none') {
      toast.warning('กรุณาเลือกรายชื่อลูกค้าก่อน');
      return;
    }
    const updated = { ...rowSettings };
    Object.keys(updated).forEach((declNo) => {
      updated[declNo].customerId = batchCustomerId;
    });
    setRowSettings(updated);
    toast.success('จับคู่ลูกค้าให้ทุกรายการเรียบร้อย');
  };

  // Batch submission date assign
  const handleBatchDateApply = async () => {
    if (!batchSubmissionDate) {
      toast.warning('กรุณาเลือกวันที่ก่อน');
      return;
    }
    const updated = { ...rowSettings };
    Object.keys(updated).forEach((declNo) => {
      updated[declNo].submissionDate = batchSubmissionDate;
    });
    setRowSettings(updated);
    toast.success('กำหนดวันที่ส่งข้อมูลให้ทุกรายการเรียบร้อย');

    // Get unique non-THB currencies
    const nonThbTxns = groupedTxns.filter(tx => tx.currencyCode !== 'THB');
    const uniqueCurrencies = Array.from(new Set(nonThbTxns.map(tx => tx.currencyCode)));

    if (uniqueCurrencies.length === 0) return;

    // Set all of them to loading first
    setRowSettings(prev => {
      const copy = { ...prev };
      nonThbTxns.forEach(tx => {
        if (copy[tx.declarationNumber]) {
          copy[tx.declarationNumber] = {
            ...copy[tx.declarationNumber],
            rateLoading: true,
            rateError: null
          };
        }
      });
      return copy;
    });

    // Fetch rate for each unique currency on this date
    const rateMap: Record<string, { rate: any; error: string | null }> = {};
    for (const currency of uniqueCurrencies) {
      try {
        const res = await fetch(`/api/rates/bot-fallback/${currency}/${batchSubmissionDate}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'ไม่พบอัตราแลกเปลี่ยน');
        rateMap[currency] = { rate: json.data, error: null };
      } catch (err) {
        rateMap[currency] = { rate: null, error: (err as Error).message };
      }
    }

    // Apply rates to rowSettings
    setRowSettings(prev => {
      const copy = { ...prev };
      nonThbTxns.forEach(tx => {
        const result = rateMap[tx.currencyCode];
        if (result && copy[tx.declarationNumber]) {
          if (result.rate) {
            copy[tx.declarationNumber] = {
              ...copy[tx.declarationNumber],
              exchangeRate: result.rate.buyingTransfer,
              rateDate: result.rate.period,
              rateLoading: false,
              botRateFound: true,
              botActualDate: result.rate.period,
              rateError: null
            };
          } else {
            copy[tx.declarationNumber] = {
              ...copy[tx.declarationNumber],
              rateLoading: false,
              botRateFound: false,
              rateError: result.error
            };
          }
        }
      });
      return copy;
    });
  };

  // Submit final import data
  const handleConfirmImport = async () => {
    // Check if any row settings are invalid:
    // - customerId is 'none'
    // - exchangeRate is missing or invalid
    // - submissionDate is missing
    const validationErrors: string[] = [];

    const payload = groupedTxns.map((tx) => {
      const settings = rowSettings[tx.declarationNumber];
      const validation = validationResults[tx.declarationNumber];

      if (!settings) {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: ไม่พบการตั้งค่าแถว`);
        return null;
      }

      if (settings.customerId === 'none') {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: กรุณาจับคู่รายชื่อลูกค้า`);
      }

      if (!settings.submissionDate) {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: กรุณากำหนดวันส่งข้อมูลเข้าศุลกากร`);
      }

      if (tx.currencyCode !== 'THB' && !settings.exchangeRate) {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: กรุณาระบุอัตราแลกเปลี่ยน`);
      }

      if (validation?.status === 'error') {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: มีข้อผิดพลาดในข้อมูลที่ระบบตรวจสอบพบ`);
      }

      // Check if duplicate is blocked
      if (validation?.duplicateStatus === 'duplicate_blocked') {
        validationErrors.push(`ใบขนสินค้า ${tx.declarationNumber}: มีการตัดชำระเงินแล้ว ไม่สามารถนำเข้าซ้ำได้`);
      }

      return {
        transaction: {
          ...tx,
          declarationDate: settings.submissionDate // overwrite declaration date with submission date
        },
        customerId: parseInt(settings.customerId),
        duplicateAction: settings.duplicateAction,
        exchangeRate: tx.currencyCode === 'THB' ? '1' : settings.exchangeRate,
        rateDate: tx.currencyCode === 'THB' ? settings.submissionDate : (settings.rateDate || settings.submissionDate)
      };
    });

    if (validationErrors.length > 0) {
      toast.error(
        <div className="flex flex-col gap-1 text-xs">
          <p className="font-semibold text-sm mb-1 text-rose-500">กรุณาแก้ไขข้อมูลก่อนยืนยันนำเข้า:</p>
          <ul className="list-disc pl-4 max-h-[150px] overflow-auto">
            {validationErrors.map((err, idx) => <li key={idx}>{err}</li>)}
          </ul>
        </div>,
        { duration: 5000, position: 'top-center' }
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/confirm-import?companyId=${cId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items: payload }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to import');

      toast.success(`นำเข้าสำเร็จ! เพิ่มรายการใหม่ ${json.importCount} รายการ, เขียนทับ ${json.overwriteCount} รายการ`, { position: 'top-center' });
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', { position: 'top-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSampleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const uploadedFile = files[0];
    setSampleFile(uploadedFile);
    setIsParsing(true);
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const sheetData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
          const extractedHeaders = (sheetData[0] || []) as string[];
          
          if (extractedHeaders.length === 0) {
            toast.error('ไม่พบหัวคอลัมน์ในแถวแรกของไฟล์ Excel', { position: 'top-center' });
            setIsParsing(false);
            return;
          }

          const cleanedHeaders = extractedHeaders.map(h => String(h).trim()).filter(Boolean);
          setHeaders(cleanedHeaders);

          // Auto-match headers to system fields if not already mapped
          const newMapping = { ...mappingState };
          SYSTEM_FIELDS.forEach(field => {
            if (!newMapping[field.key]) {
              // Try to find a header that matches
              const matched = cleanedHeaders.find(h => {
                const normH = h.toLowerCase().replace(/\s/g, '');
                const normKey = field.key.toLowerCase().replace(/\s/g, '');
                // Check if key contains header name or vice versa
                return normH.includes(normKey) || normKey.includes(normH) || 
                       (field.label.toLowerCase().includes(normH));
              });
              if (matched) {
                newMapping[field.key] = matched;
              }
            }
          });
          setMappingState(newMapping);

          toast.success(`ดึงหัวตารางสำเร็จ: ตรวจพบ ${cleanedHeaders.length} คอลัมน์`, { position: 'top-center' });
        } catch (err) {
          console.error(err);
          toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลจากไฟล์ตัวอย่าง', { position: 'top-center' });
        } finally {
          setIsParsing(false);
        }
      };

      reader.readAsBinaryString(uploadedFile);
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการโหลดไฟล์ตัวอย่าง', { position: 'top-center' });
      setIsParsing(false);
    }
  };

  const handleSaveMapping = async () => {
    // Validation: make sure all required fields are mapped
    const missingFields = SYSTEM_FIELDS.filter(f => f.required && !mappingState[f.key]);
    if (missingFields.length > 0) {
      toast.error(
        <div className="flex flex-col gap-1 text-xs">
          <p className="font-semibold text-rose-500 text-sm">ไม่สามารถบันทึกได้:</p>
          <p>กรุณาจับคู่ฟิลด์ที่จำเป็นต่อไปนี้:</p>
          <ul className="list-disc pl-4">
            {missingFields.map(f => <li key={f.key}>{f.label}</li>)}
          </ul>
        </div>,
        { position: 'top-center' }
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${cId}/excel-mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mapping: mappingState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save mapping');
      
      toast.success('บันทึกการจับคู่คอลัมน์สำเร็จ!', { position: 'top-center' });
      await fetchCompanies();
    } catch (err) {
      toast.error((err as Error).message, { position: 'top-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setRawExcelRows([]);
    setGroupedTxns([]);
    setValidationResults({});
    setRowSettings({});
    setExpandedRows(new Set());
    setSearchQuery('');
    setBatchCustomerId('none');
    setBatchSubmissionDate('');
    setTaxMismatchBlocked(false);
    setTaxMismatchData(null);
    setSampleFile(null);
    setHeaders([]);
    if (activeCompany?.excelMapping) {
      setMappingState(activeCompany.excelMapping as Record<string, string>);
      const existingValues = Object.values(activeCompany.excelMapping) as string[];
      setHeaders(prev => Array.from(new Set([...prev, ...existingValues])));
    } else {
      setMappingState({});
    }
  };

  // Mismatch block UI overlay
  if (taxMismatchBlocked && taxMismatchData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl border-rose-200 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-10 w-10 shrink-0" />
              <div>
                <h2 className="text-lg font-bold">แจ้งเตือน: ตรวจพบเลขประจำตัวผู้เสียภาษีไม่ตรงกัน!</h2>
                <p className="text-xs text-muted-foreground">Exporter Tax ID Mismatch Check</p>
              </div>
            </div>

            <hr className="border-rose-100 dark:border-rose-900" />

            <div className="text-sm space-y-2 py-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">เลขผู้เสียภาษีอากรในไฟล์ Excel:</span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                  {taxMismatchData.fileTax || 'ไม่พบในไฟล์'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เลขผู้เสียภาษีบริษัทที่ใช้งานอยู่:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {taxMismatchData.companyTax || 'ไม่ได้กำหนดค่าไว้'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ชื่อบริษัทปัจจุบัน:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {activeCompany?.name}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-md text-xs text-amber-800 dark:text-amber-300">
              <strong>ข้อควรระวัง:</strong> หากนำข้อมูลเข้าผิดบริษัท จะทำให้ยอดบัญชีการรับเงินและ Gain/Loss ผิดพลาด 
              กรุณาตรวจสอบว่าท่านเข้าใช้งานบริษัทถูกต้องหรือไม่ หรือได้เลือกไฟล์อัปโหลดถูกต้องแล้ว
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/companies')}>
                สลับบริษัทในระบบ
              </Button>
              <Button variant="outline" size="sm" onClick={resetState}>
                เลือกไฟล์อัปโหลดใหม่
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setTaxMismatchBlocked(false)}
              >
                ดำเนินการต่อ (ข้ามคำเตือน)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'standard':
        return 'นำเข้าแบบมาตรฐาน (Standard Import)';
      case 'custom':
        return 'นำเข้าแบบกำหนดเอง (Custom Mapping Import)';
      case 'settings':
        return 'ตั้งค่าการจับคู่คอลัมน์ (Column Mapping Settings)';
      default:
        return 'นำเข้าข้อมูลใบขนสินค้า (Excel)';
    }
  };

  const getHeaderDesc = () => {
    switch (activeTab) {
      case 'standard':
        return 'นำเข้าข้อมูลโดยใช้รูปแบบหัวตารางมาตรฐานของโปรแกรมศุลกากร';
      case 'custom':
        return 'นำเข้าข้อมูลโดยใช้โปรไฟล์การจับคู่หัวคอลัมน์ที่ตั้งค่าไว้ของบริษัทท่าน';
      case 'settings':
        return 'กำหนดหัวตารางในไฟล์ Excel เพื่อนำเข้าข้อมูลแบบกำหนดเองตามโครงสร้างข้อมูลของบริษัทตนเอง';
      default:
        return 'นำเข้าไฟล์ส่งออกจากโปรแกรมใบขนสินค้า เพื่อลดเวลาคีย์รายการและไอเท็มย่อย';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background overflow-hidden">
      <PageHeader
        title={getHeaderTitle()}
        description={getHeaderDesc()}
      />

      <div className="flex-1 p-4 min-h-0 overflow-hidden bg-background">
        <Card className="flex-1 flex flex-row h-full min-h-0 overflow-hidden bg-muted/50 rounded-xl border shadow-sm">
          {/* Sub-Sidebar */}
          <div className="w-60 bg-sidebar/20 border-r border-border/50 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-muted/20">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase font-sans">นำเข้าใบขน Excel</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">เลือกรูปแบบการดำเนินงาน</p>
          </div>
          <div className="flex-1 p-2 space-y-1">
            <button
              onClick={() => {
                setActiveTab('standard');
                resetState();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'standard'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <FileSpreadsheet className={`h-4 w-4 ${activeTab === 'standard' ? 'text-sidebar-accent-foreground' : 'text-slate-400'}`} />
              <span className="font-sans">นำเข้าแบบมาตรฐาน</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('custom');
                resetState();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'custom'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Layers className={`h-4 w-4 ${activeTab === 'custom' ? 'text-sidebar-accent-foreground' : 'text-slate-400'}`} />
              <span className="font-sans">นำเข้าแบบกำหนดเอง</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                resetState();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Sliders className={`h-4 w-4 ${activeTab === 'settings' ? 'text-sidebar-accent-foreground' : 'text-slate-400'}`} />
              <span className="font-sans">ตั้งค่าการจับคู่คอลัมน์</span>
            </button>
          </div>
            <div className="p-3 border-t border-border/50 bg-muted/20">
              <div className="text-[10px] text-muted-foreground leading-normal font-sans">
                <span className="font-semibold block text-slate-700 dark:text-slate-300">คู่คอลัมน์ปัจจุบัน:</span>
                {activeCompany?.excelMapping && Object.keys(activeCompany.excelMapping).length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ ตั้งค่าเรียบร้อยแล้ว</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-500 font-medium">⚠️ ยังไม่ได้จับคู่คอลัมน์</span>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden p-4">
          {activeTab === 'settings' ? (
            // SETTINGS VIEW
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
              <div className="space-y-4 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Left Card: Upload Sample File */}
                  <div className="md:col-span-1 space-y-4">
                    <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                      <CardContent className="p-4 space-y-4">
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide font-sans">
                          1. อัปโหลดไฟล์ Excel ตัวอย่าง
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                          อัปโหลดไฟล์ Excel ของบริษัทท่านเพื่อดึงรายชื่อหัวคอลัมน์มาทำการจับคู่กับระบบ
                        </p>

                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center bg-slate-50/50 dark:bg-slate-900/10">
                          <label className="cursor-pointer flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6 text-slate-400" />
                            <span className="text-xs font-medium text-primary font-sans">เลือกไฟล์ตัวอย่าง</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px] font-mono">
                              {sampleFile ? sampleFile.name : 'ยังไม่ได้เลือกไฟล์'}
                            </span>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              className="hidden" 
                              onChange={handleSampleFileChange} 
                            />
                          </label>
                        </div>

                        {headers.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 font-sans">
                              หัวตารางที่ตรวจพบ ({headers.length}):
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/45 dark:border-slate-800/45">
                              {headers.map(h => (
                                <Badge key={h} variant="secondary" className="text-[10px] font-mono py-0.5">
                                  {h}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Card: Column Mapping Form */}
                  <div className="md:col-span-2">
                    <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide font-sans">
                            2. จับคู่ฟิลด์ของระบบ
                          </h3>
                          <span className="text-[10px] text-rose-500 font-semibold font-sans">* จำเป็นต้องระบุ</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                          {SYSTEM_FIELDS.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 font-sans">
                                {field.label}
                                {field.required && <span className="text-rose-500">*</span>}
                              </label>
                              <Select
                                value={mappingState[field.key] || 'none'}
                                onValueChange={(val) => setMappingState(prev => ({ ...prev, [field.key]: val === 'none' ? '' : val }))}
                              >
                                <SelectTrigger className="h-7 w-full text-xs font-sans">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-xs font-sans">-- ไม่กำหนด (ใช้ค่าเริ่มต้น) --</SelectItem>
                                  {headers.map(h => (
                                    <SelectItem key={h} value={h} className="text-xs font-mono">{h}</SelectItem>
                                  ))}
                                  {mappingState[field.key] && !headers.includes(mappingState[field.key]) && (
                                    <SelectItem value={mappingState[field.key]} className="text-xs font-mono">{mappingState[field.key]}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSampleFile(null);
                              setHeaders([]);
                              setMappingState(activeCompany?.excelMapping as Record<string, string> || {});
                            }}
                            disabled={isSubmitting}
                            className="font-sans"
                          >
                            รีเซ็ตแบบฟอร์ม
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSaveMapping}
                            disabled={isSubmitting}
                            className="font-sans"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> กำลังบันทึก...
                              </>
                            ) : (
                              'บันทึกการจับคู่'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // STANDARD & CUSTOM VIEW
            <div className="flex-1 flex flex-col h-full min-h-0">
              {activeTab === 'custom' && (!activeCompany?.excelMapping || Object.keys(activeCompany.excelMapping).length === 0) ? (
                // No mapping configured yet warning
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <Card className="w-full max-w-md border-amber-200 dark:border-amber-900 bg-amber-50/15 dark:bg-amber-950/10 shadow">
                    <CardContent className="pt-6 text-center space-y-4">
                      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans">ยังไม่ได้จับคู่คอลัมน์!</h3>
                        <p className="text-xs text-muted-foreground leading-normal max-w-sm mx-auto font-sans">
                          บริษัทนี้ยังไม่มีโปรไฟล์การจับคู่คอลัมน์ กรุณาไปตั้งค่าจับคู่คอลัมน์ของไฟล์ตัวอย่างก่อนใช้งานระบบนี้
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('settings')} className="font-sans">
                        ไปตั้งค่าการจับคู่คอลัมน์
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Shared Upload & Preview Grid
                <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden">
                  {/* Step 1: Upload Dropzone if no data is parsed */}
                  {groupedTxns.length === 0 ? (
                    <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                      <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full text-primary">
                          <FileSpreadsheet className="h-10 w-10" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold font-sans">อัปโหลดไฟล์ใบขนสินค้า Excel</h3>
                          <p className="text-xs text-muted-foreground max-w-sm font-sans font-sans">
                            ลากไฟล์ .xlsx หรือ .xls มาวางที่นี่ หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์จากคอมพิวเตอร์
                          </p>
                        </div>

                        <div className="flex items-center justify-center">
                          <label className="cursor-pointer">
                            <Input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              className="hidden" 
                              onChange={handleFileChange} 
                            />
                            <Button asChild size="sm" className="gap-2 font-sans">
                              <span>
                                <Upload className="h-4 w-4" /> เลือกไฟล์ Excel
                              </span>
                            </Button>
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Step 2: Interactive Preview Grid */
                    <div className="flex-1 flex flex-col min-h-0 space-y-3">
                      {/* Top configuration and batch actions */}
                      <Card className="shrink-0 border-slate-100 dark:border-slate-800">
                        <CardContent className="p-3 flex flex-wrap gap-4 items-center justify-between">
                          
                          {/* Left side settings: Product Name Language */}
                          <div className="flex items-center gap-2">
                            <Globe2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium font-sans">ชื่อสินค้าเริ่มต้น:</span>
                            <div className="flex border rounded-md overflow-hidden bg-slate-50 dark:bg-slate-900">
                              <button
                                className={`px-3 py-1 text-xs font-semibold font-sans transition-colors ${
                                  productLang === 'TH' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                onClick={() => setProductLang('TH')}
                              >
                                ภาษาไทย (TH)
                              </button>
                              <button
                                className={`px-3 py-1 text-xs font-semibold font-sans transition-colors ${
                                  productLang === 'EN' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                onClick={() => setProductLang('EN')}
                              >
                                ภาษาอังกฤษ (EN)
                              </button>
                            </div>
                          </div>

                          {/* Batch controls */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Batch Customer */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground font-sans">ลูกค้า:</span>
                              <CustomerCombobox
                                companyId={cId}
                                value={batchCustomerId}
                                onChange={setBatchCustomerId}
                                className="w-[160px] h-7 text-xs"
                              />
                              <Button variant="secondary" size="xs" onClick={handleBatchCustomerApply} className="h-7 text-xs font-sans">
                                กำหนดทั้งหมด
                              </Button>
                            </div>

                            {/* Batch Date */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground font-sans">วันส่งศุลกากร:</span>
                              <DatePicker
                                value={batchSubmissionDate}
                                onChange={setBatchSubmissionDate}
                                className="w-[150px]"
                                inputClassName="h-7 text-xs bg-background"
                                buttonClassName="h-7 w-7"
                              />
                              <Button variant="secondary" size="xs" onClick={handleBatchDateApply} className="h-7 text-xs font-sans">
                                กำหนดทั้งหมด
                              </Button>
                            </div>
                          </div>

                          {/* File info and reset */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground truncate max-w-[150px] font-mono">
                              {file?.name}
                            </span>
                            <Button variant="ghost" size="xs" onClick={resetState} className="text-rose-600 hover:text-rose-700 h-7 text-xs font-sans">
                              ล้างใหม่
                            </Button>
                          </div>

                        </CardContent>
                      </Card>

                      {/* Validation table */}
                      <div className="flex-1 border rounded-md overflow-hidden bg-card min-h-0 flex flex-col">
                        <div className="shrink-0 p-2 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 max-w-xs w-full relative">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="ค้นหาเลขที่ใบขน..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="h-7 text-xs pl-8 w-full bg-background"
                            />
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium font-sans">
                            แสดง {filteredTxns.length} จาก {groupedTxns.length} ใบขนสินค้า
                          </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                          <Table className="relative text-xs">
                            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50 sticky top-0 z-10">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[100px] font-sans">สถานะ</TableHead>
                                <TableHead className="w-[180px] font-sans">เลขที่ใบขน</TableHead>
                                <TableHead className="w-[100px] font-sans">สกุลเงิน</TableHead>
                                <TableHead className="w-[180px] font-sans">ยอดรวมสินค้า (FOB)</TableHead>
                                <TableHead className="w-[160px] font-sans">วันส่งข้อมูลเข้าศุลกากร</TableHead>
                                <TableHead className="w-[200px] font-sans">ลูกค้า (จับคู่)</TableHead>
                                <TableHead className="w-[180px] font-sans">อัตราแลกเปลี่ยน (BOT)</TableHead>
                                <TableHead className="w-[150px] font-sans">การจัดการซ้ำ</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTxns.map((tx) => {
                                const declNo = tx.declarationNumber;
                                const validation = validationResults[declNo];
                                const settings = rowSettings[declNo] || {
                                  customerId: 'none',
                                  submissionDate: '',
                                  exchangeRate: '',
                                  rateDate: '',
                                  duplicateAction: 'skip',
                                  rateLoading: false,
                                  rateError: null,
                                  botRateFound: false,
                                  botActualDate: null
                                };

                                const isExpanded = expandedRows.has(declNo);
                                const isTHB = tx.currencyCode === 'THB';

                                // Calc total FOB value
                                const totalFobValue = tx.invoices.reduce((sum, inv) => 
                                  sum + inv.items.reduce((iSum, it) => iSum + it.totalPrice, 0)
                                , 0);

                                // Status UI
                                let statusBadge = <Badge variant="secondary" className="text-[10px] py-0 h-5">Checking...</Badge>;
                                if (validation) {
                                  if (validation.status === 'error') {
                                    statusBadge = <Badge variant="destructive" className="text-[10px] py-0 h-5 gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
                                  } else if (validation.status === 'warning') {
                                    statusBadge = <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
                                  } else {
                                    statusBadge = <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 font-sans"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
                                  }
                                }

                                return (
                                  <React.Fragment key={declNo}>
                                    {/* Main Row */}
                                    <TableRow className={`${isExpanded ? 'bg-slate-50/30 dark:bg-slate-900/10' : ''}`}>
                                      <TableCell className="text-center p-2">
                                        <Button 
                                          variant="ghost" 
                                          size="xs" 
                                          onClick={() => toggleRowExpand(declNo)} 
                                          className="h-6 w-6 p-0"
                                        >
                                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                      </TableCell>
                                      <TableCell className="p-2">{statusBadge}</TableCell>
                                      <TableCell className="p-2 font-mono font-medium">{declNo}</TableCell>
                                      <TableCell className="p-2 font-mono">{tx.currencyCode}</TableCell>
                                      <TableCell className="p-2 font-semibold font-mono">
                                        {totalFobValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <DatePicker
                                          value={settings.submissionDate}
                                          onChange={(val) => handleSubmissionDateChange(declNo, val)}
                                          className="w-[150px]"
                                          inputClassName="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50"
                                          buttonClassName="h-7 w-7"
                                        />
                                      </TableCell>
                                      <TableCell className="p-2">
                                        <CustomerCombobox
                                          companyId={cId}
                                          value={settings.customerId}
                                          onChange={(val) => setRowSettings(prev => ({
                                            ...prev,
                                            [declNo]: { ...prev[declNo], customerId: val }
                                          }))}
                                          className="h-7 text-xs w-[180px] bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50"
                                        />
                                      </TableCell>
                                      <TableCell className="p-2 font-mono">
                                        {isTHB ? (
                                          <span className="text-muted-foreground">1.000000 (THB)</span>
                                        ) : settings.rateLoading ? (
                                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-sans">
                                            <Loader2 className="h-3 w-3 animate-spin" /> ค้นหาเรท...
                                          </span>
                                        ) : settings.rateError ? (
                                          <div className="flex flex-col">
                                            <span className="text-rose-500 text-[10px] leading-tight font-sans">
                                              {settings.rateError}
                                            </span>
                                            <Input
                                              type="number"
                                              placeholder="ใส่เรทเอง"
                                              value={settings.exchangeRate}
                                              onChange={(e) => setRowSettings(prev => ({
                                                ...prev,
                                                [declNo]: { ...prev[declNo], exchangeRate: e.target.value }
                                              }))}
                                              className="h-6 w-[100px] text-xs px-1 mt-1 font-mono"
                                            />
                                          </div>
                                        ) : settings.exchangeRate ? (
                                          <div className="flex flex-col leading-tight">
                                            <span className="font-semibold text-primary">
                                              {parseFloat(settings.exchangeRate).toFixed(6)}
                                            </span>
                                            {settings.botActualDate && (
                                              <span className="text-[10px] text-muted-foreground">
                                                BOT: {format(new Date(settings.botActualDate), 'dd/MM/yyyy')}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground italic text-[11px] font-sans">รอกำหนดวันที่</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="p-2">
                                        {validation?.duplicateStatus !== 'none' ? (
                                          <Select
                                            value={settings.duplicateAction}
                                            onValueChange={(val) => setRowSettings(prev => ({
                                              ...prev,
                                              [declNo]: { ...prev[declNo], duplicateAction: val as any }
                                            }))}
                                            disabled={validation?.duplicateStatus === 'duplicate_blocked'}
                                          >
                                            <SelectTrigger className="h-7 w-[120px] text-xs font-sans">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="skip" className="text-xs font-sans">ข้าม (Skip)</SelectItem>
                                              <SelectItem 
                                                value="overwrite" 
                                                disabled={validation?.duplicateStatus === 'duplicate_blocked'}
                                                className="text-xs font-sans"
                                              >
                                                เขียนทับ (Overwrite)
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                    </TableRow>

                                    {/* Expansion Row */}
                                    {isExpanded && (
                                      <TableRow className="bg-slate-50/10 dark:bg-slate-950/10">
                                        <TableCell colSpan={9} className="p-3 border-y border-dashed">
                                          <div className="space-y-3">
                                            {/* Error/Warning list */}
                                            {validation && validation.messages.length > 0 && (
                                              <div className="bg-amber-50/30 dark:bg-amber-950/5 border border-amber-200/55 p-2 rounded text-[11px] space-y-1">
                                                <p className="font-semibold text-amber-800 dark:text-amber-400 font-sans">ผลการตรวจสอบใบขนนี้:</p>
                                                <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                                  {validation.messages.map((msg: string, idx: number) => (
                                                    <li key={idx} className="font-sans">{msg}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}

                                            {/* Invoices detail table */}
                                            <div className="rounded-md border bg-card p-2 space-y-2">
                                              <p className="font-semibold text-[11px] text-muted-foreground px-1 font-sans">
                                                รายการอินวอยซ์และรายการสินค้า ({tx.invoices.length} อินวอยซ์)
                                              </p>
                                              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                                                {tx.invoices.map((inv) => (
                                                  <div key={inv.invoiceNumber} className="py-2 first:pt-0 last:pb-0 space-y-1">
                                                    <div className="flex justify-between text-xs px-1 pb-1">
                                                      <span className="font-medium text-slate-700 dark:text-slate-300 font-sans">
                                                        อินวอยซ์เลขที่: <span className="font-mono text-primary font-bold">{inv.invoiceNumber}</span>
                                                      </span>
                                                      <span className="text-muted-foreground font-sans">
                                                        วันที่อินวอยซ์: {inv.invoiceDate ? format(new Date(inv.invoiceDate), 'dd/MM/yyyy') : '-'}
                                                      </span>
                                                    </div>
                                                    <Table className="text-[11px]">
                                                      <TableHeader className="bg-slate-100/40 dark:bg-slate-900/30">
                                                        <TableRow className="hover:bg-transparent">
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 w-[40px] text-center">#</TableHead>
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 font-sans">ชื่อสินค้า ( goodsName )</TableHead>
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 w-[100px] text-right font-sans">จำนวน (Qty)</TableHead>
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 w-[120px] text-right font-sans">ราคา/หน่วย (Price)</TableHead>
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 w-[120px] text-right font-sans">ยอดรวม (FOB)</TableHead>
                                                          <TableHead className="h-6 p-1 py-1 text-slate-500 w-[100px] text-right font-sans">น้ำหนักสุทธิ</TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {inv.items.map((it, idx) => (
                                                          <TableRow key={idx} className="hover:bg-slate-50/10 dark:hover:bg-slate-900/5">
                                                            <TableCell className="p-1 text-center font-mono text-muted-foreground">{it.itemNo ?? (idx + 1)}</TableCell>
                                                            <TableCell className="p-1 font-medium font-sans">{it.goodsName}</TableCell>
                                                            <TableCell className="p-1 text-right font-mono">{it.quantity.toLocaleString()}</TableCell>
                                                            <TableCell className="p-1 text-right font-mono">
                                                              {it.price.toLocaleString('en-US', { minimumFractionDigits: 4 })}
                                                            </TableCell>
                                                            <TableCell className="p-1 text-right font-mono font-semibold">
                                                              {it.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="p-1 text-right font-mono text-muted-foreground">
                                                              {it.netWeight ? `${it.netWeight.toLocaleString()} kg` : '-'}
                                                            </TableCell>
                                                          </TableRow>
                                                        ))}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 p-3 border rounded-md shrink-0">
                        <div className="text-xs text-muted-foreground font-sans">
                          ตรวจพบใบขนทั้งหมด <span className="font-semibold text-slate-800 dark:text-slate-200">{groupedTxns.length}</span> รายการ 
                          (รวมรายการย่อยทั้งหมด {groupedTxns.reduce((s, tx) => s + tx.invoices.reduce((is, inv) => is + inv.items.length, 0), 0)} สินค้า)
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={resetState} disabled={isSubmitting} className="font-sans">
                            ยกเลิก
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleConfirmImport} 
                            disabled={isSubmitting || isValidating}
                            className="gap-2 shadow-sm font-sans"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> กำลังบันทึก...
                              </>
                            ) : (
                              <>
                                นำเข้า {groupedTxns.length} รายการใบขน
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>

      {/* Full-screen Loading Overlay for Import Actions */}
      {(isParsing || isValidating || isSubmitting) && (
        <div className="absolute inset-0 bg-background/55 backdrop-blur-xs flex flex-col items-center justify-center z-50">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse font-sans">
            {isParsing ? 'กำลังอ่านและวิเคราะห์ไฟล์ Excel...' : 
             isValidating ? 'กำลังตรวจสอบความถูกต้องของข้อมูลใบขน...' : 
             'กำลังบันทึกข้อมูลใบขนสินค้าเข้าระบบ...'}
          </p>
        </div>
      )}
    </div>
  );
}
