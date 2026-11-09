import { File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

export const STORE_KEYS = {
  WATCHLIST: 'paisabuddy_watchlist_v1.json',
  DIVIDEND_CONFIG: 'paisabuddy_dividend_v1.json',
  PORTFOLIO_HOLDINGS: 'paisabuddy_portfolio_v1.json',
  TAX_HARVEST_STATE: 'paisabuddy_tax_v1.json',
  DIP_ALERT_CONFIG: 'paisabuddy_dip_alert_v1.json',
};

const memoryFallback = {};

export async function readJsonStore(fileName, fallback = null) {
  try {
    if (Paths && Paths.document && File) {
      const target = new File(Paths.document, fileName);
      if (target.exists) {
        const raw = await target.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          memoryFallback[fileName] = parsed;
          return parsed;
        }
      }
      return memoryFallback[fileName] !== undefined ? memoryFallback[fileName] : fallback;
    }
  } catch (err) {
    // Fall back to legacy FileSystem API or memory cache below
  }

  try {
    if (LegacyFS && LegacyFS.documentDirectory) {
      const uri = `${LegacyFS.documentDirectory}${fileName}`;
      const info = await LegacyFS.getInfoAsync(uri);
      if (info && info.exists) {
        const raw = await LegacyFS.readAsStringAsync(uri, { encoding: 'utf8' });
        if (raw) {
          const parsed = JSON.parse(raw);
          memoryFallback[fileName] = parsed;
          return parsed;
        }
      }
    }
  } catch (err) {
    // Use memory fallback cleanly
  }

  return memoryFallback[fileName] !== undefined ? memoryFallback[fileName] : fallback;
}

export async function writeJsonStore(fileName, data) {
  memoryFallback[fileName] = data;
  const serialized = JSON.stringify(data);

  try {
    if (Paths && Paths.document && File) {
      const target = new File(Paths.document, fileName);
      if (!target.exists) {
        target.create({ intermediates: true, overwrite: true });
      }
      target.write(serialized);
      return true;
    }
  } catch (err) {
    // Fall back to legacy write below
  }

  try {
    if (LegacyFS && LegacyFS.documentDirectory) {
      const uri = `${LegacyFS.documentDirectory}${fileName}`;
      await LegacyFS.writeAsStringAsync(uri, serialized, { encoding: 'utf8' });
      return true;
    }
  } catch (err) {
    // Stored in memory fallback
  }

  return false;
}
