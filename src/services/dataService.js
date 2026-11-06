import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockWhales } from '../data/mockWhales';
import { mockStartups } from '../data/mockStartups';

// Map of local bundled images for 100% reliable zero-lag display
const localWhaleImages = {
  '1': require('../../assets/whales/rekha.jpg'),
  '2': require('../../assets/whales/kedia.jpg'),
  '3': require('../../assets/whales/kacholia.jpg'),
  '4': require('../../assets/whales/buffett.jpg'),
  '5': require('../../assets/whales/damani.jpg'),
  '6': require('../../assets/whales/mukul.jpg'),
  '7': require('../../assets/whales/singhania.jpg'),
  '8': require('../../assets/whales/porinju.jpg'),
  '9': require('../../assets/whales/dalio.jpg'),
  '10': require('../../assets/whales/ackman.jpg'),
  '11': null,
  '12': null,
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
    const mergedList = data.map((item) => ({
      id: item.id,
      name: item.name,
      tag: item.tag,
      portfolioValue: item.portfolio_value,
      return1Y: item.return_1y,
      isPositive: item.is_positive,
      avatar: item.avatar,
      avatarGradient: localWhaleGradients[item.id] || ['#3B82F6', '#1D4ED8'],
      localImage: localWhaleImages[item.id],
      topHoldings: item.top_holdings || [],
      recentMoves: item.recent_moves || [],
    }));

    // Add any remaining whales from mockWhales not yet in Supabase
    mockWhales.forEach((w) => {
      if (!supabaseIds.has(w.id)) {
        mergedList.push(w);
      }
    });

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
