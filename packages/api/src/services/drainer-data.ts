import { KeyValueStore } from 'crawlee';
import fs from 'fs';
import path from 'path';

interface DrainerReport {
  reportId: string;
  title: string;
  description: string;
  amountLost?: string;
  domains: string[];
  submitted: string;
  submittedBy: string;
  page: number;
}

interface DrainerAddressData {
  address: string;
  reports: DrainerReport[];
}

interface AddressMap {
  [address: string]: DrainerAddressData;
}

let cachedAddressMap: AddressMap | null = null;

/**
 * Load drainer addresses and domains from scraped data
 */
export async function loadDrainerData(): Promise<AddressMap> {
  if (cachedAddressMap) {
    return cachedAddressMap;
  }

  try {
    // Try to load from Crawlee KeyValueStore first
    const kv = await KeyValueStore.open();
    const addresses = await kv.getValue<AddressMap>('addresses');
    
    if (addresses) {
      cachedAddressMap = addresses;
      return addresses;
    }
  } catch (err) {
    // Fallback to file system
  }

  // Fallback: Load from file system
  try {
    const storagePath = path.join(process.cwd(), 'storage', 'key_value_stores', 'default', 'addresses.json');
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8');
      cachedAddressMap = JSON.parse(data);
      return cachedAddressMap!;
    }
  } catch (err) {
    console.warn('Could not load drainer data:', err);
  }

  return {};
}

/**
 * Get domains associated with a drainer address
 */
export async function getDomainsForAddress(address: string): Promise<string[]> {
  const addressMap = await loadDrainerData();
  const drainerData = addressMap[address];
  
  if (!drainerData) {
    return [];
  }

  // Collect all unique domains from all reports for this address
  const domains = new Set<string>();
  for (const report of drainerData.reports) {
    for (const domain of report.domains || []) {
      // Filter out common non-malicious domains
      if (domain && 
          !domain.includes('chainabuse.com') && 
          !domain.includes('solana.fm') && 
          !domain.includes('twitter.com') &&
          !domain.includes('trmlabs.com')) {
        domains.add(domain);
      }
    }
  }

  return Array.from(domains);
}

