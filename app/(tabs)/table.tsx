import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity, Alert, Image } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Colors } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface BaseRecord {
  id: number;
  uid: string;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  [key: string]: string | number | undefined;
}

interface CompanyRequest {
  creator: string;
  creator_name: string;
  created: string;
  updated: string;
  updator: string;
}

interface RequiredQualification {
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
  comp_requests?: CompanyRequest[];
}

interface SampleQualification {
  uid: string;
  name: string;
  expires_months: number;
  parent_uid: string;
  reference: string;
  achieved: string;
}

interface SkillsFileRecord extends BaseRecord {
  name: string;
  expires_months: number;
  parent_uid?: string;
  reference?: string;
  achieved?: string;
  status: number;
}

interface UserRecord extends BaseRecord {
  first_name: string;
  last_name: string;
  username: string;
}

interface QualsReqRecord extends BaseRecord {
  name: string;
  intro: string;
  category_name: string;
  expires_months: number;
  status: number;
  accreditor: string;
}

interface CompanyData {
  uid: string;
  name: string;
  status: number;
}

interface CompanyRecord extends BaseRecord {
  name: string;
  status: number;
}

interface QualCompRelRecord extends BaseRecord {
  qual_uid: string;
  company_uid: string;
}

type TableType = 'qualifications' | 'users' | 'quals_req' | 'companies' | 'qual_company_req';

const db = SQLite.openDatabaseSync('skillsfile.db');

const formatToSQLDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const generateUID = () => {
  return Array.from({ length: 36 }, () => {
    const random = Math.random() * 16 | 0;
    return random.toString(16);
  }).join('');
};

const truncateUID = (uid: string | number | undefined) => {
  if (typeof uid === 'number') {
    return uid.toString();
  }
  return uid ? `${uid.slice(0, 7)}...` : 'NULL';
};

export default function TableScreen() {
  const [selectedTable, setSelectedTable] = useState<TableType>('qualifications');
  const [records, setRecords] = useState<(SkillsFileRecord | UserRecord | QualsReqRecord | CompanyRecord | QualCompRelRecord)[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const loadRecords = () => {
    try {
      let result;
      if (selectedTable === 'qualifications') {
        result = db.getAllSync<SkillsFileRecord>(
          'SELECT * FROM qualifications ORDER BY created DESC'
        );
      } else if (selectedTable === 'users') {
        result = db.getAllSync<UserRecord>(
          'SELECT * FROM users ORDER BY id DESC'
        );
      } else if (selectedTable === 'companies') {
        result = db.getAllSync<CompanyRecord>(
          'SELECT * FROM companies ORDER BY name ASC'
        );
      } else if (selectedTable === 'qual_company_req') {
        result = db.getAllSync<QualCompRelRecord>(
          'SELECT * FROM qual_company_req ORDER BY qual_uid ASC'
        );
      } else {
        result = db.getAllSync<QualsReqRecord>(
          'SELECT * FROM quals_req ORDER BY name ASC'
        );
      }
      setRecords(result);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const sortRecords = (records: (SkillsFileRecord | UserRecord | QualsReqRecord | CompanyRecord | QualCompRelRecord)[], config: { key: string; direction: 'asc' | 'desc' }) => {
    return [...records].sort((a, b) => {
      const aValue = a[config.key as keyof (SkillsFileRecord | UserRecord | QualsReqRecord | CompanyRecord | QualCompRelRecord)] as string | number;
      const bValue = b[config.key as keyof (SkillsFileRecord | UserRecord | QualsReqRecord | CompanyRecord | QualCompRelRecord)] as string | number;
      
      if (aValue < bValue) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedRecords = () => {
    if (!sortConfig) return records;
    return sortRecords(records, sortConfig);
  };

  const getSortDirection = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  const clearTable = () => {
    Alert.alert(
      'Clear Table',
      `Are you sure you want to delete all records from ${selectedTable}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            try {
              db.execSync(`DELETE FROM ${selectedTable}`);
              db.execSync(`DELETE FROM sqlite_sequence WHERE name='${selectedTable}'`);
              
              // If users table was cleared, recreate the default user
              if (selectedTable === 'users') {
                db.execSync(`
                  INSERT INTO users (
                    uid, created, creator, updated, updator,
                    first_name, last_name, username
                  ) VALUES (
                    '${generateUID()}', 
                    '${formatToSQLDateTime(new Date())}',
                    'system',
                    '',
                    '',
                    'Matt',
                    'Riley',
                    'hugosebriley'
                  );
                `);
              }
              
              // If qualifications table was cleared, load sample qualifications
              if (selectedTable === 'qualifications') {
                try {
                  const sampleQuals: { qualifications: SampleQualification[] } = require('../../api/sample_qualifications.json');
                  const now = formatToSQLDateTime(new Date());
                  
                  // Get the first user's UID to use as creator
                  const userResult = db.getAllSync<{ uid: string }>(
                    'SELECT uid FROM users LIMIT 1'
                  );
                  
                  if (userResult.length === 0) {
                    throw new Error('No users found in database');
                  }
                  
                  const creatorUid = userResult[0].uid;
                  
                  sampleQuals.qualifications.forEach((qual: SampleQualification) => {
                    db.execSync(`
                      INSERT INTO qualifications (
                        uid, name, expires_months, created, creator, updated, updator,
                        parent_uid, reference, achieved, status
                      ) VALUES (
                        '${qual.uid}',
                        '${qual.name}',
                        ${qual.expires_months},
                        '${now}',
                        '${creatorUid}',
                        '',
                        '',
                        '${qual.parent_uid}',
                        '${qual.reference}',
                        '${qual.achieved}',
                        0
                      )
                    `);
                  });
                } catch (error) {
                  console.error('Error loading sample qualifications:', error);
                }
              }
              // If companies table was cleared, load companies from JSON
              else if (selectedTable === 'companies') {
                try {
                  const companiesData: { companies: CompanyData[] } = require('../../api/companies.json');
                  const now = formatToSQLDateTime(new Date());
                  
                  companiesData.companies.forEach((company: CompanyData) => {
                    db.execSync(`
                      INSERT INTO companies (
                        uid, name, status,
                        created, creator, updated, updator
                      ) VALUES (
                        '${company.uid}',
                        '${company.name}',
                        ${company.status},
                        '${now}',
                        'system',
                        '',
                        ''
                      )
                    `);
                  });
                } catch (error) {
                  console.error('Error loading companies:', error);
                }
              }
              // If quals_req table was cleared, load required qualifications from JSON
              else if (selectedTable === 'quals_req') {
                try {
                  const reqQuals: { qualifications: RequiredQualification[] } = require('../../api/required_qualifications.json');
                  const now = formatToSQLDateTime(new Date());
                  
                  // First clear the qual_company_req table
                  db.execSync('DELETE FROM qual_company_req');
                  db.execSync('DELETE FROM sqlite_sequence WHERE name="qual_company_req"');
                  
                  reqQuals.qualifications.forEach((qual) => {
                    // Insert the qualification
                    db.execSync(`
                      INSERT INTO quals_req (
                        uid, name, intro, category_name, expires_months,
                        created, creator, updated, updator, status, accreditor
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
                        '${qual.accreditor}'
                      )
                    `);

                    // Insert company relationships
                    if (qual.comp_requests) {
                      qual.comp_requests.forEach((req) => {
                        db.execSync(`
                          INSERT INTO qual_company_req (
                            qual_uid, company_uid
                          ) VALUES (
                            '${qual.uid}',
                            '${req.creator}'
                          )
                        `);
                      });
                    }
                  });
                } catch (error) {
                  console.error('Error loading required qualifications:', error);
                }
              }
              
              loadRecords();
            } catch (error) {
              console.error('Error clearing records:', error);
              Alert.alert('Error', 'Failed to clear records');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadRecords();
  }, [selectedTable]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadRecords();
    setRefreshing(false);
  }, []);

  const renderTableHeader = () => {
    if (selectedTable === 'qualifications') {
      return (
        <View style={styles.tableHeader}>
          <TouchableOpacity 
            style={[styles.headerCell, styles.idCell]} 
            onPress={() => requestSort('id')}
          >
            <Text style={styles.headerCellText}>id {getSortDirection('id')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('uid')}
          >
            <Text style={styles.headerCellText}>uid {getSortDirection('uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('name')}
          >
            <Text style={styles.headerCellText}>name {getSortDirection('name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.referenceCell]} 
            onPress={() => requestSort('reference')}
          >
            <Text style={styles.headerCellText}>reference {getSortDirection('reference')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.expiresCell]} 
            onPress={() => requestSort('expires_months')}
          >
            <Text style={styles.headerCellText}>exp{getSortDirection('expires_months')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.achievedCell]} 
            onPress={() => requestSort('achieved')}
          >
            <Text style={styles.headerCellText}>achieved{getSortDirection('achieved')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('created')}
          >
            <Text style={styles.headerCellText}>created {getSortDirection('created')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('creator')}
          >
            <Text style={styles.headerCellText}>creator {getSortDirection('creator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('updated')}
          >
            <Text style={styles.headerCellText}>updated {getSortDirection('updated')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('updator')}
          >
            <Text style={styles.headerCellText}>updator {getSortDirection('updator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('parent_uid')}
          >
            <Text style={styles.headerCellText}>parent_uid {getSortDirection('parent_uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.statusCell]} 
            onPress={() => requestSort('status')}
          >
            <Text style={styles.headerCellText}>status {getSortDirection('status')}</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (selectedTable === 'users') {
      return (
        <View style={styles.tableHeader}>
          <TouchableOpacity 
            style={[styles.headerCell, styles.idCell]} 
            onPress={() => requestSort('id')}
          >
            <Text style={styles.headerCellText}>id {getSortDirection('id')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('uid')}
          >
            <Text style={styles.headerCellText}>uid {getSortDirection('uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.nameCell]} 
            onPress={() => requestSort('first_name')}
          >
            <Text style={styles.headerCellText}>first name {getSortDirection('first_name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.nameCell]} 
            onPress={() => requestSort('last_name')}
          >
            <Text style={styles.headerCellText}>last name {getSortDirection('last_name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('username')}
          >
            <Text style={styles.headerCellText}>username {getSortDirection('username')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('created')}
          >
            <Text style={styles.headerCellText}>created {getSortDirection('created')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('creator')}
          >
            <Text style={styles.headerCellText}>creator {getSortDirection('creator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('updated')}
          >
            <Text style={styles.headerCellText}>updated {getSortDirection('updated')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('updator')}
          >
            <Text style={styles.headerCellText}>updator {getSortDirection('updator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.statusCell]} 
            onPress={() => requestSort('status')}
          >
            <Text style={styles.headerCellText}>status {getSortDirection('status')}</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (selectedTable === 'companies') {
      return (
        <View style={styles.tableHeader}>
          <TouchableOpacity 
            style={[styles.headerCell, styles.idCell]} 
            onPress={() => requestSort('id')}
          >
            <Text style={styles.headerCellText}>id {getSortDirection('id')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('uid')}
          >
            <Text style={styles.headerCellText}>uid {getSortDirection('uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.nameCell]} 
            onPress={() => requestSort('name')}
          >
            <Text style={styles.headerCellText}>name {getSortDirection('name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('created')}
          >
            <Text style={styles.headerCellText}>created {getSortDirection('created')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.statusCell]} 
            onPress={() => requestSort('status')}
          >
            <Text style={styles.headerCellText}>status {getSortDirection('status')}</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (selectedTable === 'qual_company_req') {
      return (
        <View style={styles.tableHeader}>
          <TouchableOpacity 
            style={[styles.headerCell, styles.idCell]} 
            onPress={() => requestSort('id')}
          >
            <Text style={styles.headerCellText}>id {getSortDirection('id')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('qual_uid')}
          >
            <Text style={styles.headerCellText}>qual {getSortDirection('qual_uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('company_uid')}
          >
            <Text style={styles.headerCellText}>company {getSortDirection('company_uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('created')}
          >
            <Text style={styles.headerCellText}>created {getSortDirection('created')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('updated')}
          >
            <Text style={styles.headerCellText}>updated {getSortDirection('updated')}</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.tableHeader}>
          <TouchableOpacity 
            style={[styles.headerCell, styles.idCell]} 
            onPress={() => requestSort('id')}
          >
            <Text style={styles.headerCellText}>id {getSortDirection('id')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('uid')}
          >
            <Text style={styles.headerCellText}>uid {getSortDirection('uid')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('name')}
          >
            <Text style={styles.headerCellText}>name {getSortDirection('name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('intro')}
          >
            <Text style={styles.headerCellText}>intro {getSortDirection('intro')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('category_name')}
          >
            <Text style={styles.headerCellText}>category {getSortDirection('category_name')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('accreditor')}
          >
            <Text style={styles.headerCellText}>accreditor {getSortDirection('accreditor')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.skillsFileCell]} 
            onPress={() => requestSort('expires_months')}
          >
            <Text style={styles.headerCellText}>expires (months) {getSortDirection('expires_months')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('created')}
          >
            <Text style={styles.headerCellText}>created {getSortDirection('created')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('creator')}
          >
            <Text style={styles.headerCellText}>creator {getSortDirection('creator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.dateCell]} 
            onPress={() => requestSort('updated')}
          >
            <Text style={styles.headerCellText}>updated {getSortDirection('updated')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.uidCell]} 
            onPress={() => requestSort('updator')}
          >
            <Text style={styles.headerCellText}>updator {getSortDirection('updator')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerCell, styles.statusCell]} 
            onPress={() => requestSort('status')}
          >
            <Text style={styles.headerCellText}>status {getSortDirection('status')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderTableRow = (record: SkillsFileRecord | UserRecord | QualsReqRecord | CompanyRecord | QualCompRelRecord) => {
    const getStatusText = (status: number) => {
      switch (status) {
        case 0: return '0';
        case 1: return '1';
        case 2: return '2';
        default: return 'Unknown';
      }
    };

    if (selectedTable === 'qualifications' && 'name' in record && 'uid' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.uid)}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.name}</Text>
          <Text style={[styles.cell, styles.referenceCell]}>{record.reference || 'NULL'}</Text>
          <Text style={[styles.cell, styles.expiresCell]}>{record.expires_months}</Text>
          <Text style={[styles.cell, styles.achievedCell]}>{record.achieved || 'NULL'}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.creator)}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.updator)}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.parent_uid)}</Text>
          <Text style={[styles.cell, styles.statusCell]}>{getStatusText(Number(record.status))}</Text>
        </View>
      );
    } else if (selectedTable === 'users' && 'first_name' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.uid)}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.first_name}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.last_name}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.username}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.creator)}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.updator)}</Text>
          <Text style={[styles.cell, styles.statusCell]}>{getStatusText(Number(record.status))}</Text>
        </View>
      );
    } else if (selectedTable === 'companies' && 'status' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.uid)}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.name}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.statusCell]}>{getStatusText(Number(record.status))}</Text>
        </View>
      );
    } else if (selectedTable === 'quals_req' && 'name' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.uid)}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.name}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.intro}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.category_name}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.accreditor}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.expires_months}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.creator)}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.updator)}</Text>
          <Text style={[styles.cell, styles.statusCell]}>{getStatusText(Number(record.status))}</Text>
        </View>
      );
    } else if (selectedTable === 'qual_company_req' && 'qual_uid' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{truncateUID(record.qual_uid)}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{truncateUID(record.company_uid)}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={23} color="#000000" />
        </TouchableOpacity>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTable === 'qualifications' && styles.activeTabButton]}
            onPress={() => setSelectedTable('qualifications')}
          >
            <Text style={[styles.tabButtonText, selectedTable === 'qualifications' && styles.activeTabButtonText]}>Quals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTable === 'quals_req' && styles.activeTabButton]}
            onPress={() => setSelectedTable('quals_req')}
          >
            <Text style={[styles.tabButtonText, selectedTable === 'quals_req' && styles.activeTabButtonText]}>Req. Quals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTable === 'qual_company_req' && styles.activeTabButton]}
            onPress={() => setSelectedTable('qual_company_req')}
          >
            <Text style={[styles.tabButtonText, selectedTable === 'qual_company_req' && styles.activeTabButtonText]}>Qual Comp Rel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTable === 'users' && styles.activeTabButton]}
            onPress={() => setSelectedTable('users')}
          >
            <Text style={[styles.tabButtonText, selectedTable === 'users' && styles.activeTabButtonText]}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTable === 'companies' && styles.activeTabButton]}
            onPress={() => setSelectedTable('companies')}
          >
            <Text style={[styles.tabButtonText, selectedTable === 'companies' && styles.activeTabButtonText]}>Comps</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.subtitle}>Showing {records.length} records</Text>
      </View>

      <ScrollView horizontal style={styles.tableWrapper}>
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          <ScrollView 
            style={styles.tableContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {getSortedRecords().map(renderTableRow)}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity 
            style={[styles.footerButton, styles.clearButton]} 
            onPress={clearTable}
          >
            <Text style={styles.footerButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.footerButton, styles.updateButton]} 
            onPress={loadRecords}
          >
            <Text style={styles.footerButtonText}>Update Tables</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#E5E5EA',
    marginRight: 10,
  },
  activeTabButton: {
    backgroundColor: '#000000',
  },
  tabButtonText: {
    color: '#000',
  },
  activeTabButtonText: {
    color: 'white',
  },
  header: {
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  tableWrapper: {
    flex: 1,
  },
  tableContainer: {
    minWidth: 1200,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerCell: {
    justifyContent: 'center',
  },
  headerCellText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableContent: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: 0,
    paddingHorizontal: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  cell: {
    fontSize: 12,
    color: '#000',
  },
  idCell: {
    width: 50,
  },
  uidCell: {
    width: 100,
  },
  skillsFileCell: {
    width: 150,
  },
  dateCell: {
    width: 120,
  },
  nameCell: {
    width: 100,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  footerButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
  },
  updateButton: {
    flex: 3,
    backgroundColor: '#007AFF',
  },
  footerButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'MavenPro-Bold',
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'MavenPro-Bold',
    color: Colors.blueDark,
  },
  cellText: {
    fontSize: 14,
    fontFamily: 'MavenPro-Regular',
    color: Colors.charcoal,
  },
  referenceCell: {
    width: 120,
  },
  expiresCell: {
    width: 50,
    textAlign: 'center',
  },
  achievedCell: {
    width: 120,
    textAlign: 'left',
  },
  statusCell: {
    flex: 0.8,
    paddingHorizontal: 8,
  },
}); 