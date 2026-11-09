import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AppHeader from '../components/AppHeader';
import { mockSIPFundsDatabase, resolveFundAudit } from '../data/mockSIPFunds';
import {
  searchAmfiSchemes,
  fetchLiveSchemeAudit,
  cleanBaseSchemeName,
} from '../services/mfApiService';
import { fetchLiveWhales } from '../services/dataService';
import {
  POPULAR_OVERLAP_PAIRS,
  findCuratedFundById,
  compareMutualFunds,
} from '../services/mfOverlapEngine';
import { shareOverlapInsight } from '../services/shareService';

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'LARGE', label: 'Large Cap' },
  { id: 'FLEXI', label: 'Flexi Cap' },
  { id: 'MID', label: 'Mid Cap' },
  { id: 'SMALL', label: 'Small Cap' },
  { id: 'HYBRID', label: 'Hybrid' },
  { id: 'ELSS', label: 'ELSS' },
];

export default function MFOverlapScreen({ onOpenMenu, onOpenSipDoctor }) {
  const defaultFundA = findCuratedFundById('parag_parikh_flexicap') || mockSIPFundsDatabase[0];
  const defaultFundB = findCuratedFundById('hdfc_flexicap') || mockSIPFundsDatabase[1];

  const [fundA, setFundA] = useState(defaultFundA);
  const [fundB, setFundB] = useState(defaultFundB);
  const [whalesList, setWhalesList] = useState([]);
  const [overlapReport, setOverlapReport] = useState(() =>
    compareMutualFunds(defaultFundA, defaultFundB, [])
  );

  // Picker Modal State
  const [pickingSlot, setPickingSlot] = useState(null); // 'A' | 'B' | null
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [liveAmfiResults, setLiveAmfiResults] = useState([]);
  const [isSearchingAmfi, setIsSearchingAmfi] = useState(false);
  const [syncingSlot, setSyncingSlot] = useState(null);
  const slotReqIdRef = useRef({ A: 0, B: 0 });

  useEffect(() => {
    fetchLiveWhales()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setWhalesList(list);
          setOverlapReport(compareMutualFunds(fundA, fundB, list));
        }
      })
      .catch(() => {});
  }, []);

  // Recompute overlap seamlessly whenever selected funds or whales update
  useEffect(() => {
    if (fundA && fundB) {
      setOverlapReport(compareMutualFunds(fundA, fundB, whalesList));
    }
  }, [fundA, fundB, whalesList]);

  // Live AMFI Search (45,000+ schemes) inside Picker Modal
  useEffect(() => {
    const q = searchText.trim();
    if (!pickingSlot || q.length < 2) {
      setLiveAmfiResults([]);
      setIsSearchingAmfi(false);
      return;
    }

    let cancelled = false;
    setIsSearchingAmfi(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await searchAmfiSchemes(q, 20);
        if (!cancelled) {
          setLiveAmfiResults(Array.isArray(rows) ? rows : []);
        }
      } catch (e) {
        if (!cancelled) setLiveAmfiResults([]);
      } finally {
        if (!cancelled) setIsSearchingAmfi(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchText, pickingSlot]);

  const filteredCuratedFunds = useMemo(() => {
    const q = searchText.toLowerCase();
    return mockSIPFundsDatabase.filter((f) => {
      const matchesQuery =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.category || '').toLowerCase().includes(q) ||
        (f.amc || '').toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (categoryFilter === 'LARGE') return f.category.includes('Large') || f.category.includes('Index');
      if (categoryFilter === 'FLEXI') return f.category.includes('Flexi') || f.category.includes('Multi');
      if (categoryFilter === 'MID') return f.category.includes('Mid');
      if (categoryFilter === 'SMALL') return f.category.includes('Small');
      if (categoryFilter === 'HYBRID') return f.category.includes('Dynamic') || f.category.includes('Balanced') || f.category.includes('Hybrid');
      if (categoryFilter === 'ELSS') return f.category.includes('ELSS') || f.category.includes('Tax');
      return true;
    });
  }, [searchText, categoryFilter]);

  const extraLiveAmfiRows = useMemo(() => {
    return liveAmfiResults.filter((cand) => {
      const baseLower = cleanBaseSchemeName(cand.schemeName).toLowerCase();
      return !filteredCuratedFunds.some((f) => {
        const fBase = cleanBaseSchemeName(f.name).toLowerCase();
        return fBase === baseLower || fBase.includes(baseLower) || baseLower.includes(fBase);
      });
    });
  }, [liveAmfiResults, filteredCuratedFunds]);

  const hydrateSlotLiveAmfi = async (slot, fundSeed) => {
    const reqId = ++slotReqIdRef.current[slot];
    setSyncingSlot(slot);
    try {
      const enriched = await fetchLiveSchemeAudit(fundSeed, 'DIRECT');
      if (enriched && slotReqIdRef.current[slot] === reqId) {
        const merged = {
          ...enriched,
          id:
            fundSeed?.id && !String(fundSeed.id).startsWith('amfi_')
              ? fundSeed.id
              : enriched.id,
        };
        if (slot === 'A') setFundA(merged);
        else setFundB(merged);
      }
    } catch (e) {
      // Retain immediate resolved template gracefully
    } finally {
      if (slotReqIdRef.current[slot] === reqId) {
        setSyncingSlot((prev) => (prev === slot ? null : prev));
      }
    }
  };

  const handleChooseCurated = (fund) => {
    Haptics.selectionAsync();
    const targetSlot = pickingSlot;
    if (targetSlot === 'A') setFundA(fund);
    else setFundB(fund);
    setPickingSlot(null);
    setSearchText('');
    hydrateSlotLiveAmfi(targetSlot, fund);
  };

  const handleChooseAmfiCandidate = (cand) => {
    Haptics.selectionAsync();
    const targetSlot = pickingSlot;
    const baseName = cleanBaseSchemeName(cand.schemeName) || cand.schemeName;
    const preliminary = {
      ...resolveFundAudit(baseName),
      id: `amfi_${cand.schemeCode}`,
      schemeCode: cand.schemeCode,
      name: cand.schemeName,
    };
    if (targetSlot === 'A') setFundA(preliminary);
    else setFundB(preliminary);
    setPickingSlot(null);
    setSearchText('');
    hydrateSlotLiveAmfi(targetSlot, preliminary);
  };

  const handleSwapFunds = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const oldA = fundA;
    setFundA(fundB);
    setFundB(oldA);
  };

  const handleApplyPreset = (preset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const a = findCuratedFundById(preset.fundAId);
    const b = findCuratedFundById(preset.fundBId);
    if (a && b) {
      setFundA(a);
      setFundB(b);
      hydrateSlotLiveAmfi('A', a);
      hydrateSlotLiveAmfi('B', b);
    }
  };

  // Venn Diagram SVG circle centers shift closer dynamically as overlap% grows
  const overlapPct = overlapReport?.overlapPercent ?? 0;
  const maxSep = 96; // 0% overlap -> circles barely touching
  const minSep = 8;  // 100% overlap -> concentric
  const sep = maxSep - ((overlapPct / 100) * (maxSep - minSep));
  const cxLeft = 110 - sep / 2;
  const cxRight = 110 + sep / 2;

  const renderSlotCard = (slot, fund, accent) => {
    const isSyncing = syncingSlot === slot;
    return (
      <TouchableOpacity
        style={[s.fundSlotCard, { borderColor: `${accent}44` }]}
        activeOpacity={0.82}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setPickingSlot(slot);
        }}
      >
        <View style={s.slotHeaderRow}>
          <View style={s.slotTagLeft}>
            <View style={[s.slotDot, { backgroundColor: accent }]} />
            <Text style={[s.slotTagText, { color: accent }]}>
              {slot === 'A' ? 'FUND A • PRIMARY' : 'FUND B • COMPARE'}
            </Text>
          </View>
          <View style={s.changePill}>
            <Ionicons name="swap-horizontal" size={12} color="#94A3B8" />
            <Text style={s.changePillText}>Change</Text>
          </View>
        </View>

        <Text style={s.slotFundName} numberOfLines={2}>
          {fund?.name}
        </Text>

        <View style={s.slotMetaRow}>
          <Text style={s.slotMetaText} numberOfLines={1}>
            {fund?.amc || 'AMFI Scheme'} • {fund?.category}
          </Text>
          {isSyncing ? (
            <ActivityIndicator size="small" color={accent} style={{ marginLeft: 6 }} />
          ) : fund?.latestNav ? (
            <Text style={[s.slotNavChip, { color: accent }]}>
              NAV ₹{fund.latestNav.toFixed(2)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.screenRoot}>
      <ScrollView
        style={s.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <AppHeader
          subtitle="2-Fund Mutual Fund Overlap Scanner"
          onMenuPress={onOpenMenu}
        />

        {/* Hero Status Strip */}
        <View style={s.heroStrip}>
          <View style={s.heroStripLeft}>
            <Ionicons name="git-compare-outline" size={16} color="#10B981" />
            <Text style={s.heroStripText}>
              Compare any 2 of 45,000+ AMFI schemes (Zero CSV needed)
            </Text>
          </View>
          {onOpenSipDoctor && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onOpenSipDoctor();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.heroLink}>SIP Doctor →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick 1-Tap Popular Pairs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.presetsScroll}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {POPULAR_OVERLAP_PAIRS.map((preset) => {
            const isActive =
              fundA?.id === preset.fundAId && fundB?.id === preset.fundBId;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[s.presetChip, isActive && s.presetChipActive]}
                activeOpacity={0.8}
                onPress={() => handleApplyPreset(preset)}
              >
                <Text style={s.presetTag}>{preset.tag}</Text>
                <Text
                  style={[
                    s.presetLabel,
                    isActive && { color: '#10B981' },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dual Fund Picker */}
        <View style={s.dualPickerWrap}>
          {renderSlotCard('A', fundA, '#10B981')}

          <View style={s.swapOverlay}>
            <TouchableOpacity
              style={s.swapCircleBtn}
              activeOpacity={0.85}
              onPress={handleSwapFunds}
            >
              <Ionicons name="swap-vertical" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {renderSlotCard('B', fundB, '#38BDF8')}
        </View>

        {/* Visual Overlap Gauge Card */}
        {overlapReport && (
          <>
            <View
              style={[
                s.gaugeCard,
                { borderColor: `${overlapReport.tierColor}45` },
              ]}
            >
              <View style={s.gaugeTopRow}>
                <View
                  style={[
                    s.tierPill,
                    {
                      backgroundColor: `${overlapReport.tierColor}1A`,
                      borderColor: `${overlapReport.tierColor}55`,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.tierDot,
                      { backgroundColor: overlapReport.tierColor },
                    ]}
                  />
                  <Text
                    style={[
                      s.tierText,
                      { color: overlapReport.tierColor },
                    ]}
                  >
                    {overlapReport.tierBadge}
                  </Text>
                </View>

                <View style={s.gradeBadge}>
                  <Text style={s.gradeLabel}>DIVERSIFICATION</Text>
                  <Text
                    style={[
                      s.gradeValue,
                      { color: overlapReport.tierColor },
                    ]}
                  >
                    {overlapReport.grade}
                  </Text>
                </View>
              </View>

              {/* Dynamic Venn Overlap SVG */}
              <View style={s.vennWrapper}>
                <Svg width={220} height={126}>
                  <Circle
                    cx={cxLeft}
                    cy={63}
                    r={52}
                    fill="rgba(16, 185, 129, 0.20)"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                  <Circle
                    cx={cxRight}
                    cy={63}
                    r={52}
                    fill="rgba(56, 189, 248, 0.20)"
                    stroke="#38BDF8"
                    strokeWidth={2}
                  />
                </Svg>
                <View style={s.vennCenterText}>
                  <Text
                    style={[
                      s.overlapBigPct,
                      { color: overlapReport.tierColor },
                    ]}
                  >
                    {overlapReport.overlapPercent}%
                  </Text>
                  <Text style={s.overlapSubLabel}>WEIGHTED OVERLAP</Text>
                </View>
              </View>

              {/* 3-Box Summary Strip */}
              <View style={s.summaryStrip}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryValue}>
                    {overlapReport.sharedStocks.length}
                  </Text>
                  <Text style={s.summaryLabel}>Shared Stocks</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryValue, { color: '#10B981' }]}>
                    {overlapReport.uniqueToA.length}
                  </Text>
                  <Text style={s.summaryLabel}>Unique to A</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryValue, { color: '#38BDF8' }]}>
                    {overlapReport.uniqueToB.length}
                  </Text>
                  <Text style={s.summaryLabel}>Unique to B</Text>
                </View>
              </View>
            </View>

            {/* Verdict & Consolidation Action Card */}
            <View
              style={[
                s.verdictCard,
                { borderLeftColor: overlapReport.tierColor },
              ]}
            >
              <Text style={s.verdictTitle}>{overlapReport.headline}</Text>
              <Text style={s.verdictDesc}>{overlapReport.recommendation}</Text>

              {overlapReport.topSectorWarning && (
                <View style={s.sectorAlertPill}>
                  <Ionicons name="warning" size={14} color="#F59E0B" />
                  <Text style={s.sectorAlertText}>
                    Sector Concentration Alert: Combined portfolio allocates{' '}
                    {overlapReport.topSectorWarning.pct}% to{' '}
                    {overlapReport.topSectorWarning.sector}.
                  </Text>
                </View>
              )}
            </View>

            {/* Side-by-Side Key Metrics (CAGR / Expense) */}
            <View style={s.cardBlock}>
              <Text style={s.sectionTitle}>SIDE-BY-SIDE METRICS</Text>
              <View style={s.compareTable}>
                <View style={s.compareCol}>
                  <Text style={[s.colDotLabel, { color: '#10B981' }]}>FUND A</Text>
                  <Text style={s.colName} numberOfLines={2}>
                    {fundA?.name}
                  </Text>
                  <Text style={s.colStat}>
                    Return:{' '}
                    <Text style={{ color: '#10B981', fontWeight: '800' }}>
                      {fundA?.directCagrNum
                        ? `${fundA.directCagrNum.toFixed(1)}%`
                        : fundA?.currentCagr || '—'}
                    </Text>
                  </Text>
                  <Text style={s.colStat}>
                    Expense:{' '}
                    <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>
                      {fundA?.replacement?.expenseRatio || fundA?.currentExpense || '—'}
                    </Text>
                  </Text>
                </View>

                <View style={s.compareMidLine} />

                <View style={s.compareCol}>
                  <Text style={[s.colDotLabel, { color: '#38BDF8' }]}>FUND B</Text>
                  <Text style={s.colName} numberOfLines={2}>
                    {fundB?.name}
                  </Text>
                  <Text style={s.colStat}>
                    Return:{' '}
                    <Text style={{ color: '#38BDF8', fontWeight: '800' }}>
                      {fundB?.directCagrNum
                        ? `${fundB.directCagrNum.toFixed(1)}%`
                        : fundB?.currentCagr || '—'}
                    </Text>
                  </Text>
                  <Text style={s.colStat}>
                    Expense:{' '}
                    <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>
                      {fundB?.replacement?.expenseRatio || fundB?.currentExpense || '—'}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Common Overlapping Stocks Matrix */}
            <View style={s.cardBlock}>
              <View style={s.cardHeaderRow}>
                <Text style={s.sectionTitle}>
                  COMMON OVERLAPPING HOLDINGS ({overlapReport.sharedStocks.length})
                </Text>
                <Text style={s.legendPairText}>
                  <Text style={{ color: '#10B981' }}>■ A</Text> vs{' '}
                  <Text style={{ color: '#38BDF8' }}>■ B</Text>
                </Text>
              </View>

              {overlapReport.sharedStocks.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {overlapReport.sharedStocks.map((st) => {
                    const maxW = Math.max(st.weightA, st.weightB, 10);
                    return (
                      <View key={st.symbol} style={s.sharedStockRow}>
                        <View style={s.sharedTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.sharedStockName}>{st.name}</Text>
                            <Text style={s.sharedStockSector}>
                              {st.sector}
                              {st.whaleCount > 0
                                ? `  •  🐋 ${st.whaleCount} Whale${
                                    st.whaleCount > 1 ? 's' : ''
                                  }`
                                : ''}
                            </Text>
                          </View>
                          <View style={s.overlapContribPill}>
                            <Text style={s.overlapContribText}>
                              Min {st.overlapContribution}%
                            </Text>
                          </View>
                        </View>

                        {/* Dual horizontal proportion bars */}
                        <View style={s.barsStack}>
                          <View style={s.barTrackRow}>
                            <Text style={s.barTagA}>A</Text>
                            <View style={s.barTrack}>
                              <View
                                style={[
                                  s.barFillA,
                                  {
                                    width: `${Math.min(100, (st.weightA / maxW) * 100)}%`,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={s.barPct}>{st.weightA.toFixed(1)}%</Text>
                          </View>
                          <View style={s.barTrackRow}>
                            <Text style={s.barTagB}>B</Text>
                            <View style={s.barTrack}>
                              <View
                                style={[
                                  s.barFillB,
                                  {
                                    width: `${Math.min(100, (st.weightB / maxW) * 100)}%`,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={s.barPct}>{st.weightB.toFixed(1)}%</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={s.zeroSharedBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={s.zeroSharedText}>
                    Zero top-holding equity overlap! Every stock added by Fund B provides pure new diversification.
                  </Text>
                </View>
              )}
            </View>

            {/* Unique Holdings Split */}
            {(overlapReport.uniqueToA.length > 0 ||
              overlapReport.uniqueToB.length > 0) && (
              <View style={s.cardBlock}>
                <Text style={s.sectionTitle}>UNIQUE DIVERSIFICATION PICKS</Text>
                <View style={s.uniqueGrid}>
                  <View style={s.uniqueCol}>
                    <Text style={[s.uniqueColHeader, { color: '#10B981' }]}>
                      Only in Fund A
                    </Text>
                    {overlapReport.uniqueToA.slice(0, 5).map((u) => (
                      <Text key={u.symbol} style={s.uniqueItemText} numberOfLines={1}>
                        • {u.name} ({u.weightPct}%)
                      </Text>
                    ))}
                  </View>
                  <View style={s.uniqueCol}>
                    <Text style={[s.uniqueColHeader, { color: '#38BDF8' }]}>
                      Only in Fund B
                    </Text>
                    {overlapReport.uniqueToB.slice(0, 5).map((u) => (
                      <Text key={u.symbol} style={s.uniqueItemText} numberOfLines={1}>
                        • {u.name} ({u.weightPct}%)
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Combined Sector Concentration */}
            <View style={s.cardBlock}>
              <Text style={s.sectionTitle}>BLENDED 50/50 SECTOR EXPOSURE</Text>
              <View style={{ gap: 8 }}>
                {overlapReport.combinedSectors.map((sec) => {
                  const highRisk = sec.pct >= 30 && sec.sector !== 'Debt & Hedges';
                  return (
                    <View key={sec.sector} style={s.secRow}>
                      <View style={s.secLabelRow}>
                        <Text style={s.secName}>{sec.sector}</Text>
                        <Text
                          style={[
                            s.secPct,
                            { color: highRisk ? '#F59E0B' : '#CBD5E1' },
                          ]}
                        >
                          {sec.pct}%
                        </Text>
                      </View>
                      <View style={s.secBarTrack}>
                        <View
                          style={[
                            s.secBarFill,
                            {
                              width: `${Math.min(100, sec.pct * 1.8)}%`,
                              backgroundColor: highRisk ? '#F59E0B' : '#10B981',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Share Report CTA */}
            <TouchableOpacity
              style={s.shareBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                shareOverlapInsight(overlapReport);
              }}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.shareBtnGrad}
              >
                <Ionicons name="share-social" size={17} color="#FFFFFF" />
                <Text style={s.shareBtnText}>
                  Share {overlapReport.overlapPercent}% Overlap Report
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.methodologyNote}>{overlapReport.methodologyNote}</Text>
          </>
        )}
      </ScrollView>

      {/* Fund Picker Modal (Curated + Live 45,000+ AMFI Search) */}
      <Modal
        visible={!!pickingSlot}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickingSlot(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                Select {pickingSlot === 'A' ? 'Fund A (Primary)' : 'Fund B (Compare)'}
              </Text>
              <TouchableOpacity
                onPress={() => setPickingSlot(null)}
                style={s.modalCloseBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={s.modalSearchBox}>
              <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={s.modalSearchInput}
                placeholder="Search any of 45,000+ AMFI schemes (HDFC, Quant, Nifty)..."
                placeholderTextColor="#64748B"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ maxHeight: 34, marginBottom: 10 }}
              contentContainerStyle={{ gap: 6, paddingRight: 16 }}
            >
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catPill, active && s.catPillActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryFilter(cat.id);
                    }}
                  >
                    <Text style={[s.catPillText, active && s.catPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {filteredCuratedFunds.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={s.fundPickRow}
                  onPress={() => handleChooseCurated(f)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={s.fundPickName}>{f.name}</Text>
                    <Text style={s.fundPickMeta}>
                      {f.amc} • {f.category}
                    </Text>
                  </View>
                  <View style={s.fundPickRight}>
                    <Text style={s.fundPickCagr}>{f.currentCagr}</Text>
                    <Text style={s.fundPickSub}>5Y CAGR</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {isSearchingAmfi && (
                <View style={s.amfiLoadingRow}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={s.amfiLoadingText}>Searching live AMFI registry...</Text>
                </View>
              )}

              {extraLiveAmfiRows.length > 0 && (
                <>
                  <Text style={s.amfiSectionHeader}>
                    LIVE AMFI REGISTRY MATCHES ({extraLiveAmfiRows.length})
                  </Text>
                  {extraLiveAmfiRows.map((cand) => (
                    <TouchableOpacity
                      key={cand.schemeCode}
                      style={s.fundPickRow}
                      onPress={() => handleChooseAmfiCandidate(cand)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={s.fundPickName} numberOfLines={2}>
                          {cand.schemeName}
                        </Text>
                        <Text style={s.fundPickMeta}>
                          AMFI Code #{cand.schemeCode} • {cand.planHint} Plan
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color="#38BDF8" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 115,
  },
  heroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D131F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    marginBottom: 10,
  },
  heroStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  heroStripText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  heroLink: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '800',
  },
  presetsScroll: {
    marginBottom: 12,
    maxHeight: 54,
  },
  presetChip: {
    backgroundColor: '#0D131F',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipActive: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  presetTag: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  presetLabel: {
    color: '#F1F5F9',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 1,
  },
  dualPickerWrap: {
    position: 'relative',
    gap: 8,
    marginBottom: 14,
  },
  fundSlotCard: {
    backgroundColor: '#0D131F',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.2,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  slotTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  slotTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changePillText: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  slotFundName: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  slotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  slotMetaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  slotNavChip: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },
  swapOverlay: {
    position: 'absolute',
    right: 22,
    top: '50%',
    marginTop: -17,
    zIndex: 5,
  },
  swapCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCard: {
    backgroundColor: '#0C1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  gaugeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gradeBadge: {
    alignItems: 'flex-end',
  },
  gradeLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gradeValue: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },
  vennWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  vennCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlapBigPct: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  overlapSubLabel: {
    color: '#CBD5E1',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 1,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080C15',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  verdictCard: {
    backgroundColor: '#0D131F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderLeftWidth: 3.5,
    marginBottom: 12,
  },
  verdictTitle: {
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 5,
  },
  verdictDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectorAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  sectorAlertText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  cardBlock: {
    backgroundColor: '#0D131F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  legendPairText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  compareTable: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  compareCol: {
    flex: 1,
  },
  compareMidLine: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  colDotLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  colName: {
    color: '#F1F5F9',
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 6,
  },
  colStat: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sharedStockRow: {
    backgroundColor: '#080C15',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sharedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  sharedStockName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  sharedStockSector: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 1,
  },
  overlapContribPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  overlapContribText: {
    color: '#FBBF24',
    fontSize: 10.5,
    fontWeight: '800',
  },
  barsStack: {
    gap: 4,
  },
  barTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barTagA: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: '900',
    width: 11,
  },
  barTagB: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '900',
    width: 11,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  barFillA: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  barFillB: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  barPct: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '700',
    width: 38,
    textAlign: 'right',
  },
  zeroSharedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 11,
  },
  zeroSharedText: {
    color: '#A7F3D0',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  uniqueGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  uniqueCol: {
    flex: 1,
    backgroundColor: '#080C15',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  uniqueColHeader: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  uniqueItemText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  secRow: {
    gap: 4,
  },
  secLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secName: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
  },
  secPct: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  secBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  secBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  shareBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  shareBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  methodologyNote: {
    color: '#64748B',
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0B101C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131A29',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#131A29',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  catPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  catPillTextActive: {
    color: '#10B981',
  },
  fundPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  fundPickName: {
    color: '#F1F5F9',
    fontSize: 13.5,
    fontWeight: '700',
  },
  fundPickMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  fundPickRight: {
    alignItems: 'flex-end',
  },
  fundPickCagr: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  fundPickSub: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
  amfiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  amfiLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  amfiSectionHeader: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
  },
});
