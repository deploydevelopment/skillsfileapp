import requiredQualifications from './quals_required.json';
import companies from './companies.json';
import sampleQualifications from './quals_sample.json';
import users from './users.json';

type JsonDataType = 'req_quals' | 'companies' | 'sample_quals' | 'users';

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
  synced: number;
  comp_requests?: {
    creator: string;
    creator_name: string;
    created: string;
    updated: string;
    updator: string;
    synced: number;
  }[];
}

export interface Company {
  uid: string;
  name: string;
  status: number;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  synced: number;
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
  synced: number;
}

export interface User {
  uid: string;
  first_name: string;
  last_name: string;
  username: string;
  status: number;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  synced: number;
}

export function pullJson(type: JsonDataType): RequiredQualification[] | Company[] | SampleQualification[] | User[] {
  switch (type) {
    case 'req_quals':
      return requiredQualifications.qualifications as RequiredQualification[];
    case 'companies':
      return companies.companies as Company[];
    case 'sample_quals':
      return sampleQualifications.qualifications as SampleQualification[];
    case 'users':
      return users.users as User[];
    default:
      throw new Error(`Unknown JSON data type: ${type}`);
  }
} 