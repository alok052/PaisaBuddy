import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockWhales } from '../data/mockWhales';
import { mockStartups } from '../data/mockStartups';

// Map of local bundled images for 100% reliable zero-lag display
const localWhaleImages = {
  '1': require('../../assets/whales/whale_1.jpg'),
  '2': require('../../assets/whales/whale_2.jpg'),
  '3': require('../../assets/whales/whale_3.jpg'),
  '4': require('../../assets/whales/whale_4.jpg'),
  '5': require('../../assets/whales/whale_5.jpg'),
  '6': require('../../assets/whales/whale_6.jpg'),
  '7': require('../../assets/whales/whale_7.jpg'),
  '8': require('../../assets/whales/whale_8.jpg'),
  '9': require('../../assets/whales/whale_9.jpg'),
  '10': require('../../assets/whales/whale_10.jpg'),
  '11': require('../../assets/whales/whale_11.jpg'),
  '12': require('../../assets/whales/whale_12.jpg'),
  '13': require('../../assets/whales/whale_13.jpg'),
  '14': require('../../assets/whales/whale_14.jpg'),
  '15': require('../../assets/whales/whale_15.jpg'),
  '16': require('../../assets/whales/whale_16.jpg'),
  '17': require('../../assets/whales/whale_17.jpg'),
  '18': require('../../assets/whales/whale_18.jpg'),
  '19': require('../../assets/whales/whale_19.jpg'),
  '20': require('../../assets/whales/whale_20.jpg'),
  '21': require('../../assets/whales/whale_21.jpg'),
  '22': require('../../assets/whales/whale_22.jpg'),
  '23': require('../../assets/whales/whale_23.jpg'),
  '24': require('../../assets/whales/whale_24.jpg'),
  '25': require('../../assets/whales/whale_25.jpg'),
  '26': require('../../assets/whales/whale_26.jpg'),
  '27': require('../../assets/whales/whale_27.jpg'),
  '28': require('../../assets/whales/whale_28.jpg'),
  '29': require('../../assets/whales/whale_29.jpg'),
  '30': require('../../assets/whales/whale_30.jpg'),
  '31': require('../../assets/whales/whale_31.jpg'),
  '32': require('../../assets/whales/whale_32.jpg'),
  '33': require('../../assets/whales/whale_33.jpg'),
  '34': require('../../assets/whales/whale_34.jpg'),
  '35': require('../../assets/whales/whale_35.jpg'),
  '36': require('../../assets/whales/whale_36.jpg'),
  '37': require('../../assets/whales/whale_37.jpg'),
  '38': require('../../assets/whales/whale_38.jpg'),
  '39': require('../../assets/whales/whale_39.jpg'),
  '40': require('../../assets/whales/whale_40.jpg'),
  '41': require('../../assets/whales/whale_41.jpg'),
  '42': require('../../assets/whales/whale_42.jpg'),
  '43': require('../../assets/whales/whale_43.jpg'),
  '44': require('../../assets/whales/whale_44.jpg'),
  '45': require('../../assets/whales/whale_45.jpg'),
  '46': require('../../assets/whales/whale_46.jpg'),
  '47': require('../../assets/whales/whale_47.jpg'),
  '48': require('../../assets/whales/whale_48.jpg'),
  '49': require('../../assets/whales/whale_49.jpg'),
  '50': require('../../assets/whales/whale_50.jpg'),
};


const LUXURY_PALETTES = [
  ['#059669', '#047857'], // Emerald
  ['#2563EB', '#1D4ED8'], // Sapphire
  ['#D97706', '#B45309'], // Amber
  ['#DC2626', '#B91C1C'], // Ruby
  ['#0891B2', '#0E7490'], // Cyan
  ['#4F46E5', '#4338CA'], // Indigo
  ['#0D9488', '#0F766E'], // Teal
  ['#475569', '#334155'], // Slate
  ['#7C3AED', '#6D28D9'], // Violet
  ['#E11D48', '#BE123C'], // Rose
];

const getWhaleGradient = (id) => {
  if (localWhaleGradients[id]) return localWhaleGradients[id];
  const num = parseInt(id || '1', 10);
  return LUXURY_PALETTES[num % LUXURY_PALETTES.length];
};

const localWhaleGradients = {
  '1': ['#F97316', '#EF4444'],
  '2': ['#3B82F6', '#6366F1'],
  '3': ['#10B981', '#059669'],
  '4': ['#F59E0B', '#D97706'],
  '5': ['#1E293B', '#0F172A'],
  '6': ['#EC4899', '#BE185D'],
  '7': ['#06B6D4', '#0E7490'],
  '8': ['#84CC16', '#4D7C0F'],
  '9': ['#6366F1', '#4338CA'],
  '10': ['#14B8A6', '#0F766E'],
  '11': ['#F43F5E', '#BE123C'],
  '12': ['#334155', '#1E293B'],
};

/**
 * Fetch live whales from Supabase with fallback to complete local dataset
 */
export async function fetchLiveWhales() {
  if (!isSupabaseConfigured() || !supabase) {
    return mockWhales;
  }

  try {
    const { data, error } = await supabase
      .from('whales')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockWhales;
    }

    // Merge Supabase data with any missing local whales so user gets the full 12 whales
    const supabaseIds = new Set(data.map((d) => d.id));
    const mergedList = data.map((item) => {
      const localWhale = mockWhales.find((w) => w.id === item.id) || {};
      return {
        id: item.id,
        name: item.name,
        tag: item.tag,
        portfolioValue: item.portfolio_value,
        return1Y: item.return_1y,
        isPositive: item.is_positive,
        avatar: item.avatar,
        avatarGradient: getWhaleGradient(item.id),
        localImage: localWhaleImages[item.id],
        topHoldings: item.top_holdings || localWhale.topHoldings || [],
        allHoldings: item.all_holdings || localWhale.allHoldings || localWhale.topHoldings || [],
        startups: item.startups || localWhale.startups || [],
        recentMoves: item.recent_moves || localWhale.recentMoves || [],
      };
    });

    // Add any remaining whales from mockWhales not yet in Supabase
    mockWhales.forEach((w) => {
      if (!supabaseIds.has(w.id)) {
        mergedList.push(w);
      }
    });

    // Sort numerically by ID so 1..50 appear in clean order
    mergedList.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
    return mergedList;
  } catch (err) {
    console.log('Error fetching whales from Supabase:', err);
    return mockWhales;
  }
}

/**
 * Fetch live startups deals from Supabase with fallback
 */

/**
 * Subscribe to real-time whale portfolio updates from Supabase
 */
export function subscribeToWhales(onUpdate) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const channel = supabase
      .channel('realtime:whales')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whales' },
        (payload) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.log('Error setting up Supabase Realtime subscription:', err);
    return null;
  }
}

export async function fetchLiveStartups() {
  if (!isSupabaseConfigured() || !supabase) {
    return mockStartups;
  }

  try {
    const { data, error } = await supabase
      .from('startups')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return mockStartups;
    }

    const supabaseIds = new Set(data.map((d) => d.id));
    const mergedList = data.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      city: item.city,
      stage: item.stage,
      isUnicorn: item.is_unicorn,
      valuation: item.valuation,
      totalRaised: item.total_raised,
      minInvestment: item.min_investment,
      investStatus: item.invest_status,
      raisedSoFar: item.raised_so_far,
      targetAmount: item.target_amount,
      progressPercent: item.progress_percent,
      daysLeft: item.days_left,
      investorCount: item.investor_count,
      iconBg: item.icon_bg,
      iconEmoji: item.icon_emoji,
      investors: item.investors || [],
      growthMetric: item.growth_metric,
    }));

    // Add remaining startups not yet in Supabase
    mockStartups.forEach((s) => {
      if (!supabaseIds.has(s.id)) {
        mergedList.push(s);
      }
    });

    return mergedList;
  } catch (err) {
    console.log('Error fetching startups from Supabase:', err);
    return mockStartups;
  }
}

/**
 * Fetch live bulk deal alert
 */
export async function fetchLiveAlert() {
  const fallback = {
    title: 'Ashish Kacholia increased stake in Gravita India by 1.2%!',
    subtitle: 'Bulk Deal: 3,50,000 shares @ ₹2,145',
    source: 'BSE Disclosed',
    timeAgo: '2h ago',
  };

  if (!isSupabaseConfigured() || !supabase) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('live_alerts')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return fallback;
    }

    return {
      title: data[0].title,
      subtitle: data[0].subtitle,
      source: data[0].source,
      timeAgo: data[0].time_ago,
    };
  } catch (err) {
    return fallback;
  }
}
