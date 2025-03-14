import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Colors } from '../../constants/styles';

interface BaseRecord {
  id: number;
  uid: string;
  created: string;
  creator: string;
  updated: string;
  updator: string;
  [key: string]: string | number;
}

interface SkillsFileRecord extends BaseRecord {
  name: string;
  expires_months: number;
}

interface UserRecord extends BaseRecord {
  first_name: string;
  last_name: string;
  username: string;
}

interface QualsReqRecord extends BaseRecord {
  name: string;
  intro: string;
  requested_by: string;
  expires_months: number;
}

type TableType = 'skillsfile' | 'users' | 'quals_req';

const db = SQLite.openDatabaseSync('timestamps.db');

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

export default function TableScreen() {
  const [selectedTable, setSelectedTable] = useState<TableType>('skillsfile');
  const [records, setRecords] = useState<(SkillsFileRecord | UserRecord | QualsReqRecord)[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const loadRecords = () => {
    try {
      let result;
      if (selectedTable === 'skillsfile') {
        result = db.getAllSync<SkillsFileRecord>(
          'SELECT * FROM skillsfile ORDER BY created DESC'
        );
      } else if (selectedTable === 'users') {
        result = db.getAllSync<UserRecord>(
          'SELECT * FROM users ORDER BY id DESC'
        );
      } else {
        result = db.getAllSync<QualsReqRecord>(
          'SELECT * FROM quals_req ORDER BY id ASC'
        );
      }
      setRecords(result);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  const sortRecords = (records: (SkillsFileRecord | UserRecord | QualsReqRecord)[], config: { key: string; direction: 'asc' | 'desc' }) => {
    return [...records].sort((a, b) => {
      const aValue = a[config.key as keyof (SkillsFileRecord | UserRecord | QualsReqRecord)] as string | number;
      const bValue = b[config.key as keyof (SkillsFileRecord | UserRecord | QualsReqRecord)] as string | number;
      
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
                    'mriley'
                  );
                `);
              }
              
              loadRecords();
              Alert.alert('Success', `All records have been cleared from ${selectedTable}`);
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
    if (selectedTable === 'skillsfile') {
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
            onPress={() => requestSort('requested_by')}
          >
            <Text style={styles.headerCellText}>requested by {getSortDirection('requested_by')}</Text>
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
        </View>
      );
    }
  };

  const renderTableRow = (record: SkillsFileRecord | UserRecord | QualsReqRecord) => {
    if (selectedTable === 'skillsfile' && 'name' in record && 'uid' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.uid}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.name}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.expires_months}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.creator}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.updator || 'NULL'}</Text>
        </View>
      );
    } else if (selectedTable === 'users' && 'first_name' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.uid}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.first_name}</Text>
          <Text style={[styles.cell, styles.nameCell]}>{record.last_name}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.username}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.creator}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.updator || 'NULL'}</Text>
        </View>
      );
    } else if (selectedTable === 'quals_req' && 'name' in record) {
      return (
        <View key={record.id} style={styles.tableRow}>
          <Text style={[styles.cell, styles.idCell]}>{record.id}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.uid}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.name}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.intro}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.requested_by}</Text>
          <Text style={[styles.cell, styles.skillsFileCell]}>{record.expires_months}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.created}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.creator}</Text>
          <Text style={[styles.cell, styles.dateCell]}>{record.updated || 'NULL'}</Text>
          <Text style={[styles.cell, styles.uidCell]}>{record.updator || 'NULL'}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Showing {records.length} records</Text>
      </View>

      <View style={styles.tableSelector}>
        <TouchableOpacity 
          style={[styles.tableButton, selectedTable === 'skillsfile' && styles.selectedTableButton]}
          onPress={() => setSelectedTable('skillsfile')}
        >
          <Text style={[styles.tableButtonText, selectedTable === 'skillsfile' && styles.selectedTableButtonText]}>
            SkillsFile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tableButton, selectedTable === 'users' && styles.selectedTableButton]}
          onPress={() => setSelectedTable('users')}
        >
          <Text style={[styles.tableButtonText, selectedTable === 'users' && styles.selectedTableButtonText]}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tableButton, selectedTable === 'quals_req' && styles.selectedTableButton]}
          onPress={() => setSelectedTable('quals_req')}
        >
          <Text style={[styles.tableButtonText, selectedTable === 'quals_req' && styles.selectedTableButtonText]}>
            Required Qualifications
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity style={styles.clearButton} onPress={clearTable}>
          <Text style={styles.clearButtonText}>Clear all tables</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  tableSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  tableButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#E5E5EA',
    marginRight: 10,
  },
  selectedTableButton: {
    backgroundColor: '#007AFF',
  },
  tableButtonText: {
    color: '#000',
  },
  selectedTableButtonText: {
    color: 'white',
  },
  tableWrapper: {
    flex: 1,
  },
  tableContainer: {
    minWidth: 1200,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 15,
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
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
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
}); 