import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanyStore } from '@/stores/company-store';
import { useCustomerStore } from '@/stores/customer-store';
import { CustomerCombobox } from '@/components/customer-combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useExcelTemplateStore, type ExcelTemplate } from '@/stores/excel-template-store';
import { toast } from 'sonner';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, Globe2, ChevronDown, ChevronRight, Search, Sliders,
  Trash2, Copy, Plus, Star, ArrowLeft, Check, Edit3, Settings2, FileText
} from 'lucide-react';
import { 
  groupExcelRows, 
  cleanTaxId, 
  extractRowTaxId,
  type ImportTransaction 
} from '@/lib/import-helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RowSetting {
  customerId: string;
  submissionDate: string;
  exchangeRate: string;
  rateDate: string;
  rateSource?: string;
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
  { key: 'exporterTaxNo', label: 'เลขผู้เสียภาษีผู้ส่งออก/ผู้นำเข้า (Tax ID)', required: true },
  { key: 'exporterName', label: 'ชื่อผู้ส่งออก/ผู้นำเข้า (Exporter/Importer Name)', required: true },
  { key: 'currencyCode', label: 'รหัสสกุลเงิน (Currency Code)', required: true },
  { key: 'goodsNameTH', label: 'ชื่อสินค้าภาษาไทย (Goods Name TH)', required: false },
  { key: 'goodsNameEN', label: 'ชื่อสินค้าภาษาอังกฤษ (Goods Name EN)', required: false },
  { key: 'itemNo', label: 'ลำดับรายการสินค้า (Item Number)', required: false },
  { key: 'quantity', label: 'จำนวนสินค้า (Quantity)', required: true },
  { key: 'netWeight', label: 'น้ำหนักสุทธิ (Net Weight)', required: false },
  { key: 'price', label: 'ราคาต่อหน่วย (Unit Price / FOB / CIF)', required: false },
  { key: 'fobPrice', label: 'มูลค่าสินค้า FOB (FOB Price)', required: false },
  { key: 'freight', label: 'ค่าระวาง (Freight Amount)', required: false },
  { key: 'insurance', label: 'ค่าประกันภัย (Insurance Amount)', required: false },
  { key: 'totalPrice', label: 'ราคารวมสินค้า (FOB / CIF / Total Price / Amount)', required: true },
  { key: 'term', label: 'เงื่อนไขการส่งมอบ (Term / Incoterm เช่น FOB, CNF, CIF)', required: false },
  { key: 'status', label: 'สถานะรายการ (Status)', required: false },
  { key: 'notes', label: 'หมายเหตุ / อ้างอิง (Notes/Remark)', required: false },
];

const FIELD_ALIASES: Record<string, string[]> = {
  declarationNumber: ['declarationnumber', 'declarationno', 'declno', 'เลขที่ใบขน', 'เลขที่ใบขนสินค้า', 'ใบขน', 'ใบขนสินค้า', 'customsno', 'customsdeclarationno'],
  invoiceNumber: ['invoicenumber', 'invoiceno', 'invno', 'เลขที่อินวอย', 'เลขที่ใบกำกับ', 'เลขที่ใบกำกับสินค้า', 'invoice'],
  invoiceDate: ['invoicedate', 'invdate', 'วันที่อินวอย', 'วันที่ใบกำกับ', 'วันที่ใบกำกับสินค้า', 'invoiced'],
  exporterTaxNo: ['exportertaxno', 'exportertaxid', 'taxid', 'taxno', 'importertaxno', 'importertaxid', 'consigneetaxno', 'เลขผู้เสียภาษี', 'เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษีผู้ส่งออก', 'เลขผู้เสียภาษีผู้นำเข้า', 'exportertax', 'importertax'],
  exporterName: ['exportername', 'exporter', 'importername', 'importer', 'consignee', 'ผู้ส่งออก', 'ผู้นำเข้า', 'ชื่อผู้ส่งออก', 'ชื่อผู้นำเข้า', 'companyname', 'company'],
  currencyCode: ['currencycode', 'currency', 'cur', 'สกุลเงิน', 'รหัสสกุลเงิน', 'ccy'],
  goodsNameTH: ['goodsnameth', 'goodsnamethai', 'goodsname_th', 'ชื่อสินค้า', 'ชื่อสินค้าไทย', 'ชื่อสินค้าภาษาไทย', 'รายการสินค้า', 'สินค้า'],
  goodsNameEN: ['goodsnameen', 'goodsnameeng', 'goodsname_en', 'goodsname', 'description', 'goodsdescription', 'ชื่อสินค้าภาษาอังกฤษ'],
  itemNo: ['itemno', 'itemnumber', 'item', 'ลำดับ', 'ลำดับรายการ', 'ลำดับสินค้า', 'ลำดับที่'],
  quantity: ['quantity', 'qty', 'จำนวน', 'จำนวนสินค้า'],
  netWeight: ['netweight', 'weight', 'น้ำหนัก', 'น้ำหนักสุทธิ', 'netwt', 'gw', 'nw'],
  price: ['price', 'unitprice', 'ราคาต่อหน่วย', 'ราคา', 'fobunit', 'unitpricefob', 'cifunit', 'unitpricecif', 'ราคาcifต่อหน่วย'],
  fobPrice: ['fob', 'fobprice', 'totalfob', 'fob price', 'มูลค่าfob', 'ราคาสินค้า', 'มูลค่าสินค้า', 'invoicevalue', 'invoice value', 'invoicetotal', 'amount', 'total amount', 'amt', 'fcy amount', 'fcy', 'amount fcy', 'amount foreign'],
  freight: ['freight', 'freightamount', 'freight amount', 'fright', 'frightamount', 'fright amount', 'frightthb', 'freightthb', 'frightfcy', 'freightfcy', 'ค่าระวาง', 'ค่าขนส่ง', 'ค่าเฟรท', 'oceanfreight', 'airfreight', 'frt', 'frtamt', 'ค่าระวางเรือ', 'ค่าระวางต่างประเทศ'],
  insurance: ['insurance', 'insuranceamount', 'insurance amount', 'ins', 'insamount', 'insurancethb', 'insurancefcy', 'insthb', 'insfcy', 'insuarance', 'insuarance amount', 'insuarance thb', 'insuarancefcy', 'ค่าประกัน', 'ค่าประกันภัย', 'ค่าประกันต่างประเทศ', 'ค่าประกันบาท'],
  totalPrice: ['totalprice', 'totalfob', 'totalfobprice', 'total price', 'total cif', 'total amount', 'amount', 'amt', 'amount fcy', 'fcy amount', 'fob', 'fobthb', 'cif', 'cifthb', 'totalcif', 'totalcifprice', 'ราคารวม', 'ราคารวมสินค้า', 'ราคารวมfob', 'ราคารวมcif', 'ยอดรวม', 'ยอดรวมcif', 'cifprice', 'ราคาสินค้า', 'มูลค่าสินค้า'],
  term: ['term', 'terms', 'incoterm', 'incoterms', 'deliveryterm', 'delivery term', 'termofdelivery', 'termofpayment', 'paymentterm', 'payment terms', 'เงื่อนไข', 'เทอม', 'เทอมการค้า', 'เงื่อนไขการส่งมอบ'],
  status: ['status', 'สถานะ', 'สถานะรายการ'],
  notes: ['notes', 'remark', 'remarks', 'note', 'หมายเหตุ', 'อ้างอิง'],
};

export default function ImportTransactionsPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');

  const { companies, fetchCompanies } = useCompanyStore();
  const { fetchCustomers } = useCustomerStore();
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useExcelTemplateStore();

  const activeCompany = companies.find(c => c.id === cId);
  const companyTemplates = templates[cId] || [];

  const [activeTab, setActiveTab] = useState<'import' | 'templates'>('import');
  const [templateView, setTemplateView] = useState<'list' | 'editor'>('list');
  const [deletingTemplate, setDeletingTemplate] = useState<ExcelTemplate | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [isParsing, setIsParsing] = useState(false);
  const [rawExcelRows, setRawExcelRows] = useState<any[]>([]);
  const [groupedTxns, setGroupedTxns] = useState<ImportTransaction[]>([]);
  const [productLang, setProductLang] = useState<'TH' | 'EN'>('TH');
  const [selectedImportTemplateId, setSelectedImportTemplateId] = useState<number | 'auto'>('auto');

  const [editingTemplateId, setEditingTemplateId] = useState<number | 'new'>('new');
  const [templateName, setTemplateName] = useState<string>('');
  const [isDefaultTemplate, setIsDefaultTemplate] = useState<boolean>(false);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);

  const [taxMismatchData, setTaxMismatchData] = useState<{ fileTax: string; companyTax: string } | null>(null);
  const [taxMismatchBlocked, setTaxMismatchBlocked] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [rowSettings, setRowSettings] = useState<Record<string, RowSetting>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchCustomerId, setBatchCustomerId] = useState<string>('none');
  const [batchSubmissionDate, setBatchSubmissionDate] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeImportTemplate = selectedImportTemplateId === 'auto'
    ? (companyTemplates.find(t => t.isDefault) || null)
    : (companyTemplates.find(t => t.id === selectedImportTemplateId) || null);

  const filteredTxns = groupedTxns.filter(tx => tx.declarationNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    if (cId) {
      fetchCompanies();
      fetchCustomers(cId);
      fetchTemplates(cId);
    }
  }, [cId]);

  useEffect(() => {
    if (companyTemplates.length > 0 && selectedImportTemplateId === 'auto') {
      const defaultTmpl = companyTemplates.find(t => t.isDefault);
      if (defaultTmpl) setSelectedImportTemplateId(defaultTmpl.id);
    }
  }, [companyTemplates, selectedImportTemplateId]);

  useEffect(() => {
    if (rawExcelRows.length > 0) {
      const mapping = (activeImportTemplate?.mapping as Record<string, string>) || null;
      const grouped = groupExcelRows(rawExcelRows, productLang, mapping);
      setGroupedTxns(grouped);
      validateGroupedData(grouped);
    }
  }, [productLang, selectedImportTemplateId]);

  const toggleRowExpand = (declNo: string) => {
    const next = new Set(expandedRows);
    if (next.has(declNo)) next.delete(declNo); else next.add(declNo);
    setExpandedRows(next);
  };

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
          const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
          if (rows.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
          setRawExcelRows(rows);
          const mapping = (activeImportTemplate?.mapping as Record<string, string>) || null;
          const taxField = mapping?.exporterTaxNo;

          // Extract tax ID from rows using mapping or auto-matching aliases
          let rawFileTax = '';
          for (const r of rows) {
            const extracted = extractRowTaxId(r, taxField);
            if (extracted) {
              rawFileTax = extracted;
              break;
            }
          }

          const cleanedFileTax = cleanTaxId(rawFileTax);
          const cleanedCompanyTax = cleanTaxId(activeCompany?.taxId || '');

          if (cleanedFileTax && cleanedCompanyTax && cleanedFileTax !== cleanedCompanyTax) {
            setTaxMismatchData({ fileTax: rawFileTax, companyTax: activeCompany?.taxId || '' });
            setTaxMismatchBlocked(true);
            setIsParsing(false);
            toast.warning('เลขประจำตัวผู้เสียภาษีผู้ส่งออกไม่ตรงกัน', { position: 'top-center' });
            return;
          } else {
            setTaxMismatchBlocked(false);
            setTaxMismatchData(null);
            const grouped = groupExcelRows(rows, productLang, mapping);
            setGroupedTxns(grouped);
            await validateGroupedData(grouped);
            toast.success(`โหลดข้อมูลใบขนสำเร็จ: ตรวจพบ ${grouped.length} ใบขน`, { position: 'top-center' });
          }
        } catch (err) { toast.error((err as Error).message); } finally { setIsParsing(false); }
      };
      reader.readAsBinaryString(uploadedFile);
    } catch (err) { setIsParsing(false); }
  };

  const validateGroupedData = async (transactions: ImportTransaction[]) => {
    setIsValidating(true);
    try {
      const res = await fetch(`/api/transactions/validate-import?companyId=${cId}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ transactions }) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const resultsMap: Record<string, any> = {};
      const initialSettings: Record<string, RowSetting> = { ...rowSettings };
      json.data.forEach((tx: any) => {
        resultsMap[tx.declarationNumber] = tx.validation;
        if (!initialSettings[tx.declarationNumber]) {
          initialSettings[tx.declarationNumber] = { 
            customerId: tx.customerId ? String(tx.customerId) : 'none', 
            submissionDate: tx.declarationDate || '', 
            exchangeRate: tx.currencyCode === 'THB' ? '1' : '', 
            rateDate: '', 
            duplicateAction: 'skip', 
            rateLoading: tx.currencyCode !== 'THB' && !!tx.declarationDate, 
            rateError: null, 
            botRateFound: tx.currencyCode === 'THB', 
            botActualDate: null 
          };
        }
      });
      setValidationResults(resultsMap);
      setRowSettings(initialSettings);
      Object.keys(initialSettings).forEach(declNo => {
        const txn = transactions.find(t => t.declarationNumber === declNo);
        if (txn && initialSettings[declNo].rateLoading) fetchBotRate(declNo, txn.currencyCode, initialSettings[declNo].submissionDate, true);
      });
    } catch (err) { toast.error((err as Error).message); } finally { setIsValidating(false); }
  };

  const fetchBotRate = async (declNo: string, currency: string, submissionDate: string, skipStartLoading = false) => {
    if (!submissionDate || !submissionDate.trim() || currency === 'THB') return;
    if (!skipStartLoading) setRowSettings(prev => ({ ...prev, [declNo]: { ...prev[declNo], rateLoading: true, rateError: null } }));
    try {
      const res = await fetch(`/api/rates/bot-fallback/${currency}/${submissionDate}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRowSettings(prev => ({ 
        ...prev, 
        [declNo]: { 
          ...prev[declNo], 
          exchangeRate: importType === 'IMPORT' ? (json.data.selling || json.data.buyingTransfer) : json.data.buyingTransfer, 
          rateDate: json.data.period, 
          rateSource: json.data.source || 'BOT',
          rateLoading: false, 
          botRateFound: true, 
          botActualDate: json.data.period, 
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

  const handleSubmissionDateChange = (declNo: string, dateStr: string) => {
    setRowSettings(prev => ({ ...prev, [declNo]: { ...prev[declNo], submissionDate: dateStr } }));
    if (!dateStr || !dateStr.trim()) {
      setRowSettings(prev => ({ ...prev, [declNo]: { ...prev[declNo], exchangeRate: '', rateDate: '', rateSource: undefined, rateLoading: false, rateError: null, botRateFound: false, botActualDate: null } }));
      return;
    }
    const txn = groupedTxns.find(t => t.declarationNumber === declNo);
    if (txn && txn.currencyCode !== 'THB') fetchBotRate(declNo, txn.currencyCode, dateStr);
  };

  const handleBatchCustomerApply = () => {
    if (batchCustomerId === 'none') return;
    setRowSettings(prev => { 
      const next = { ...prev }; 
      Object.keys(next).forEach(d => next[d].customerId = batchCustomerId); 
      return next; 
    });
    toast.success('กำหนดลูกค้าให้ทุกรายการเรียบร้อย');
  };

  const handleBatchDateApply = async () => {
    if (!batchSubmissionDate) return;
    setRowSettings(prev => { 
      const next = { ...prev }; 
      Object.keys(next).forEach(d => next[d].submissionDate = batchSubmissionDate); 
      return next; 
    });
    toast.success('กำหนดวันส่งข้อมูลให้ทุกรายการเรียบร้อย');
    const nonThb = groupedTxns.filter(tx => tx.currencyCode !== 'THB');
    for (const tx of nonThb) await fetchBotRate(tx.declarationNumber, tx.currencyCode, batchSubmissionDate);
  };

  const handleConfirmImport = async () => {
    const payload = groupedTxns.map((tx) => {
      const settings = rowSettings[tx.declarationNumber];
      return { 
        transaction: { ...tx, declarationDate: settings?.submissionDate || '' }, 
        customerId: settings?.customerId && settings.customerId !== 'none' ? parseInt(settings.customerId) : null, 
        duplicateAction: settings?.duplicateAction || 'skip', 
        exchangeRate: tx.currencyCode === 'THB' ? '1' : (settings?.exchangeRate || '1'), 
        rateDate: tx.currencyCode === 'THB' ? settings?.submissionDate : (settings?.rateDate || settings?.submissionDate), 
        rateSource: tx.currencyCode === 'THB' ? 'THB' : (settings?.rateSource || 'BOT'),
        type: importType 
      };
    });
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/confirm-import?companyId=${cId}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ items: payload }) 
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to import');
      }
      const json = await res.json();
      toast.success(`นำเข้าสำเร็จ! เพิ่มรายการใหม่ ${json.importCount} รายการ, เขียนทับ ${json.overwriteCount} รายการ`);
      resetState();
    } catch (err) { toast.error((err as Error).message); } finally { setIsSubmitting(false); }
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
          const wb = XLSX.read(evt.target?.result, { type: 'binary' });
          const extractedHeaders = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0] as string[];
          const cleaned = Array.from(new Set(extractedHeaders.map(h => String(h).trim()).filter(Boolean)));
          setHeaders(cleaned);
          const newMapping = { ...mappingState };
          SYSTEM_FIELDS.forEach(f => {
            if (!newMapping[f.key]) {
              const match = cleaned.find(h => {
                const normH = h.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
                return (FIELD_ALIASES[f.key] || []).some(a => a.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '') === normH) || normH === f.key.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
              });
              if (match) newMapping[f.key] = match;
            }
          });
          setMappingState(newMapping);
          toast.success(`ดึงหัวตารางสำเร็จ: ตรวจพบ ${cleaned.length} คอลัมน์`);
        } catch (err) { toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล'); } finally { setIsParsing(false); }
      };
      reader.readAsBinaryString(uploadedFile);
    } catch (err) { setIsParsing(false); }
  };

  const handleStartCreateNewTemplate = () => {
    setEditingTemplateId('new');
    setTemplateName('');
    setMappingState({});
    setIsDefaultTemplate(companyTemplates.length === 0);
    setSampleFile(null);
    setHeaders([]);
    setTemplateView('editor');
  };

  const handleStartEditTemplate = (tmpl: ExcelTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setMappingState(tmpl.mapping || {});
    setIsDefaultTemplate(tmpl.isDefault);
    setHeaders(Array.from(new Set(Object.values(tmpl.mapping || {}).filter(Boolean))));
    setSampleFile(null);
    setTemplateView('editor');
  };

  const handleSetDefaultTemplate = async (tmpl: ExcelTemplate) => {
    try { 
      await updateTemplate(cId, tmpl.id, { isDefault: true }); 
      toast.success(`ตั้ง "${tmpl.name}" เป็นเทมเพลตเริ่มต้นแล้ว ⭐`); 
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleDuplicateTemplate = async (tmpl: ExcelTemplate) => {
    try { 
      await createTemplate(cId, { name: `${tmpl.name} (คัดลอก)`, mapping: tmpl.mapping, isDefault: false }); 
      toast.success(`คัดลอกเทมเพลตสำเร็จ`); 
    } catch (err) { toast.error((err as Error).message); }
  };

  const handleSaveTemplate = async (asNew: boolean = false) => {
    if (!templateName.trim()) { toast.error('กรุณาระบุชื่อเทมเพลต'); return; }
    setIsSubmitting(true);
    try {
      if (editingTemplateId === 'new' || asNew) {
        await createTemplate(cId, { name: asNew ? `${templateName} (คัดลอก)` : templateName, mapping: mappingState, isDefault: isDefaultTemplate });
      } else {
        await updateTemplate(cId, editingTemplateId, { name: templateName, mapping: mappingState, isDefault: isDefaultTemplate });
      }
      toast.success('บันทึกเทมเพลตเรียบร้อย');
      setTemplateView('list');
    } catch (err) { toast.error((err as Error).message); } finally { setIsSubmitting(false); }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    setIsSubmitting(true);
    try { 
      await deleteTemplate(cId, deletingTemplate.id); 
      toast.success('ลบเทมเพลตเรียบร้อย'); 
      setDeletingTemplate(null); 
    } catch (err) { toast.error((err as Error).message); } finally { setIsSubmitting(false); }
  };

  const handleProceedAnyway = async () => {
    setTaxMismatchBlocked(false);
    if (rawExcelRows.length > 0) {
      const mapping = (activeImportTemplate?.mapping as Record<string, string>) || null;
      const grouped = groupExcelRows(rawExcelRows, productLang, mapping);
      setGroupedTxns(grouped);
      await validateGroupedData(grouped);
      toast.info('ดำเนินการต่อโดยข้ามการตรวจสอบเลขประจำตัวผู้เสียภาษี', { position: 'top-center' });
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
  };

  if (taxMismatchBlocked && taxMismatchData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl border-rose-200 bg-rose-50/20 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
              <div>
                <h2 className="text-lg font-bold">แจ้งเตือน: ตรวจพบเลขประจำตัวผู้เสียภาษีไม่ตรงกัน!</h2>
                <p className="text-xs text-muted-foreground">Exporter Tax ID Mismatch Check</p>
              </div>
            </div>
            <div className="text-sm space-y-1 py-2">
              <div className="flex justify-between"><span className="text-muted-foreground">ไฟล์ Excel:</span><span className="font-bold text-rose-600">{taxMismatchData.fileTax}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">บริษัทปัจจุบัน:</span><span className="font-bold">{taxMismatchData.companyTax}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ชื่อบริษัทปัจจุบัน:</span><span className="font-medium">{activeCompany?.name}</span></div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 p-2.5 rounded border">
              💡 เพื่อความถูกต้องทางบัญชีและภาษี กรุณาตรวจสอบว่าไฟล์ Excel ใบขนสินค้าตรงกับบริษัทที่กำลังเลือกใช้งานอยู่หรือไม่
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetState}>ยกเลิกการนำเข้า</Button>
              <Button variant="destructive" size="sm" onClick={handleProceedAnyway}>ดำเนินการต่อ (ข้ามคำเตือน)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background overflow-hidden">
      <PageHeader 
        title={activeTab === 'import' ? 'นำเข้าข้อมูลใบขนสินค้า (Excel Import)' : 'จัดการเทมเพลตการจับคู่คอลัมน์ (Template Management)'} 
        description={activeTab === 'import' ? 'นำเข้าและตรวจสอบข้อมูลใบขนสินค้าจากไฟล์ Excel พร้อมคำนวณอัตราแลกเปลี่ยนอัตโนมัติ' : 'จัดการเทมเพลตเพื่อรองรับการนำเข้าไฟล์ Excel จากหลากหลายชิปปิ้งหรือผู้ส่งออก'} 
      />

      <div className="flex-1 p-4 min-h-0 overflow-hidden bg-background">
        <Card className="flex-1 flex flex-row h-full min-h-0 overflow-hidden bg-muted/50 rounded-xl border shadow-sm">
          
          {/* Left Sub-Sidebar */}
          <div className="w-56 bg-sidebar/20 border-r border-border/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-border/50 bg-muted/20">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">นำเข้าข้อมูลใบขน</h2>
            </div>
            <div className="flex-1 p-2 space-y-1">
              <button 
                onClick={() => setActiveTab('import')} 
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'import' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:bg-sidebar-accent'}`}
              >
                <FileSpreadsheet className="h-4 w-4" /> นำเข้าไฟล์ Excel
              </button>
              <button 
                onClick={() => { setActiveTab('templates'); setTemplateView('list'); }} 
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${activeTab === 'templates' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:bg-sidebar-accent'}`}
              >
                <Sliders className="h-4 w-4" /> จัดการเทมเพลต
                {companyTemplates.length > 0 && <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">{companyTemplates.length}</Badge>}
              </button>
            </div>
            <div className="p-3 border-t border-border/50 bg-muted/20 text-[10px] text-muted-foreground">
              {companyTemplates.length > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ มี {companyTemplates.length} เทมเพลต</span>
              ) : (
                <span className="text-amber-600 font-medium">⚠️ ยังไม่มีเทมเพลต</span>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden p-4">
            {activeTab === 'import' ? (
              // TAB 1: UNIFIED IMPORT
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                {groupedTxns.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <Card className="w-full max-w-xl border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 shadow-xs p-8 text-center space-y-5">
                      <div className="p-4 bg-primary/10 rounded-full text-primary w-fit mx-auto">
                        <FileSpreadsheet className="h-10 w-10" />
                      </div>

                      <div className="w-full max-w-md space-y-3 text-left mx-auto">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold">เทมเพลตการจับคู่คอลัมน์</label>
                            <button 
                              type="button" 
                              onClick={() => { setActiveTab('templates'); setTemplateView('list'); }} 
                              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                            >
                              <Settings2 className="h-3.5 w-3.5" /> จัดการเทมเพลต
                            </button>
                          </div>
                          <Select value={String(selectedImportTemplateId)} onValueChange={(val) => setSelectedImportTemplateId(val === 'auto' ? 'auto' : Number(val))}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="เลือกเทมเพลต..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto" className="text-xs text-primary font-medium">✨ จับคู่อัตโนมัติ (Auto Match / ค่าเริ่มต้น)</SelectItem>
                              {companyTemplates.map(t => (
                                <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                                  {t.name} {t.isDefault ? '⭐ (ค่าเริ่มต้น)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold block mb-1">ประเภทใบขนที่ต้องการนำเข้า</label>
                          <Select value={importType} onValueChange={(val: any) => setImportType(val)}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IMPORT" className="text-xs">ขาเข้า (Import)</SelectItem>
                              <SelectItem value="EXPORT" className="text-xs">ขาออก (Export)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">อัปโหลดไฟล์ Excel ใบขนสินค้า</h3>
                        <p className="text-xs text-muted-foreground">ลากไฟล์ .xlsx หรือ .xls มาวาง หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์</p>
                      </div>

                      <div className="flex justify-center">
                        <label className="cursor-pointer">
                          <Input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileChange} />
                          <Button asChild size="sm" className="gap-2">
                            <span>
                              {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              เลือกไฟล์ Excel
                            </span>
                          </Button>
                        </label>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-hidden">
                    {/* Top Controls */}
                    <Card className="shrink-0 border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                      <CardContent className="p-3 flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">ภาษาชื่อสินค้า:</span>
                          <div className="flex border rounded-md overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <button 
                              className={`px-3 py-1 text-xs font-semibold ${productLang === 'TH' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                              onClick={() => setProductLang('TH')}
                            >
                              ไทย (TH)
                            </button>
                            <button 
                              className={`px-3 py-1 text-xs font-semibold ${productLang === 'EN' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                              onClick={() => setProductLang('EN')}
                            >
                              อังกฤษ (EN)
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">ลูกค้า:</span>
                            <CustomerCombobox companyId={cId} value={batchCustomerId} onChange={setBatchCustomerId} className="w-[150px] h-7 text-xs" />
                            <Button variant="secondary" size="xs" onClick={handleBatchCustomerApply} className="h-7 text-xs">กำหนดทั้งหมด</Button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">วันส่งศุลกากร:</span>
                            <DatePicker value={batchSubmissionDate} onChange={setBatchSubmissionDate} className="w-[140px]" inputClassName="h-7 text-xs" buttonClassName="h-7 w-7" />
                            <Button variant="secondary" size="xs" onClick={handleBatchDateApply} className="h-7 text-xs">กำหนดทั้งหมด</Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">{file?.name}</span>
                          <Button variant="ghost" size="xs" onClick={resetState} className="text-rose-600 hover:text-rose-700 h-7 text-xs">ล้างใหม่</Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preview Table */}
                    <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                      <div className="p-3 border-b flex items-center justify-between gap-4 bg-muted/20">
                        <div className="relative w-72">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="ค้นหาเลขที่ใบขน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs pl-8 w-full bg-background" />
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          แสดง {filteredTxns.length} จาก {groupedTxns.length} ใบขนสินค้า
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto">
                        <Table className="relative text-xs">
                          <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50 sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[36px] px-1"></TableHead>
                              <TableHead className="w-[85px] px-2">สถานะ</TableHead>
                              <TableHead className="w-[160px] px-2">เลขที่ใบขน</TableHead>
                              <TableHead className="w-[70px] px-2">สกุลเงิน</TableHead>
                              <TableHead className="w-[130px] px-2">ยอดรวมสินค้า</TableHead>
                              <TableHead className="w-[155px] px-2">วันส่งข้อมูลศุลกากร *</TableHead>
                              <TableHead className="w-[185px] px-2">ลูกค้า (ค่าเริ่มต้น: ลูกค้าทั่วไป)</TableHead>
                              <TableHead className="w-[230px] px-2">อัตราแลกเปลี่ยน (BOT / ระบบ)</TableHead>
                              <TableHead className="w-[120px] px-2">การจัดการซ้ำ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTxns.map((tx) => {
                              const declNo = tx.declarationNumber;
                              const validation = validationResults[declNo];
                              const settings = rowSettings[declNo] || { customerId: 'none', submissionDate: '', exchangeRate: '', rateDate: '', duplicateAction: 'skip', rateLoading: false, rateError: null, botRateFound: false, botActualDate: null };
                              const isExpanded = expandedRows.has(declNo);
                              const isTHB = tx.currencyCode === 'THB';
                              const totalVal = tx.invoices.reduce((sum, inv) => sum + inv.items.reduce((iSum, it) => iSum + it.totalPrice, 0), 0);

                              let statusBadge = <Badge variant="secondary" className="text-[10px] py-0 h-5">Checking...</Badge>;
                              if (validation) {
                                if (validation.status === 'error') {
                                  statusBadge = <Badge variant="destructive" className="text-[10px] py-0 h-5 gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
                                } else if (validation.status === 'warning') {
                                  statusBadge = <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-amber-400 bg-amber-50 text-amber-800"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
                                } else {
                                  statusBadge = <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-emerald-400 bg-emerald-50 text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
                                }
                              }

                              return (
                                <React.Fragment key={declNo}>
                                  <TableRow className={`hover:bg-muted/40 transition-colors ${isExpanded ? 'bg-slate-50/30 dark:bg-slate-900/10' : ''}`}>
                                    <TableCell className="text-center py-1.5 px-1">
                                      <Button variant="ghost" size="xs" onClick={() => toggleRowExpand(declNo)} className="h-6 w-6 p-0">
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2">{statusBadge}</TableCell>
                                    <TableCell className="py-1.5 px-2 font-medium">{declNo}</TableCell>
                                    <TableCell className="py-1.5 px-2">{tx.currencyCode}</TableCell>
                                    <TableCell className="py-1.5 px-2 font-semibold">{totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="py-1.5 px-2">
                                      <DatePicker 
                                        value={settings.submissionDate} 
                                        onChange={(val) => handleSubmissionDateChange(declNo, val)} 
                                        className="w-[140px]" 
                                        inputClassName="h-7 text-xs bg-warning/15 border-warning/30" 
                                        buttonClassName="h-7 w-7" 
                                      />
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2">
                                      <CustomerCombobox 
                                        companyId={cId} 
                                        value={settings.customerId} 
                                        onChange={(val) => setRowSettings(prev => ({ ...prev, [declNo]: { ...prev[declNo], customerId: val } }))} 
                                        className="h-7 text-xs w-[170px]" 
                                      />
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2">
                                      {isTHB ? (
                                        <span className="text-muted-foreground text-xs">1.000000 (THB)</span>
                                      ) : settings.rateLoading ? (
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> ค้นหาเรท...</span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                          <Input 
                                            type="number" 
                                            step="0.0001"
                                            value={settings.exchangeRate} 
                                            onChange={(e) => setRowSettings(prev => ({ 
                                              ...prev, 
                                              [declNo]: { ...prev[declNo], exchangeRate: e.target.value, rateSource: 'MANUAL' } 
                                            }))} 
                                            className="h-7 text-xs w-[80px] bg-warning/15 border-warning/30 px-1.5 text-right shrink-0 font-medium" 
                                          />
                                          {settings.botRateFound && (
                                            settings.rateSource === 'LOCAL_DB' ? (
                                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-sans shrink-0" title={`เรทวันที่: ${settings.botActualDate} (ฐานข้อมูลในระบบ)`}>
                                                ระบบ
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-sans shrink-0" title={`เรทวันที่: ${settings.botActualDate} (ธปท. BOT)`}>
                                                BOT
                                              </Badge>
                                            )
                                          )}
                                          {settings.botActualDate && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                              {settings.botActualDate}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2">
                                      {validation?.duplicateStatus === 'duplicate_eligible' && (
                                        <Select value={settings.duplicateAction} onValueChange={(val: any) => setRowSettings(prev => ({ ...prev, [declNo]: { ...prev[declNo], duplicateAction: val } }))}>
                                          <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="skip" className="text-xs">ข้าม</SelectItem>
                                            <SelectItem value="overwrite" className="text-xs text-rose-600 font-medium">เขียนทับ</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </TableCell>
                                  </TableRow>

                                  {isExpanded && (
                                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/30">
                                      <TableCell colSpan={9} className="p-3 pl-12">
                                        <div className="space-y-3">
                                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">รายการอินวอยและสินค้า ({tx.invoices.length} อินวอย)</h4>
                                          {tx.invoices.map((inv, iIdx) => (
                                            <div key={iIdx} className="bg-background rounded border p-2.5 space-y-2">
                                              <div className="flex justify-between text-xs font-medium">
                                                <span>Invoice: {inv.invoiceNumber} ({inv.invoiceDate})</span>
                                                <span>ยอดรวม: {inv.items.reduce((s, it) => s + it.totalPrice, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.currencyCode}</span>
                                              </div>
                                              <Table className="text-[11px]">
                                                <TableHeader>
                                                  <TableRow className="h-6">
                                                    <TableHead className="h-6">ลำดับ</TableHead>
                                                    <TableHead className="h-6">ชื่อสินค้า</TableHead>
                                                    <TableHead className="h-6 text-right">จำนวน</TableHead>
                                                    <TableHead className="h-6 text-right">นน. (NW)</TableHead>
                                                    <TableHead className="h-6 text-right">ราคาต่อหน่วย</TableHead>
                                                    <TableHead className="h-6 text-right">ราคาสินค้า ({tx.currencyCode})</TableHead>
                                                    <TableHead className="h-6 text-right">ค่าระวาง ({tx.currencyCode})</TableHead>
                                                    <TableHead className="h-6 text-right">ค่าประกัน ({tx.currencyCode})</TableHead>
                                                    <TableHead className="h-6 text-right font-bold text-foreground">รวม CIF ({tx.currencyCode})</TableHead>
                                                    <TableHead className="h-6 text-right text-primary font-bold">รวม CIF (THB)</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {inv.items.map((it, itIdx) => {
                                                    const exRate = parseFloat(settings.exchangeRate) || 0;
                                                    const baseFcy = (it.fobPrice !== undefined && it.fobPrice > 0) ? it.fobPrice : (it.totalPrice || 0);
                                                    const freightFcy = it.freight || 0;
                                                    const insFcy = it.insurance || 0;
                                                    const cifForeign = baseFcy + freightFcy + insFcy;
                                                    const thbVal = exRate > 0 ? Math.round(cifForeign * exRate * 100) / 100 : 0;
                                                    return (
                                                      <TableRow key={itIdx} className="h-6">
                                                        <TableCell className="py-1">{it.itemNo || itIdx + 1}</TableCell>
                                                        <TableCell className="py-1 font-medium">{it.goodsName}</TableCell>
                                                        <TableCell className="py-1 text-right">{it.quantity}</TableCell>
                                                        <TableCell className="py-1 text-right text-muted-foreground">{it.netWeight ? it.netWeight.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</TableCell>
                                                        <TableCell className="py-1 text-right">{it.price ? it.price.toLocaleString('en-US', { minimumFractionDigits: 4 }) : '-'}</TableCell>
                                                        <TableCell className="py-1 text-right font-medium">{baseFcy.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                        <TableCell className="py-1 text-right text-muted-foreground">{freightFcy > 0 ? freightFcy.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</TableCell>
                                                        <TableCell className="py-1 text-right text-muted-foreground">{insFcy > 0 ? insFcy.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</TableCell>
                                                        <TableCell className="py-1 text-right font-bold text-foreground">{cifForeign.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                        <TableCell className="py-1 text-right text-primary font-semibold">
                                                          {thbVal > 0 ? `฿${thbVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : (exRate > 0 ? '฿0.00' : <span className="text-muted-foreground text-[10px] font-normal font-sans">(รอเลือกวันเรท)</span>)}
                                                        </TableCell>
                                                      </TableRow>
                                                    );
                                                  })}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          ))}
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
                    </Card>

                    {/* Bottom Confirm */}
                    <div className="shrink-0 flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                      <div className="text-xs text-muted-foreground">รวมทั้งหมด <strong>{groupedTxns.length}</strong> ใบขนสินค้า</div>
                      <Button size="sm" onClick={handleConfirmImport} disabled={isSubmitting || isValidating} className="gap-2 px-5">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        ยืนยันการนำเข้าข้อมูลเข้าสู่ระบบ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // TAB 2: TEMPLATE MANAGEMENT
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
                {templateView === 'list' ? (
                  <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-border/50">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Sliders className="h-5 w-5 text-primary" /> เทมเพลตการจับคู่คอลัมน์ (Column Mapping Templates)
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">จัดการเทมเพลตเพื่อรองรับการนำเข้าไฟล์ Excel จากหลากหลายชิปปิ้งหรือผู้ส่งออก</p>
                      </div>
                      <Button size="sm" onClick={handleStartCreateNewTemplate} className="gap-1.5 shrink-0">
                        <Plus className="h-4 w-4" /> สร้างเทมเพลตใหม่
                      </Button>
                    </div>

                    {companyTemplates.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="p-4 bg-muted rounded-full text-muted-foreground mb-3">
                          <Sliders className="h-8 w-8" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">ยังไม่มีเทมเพลตการจับคู่คอลัมน์</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">สร้างเทมเพลตเพื่อช่วยให้ระบบสามารถอ่านหัวตารางในไฟล์ Excel และแปลงเป็นข้อมูลได้อย่างแม่นยำ</p>
                        <Button size="sm" onClick={handleStartCreateNewTemplate} className="gap-1.5"><Plus className="h-4 w-4" /> สร้างเทมเพลตแรก</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                        {companyTemplates.map((tmpl) => {
                          const mappedCount = Object.keys(tmpl.mapping || {}).filter(k => (tmpl.mapping as any)[k]).length;
                          return (
                            <Card key={tmpl.id} className={`border transition-all shadow-xs hover:shadow-md ${tmpl.isDefault ? 'border-primary/50 bg-primary/5 dark:bg-primary/10' : 'border-border/60 bg-card'}`}>
                              <CardHeader className="p-4 pb-2 space-y-1">
                                <div className="flex justify-between items-start gap-2">
                                  <CardTitle className="text-sm font-bold truncate">{tmpl.name}</CardTitle>
                                  {tmpl.isDefault && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 shrink-0 gap-1 bg-amber-500 hover:bg-amber-600">
                                      <Star className="h-3 w-3 fill-current" /> ค่าเริ่มต้น
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="text-xs">จับคู่แล้ว {mappedCount} / {SYSTEM_FIELDS.length} ฟิลด์</CardDescription>
                              </CardHeader>
                              <CardContent className="p-4 pt-2 space-y-3">
                                <div className="text-[11px] space-y-1 bg-muted/40 p-2.5 rounded-md border border-border/40">
                                  <div className="flex justify-between text-muted-foreground"><span>เลขที่ใบขน:</span><span className="font-medium truncate max-w-[120px]">{(tmpl.mapping as any)?.declarationNumber || '-'}</span></div>
                                  <div className="flex justify-between text-muted-foreground"><span>เลขที่อินวอย:</span><span className="font-medium truncate max-w-[120px]">{(tmpl.mapping as any)?.invoiceNumber || '-'}</span></div>
                                  <div className="flex justify-between text-muted-foreground"><span>สกุลเงิน:</span><span className="font-medium truncate max-w-[120px]">{(tmpl.mapping as any)?.currencyCode || '-'}</span></div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-border/40">
                                  {!tmpl.isDefault ? (
                                    <Button variant="ghost" size="xs" onClick={() => handleSetDefaultTemplate(tmpl)} className="text-xs text-muted-foreground hover:text-amber-600 gap-1">
                                      <Star className="h-3.5 w-3.5" /> ตั้งเป็นค่าเริ่มต้น
                                    </Button>
                                  ) : (
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pl-1">
                                      <Check className="h-3.5 w-3.5" /> ใช้งานเป็นค่าเริ่มต้น
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="xs" onClick={() => handleDuplicateTemplate(tmpl)} title="คัดลอกเทมเพลตนี้" className="h-7 w-7 p-0"><Copy className="h-3.5 w-3.5" /></Button>
                                    <Button variant="outline" size="xs" onClick={() => handleStartEditTemplate(tmpl)} className="h-7 text-xs gap-1"><Edit3 className="h-3.5 w-3.5" /> แก้ไข</Button>
                                    <Button variant="ghost" size="xs" onClick={() => setDeletingTemplate(tmpl)} title="ลบเทมเพลต" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  // TEMPLATE EDITOR VIEW
                  <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => setTemplateView('list')} className="gap-1.5 -ml-2 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" /> กลับไปหน้ารวมเทมเพลต
                      </Button>
                      <h3 className="text-sm font-bold">{editingTemplateId === 'new' ? '✨ สร้างเทมเพลตใหม่' : `✏️ แก้ไขเทมเพลต: ${templateName}`}</h3>
                    </div>

                    <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-xs bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="w-full md:w-96 space-y-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ชื่อเทมเพลต <span className="text-rose-500">*</span></label>
                            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="เช่น ชิปปิ้ง A (ขาเข้า), DHL Express" className="h-8 text-xs bg-background" />
                          </div>
                          <div className="flex items-center gap-2 pt-2 md:pt-4">
                            <Switch id="editor-default-switch" checked={isDefaultTemplate} onCheckedChange={setIsDefaultTemplate} />
                            <label htmlFor="editor-default-switch" className="text-xs font-medium cursor-pointer select-none">ตั้งเป็นเทมเพลตเริ่มต้น (Default) สำหรับบริษัทนี้</label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1 space-y-4">
                        <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                          <CardContent className="p-4 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> 1. อัปโหลดไฟล์ตัวอย่าง</h4>
                            <p className="text-[11px] text-muted-foreground">อัปโหลดไฟล์ Excel เพื่อให้ระบบดึงรายชื่อหัวคอลัมน์จริงมาให้เลือกจับคู่</p>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center bg-slate-50/50 dark:bg-slate-900/10">
                              <label className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="h-6 w-6 text-slate-400" />
                                <span className="text-xs font-medium text-primary">เลือกไฟล์ตัวอย่าง</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{sampleFile ? sampleFile.name : 'ยังไม่ได้เลือกไฟล์'}</span>
                                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleSampleFileChange} />
                              </label>
                            </div>
                            {headers.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <p className="text-[11px] font-semibold">หัวตารางที่ตรวจพบ ({headers.length}):</p>
                                <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-900 rounded border">
                                  {headers.map((h, hIdx) => <Badge key={`${h}-${hIdx}`} variant="secondary" className="text-[10px]">{h}</Badge>)}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="md:col-span-2">
                        <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-xs">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                              <h4 className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"><Sliders className="h-4 w-4 text-primary" /> 2. จับคู่ฟิลด์ของระบบ</h4>
                              <span className="text-[10px] text-rose-500 font-semibold">* จำเป็นต้องระบุ</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                              {SYSTEM_FIELDS.map((field) => (
                                <div key={field.key} className="space-y-1">
                                  <label className="text-[11px] font-medium flex items-center gap-1">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                  </label>
                                  <Select value={mappingState[field.key] || 'none'} onValueChange={(val) => setMappingState(prev => ({ ...prev, [field.key]: val === 'none' ? '' : val }))}>
                                    <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs italic text-muted-foreground">-- ไม่กำหนด (ใช้ค่าเริ่มต้น) --</SelectItem>
                                      {Array.from(new Set([...headers, mappingState[field.key]].filter(Boolean))).map((h) => (
                                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t">
                              <Button variant="outline" size="sm" onClick={() => setTemplateView('list')} className="text-xs">ยกเลิก</Button>
                              <div className="flex items-center gap-2">
                                {editingTemplateId !== 'new' && (
                                  <Button variant="outline" size="sm" onClick={() => handleSaveTemplate(true)} disabled={isSubmitting} className="gap-1 text-xs">
                                    <Copy className="h-3.5 w-3.5" /> บันทึกเป็นรายการใหม่
                                  </Button>
                                )}
                                <Button size="sm" onClick={() => handleSaveTemplate(false)} disabled={isSubmitting} className="gap-1 text-xs px-4">
                                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  {editingTemplateId === 'new' ? 'สร้างเทมเพลต' : 'บันทึกการเปลี่ยนแปลง'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Delete Template Confirmation Modal */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบเทมเพลต?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              คุณต้องการลบเทมเพลต <strong>"{deletingTemplate?.name}"</strong> ออกจากระบบใช่หรือไม่ การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteTemplate} disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-xs">
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              ยืนยันการลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
