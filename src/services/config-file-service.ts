import * as path from 'path';
import * as fs from 'fs/promises';
import { CspPartner, Customer } from '../types';
import { Logger } from './logger';

export interface ConfigFileService {
  loadCspPartners: () => Promise<CspPartner[]>;
  saveCspPartners: (partners: CspPartner[]) => Promise<void>;
  loadCustomers: () => Promise<Customer[]>;
  saveCustomers: (customers: Customer[]) => Promise<void>;
  getCspPartners: () => CspPartner[];
  getCustomers: () => Customer[];
}

const DEFAULT_CSP_PARTNERS: CspPartner[] = [
  {
    id: 'sample-csp-1',
    name: 'Sample CSP Partner',
    email: 'admin@msppartner.com'
  }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'sample-customer-1',
    name: 'GoingIPO',
    emailId: 'demo@goingipo.com',
    objectId: '1b714f99-f5eb-4f9c-9de7-a122da656f49',
    tenantId: '1bfcf5db-8869-42f6-8a5c-ba7985673503'
  },
  {
    id: 'sample-customer-2',
    name: 'Fourth Coffee',
    emailId: 'test@fourthcoffee.com',
    objectId: 'cbb6d5aa-4887-444f-ac9e-b56f8f6e66c2',
    tenantId: '2694e9dc-29a5-4017-958d-68314a91f2d2'
  },
  {
    id: 'sample-customer-3',
    name: 'Contoso',
    emailId: 'customer@contoso.com',
    objectId: 'sample-oid-contoso',
    tenantId: 'sample-tid-contoso'
  }
];

export const createConfigFileService = (fileLocation: string, logger: Logger): ConfigFileService => {
  let cspPartners: CspPartner[] = [];
  let customers: Customer[] = [];

  const checkDir = async (filePath: string): Promise<void> => {
    const dir = path.dirname(filePath);
    if (!((await fs.stat(dir).catch((_) => false)) as boolean)) {
      await fs.mkdir(dir, { recursive: true });
    }
  };

  const fileExists = async (filePath: string): Promise<boolean> => {
    await checkDir(filePath);
    return (await fs.stat(filePath).catch((_) => false)) as boolean;
  };

  const loadCspPartners = async (): Promise<CspPartner[]> => {
    const filePath = path.resolve(fileLocation, 'csppartners.json');

    if (!(await fileExists(filePath))) {
      logger.log('csppartners.json not found - creating with defaults', 'ConfigFileService');
      await saveCspPartners(DEFAULT_CSP_PARTNERS);
      return DEFAULT_CSP_PARTNERS;
    }

    try {
      const buffer = await fs.readFile(filePath, 'utf8');
      cspPartners = JSON.parse(buffer) as CspPartner[];
      logger.log(`Loaded ${cspPartners.length} CSP partners from file`, 'ConfigFileService');
      return cspPartners;
    } catch (e) {
      logger.log(`Error loading csppartners.json: ${e as string}`, 'ConfigFileService');
      return DEFAULT_CSP_PARTNERS;
    }
  };

  const saveCspPartners = async (partners: CspPartner[]): Promise<void> => {
    const filePath = path.resolve(fileLocation, 'csppartners.json');
    await checkDir(filePath);

    try {
      const data = JSON.stringify(partners, null, 2);
      await fs.writeFile(filePath, data, { encoding: 'utf8' });
      cspPartners = partners;
      logger.log(`Saved ${partners.length} CSP partners to file`, 'ConfigFileService');
    } catch (e) {
      logger.log(`Error saving csppartners.json: ${e as string}`, 'ConfigFileService');
    }
  };

  const loadCustomers = async (): Promise<Customer[]> => {
    const filePath = path.resolve(fileLocation, 'customers.json');

    if (!(await fileExists(filePath))) {
      logger.log('customers.json not found - creating with defaults', 'ConfigFileService');
      await saveCustomers(DEFAULT_CUSTOMERS);
      return DEFAULT_CUSTOMERS;
    }

    try {
      const buffer = await fs.readFile(filePath, 'utf8');
      customers = JSON.parse(buffer) as Customer[];
      logger.log(`Loaded ${customers.length} customers from file`, 'ConfigFileService');
      return customers;
    } catch (e) {
      logger.log(`Error loading customers.json: ${e as string}`, 'ConfigFileService');
      return DEFAULT_CUSTOMERS;
    }
  };

  const saveCustomers = async (customerList: Customer[]): Promise<void> => {
    const filePath = path.resolve(fileLocation, 'customers.json');
    await checkDir(filePath);

    try {
      const data = JSON.stringify(customerList, null, 2);
      await fs.writeFile(filePath, data, { encoding: 'utf8' });
      customers = customerList;
      logger.log(`Saved ${customerList.length} customers to file`, 'ConfigFileService');
    } catch (e) {
      logger.log(`Error saving customers.json: ${e as string}`, 'ConfigFileService');
    }
  };

  const getCspPartners = (): CspPartner[] => cspPartners;
  const getCustomers = (): Customer[] => customers;

  return {
    loadCspPartners,
    saveCspPartners,
    loadCustomers,
    saveCustomers,
    getCspPartners,
    getCustomers
  };
};
