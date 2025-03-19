import * as SQLite from 'expo-sqlite';
import { pullJson, RequiredQualification, Company, SampleQualification, User } from './data';

const db = SQLite.openDatabaseSync('skillsfile.db');

export const pullAPI = async () => {
  try {
    // Fetch and update users
    const users = pullJson('users') as User[];
    const existingUsers = db.getAllSync<User>('SELECT * FROM users');
    const existingUsersMap = new Map(existingUsers.map(user => [user.uid, user]));

    users.forEach((user) => {
      const existingUser = existingUsersMap.get(user.uid);
      
      if (!existingUser) {
        // New user - insert
        db.execSync(`
          INSERT INTO users (
            uid, first_name, last_name, username,
            created, creator, updated, updator, status, synced
          ) VALUES (
            '${user.uid}',
            '${user.first_name}',
            '${user.last_name}',
            '${user.username}',
            '${user.created}',
            '${user.creator}',
            '${user.updated}',
            '${user.updator}',
            ${user.status},
            1
          )
        `);
      } else if (user.updated > existingUser.updated) {
        // Existing user with newer update - update
        db.execSync(`
          UPDATE users 
          SET first_name = '${user.first_name}',
              last_name = '${user.last_name}',
              username = '${user.username}',
              updated = '${user.updated}',
              updator = '${user.updator}',
              status = ${user.status},
              synced = 1
          WHERE uid = '${user.uid}'
        `);
      }
      // If updated date is not newer, skip the record
    });

    // Fetch and update required qualifications
    const reqQuals = pullJson('req_quals') as RequiredQualification[];
    const existingQuals = db.getAllSync<RequiredQualification>('SELECT * FROM quals_req');
    const existingQualsMap = new Map(existingQuals.map(qual => [qual.uid, qual]));

    reqQuals.forEach((qual) => {
      const existingQual = existingQualsMap.get(qual.uid);
      
      if (!existingQual) {
        // New qualification - insert
        db.execSync(`
          INSERT INTO quals_req (
            uid, name, intro, category_name, expires_months,
            created, creator, updated, updator, status, accreditor, synced
          ) VALUES (
            '${qual.uid}',
            '${qual.name}',
            '${qual.intro}',
            '${qual.category_name}',
            ${qual.expires_months},
            '${qual.created}',
            '${qual.creator}',
            '${qual.updated}',
            '${qual.updator}',
            ${qual.status},
            '${qual.accreditor}',
            1
          )
        `);
      } else if (qual.updated > existingQual.updated) {
        // Existing qualification with newer update - update
        db.execSync(`
          UPDATE quals_req 
          SET name = '${qual.name}',
              intro = '${qual.intro}',
              category_name = '${qual.category_name}',
              expires_months = ${qual.expires_months},
              updated = '${qual.updated}',
              updator = '${qual.updator}',
              status = ${qual.status},
              accreditor = '${qual.accreditor}',
              synced = 1
          WHERE uid = '${qual.uid}'
        `);
      }
      // If updated date is not newer, skip the record

      // Handle company relationships
      if (qual.comp_requests) {
        const existingRelations = db.getAllSync<{ company_uid: string; updated: string }>(
          `SELECT company_uid, updated FROM qual_company_req WHERE qual_uid = '${qual.uid}'`
        );
        const existingRelationsMap = new Map(
          existingRelations.map(rel => [rel.company_uid, rel])
        );

        qual.comp_requests.forEach((req) => {
          const existingRel = existingRelationsMap.get(req.creator);
          
          if (!existingRel) {
            // New relationship - insert
            db.execSync(`
              INSERT INTO qual_company_req (
                qual_uid, company_uid, created, creator, updated, updator, synced
              ) VALUES (
                '${qual.uid}',
                '${req.creator}',
                '${req.created}',
                'system',
                '${req.updated}',
                '${req.updator}',
                1
              )
            `);
          } else if (req.updated > existingRel.updated) {
            // Existing relationship with newer update - update
            db.execSync(`
              UPDATE qual_company_req 
              SET updated = '${req.updated}',
                  updator = '${req.updator}',
                  synced = 1
              WHERE qual_uid = '${qual.uid}' AND company_uid = '${req.creator}'
            `);
          }
          // If updated date is not newer, skip the record
        });
      }
    });

    // Fetch and update companies
    const companies = pullJson('companies') as Company[];
    const existingCompanies = db.getAllSync<Company>('SELECT * FROM companies');
    const existingCompaniesMap = new Map(existingCompanies.map(company => [company.uid, company]));

    companies.forEach((company) => {
      const existingCompany = existingCompaniesMap.get(company.uid);
      
      if (!existingCompany) {
        // New company - insert
        db.execSync(`
          INSERT INTO companies (
            uid, name, status,
            created, creator, updated, updator, synced
          ) VALUES (
            '${company.uid}',
            '${company.name}',
            ${company.status},
            '${company.created}',
            '${company.creator}',
            '${company.updated}',
            '${company.updator}',
            1
          )
        `);
      } else if (company.updated > existingCompany.updated) {
        // Existing company with newer update - update
        db.execSync(`
          UPDATE companies 
          SET name = '${company.name}',
              status = ${company.status},
              updated = '${company.updated}',
              updator = '${company.updator}',
              synced = 1
          WHERE uid = '${company.uid}'
        `);
      }
      // If updated date is not newer, skip the record
    });

    // Fetch and update sample qualifications
    const sampleQuals = pullJson('sample_quals') as SampleQualification[];
    const existingSampleQuals = db.getAllSync<SampleQualification>('SELECT * FROM qualifications');
    const existingSampleQualsMap = new Map(existingSampleQuals.map(qual => [qual.uid, qual]));

    sampleQuals.forEach((qual) => {
      const existingQual = existingSampleQualsMap.get(qual.uid);
      
      if (!existingQual) {
        // New qualification - insert
        db.execSync(`
          INSERT INTO qualifications (
            uid, name, expires_months,
            created, creator, updated, updator,
            parent_uid, reference, achieved, status, synced
          ) VALUES (
            '${qual.uid}',
            '${qual.name}',
            ${qual.expires_months},
            '${qual.created}',
            '${qual.creator}',
            '${qual.updated}',
            '${qual.updator}',
            ${qual.parent_uid ? `'${qual.parent_uid}'` : 'NULL'},
            ${qual.reference ? `'${qual.reference}'` : 'NULL'},
            ${qual.achieved ? `'${qual.achieved}'` : 'NULL'},
            ${qual.status},
            1
          )
        `);
      } else if (qual.updated > existingQual.updated) {
        // Existing qualification with newer update - update
        db.execSync(`
          UPDATE qualifications 
          SET name = '${qual.name}',
              expires_months = ${qual.expires_months},
              updated = '${qual.updated}',
              updator = '${qual.updator}',
              parent_uid = ${qual.parent_uid ? `'${qual.parent_uid}'` : 'NULL'},
              reference = ${qual.reference ? `'${qual.reference}'` : 'NULL'},
              achieved = ${qual.achieved ? `'${qual.achieved}'` : 'NULL'},
              status = ${qual.status},
              synced = 1
          WHERE uid = '${qual.uid}'
        `);
      }
      // If updated date is not newer, skip the record
    });

    return true;
  } catch (error) {
    console.error('Error pulling API data:', error);
    throw error;
  }
}; 