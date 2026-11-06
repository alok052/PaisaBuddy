const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://swnocdeyclhzevdgtdrz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r_NCnZLMgP24OLqNgdrnPg_MYzoskik';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const allWhales = [
  {
    id: '1',
    name: 'Rekha Jhunjhunwala',
    tag: '🇮🇳 Rare Enterprises',
    portfolio_value: '₹46,800 Cr',
    return_1y: '+14.2%',
    is_positive: true,
    avatar: 'RJ',
    top_holdings: [
      { name: 'Titan Company', stake: '5.1%', value: '₹17,400 Cr' },
      { name: 'Star Health', stake: '14.4%', value: '₹4,850 Cr' },
      { name: 'Tata Motors', stake: '1.4%', value: '₹3,920 Cr' },
      { name: 'Metro Brands', stake: '9.6%', value: '₹3,100 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Nazara Tech', detail: '+0.8% stake added (Bulk Deal)', date: 'Today' },
      { type: 'SELL', stock: 'Canara Bank', detail: '-1.2% profit booked', date: '2 days ago' },
      { type: 'BUY', stock: 'Fortis Healthcare', detail: '+0.4% stake added', date: 'Last week' },
    ],
  },
  {
    id: '2',
    name: 'Vijay Kedia',
    tag: '🇮🇳 Kedia Securities',
    portfolio_value: '₹1,850 Cr',
    return_1y: '+28.7%',
    is_positive: true,
    avatar: 'VK',
    top_holdings: [
      { name: 'Tejas Networks', stake: '3.8%', value: '₹410 Cr' },
      { name: 'Sudarshan Chemical', stake: '4.2%', value: '₹220 Cr' },
      { name: 'Elecon Engineering', stake: '1.8%', value: '₹185 Cr' },
      { name: 'Patel Engineering', stake: '1.5%', value: '₹95 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Praj Industries', detail: 'Fresh entry! 1.1% acquired', date: 'Yesterday' },
      { type: 'BUY', stock: 'Elecon Engg', detail: '+0.5% added on dips', date: '3 days ago' },
      { type: 'HOLD', stock: 'Tejas Networks', detail: 'Maintaining core position', date: '1 week ago' },
    ],
  },
  {
    id: '3',
    name: 'Ashish Kacholia',
    tag: '🇮🇳 Lucky Investments',
    portfolio_value: '₹3,200 Cr',
    return_1y: '+21.4%',
    is_positive: true,
    avatar: 'AK',
    top_holdings: [
      { name: 'Gravita India', stake: '3.1%', value: '₹340 Cr' },
      { name: 'Safari Industries', stake: '2.5%', value: '₹290 Cr' },
      { name: 'Balaji Amines', stake: '1.9%', value: '₹180 Cr' },
      { name: 'Shaily Engineering', stake: '5.2%', value: '₹175 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Gravita India', detail: '+1.2% stake in Bulk Deal @ ₹2,145', date: 'Today' },
      { type: 'SELL', stock: 'Faze Three', detail: 'Partial exit (-0.7%)', date: '4 days ago' },
    ],
  },
  {
    id: '4',
    name: 'Warren Buffett',
    tag: '🇺🇸 Berkshire Hathaway',
    portfolio_value: '$905 Billion',
    return_1y: '+18.2%',
    is_positive: true,
    avatar: 'WB',
    top_holdings: [
      { name: 'Apple Inc (AAPL)', stake: '28.9%', value: '$135B' },
      { name: 'Bank of America', stake: '11.2%', value: '$41B' },
      { name: 'American Express', stake: '12.4%', value: '$35B' },
      { name: 'Coca-Cola (KO)', stake: '8.5%', value: '$26B' },
    ],
    recent_moves: [
      { type: 'SELL', stock: 'Apple Inc', detail: 'Trimmed 25% stake to build cash ($300B+ cash pile)', date: 'Q3 13F' },
      { type: 'BUY', stock: 'Occidental Petroleum', detail: '+2.1M shares added', date: 'Q3 13F' },
      { type: 'BUY', stock: 'Sirius XM', detail: 'Added $450M position', date: 'Q3 13F' },
    ],
  },
  {
    id: '5',
    name: 'Radhakishan Damani',
    tag: '🇮🇳 DMart Founder & Legend',
    portfolio_value: '₹2,10,000 Cr',
    return_1y: '+9.8%',
    is_positive: true,
    avatar: 'RD',
    top_holdings: [
      { name: 'Avenue Supermarts', stake: '74.6%', value: '₹1,95,000 Cr' },
      { name: 'VST Industries', stake: '32.1%', value: '₹1,850 Cr' },
      { name: 'India Cements', stake: '20.8%', value: '₹1,400 Cr' },
      { name: 'United Breweries', stake: '1.2%', value: '₹620 Cr' },
    ],
    recent_moves: [
      { type: 'HOLD', stock: 'Avenue Supermarts', detail: 'Long term promoter holding', date: 'Quarterly' },
      { type: 'SELL', stock: 'India Cements', detail: 'Sold stake to UltraTech Cement', date: 'Recent' },
    ],
  },
  {
    id: '6',
    name: 'Mukul Agrawal',
    tag: '🇮🇳 Aggressive Mid-Cap Bull',
    portfolio_value: '₹5,400 Cr',
    return_1y: '+34.5%',
    is_positive: true,
    avatar: 'MA',
    top_holdings: [
      { name: 'Neuland Laboratories', stake: '2.8%', value: '₹410 Cr' },
      { name: 'Raymond Ltd', stake: '1.6%', value: '₹320 Cr' },
      { name: 'PTC Industries', stake: '1.2%', value: '₹280 Cr' },
      { name: 'Ceat Tyres', stake: '1.8%', value: '₹210 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Stanley Lifestyles', detail: 'Fresh IPO entry! 1.4% acquired', date: 'Yesterday' },
      { type: 'BUY', stock: 'Pearl Global', detail: '+0.6% added on breakout', date: '3 days ago' },
      { type: 'SELL', stock: 'Birlasoft', detail: 'Profit booking -0.8%', date: '1 week ago' },
    ],
  },
  {
    id: '7',
    name: 'Sunil Singhania',
    tag: '🇮🇳 Abakkus Asset Manager',
    portfolio_value: '₹8,500 Cr',
    return_1y: '+26.1%',
    is_positive: true,
    avatar: 'SS',
    top_holdings: [
      { name: 'Hindware Home', stake: '4.8%', value: '₹340 Cr' },
      { name: 'Sarda Energy', stake: '3.1%', value: '₹290 Cr' },
      { name: 'Ion Exchange', stake: '2.9%', value: '₹240 Cr' },
      { name: 'Somany Ceramics', stake: '2.5%', value: '₹190 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Dynamatic Tech', detail: '+0.9% stake in aerospace rally', date: 'Today' },
      { type: 'BUY', stock: 'Stylam Industries', detail: '+0.4% added', date: '4 days ago' },
    ],
  },
  {
    id: '8',
    name: 'Porinju Veliyath',
    tag: '🇮🇳 Equity Intelligence',
    portfolio_value: '₹320 Cr',
    return_1y: '+19.4%',
    is_positive: true,
    avatar: 'PV',
    top_holdings: [
      { name: 'Kerala Ayurveda', stake: '4.9%', value: '₹48 Cr' },
      { name: 'Aurum PropTech', stake: '3.2%', value: '₹39 Cr' },
      { name: 'Max Heights Infra', stake: '4.1%', value: '₹28 Cr' },
      { name: 'Ritesh Properties', stake: '2.8%', value: '₹22 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Kerala Ayurveda', detail: 'Increased stake by 0.7%', date: '2 days ago' },
      { type: 'SELL', stock: 'Taneja Aerospace', detail: 'Exited position (+180% return)', date: 'Last week' },
    ],
  },
  {
    id: '9',
    name: 'Ray Dalio',
    tag: '🇺🇸 Bridgewater Associates',
    portfolio_value: '$17.8 Billion',
    return_1y: '+13.6%',
    is_positive: true,
    avatar: 'RD',
    top_holdings: [
      { name: 'iShares Core S&P 500', stake: '5.8%', value: '$1.03B' },
      { name: 'Procter & Gamble (PG)', stake: '4.2%', value: '$750M' },
      { name: 'Alphabet Inc (GOOGL)', stake: '3.6%', value: '$640M' },
      { name: 'Meta Platforms (META)', stake: '3.1%', value: '$550M' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Gold Trust (GLD)', detail: 'Increased macro hedge allocation', date: 'Q3 13F' },
      { type: 'BUY', stock: 'Amazon.com', detail: 'Added $210M shares', date: 'Q3 13F' },
      { type: 'SELL', stock: 'Costco Wholesale', detail: 'Trimmed position', date: 'Q3 13F' },
    ],
  },
  {
    id: '10',
    name: 'Bill Ackman',
    tag: '🇺🇸 Pershing Square Capital',
    portfolio_value: '$10.4 Billion',
    return_1y: '+22.8%',
    is_positive: true,
    avatar: 'BA',
    top_holdings: [
      { name: 'Chipotle Mexican Grill', stake: '18.4%', value: '$1.91B' },
      { name: 'Hilton Worldwide', stake: '17.2%', value: '$1.79B' },
      { name: 'Alphabet Inc', stake: '15.6%', value: '$1.62B' },
      { name: 'Howard Hughes Holdings', stake: '14.1%', value: '$1.46B' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'Nike Inc (NKE)', detail: 'Massive $230M new turnaround bet', date: 'Q3 13F' },
      { type: 'HOLD', stock: 'Chipotle (CMG)', detail: 'Core high-conviction winner', date: 'Q3 13F' },
    ],
  },
  {
    id: '11',
    name: 'Dolly Khanna',
    tag: '🇮🇳 High-Alpha Smallcap Queen',
    portfolio_value: '₹550 Cr',
    return_1y: '+31.2%',
    is_positive: true,
    avatar: 'DK',
    top_holdings: [
      { name: 'KCP Sugar & Industries', stake: '2.4%', value: '₹75 Cr' },
      { name: 'Mangalore Chemicals', stake: '1.9%', value: '₹62 Cr' },
      { name: 'Deepak Spinners', stake: '3.1%', value: '₹45 Cr' },
      { name: 'Nitin Spinners', stake: '1.4%', value: '₹38 Cr' },
    ],
    recent_moves: [
      { type: 'BUY', stock: 'KCP Sugar', detail: '+0.5% added in sugar rally', date: 'Today' },
      { type: 'BUY', stock: 'Prakash Pipes', detail: 'Fresh position! 1.1% stake', date: 'Yesterday' },
      { type: 'SELL', stock: 'Talbros Auto', detail: 'Partial profit booking (-0.8%)', date: '3 days ago' },
    ],
  },
  {
    id: '12',
    name: 'Nemish Shah',
    tag: '🇮🇳 ENAM Securities Legend',
    portfolio_value: '₹3,800 Cr',
    return_1y: '+17.9%',
    is_positive: true,
    avatar: 'NS',
    top_holdings: [
      { name: 'Lakshmi Machine Works', stake: '6.4%', value: '₹1,280 Cr' },
      { name: 'Asahi India Glass', stake: '3.8%', value: '₹840 Cr' },
      { name: 'Zodiac Clothing', stake: '4.2%', value: '₹140 Cr' },
      { name: 'Bannari Amman Sugars', stake: '2.1%', value: '₹110 Cr' },
    ],
    recent_moves: [
      { type: 'HOLD', stock: 'Lakshmi Machine Works', detail: '20+ year multi-bagger conviction', date: 'Quarterly' },
      { type: 'BUY', stock: 'Asahi India Glass', detail: '+0.3% added on expansion news', date: 'Last week' },
    ],
  },
];

async function insertAll() {
  console.log(`Inserting ${allWhales.length} superstar whales into Supabase...`);
  const { data, error } = await supabase.from('whales').upsert(allWhales);
  if (error) {
    console.error('Error inserting whales:', error);
  } else {
    console.log(`🎉 Successfully inserted all ${allWhales.length} Whales into Supabase Cloud DB!`);
  }
}

insertAll();
