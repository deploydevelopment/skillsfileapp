import requiredQualifications from './quals_required.json';
import companies from './companies.json';
import sampleQualifications from './quals_sample.json';

type JsonDataType = 'req_quals' | 'companies' | 'sample_quals';

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

export interface SampleQualification {
  uid: string;
  name: string;
  parent_uid: string;
  reference: string;
  expires_months: number;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  achieved: string;
  status: number;
}

export function pullJson(type: JsonDataType): RequiredQualification[] | Company[] | SampleQualification[] {
  switch (type) {
    case 'req_quals':
      return requiredQualifications.qualifications as RequiredQualification[];
    case 'companies':
      return companies.companies as Company[];
    case 'sample_quals':
      return sampleQualifications.qualifications as SampleQualification[];
    default:
      throw new Error(`Unknown JSON data type: ${type}`);
  }
} 