import * as XLSX from 'xlsx';
import { CallingLead, ClientType } from './types';

export interface ParsedLeadRow {
  id: string;
  clientName: string;
  doctorName?: string;
  institutionName?: string;
  clientType: ClientType;
  phone: string;
  city: string;
  notes?: string;
  assignedEmployeeId: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * Normalizes string keys for fuzzy column matching
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Intelligent Column Detection Dictionary
 */
const COLUMN_MAPPINGS = {
  doctor: [
    'doctorname', 'doctor', 'drname', 'dr', 'doctor_name', 'dr_name', 'physician',
    'contactperson', 'contactname', 'personname', 'contact', 'name', 'owner', 'doctorcontact'
  ],
  institution: [
    'hospitalname', 'hospital', 'clinicname', 'clinic', 'institution', 'institutionname',
    'hospital_name', 'clinic_name', 'schoolname', 'school', 'coachingname', 'coaching',
    'academy', 'organization', 'organisation', 'company', 'business', 'firm', 'center', 'centre'
  ],
  phone: [
    'phone', 'phonenumber', 'phone_number', 'mobile', 'mobilenumber', 'mobile_number',
    'contactno', 'contact_no', 'contactnumber', 'contact_number', 'telephone', 'whatsapp', 'cell', 'mobile1', 'phone1'
  ],
  category: [
    'category', 'clientcategory', 'clienttype', 'client_type', 'type', 'industry', 'sector', 'segment'
  ],
  city: [
    'city', 'location', 'area', 'address', 'district', 'town', 'place', 'state'
  ],
  notes: [
    'notes', 'initialnotes', 'specialization', 'speciality', 'remarks', 'comment', 'description', 'details', 'dept', 'department'
  ]
};

/**
 * Find matching column from a raw row object
 */
function findValue(row: Record<string, any>, possibleKeys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const rawKey of rowKeys) {
    const normKey = normalizeKey(rawKey);
    if (possibleKeys.includes(normKey)) {
      const val = row[rawKey];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return '';
}

/**
 * Cleans and validates Indian mobile numbers
 */
export function cleanPhoneNumber(rawPhone: string): { phone: string; isValid: boolean } {
  if (!rawPhone) return { phone: '', isValid: false };
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const isValid = digits.length === 10;
  return { phone: digits.length === 10 ? digits : rawPhone.trim(), isValid };
}

/**
 * Smart automatic category detection based on Doctor / Hospital / Clinic / School keywords
 */
export function inferClientType(
  explicitCategory: string,
  doctorName: string,
  institutionName: string,
  notes: string
): ClientType {
  const cat = explicitCategory.toLowerCase();
  if (cat.includes('school') || cat.includes('coaching') || cat.includes('academy') || cat.includes('education')) {
    return 'School / Coaching';
  }
  if (cat.includes('clinic') || cat.includes('hospital') || cat.includes('doctor') || cat.includes('health') || cat.includes('medical')) {
    return 'Clinic / Hospital';
  }

  const combined = `${doctorName} ${institutionName} ${notes}`.toLowerCase();
  
  const hospitalKeywords = [
    'dr', 'doctor', 'hospital', 'clinic', 'care', 'health', 'pharma', 'dental', 'dentist',
    'eye', 'ortho', 'pediatric', 'nursing', 'medical', 'cardio', 'ent', 'derma', 'ayurvedic',
    'homeo', 'pathology', 'radiology', 'surgeon', 'physician', 'm.d', 'mbbs', 'bams', 'bhms', 'bds'
  ];

  const schoolKeywords = [
    'school', 'coaching', 'classes', 'academy', 'vidya', 'shiksha', 'tuition', 'institute',
    'college', 'teacher', 'sir', 'maam', 'cbse', 'icse', 'neet', 'jee', 'iit', 'upsc', 'commerce',
    'science', 'matric', 'k-12', 'gurukul'
  ];

  let hospitalScore = 0;
  for (const kw of hospitalKeywords) {
    if (combined.includes(kw)) hospitalScore += 1;
  }

  let schoolScore = 0;
  for (const kw of schoolKeywords) {
    if (combined.includes(kw)) schoolScore += 1;
  }

  if (hospitalScore > schoolScore) {
    return 'Clinic / Hospital';
  }
  if (schoolScore > hospitalScore) {
    return 'School / Coaching';
  }

  if (doctorName.toLowerCase().includes('dr') || doctorName.toLowerCase().includes('doctor')) {
    return 'Clinic / Hospital';
  }

  return 'Clinic / Hospital';
}

/**
 * Parses raw ArrayBuffer or File from Excel (.xlsx, .xls) or CSV
 */
export function parseExcelOrCsvFile(
  fileBuffer: ArrayBuffer,
  defaultEmployeeId: string
): ParsedLeadRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsedLeads: ParsedLeadRow[] = [];

  rawRows.forEach((row, index) => {
    const doctorName = findValue(row, COLUMN_MAPPINGS.doctor);
    const institutionName = findValue(row, COLUMN_MAPPINGS.institution);
    const rawPhone = findValue(row, COLUMN_MAPPINGS.phone);
    const rawCategory = findValue(row, COLUMN_MAPPINGS.category);
    const city = findValue(row, COLUMN_MAPPINGS.city) || 'Indore';
    const notes = findValue(row, COLUMN_MAPPINGS.notes);

    if (!doctorName && !institutionName && !rawPhone) {
      return;
    }

    let clientName = '';
    if (institutionName) {
      clientName = institutionName;
    } else if (doctorName) {
      clientName = doctorName;
    } else {
      const firstVal = Object.values(row).find((v) => typeof v === 'string' && v.trim().length > 0);
      clientName = firstVal ? String(firstVal).trim() : `Lead #${index + 1}`;
    }

    const { phone, isValid: isPhoneValid } = cleanPhoneNumber(rawPhone);
    const clientType = inferClientType(rawCategory, doctorName, institutionName, notes);

    const isValid = Boolean(clientName && isPhoneValid);
    let validationError = '';
    if (!clientName) {
      validationError = 'Missing Doctor/Hospital name';
    } else if (!isPhoneValid) {
      validationError = 'Invalid 10-digit mobile number';
    }

    parsedLeads.push({
      id: `imported-${Date.now()}-${index}`,
      clientName,
      doctorName,
      institutionName,
      clientType,
      phone,
      city,
      notes: notes || '',
      assignedEmployeeId: defaultEmployeeId,
      isValid,
      validationError: isValid ? undefined : validationError,
    });
  });

  return parsedLeads;
}

/**
 * Downloads a pre-formatted Excel / CSV Template for the user
 */
export function downloadSampleTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
  const sampleData = [
    {
      'Doctor / Contact Person': 'Dr. Rajesh Sharma (MBBS, MD)',
      'Hospital / Clinic / Institute': 'City Care Multi-Speciality Hospital',
      'Phone Number': '9876543210',
      'Category': 'Clinic / Hospital',
      'City': 'Indore',
      'Notes / Specialization': 'Orthopedic Surgeon, Available after 4 PM'
    },
    {
      'Doctor / Contact Person': 'Dr. Priya Mehta (BDS)',
      'Hospital / Clinic / Institute': 'Mehta Dental & Cosmetic Clinic',
      'Phone Number': '9823456789',
      'Category': 'Clinic / Hospital',
      'City': 'Indore',
      'Notes / Specialization': 'Dental Clinic, Clinic timing 11 AM - 7 PM'
    },
    {
      'Doctor / Contact Person': 'Amit Agrawal (Director)',
      'Hospital / Clinic / Institute': 'Apex IIT-JEE & NEET Academy',
      'Phone Number': '9712345678',
      'Category': 'School / Coaching',
      'City': 'Bhopal',
      'Notes / Specialization': 'Coaching for 11th & 12th Classes'
    },
    {
      'Doctor / Contact Person': 'Sangeeta Gupta (Principal)',
      'Hospital / Clinic / Institute': 'Bright Future International School',
      'Phone Number': '9988776655',
      'Category': 'School / Coaching',
      'City': 'Ujjain',
      'Notes / Specialization': 'CBSE English Medium School'
    },
    {
      'Doctor / Contact Person': 'Dr. Ankit Verma',
      'Hospital / Clinic / Institute': 'Sanjeevani Eye Hospital',
      'Phone Number': '9876501234',
      'Category': 'Clinic / Hospital',
      'City': 'Indore',
      'Notes / Specialization': 'Cataract & Lasik Specialist'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 40 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calling Leads Template');

  if (format === 'csv') {
    XLSX.writeFile(workbook, 'Vyapar_Wallah_Leads_Template.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, 'Vyapar_Wallah_Leads_Template.xlsx', { bookType: 'xlsx' });
  }
}
