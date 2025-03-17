import requiredQualifications from './required_qualifications.json';
import companies from './companies.json';

type JsonDataType = 'req_quals' | 'companies';

export interface RequiredQualification {
  uid: string;
  name: string;
  intro: string;
  category_name: string;
  expires_months: number;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  status: number;
  accreditor: string;
  reference?: string;
  parent_uid?: string;
  comp_requests?: {
    creator: string;
    creator_name: string;
    created: string;
    updated: string;
    updator: string;
  }[];
}

export interface Company {
  uid: string;
  name: string;
  status: number;
}

export function pullJson(type: 'req_quals'): RequiredQualification[];
export function pullJson(type: 'companies'): Company[];
export function pullJson(type: JsonDataType): RequiredQualification[] | Company[] {
  switch (type) {
    case 'req_quals':
      return requiredQualifications.qualifications as RequiredQualification[];
    case 'companies':
      return companies.companies as Company[];
    default:
      throw new Error(`Unknown JSON data type: ${type}`);
  }
} 