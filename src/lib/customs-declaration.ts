/**
 * Customs Declaration Number Helper
 * =================================
 * ถอดรหัสโครงสร้างเลขที่ใบขนสินค้าตามคู่มือกรมศุลกากร (e-Customs / e-Export)
 *
 * โครงสร้าง: X X DD X YY MM NNNNN (14 ตัวอักษร)
 * หลักที่ 1:    ตัวอักษร เริ่มที่ A (เปลี่ยนเป็น B, C... เมื่อเลขรันเกิน 99999 และหลัก 2 เกิน 9)
 * หลักที่ 2:    ตัวเลข 0 - 9 (เปลี่ยนเป็นเลขถัดไปเมื่อเลขรันเกิน 99999)
 * หลักที่ 3-4:  DD = วันที่ส่งข้อมูลใบขน (01-31)
 * หลักที่ 5:    X = ประเภทของเอกสาร (0=ขาเข้า, 1=ขาออก, ฯลฯ)
 * หลักที่ 6-7:  YY = ปี พ.ศ. 2 หลัก (เช่น 67 -> 2567 -> 2024)
 * หลักที่ 8-9:  MM = เดือน 2 หลัก (01-12)
 * หลักที่ 10-14: NNNNN = เลข Running 5 หลัก (00001 - 99999)
 */

export type CustomsDirection = 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'OTHER' | 'UNKNOWN';

export interface CustomsDocTypeDefinition {
    code: string;
    name: string;
    direction: CustomsDirection;
    category: 'Standard' | 'Transit' | 'Advance' | 'Special' | 'Transfer' | 'Express';
}

export const CUSTOMS_DOC_TYPES: Record<string, CustomsDocTypeDefinition> = {
    '0': { code: '0', name: 'ใบขนสินค้าขาเข้า', direction: 'IMPORT', category: 'Standard' },
    '1': { code: '1', name: 'ใบขนสินค้าขาออก', direction: 'EXPORT', category: 'Standard' },
    '2': { code: '2', name: 'ใบขนสินค้าผ่านแดน (Transit)', direction: 'TRANSIT', category: 'Transit' },
    '3': { code: '3', name: 'คำร้องขอรับของไปก่อน', direction: 'IMPORT', category: 'Advance' },
    '4': { code: '4', name: 'คำร้องขอส่งของออกไปก่อน', direction: 'EXPORT', category: 'Advance' },
    '5': { code: '5', name: 'ใบขนสินค้าขาเข้าปากระวาง', direction: 'IMPORT', category: 'Special' },
    '6': { code: '6', name: 'ใบขนสินค้าพิเศษผ่านแดนขาออก', direction: 'EXPORT', category: 'Special' },
    '7': { code: '7', name: 'ใบขนสินค้าพิเศษผ่านแดนขาเข้า', direction: 'IMPORT', category: 'Special' },
    '8': { code: '8', name: 'ใบขนสินค้าถ่ายลำ (Transhipment)', direction: 'OTHER', category: 'Transit' },
    'A': { code: 'A', name: 'ใบขนสินค้าขาเข้าโอนย้ายภายในประเทศ', direction: 'IMPORT', category: 'Transfer' },
    'B': { code: 'B', name: 'ใบขนสินค้าขาออกโอนย้ายภายในประเทศ', direction: 'EXPORT', category: 'Transfer' },
    'C': { code: 'C', name: 'ใบขนสินค้าขาเข้าโอนย้ายจากเขตปลอดอากร', direction: 'IMPORT', category: 'Transfer' },
    'D': { code: 'D', name: 'ใบขนสินค้าขาออกโอนย้ายเข้าเขตปลอดอากร', direction: 'EXPORT', category: 'Transfer' },
    'P': { code: 'P', name: 'ใบขนสินค้าขาเข้าโอนย้ายชำระภาษีอากร', direction: 'IMPORT', category: 'Transfer' },
    'X': { code: 'X', name: 'ใบขนสินค้าขาเข้าของเร่งด่วน', direction: 'IMPORT', category: 'Express' },
    'Y': { code: 'Y', name: 'ใบขนสินค้าขาออกของเร่งด่วน', direction: 'EXPORT', category: 'Express' },
};

export interface CustomsDeclarationParseResult {
    isValid: boolean;
    raw: string;
    cleaned: string;
    prefixLetter: string;
    prefixDigit: string;
    day: number | null;
    month: number | null;
    buddhistYear: number | null;
    christianYear: number | null;
    submissionDate: string | null; // Format: YYYY-MM-DD
    typeCode: string | null;
    typeName: string | null;
    direction: CustomsDirection;
    runningNumber: string | null;
}

/**
 * ถอดรหัสโครงสร้างเลขที่ใบขนสินค้า (รองรับทั้งแบบมีขีด - และไม่มีขีด)
 */
export function parseCustomsDeclarationNumber(declNo: string | null | undefined): CustomsDeclarationParseResult {
    const raw = String(declNo || '').trim();
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    const emptyResult: CustomsDeclarationParseResult = {
        isValid: false,
        raw,
        cleaned,
        prefixLetter: '',
        prefixDigit: '',
        day: null,
        month: null,
        buddhistYear: null,
        christianYear: null,
        submissionDate: null,
        typeCode: null,
        typeName: null,
        direction: 'UNKNOWN',
        runningNumber: null,
    };

    if (cleaned.length < 9) {
        return emptyResult;
    }

    const prefixLetter = cleaned[0];
    const prefixDigit = cleaned[1];
    const ddStr = cleaned.slice(2, 4);
    const typeCode = cleaned[4];
    const yyStr = cleaned.slice(5, 7);
    const mmStr = cleaned.slice(7, 9);
    const runningNumber = cleaned.slice(9);

    const day = parseInt(ddStr, 10);
    const month = parseInt(mmStr, 10);
    const yy = parseInt(yyStr, 10);

    if (isNaN(day) || day < 1 || day > 31) return emptyResult;
    if (isNaN(month) || month < 1 || month > 12) return emptyResult;
    if (isNaN(yy)) return emptyResult;

    // แปลงปี พ.ศ. 2 หลัก -> ค.ศ. 4 หลัก
    // เช่น 67 -> 2567 -> 2024, 68 -> 2568 -> 2025, 69 -> 2569 -> 2026
    const buddhistYear = 2500 + yy;
    const christianYear = buddhistYear - 543;
    const submissionDate = `${christianYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const docType = CUSTOMS_DOC_TYPES[typeCode];
    const typeName = docType ? docType.name : `ประเภทไม่ระบุ (${typeCode})`;
    const direction = docType ? docType.direction : 'UNKNOWN';

    return {
        isValid: true,
        raw,
        cleaned,
        prefixLetter,
        prefixDigit,
        day,
        month,
        buddhistYear,
        christianYear,
        submissionDate,
        typeCode,
        typeName,
        direction,
        runningNumber,
    };
}
