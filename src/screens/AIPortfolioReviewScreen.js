import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import AppHeader from '../components/AppHeader';
import WhaleAvatar from '../components/WhaleAvatar';
import { colors } from '../theme/colors';
import { mockWhales } from '../data/mockWhales';
import { fetchLiveWhales } from '../services/dataService';
import { generateAndShareAuditPdf } from '../services/pdfService';
import { readJsonStore, writeJsonStore, STORE_KEYS } from '../services/localStore';
import {
  analyzePortfolioHoldings,
  extractHoldingsWithGemini,
  getDemoSampleHoldings,
  isBase64PdfEncrypted,
  parseCsvOrTextHoldings,
  parseSpreadsheetFromBase64,
  formatINR,
  GEMINI_OCR_MODEL,
} from '../services/portfolioAuditEngine';

const SECURE_GEMINI_KEY = 'paisabuddy_gemini_api_key_v1';

async function readUriAsText(uri) {
  try {
    return await new File(uri).text();
  } catch (e) {
    return await readAsStringAsync(uri, { encoding: 'utf8' });
  }
}

async function readUriAsBase64(uri) {
  try {
    return await new File(uri).base64();
  } catch (e) {
    return await readAsStringAsync(uri, { encoding: 'base64' });
  }
}

export default function AIPortfolioReviewScreen({ onOpenMenu, onOpenOverlap }) {
  const [whalesList, setWhalesList] = useState(mockWhales);
  const [auditReport, setAuditReport] = useState(null);
  const [stagedHoldings, setStagedHoldings] = useState([]);
  const [sourceMetaState, setSourceMetaState] = useState({
    fileName: 'Manual Portfolio',
    sourceType: 'Manual Entry',
    isDemo: false,
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanEngineHint, setScanEngineHint] = useState('Analyzing portfolio metrics on-device...');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  // SecureStore Gemini API Key State (Optional — only needed for Screenshot/PDF OCR)
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [keyInputDraft, setKeyInputDraft] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [pendingOcrPayload, setPendingOcrPayload] = useState(null);

  // Manual Builder & Bulk Paste Modal
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState('add'); // 'add' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState('STOCK'); // 'STOCK' | 'MF'
  const [draftPlan, setDraftPlan] = useState('DIRECT'); // 'DIRECT' | 'REGULAR'
  const [draftInvested, setDraftInvested] = useState('');
  const [draftCurrent, setDraftCurrent] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [liveWhales, savedKey, savedPortfolio] = await Promise.all([
          fetchLiveWhales().catch(() => mockWhales),
          SecureStore.getItemAsync(SECURE_GEMINI_KEY).catch(() => null),
          readJsonStore(STORE_KEYS.PORTFOLIO_HOLDINGS, null).catch(() => null),
        ]);
        if (mounted) {
          const activeWhales =
            Array.isArray(liveWhales) && liveWhales.length > 0 ? liveWhales : mockWhales;
          setWhalesList(activeWhales);
          if (savedKey) {
            setGeminiApiKey(savedKey);
          }
          if (
            savedPortfolio &&
            Array.isArray(savedPortfolio.holdings) &&
            savedPortfolio.holdings.length > 0 &&
            !savedPortfolio.meta?.isDemo
          ) {
            const restoredMeta = savedPortfolio.meta || {
              fileName: 'Saved Portfolio',
              sourceType: 'Saved On Device',
              isDemo: false,
            };
            const report = analyzePortfolioHoldings(
              savedPortfolio.holdings,
              activeWhales,
              restoredMeta
            );
            setStagedHoldings(report.holdings);
            setSourceMetaState({
              fileName: restoredMeta.fileName || 'Saved Portfolio',
              sourceType: restoredMeta.sourceType || 'Saved On Device',
              isDemo: false,
            });
            setAuditReport(report);
          }
        }
      } catch (e) {
        // Safe fallback already set
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const runDiagnosticOnHoldings = (holdingsArray, meta) => {
    const report = analyzePortfolioHoldings(holdingsArray, whalesList, meta);
    setStagedHoldings(report.holdings);
    const normalizedMeta = {
      fileName: meta.fileName || 'Imported Portfolio',
      sourceType: meta.sourceType || 'File Import',
      isDemo: Boolean(meta.isDemo),
    };
    setSourceMetaState(normalizedMeta);
    setAuditReport(report);
    setShowAllHoldings(false);
    if (!normalizedMeta.isDemo && Array.isArray(report.holdings) && report.holdings.length > 0) {
      writeJsonStore(STORE_KEYS.PORTFOLIO_HOLDINGS, {
        holdings: report.holdings,
        meta: normalizedMeta,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const executeGeminiOcr = async (payload, keyToUse) => {
    setIsScanning(true);
    setScanStatus(
      payload.mimeType === 'application/pdf'
        ? 'Extracting CAS PDF holdings via Gemini Vision...'
        : 'Reading screenshot rows via Gemini Vision...'
    );
    setScanEngineHint(`Model: ${GEMINI_OCR_MODEL} • Zero server storage`);

    try {
      const { holdings, brokerDetected } = await extractHoldingsWithGemini(
        {
          base64: payload.base64,
          mimeType: payload.mimeType,
          apiKey: keyToUse,
          sourceLabel: payload.sourceLabel || payload.fileName || 'Screenshot',
        },
        whalesList
      );

      setScanStatus(`Matched ${holdings.length} positions — running 50-Whale & overlap diagnostics...`);
      runDiagnosticOnHoldings(holdings, {
        fileName: payload.fileName || brokerDetected || 'Screenshot OCR',
        sourceType: payload.mimeType === 'application/pdf' ? 'PDF Statement (AI OCR)' : 'Screenshot (AI Vision)',
        isDemo: false,
      });
    } catch (error) {
      Alert.alert('AI Extraction Failed', error.message || 'Could not extract portfolio rows from file.');
    } finally {
      setIsScanning(false);
      setPendingOcrPayload(null);
    }
  };

  const handleSaveGeminiKey = async () => {
    const trimmed = keyInputDraft.trim();
    if (!trimmed || trimmed.length < 15) {
      Alert.alert('Invalid API Key', 'Please paste a valid Google AI Studio Gemini API key.');
      return;
    }

    try {
      await SecureStore.setItemAsync(SECURE_GEMINI_KEY, trimmed);
    } catch (e) {
      // Proceed in-memory if SecureStore unavailable
    }

    setGeminiApiKey(trimmed);
    setIsKeyModalOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (pendingOcrPayload) {
      const payload = pendingOcrPayload;
      setPendingOcrPayload(null);
      await executeGeminiOcr(payload, trimmed);
    }
  };

  const handleClearGeminiKey = async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_GEMINI_KEY);
    } catch (e) {
      // ignore
    }
    setGeminiApiKey('');
    setKeyInputDraft('');
    setPendingOcrPayload(null);
    setIsKeyModalOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openGeminiKeyModal = (optionalPayload = null) => {
    setPendingOcrPayload(optionalPayload);
    setKeyInputDraft(geminiApiKey || '');
    setIsKeyModalOpen(true);
  };

  // 1. REAL SCREENSHOT PICKER + GEMINI OCR
  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Gallery permission is needed to select a portfolio screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    let b64 = asset.base64;
    if (!b64 && asset.uri) {
      try {
        b64 = await readUriAsBase64(asset.uri);
      } catch (e) {
        Alert.alert('Read Error', 'Could not read image data from gallery.');
        return;
      }
    }

    const payload = {
      base64: b64,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || 'Portfolio Screenshot',
      sourceLabel: 'Broker / Mutual Fund Screenshot',
    };

    if (!geminiApiKey) {
      openGeminiKeyModal(payload);
      return;
    }

    await executeGeminiOcr(payload, geminiApiKey);
  };

  // 2. REAL DOCUMENT PICKER (CAMS / KFintech / Zerodha / Groww CSV, XLSX, PDF)
  const handlePickDocument = async (channel = 'BROKER') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      const fileName = asset.name || 'statement';
      const lowerName = fileName.toLowerCase();
      const mime = (asset.mimeType || '').toLowerCase();

      const isPdf = lowerName.endsWith('.pdf') || mime.includes('pdf');
      const isExcel =
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        mime.includes('spreadsheet') ||
        mime.includes('excel');
      const isTextOrCsv =
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.tsv') ||
        lowerName.endsWith('.txt') ||
        mime.includes('csv') ||
        mime.includes('text/plain');

      if (!isPdf && !isExcel && !isTextOrCsv) {
        Alert.alert(
          'Unsupported Format',
          `"${fileName}" is not a CSV, Excel (.xlsx/.xls), or PDF file. Export Holdings/P&L from Zerodha, Groww, or MFCentral as CSV/Excel.`
        );
        return;
      }

      if (isPdf) {
        setIsScanning(true);
        setScanStatus(`Inspecting ${fileName}...`);
        setScanEngineHint('Checking PDF encryption & preparing extraction...');

        const b64 = await readUriAsBase64(asset.uri);
        if (isBase64PdfEncrypted(b64)) {
          setIsScanning(false);
          Alert.alert(
            'Password-Protected PDF Detected',
            'CAMS / KFintech CAS PDFs are locked with your PAN/DOB.\n\nQuick Fix (Zero Key Needed):\n1) Download the Excel/CSV export from MFCentral.com or CAMS/KFintech, OR\n2) Open the PDF, Print -> "Save as PDF" (unlocked copy) and re-upload.'
          );
          return;
        }

        const payload = {
          base64: b64,
          mimeType: 'application/pdf',
          fileName,
          sourceLabel: channel === 'CAMS' ? 'CAMS / KFintech CAS PDF' : 'Broker PDF Statement',
        };
        setIsScanning(false);

        if (!geminiApiKey) {
          openGeminiKeyModal(payload);
          return;
        }

        await executeGeminiOcr(payload, geminiApiKey);
        return;
      }

      // CSV / TSV / TXT or Excel (.xlsx / .xls) — 100% OFFLINE LOCAL ENGINE
      setIsScanning(true);
      setScanStatus(`Parsing ${fileName} locally on-device...`);
      setScanEngineHint('Zero upload • Reading holdings, P&L & Direct/Regular plans');

      let parsed;
      if (isExcel) {
        const b64 = await readUriAsBase64(asset.uri);
        parsed = parseSpreadsheetFromBase64(b64, fileName, whalesList);
      } else {
        const rawText = await readUriAsText(asset.uri);
        parsed = parseCsvOrTextHoldings(rawText, fileName, whalesList);
      }

      setScanStatus(`Auditing ${parsed.holdings.length} holdings against 50 Billionaires...`);
      runDiagnosticOnHoldings(parsed.holdings, {
        fileName,
        sourceType: channel === 'CAMS' ? 'CAMS / MFCentral File' : 'Broker CSV / Excel',
        isDemo: false,
      });
    } catch (error) {
      Alert.alert('File Parse Error', error.message || 'Unable to read holdings from this file.');
    } finally {
      setIsScanning(false);
    }
  };

  // 3. MANUAL BUILDER & BULK PASTE HANDLERS
  const openManualBuilder = (prefillHoldings = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (prefillHoldings) {
      setStagedHoldings(prefillHoldings);
    }
    setBuilderTab('add');
    setIsBuilderModalOpen(true);
  };

  const handleAddSingleHolding = () => {
    const name = draftName.trim();
    const inv = parseFloat(draftInvested.replace(/[^0-9.]/g, '')) || 0;
    const cur = parseFloat(draftCurrent.replace(/[^0-9.]/g, '')) || 0;

    if (!name) {
      Alert.alert('Name Required', 'Enter Stock Ticker (e.g. HDFCBANK) or Mutual Fund Scheme name.');
      return;
    }
    if (inv <= 0 && cur <= 0) {
      Alert.alert('Value Required', 'Enter Current Value or Invested Amount in ₹.');
      return;
    }

    const effectiveCur = cur > 0 ? cur : inv;
    const effectiveInv = inv > 0 ? inv : cur;
    const nextItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      assetType: draftType,
      planType: draftType === 'MF' ? draftPlan : 'N/A',
      investedValue: effectiveInv,
      currentValue: effectiveCur,
      pnl: effectiveCur - effectiveInv,
      pnlPct: effectiveInv > 0 ? Number((((effectiveCur - effectiveInv) / effectiveInv) * 100).toFixed(2)) : 0,
    };

    setStagedHoldings((prev) => [nextItem, ...prev]);
    setDraftName('');
    setDraftInvested('');
    setDraftCurrent('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleParseBulkPaste = () => {
    try {
      const { holdings } = parseCsvOrTextHoldings(pasteText, 'Pasted Portfolio', whalesList);
      setStagedHoldings((prev) => [...holdings, ...prev]);
      setPasteText('');
      setBuilderTab('add');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Could Not Parse Lines', error.message);
    }
  };

  const handleToggleStagedPlan = (idx) => {
    setStagedHoldings((prev) =>
      prev.map((item, i) => {
        if (i !== idx || item.assetType !== 'MF') return item;
        return {
          ...item,
          planType: item.planType === 'REGULAR' ? 'DIRECT' : 'REGULAR',
        };
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveStaged = (idx) => {
    setStagedHoldings((prev) => prev.filter((_, i) => i !== idx));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRunBuilderAudit = () => {
    if (stagedHoldings.length === 0) {
      Alert.alert('No Holdings Yet', 'Add at least 1 Stock or Mutual Fund to run your audit.');
      return;
    }
    setIsBuilderModalOpen(false);
    runDiagnosticOnHoldings(stagedHoldings, {
      fileName: sourceMetaState.isDemo ? 'Custom Edited Portfolio' : sourceMetaState.fileName || 'Manual Portfolio',
      sourceType: 'Custom / Edited Holdings',
      isDemo: false,
    });
  };

  const handleLoadSamplePreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sample = getDemoSampleHoldings();
    runDiagnosticOnHoldings(sample, {
      fileName: 'Sample Retail Portfolio (Preview)',
      sourceType: 'Sample Data',
      isDemo: true,
    });
  };

  const handleExportPdf = async () => {
    if (!auditReport) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsExportingPdf(true);
      await generateAndShareAuditPdf(auditReport);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Failed', 'Unable to create PDF report on this device: ' + error.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAuditReport(null);
    setShowAllHoldings(false);
  };

  const visibleHoldings = auditReport
    ? showAllHoldings
      ? auditReport.holdings
      : auditReport.holdings.slice(0, 6)
    : [];

  return (
    <View style={styles.screenRoot}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AppHeader
          subtitle="Real Portfolio Health & Direct Audit"
          onMenuPress={onOpenMenu}
        />

        {auditReport && !isScanning && (
          <View style={styles.resetHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.resetHeaderTitle}>
                {auditReport.sourceMeta.isDemo ? 'SAMPLE PREVIEW REPORT' : 'VERIFIED AUDIT REPORT'}
              </Text>
              <Text style={styles.sourceSubFile} numberOfLines={1}>
                {auditReport.sourceMeta.fileName} • {auditReport.sourceMeta.holdingsCount} Holdings
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.resetBtn, { borderColor: 'rgba(59, 130, 246, 0.35)', backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
                onPress={() => openManualBuilder(auditReport.holdings)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={13} color="#60A5FA" />
                <Text style={[styles.resetBtnText, { color: '#60A5FA' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                <Text style={styles.resetBtnText}>New Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SCANNING LOADER STATE */}
        {isScanning && (
          <View style={styles.scanningCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scanningTitle}>PaisaBuddy Engine Running</Text>
            <Text style={styles.scanningStatus}>{scanStatus}</Text>
            <View style={styles.scanningPulse}>
              <Text style={styles.scanningTip}>{scanEngineHint}</Text>
            </View>
          </View>
        )}

        {/* STATE 1: REAL UPLOAD & IMPORT HUB */}
        {!auditReport && !isScanning && (
          <View style={styles.uploadContainer}>
            {/* Top Capability & AI Vision Key Status Strip */}
            <View style={styles.engineStatusRow}>
              <View style={styles.offlineBadge}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineBadgeText}>CSV / Excel Offline Engine Ready</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.aiKeyStatusBtn,
                  geminiApiKey ? styles.aiKeyReadyBtn : styles.aiKeySetupBtn,
                ]}
                onPress={() => openGeminiKeyModal(null)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={geminiApiKey ? 'checkmark-circle' : 'key-outline'}
                  size={12}
                  color={geminiApiKey ? colors.primary : '#60A5FA'}
                />
                <Text
                  style={[
                    styles.aiKeyStatusText,
                    { color: geminiApiKey ? colors.primary : '#60A5FA' },
                  ]}
                >
                  {geminiApiKey ? 'AI Vision Ready' : 'Gemini Key'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Main Screenshot Upload Card */}
            <TouchableOpacity
              style={styles.mainUploadBox}
              activeOpacity={0.85}
              onPress={handlePickImage}
            >
              <LinearGradient
                colors={['#101A28', '#0A121E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.uploadGradient}
              >
                <View style={styles.scannerAperture}>
                  <Ionicons name="scan-outline" size={30} color={colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Scan Portfolio Screenshot</Text>
                <Text style={styles.uploadSubtitle}>
                  Pick Holdings or Mutual Funds screenshot from Zerodha, Groww, Angel One, or Coin ({GEMINI_OCR_MODEL})
                </Text>

                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.uploadBtnGradient}
                >
                  <Ionicons name="images" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadBtnText}>
                    {geminiApiKey ? 'Select Screenshot & Scan' : 'Select Screenshot (Setup Free AI Key)'}
                  </Text>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>

            {/* Real File Importers (Zero API Key Needed for CSV / Excel!) */}
            <View style={styles.altUploadGrid}>
              <TouchableOpacity
                style={styles.altUploadBox}
                activeOpacity={0.8}
                onPress={() => handlePickDocument('CAMS')}
              >
                <View style={[styles.altIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <Text style={styles.altTitle}>CAMS / KFintech</Text>
                <Text style={styles.altSub}>MFCentral CSV / XLSX / PDF</Text>
                <View style={styles.noKeyTag}>
                  <Text style={styles.noKeyTagText}>CSV/XLS ZERO KEY</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.altUploadBox}
                activeOpacity={0.8}
                onPress={() => handlePickDocument('BROKER')}
              >
                <View style={[styles.altIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="stats-chart" size={20} color="#60A5FA" />
                </View>
                <Text style={styles.altTitle}>Broker P&L File</Text>
                <Text style={styles.altSub}>Zerodha / Groww CSV / XLS</Text>
                <View style={styles.noKeyTag}>
                  <Text style={styles.noKeyTagText}>100% ON-DEVICE</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Manual Portfolio Builder & Paste Bar */}
            <TouchableOpacity
              style={styles.manualEntryCard}
              activeOpacity={0.82}
              onPress={() => openManualBuilder()}
            >
              <View style={styles.manualLeft}>
                <View style={styles.manualIconCircle}>
                  <Ionicons name="create" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manualTitle}>Add Manually or Paste Text</Text>
                  <Text style={styles.manualSub}>
                    No file handy? Add Stocks / Mutual Funds in 20 seconds ({stagedHoldings.length > 0 ? `${stagedHoldings.length} staged` : 'Free Offline Audit'})
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {onOpenOverlap && (
              <TouchableOpacity
                style={styles.quickOverlapBanner}
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenOverlap();
                }}
              >
                <View style={styles.quickOverlapIconCircle}>
                  <Ionicons name="git-compare-outline" size={18} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manualTitle}>2-Fund Mutual Fund Overlap Check</Text>
                  <Text style={styles.manualSub}>
                    Compare any 2 Mutual Funds directly without importing a portfolio
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
              </TouchableOpacity>
            )}

            {/* Explicit Sample Preview Link (Transparently labeled!) */}
            <TouchableOpacity
              style={styles.samplePreviewRow}
              activeOpacity={0.75}
              onPress={handleLoadSamplePreview}
            >
              <Ionicons name="flask-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.samplePreviewText}>
                Just exploring? <Text style={{ color: colors.primary, fontWeight: '800' }}>Load Sample Retail Portfolio Preview</Text>
              </Text>
            </TouchableOpacity>

            {/* Supported Brokers Strip */}
            <View style={styles.brokerStrip}>
              <Text style={styles.brokerStripLabel}>SUPPORTED EXPORTS &amp; PLATFORMS</Text>
              <View style={styles.brokerChipsRow}>
                {['Zerodha Console', 'Groww CSV/XLS', 'CAMS CAS', 'MFCentral', 'Angel One', 'Upstox', 'INDmoney'].map((b) => (
                  <View key={b} style={styles.brokerChip}>
                    <Text style={styles.brokerChipText}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Privacy Guarantee */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyIconCircle}>
                <Ionicons name="lock-closed" size={15} color={colors.primary} />
              </View>
              <Text style={styles.privacyText}>
                True On-Device Privacy: CSV &amp; Excel files never leave your phone. Your optional Gemini key is encrypted in Hardware Keystore with zero server storage.
              </Text>
            </View>
          </View>
        )}

        {/* STATE 2: REAL AUDIT REPORT */}
        {auditReport && !isScanning && (
          <View style={styles.reviewResults}>
            {/* Real Valuation Summary Strip */}
            <View style={styles.valuationCard}>
              <View style={styles.valRowTop}>
                <View style={styles.valCell}>
                  <Text style={styles.valLabel}>INVESTED</Text>
                  <Text style={styles.valValue}>{auditReport.sourceMeta.totalInvestedFormatted}</Text>
                </View>
                <View style={styles.valDivider} />
                <View style={styles.valCell}>
                  <Text style={styles.valLabel}>CURRENT VALUE</Text>
                  <Text style={styles.valValue}>{auditReport.sourceMeta.totalCurrentValueFormatted}</Text>
                </View>
              </View>

              <View style={styles.valBottomBar}>
                <Text style={styles.valMixText}>
                  Mix: {auditReport.sourceMeta.equitySplitPct}% Equity/ETF • {auditReport.sourceMeta.mfSplitPct}% Mutual Funds
                </Text>
                <Text
                  style={[
                    styles.valPnlText,
                    { color: auditReport.sourceMeta.totalPnl >= 0 ? colors.primary : colors.danger },
                  ]}
                >
                  {auditReport.sourceMeta.totalPnlFormatted}
                </Text>
              </View>
            </View>

            {/* 1. HERO HEALTH SCORE CARD */}
            <View style={[styles.scoreCardWrapper, { borderColor: auditReport.scoreColor + '50', borderLeftColor: auditReport.scoreColor }]}>
              <LinearGradient
                colors={['#101B2B', '#09121E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scoreCard}
              >
                <View style={styles.scoreTopHeader}>
                  <View style={styles.scoreRadarTag}>
                    <View style={[styles.scoreRadarDot, { backgroundColor: auditReport.scoreColor }]} />
                    <Text style={[styles.scoreRadarText, { color: auditReport.scoreColor }]}>
                      {auditReport.sourceMeta.isDemo ? 'SAMPLE PREVIEW' : 'PORTFOLIO HEALTH'}
                    </Text>
                  </View>
                  <View style={[styles.gradePill, { borderColor: auditReport.scoreColor + '50', backgroundColor: auditReport.scoreColor + '20' }]}>
                    <Text style={[styles.gradePillText, { color: auditReport.scoreColor }]}>
                      {auditReport.gradeLabel}
                    </Text>
                  </View>
                </View>

                <View style={[styles.scoreCircleWrapper, { borderColor: auditReport.scoreColor, shadowColor: auditReport.scoreColor }]}>
                  <View style={styles.scoreCircle}>
                    <Text style={[styles.scoreNumber, { color: auditReport.scoreColor }]}>
                      {auditReport.healthScore}
                    </Text>
                    <Text style={styles.scoreMax}>/ 100</Text>
                  </View>
                </View>

                <Text style={styles.scoreStatusTitle}>{auditReport.scoreLabel}</Text>

                <View style={styles.percentilePill}>
                  <Ionicons name="trending-up" size={13} color={colors.primary} />
                  <Text style={styles.percentilePillText}>{auditReport.percentileRank}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* 2. SUB-SCORES 2x2 GRID */}
            <View style={styles.subScoresGrid}>
              {auditReport.subScores.map((item, idx) => (
                <View key={idx} style={styles.subScoreItem}>
                  <View style={styles.subScoreTop}>
                    <Text style={styles.subScoreLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={[styles.subScoreVal, { color: item.color }]}>{item.score}</Text>
                  </View>
                  <View style={styles.subProgressBarBg}>
                    <View
                      style={[
                        styles.subProgressBarFill,
                        { width: `${item.score}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* 2B. REGULAR PLAN FEE LEAKS (If any Regular MFs found) */}
            {auditReport.regularLeaks.length > 0 && (
              <View style={styles.leakAlertCard}>
                <View style={styles.leakHeader}>
                  <View style={styles.overlapTagRow}>
                    <View style={styles.dangerDot} />
                    <Text style={styles.dangerTagText}>REGULAR PLAN COMMISSION LEAK</Text>
                  </View>
                  <Text style={styles.leakSaveBadge}>
                    {auditReport.savingsSummary.expenseRatioSaved}
                  </Text>
                </View>

                {auditReport.regularLeaks.map((lk, idx) => (
                  <View key={idx} style={styles.leakItemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.leakFundName}>{lk.name}</Text>
                      <Text style={styles.leakSub}>
                        Value: {formatINR(lk.value, true)} • Switch to {lk.replacementName}
                      </Text>
                    </View>
                    <View style={styles.leakAmtPill}>
                      <Text style={styles.leakAmtText}>-{formatINR(lk.annualLeak)}/yr</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 3. OVERLAP DETECTION CARD */}
            {auditReport.overlaps.length > 0 ? (
              <View style={styles.overlapCardWrapper}>
                <LinearGradient
                  colors={['#241217', '#150A0E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.overlapCard}
                >
                  <View style={styles.overlapHeader}>
                    <View style={styles.overlapTagRow}>
                      <View style={styles.dangerDot} />
                      <Text style={styles.dangerTagText}>SCHEME OVERLAP DETECTED</Text>
                    </View>
                    <View style={styles.overlapSavedBadge}>
                      <Text style={styles.overlapSavedText}>{auditReport.overlaps.length} Pair(s)</Text>
                    </View>
                  </View>

                  <Text style={styles.overlapHeading}>
                    Peak Mutual Fund Overlap: <Text style={{ color: colors.danger }}>{auditReport.overlaps[0].overlapPercent}% Identical Basket</Text>
                  </Text>

                  {auditReport.overlaps.map((ov, i) => (
                    <View key={i} style={styles.overlapBox}>
                      <View style={styles.fundPairBlock}>
                        <View style={styles.fundSingleRow}>
                          <View style={[styles.fundBullet, { backgroundColor: '#F87171' }]} />
                          <Text style={styles.fundNameText}>{ov.fundA}</Text>
                        </View>

                        <View style={styles.overlapCenterBar}>
                          <View style={styles.overlapLine} />
                          <View style={styles.overlapBadge}>
                            <Ionicons name="swap-vertical" size={12} color={colors.danger} />
                            <Text style={styles.overlapBadgeText}>{ov.overlapPercent}% Common Stocks</Text>
                          </View>
                          <View style={styles.overlapLine} />
                        </View>

                        <View style={styles.fundSingleRow}>
                          <View style={[styles.fundBullet, { backgroundColor: '#60A5FA' }]} />
                          <Text style={styles.fundNameText}>{ov.fundB}</Text>
                        </View>
                      </View>

                      <View style={styles.sharedHoldingsContainer}>
                        <Text style={styles.sharedLabel}>ESTIMATED SHARED BLUECHIPS:</Text>
                        <View style={styles.sharedPillsRow}>
                          {ov.sharedStocks.map((stk, sIdx) => (
                            <View key={sIdx} style={styles.sharedStockPill}>
                              <Text style={styles.sharedStockText}>{stk}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <Text style={styles.overlapVerdictText}>{ov.verdict}</Text>
                      <View style={styles.fixPill}>
                        <Ionicons name="bulb" size={13} color={colors.primary} />
                        <Text style={styles.fixPillText}>{ov.fix}</Text>
                      </View>
                    </View>
                  ))}
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.cleanOverlapCard}>
                <View style={styles.cleanOverlapIcon}>
                  <Ionicons name="checkmark-done-circle" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cleanOverlapTitle}>Zero Critical Scheme Overlap</Text>
                  <Text style={styles.cleanOverlapSub}>
                    {auditReport.sourceMeta.mfCount < 2
                      ? 'Your portfolio holds fewer than 2 Mutual Funds — zero duplicate fund overlap!'
                      : 'Your Mutual Funds hold well-differentiated market cap mandates.'}
                  </Text>
                </View>
              </View>
            )}

            {/* 4. SECTOR ALLOCATION & RISK */}
            <View style={styles.sectorCard}>
              <View style={styles.sectorCardHeader}>
                <Text style={styles.sectionTitle}>Sector Allocation &amp; Risk</Text>
                <View style={styles.sectorStatusBadge}>
                  <Text style={styles.sectorStatusBadgeText}>{auditReport.sectorAllocations.length} Sectors</Text>
                </View>
              </View>

              {auditReport.sectorAllocations.map((sec, i) => (
                <View key={i} style={styles.sectorRowItem}>
                  <View style={styles.sectorHeaderRow}>
                    <Text style={styles.sectorNameText}>{sec.sector}</Text>
                    <View
                      style={[
                        styles.sectorPctBadge,
                        {
                          backgroundColor: sec.isHighRisk
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectorPctText,
                          { color: sec.isHighRisk ? colors.danger : colors.primary },
                        ]}
                      >
                        {sec.percent}% ({sec.valueFormatted})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectorBarBg}>
                    <View
                      style={[
                        styles.sectorBarFill,
                        {
                          width: `${Math.min(100, sec.percent)}%`,
                          backgroundColor: sec.isHighRisk ? colors.danger : colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.sectorNoteText,
                      { color: sec.isHighRisk ? '#FCA5A5' : colors.textMuted },
                    ]}
                  >
                    {sec.status}
                  </Text>
                </View>
              ))}
            </View>

            {/* 5. SUPER-INVESTOR ALIGNMENT & ALERTS */}
            <View style={styles.whaleCrossCard}>
              <View style={styles.whaleCrossHeader}>
                <View style={styles.whaleHeaderTag}>
                  <View style={styles.whaleDot} />
                  <Text style={styles.whaleHeaderTagText}>50-WHALE ALIGNMENT &amp; RISK CHECK</Text>
                </View>
              </View>

              <Text style={styles.whaleCrossTitle}>
                {auditReport.whaleMatches.length > 0
                  ? 'Institutional Cross-Check & Position Alerts'
                  : 'Super-Investor Overlap Scan'}
              </Text>

              {auditReport.whaleMatches.length > 0 ? (
                auditReport.whaleMatches.map((wm, i) => (
                  <View key={i} style={styles.whaleMatchItem}>
                    <View style={styles.matchTopRow}>
                      {wm.localImage ? (
                        <WhaleAvatar
                          imageSource={wm.localImage}
                          avatarText={wm.whale.slice(0, 2).toUpperCase()}
                          size={44}
                          borderColor={wm.color}
                        />
                      ) : (
                        <View
                          style={[
                            styles.matchIconFallback,
                            { backgroundColor: wm.color + '20', borderColor: wm.color },
                          ]}
                        >
                          <Ionicons name="alert-circle" size={22} color={wm.color} />
                        </View>
                      )}

                      <View style={styles.matchInfoCol}>
                        <Text style={styles.matchStockName}>{wm.stock}</Text>
                        <Text style={styles.matchWhaleSub}>
                          {wm.whale} • <Text style={{ color: wm.color, fontWeight: '700' }}>{wm.stake}</Text>
                        </Text>
                      </View>

                      <View style={[styles.matchBadge, { backgroundColor: wm.color + '18' }]}>
                        <Text style={[styles.matchBadgeText, { color: wm.color }]}>{wm.badge}</Text>
                      </View>
                    </View>

                    <View style={styles.matchSentimentBox}>
                      <Text style={styles.matchSentimentText}>{wm.sentiment}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noWhaleBox}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.noWhaleText}>
                    None of your direct holdings overlap with SEBI-disclosed &gt;1% mid/small-cap stakes of the 50 tracked Super-Investors (normal for Nifty50/MF portfolios).
                  </Text>
                </View>
              )}
            </View>

            {/* 6. PARSED HOLDINGS BREAKDOWN */}
            <View style={styles.sectorCard}>
              <View style={styles.sectorCardHeader}>
                <Text style={styles.sectionTitle}>Audited Holdings ({auditReport.holdings.length})</Text>
                <TouchableOpacity onPress={() => openManualBuilder(auditReport.holdings)}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#60A5FA' }}>Edit / Add</Text>
                </TouchableOpacity>
              </View>

              {visibleHoldings.map((h) => (
                <View key={h.id} style={styles.holdingRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.holdingName} numberOfLines={1}>{h.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View style={styles.holdingTagPill}>
                        <Text style={styles.holdingTagText}>
                          {h.assetType === 'MF' ? `MF • ${h.planType}` : h.assetType}
                        </Text>
                      </View>
                      <Text style={styles.holdingSecText} numberOfLines={1}>{h.sector}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.holdingVal}>{formatINR(h.currentValue, true)}</Text>
                    <Text
                      style={[
                        styles.holdingPnl,
                        { color: h.pnl >= 0 ? colors.primary : colors.danger },
                      ]}
                    >
                      {h.pnl >= 0 ? '+' : ''}{formatINR(h.pnl, true)} ({h.pnlPct >= 0 ? '+' : ''}{h.pnlPct}%)
                    </Text>
                  </View>
                </View>
              ))}

              {auditReport.holdings.length > 6 && (
                <TouchableOpacity
                  style={styles.expandHoldingsBtn}
                  onPress={() => setShowAllHoldings(!showAllHoldings)}
                >
                  <Text style={styles.expandHoldingsText}>
                    {showAllHoldings
                      ? 'Show Less'
                      : `Show All ${auditReport.holdings.length} Holdings`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 7. 4-STEP AI ACTION ROADMAP */}
            <View style={styles.actionPlanCard}>
              <Text style={styles.sectionTitle}>4-Step Action Roadmap</Text>
              <View style={{ height: 10 }} />

              {auditReport.actionPlan.map((act) => (
                <View key={act.step} style={styles.planCardItem}>
                  <View style={styles.planItemHeader}>
                    <View style={[styles.stepCircle, { backgroundColor: act.color }]}>
                      <Text style={styles.stepCircleText}>{act.step}</Text>
                    </View>

                    <View style={[styles.actionTypeBadge, { backgroundColor: act.color + '20' }]}>
                      <Text style={[styles.actionTypeText, { color: act.color }]}>{act.action}</Text>
                    </View>

                    <Text style={styles.planItemTitle} numberOfLines={2}>
                      {act.title}
                    </Text>
                  </View>

                  <Text style={styles.planDetailText}>{act.detail}</Text>
                </View>
              ))}
            </View>

            {/* 8. ANNUAL SAVINGS SUMMARY */}
            <View style={styles.savingsCardWrapper}>
              <LinearGradient
                colors={['#062E23', '#031F17']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.savingsCard}
              >
                <Text style={styles.savingsHeader}>ESTIMATED ANNUAL RECOVERABLE SAVINGS</Text>
                <Text style={styles.savingsAmount}>{auditReport.savingsSummary.totalAnnualSavings}</Text>

                <View style={styles.savingsColumnsRow}>
                  <View style={styles.savingsCol}>
                    <Text style={styles.savingsColVal}>{auditReport.savingsSummary.expenseRatioSaved}</Text>
                    <Text style={styles.savingsColLabel}>Direct Plan Switch</Text>
                  </View>
                  <View style={styles.savingsColDivider} />
                  <View style={styles.savingsCol}>
                    <Text style={styles.savingsColVal}>{auditReport.savingsSummary.taxHarvestSaved}</Text>
                    <Text style={styles.savingsColLabel}>Tax Harvesting</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* 9. EXPORT CA-READY PDF */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.downloadPdfBtn}
                activeOpacity={0.8}
                onPress={handleExportPdf}
                disabled={isExportingPdf}
              >
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.downloadPdfGrad}>
                  {isExportingPdf ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.downloadPdfText}>Generating 2-Page PDF...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.downloadPdfText}>Export CA-Ready Audit PDF</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareBtn}
                activeOpacity={0.8}
                onPress={handleExportPdf}
                disabled={isExportingPdf}
              >
                <Ionicons name="share-social" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 125 }} />
      </ScrollView>

      {/* MODAL 1: GEMINI AI VISION API KEY SETUP */}
      <Modal
        visible={isKeyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsKeyModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Gemini AI Vision Setup</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsKeyModalOpen(false); setPendingOcrPayload(null); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {pendingOcrPayload
                ? 'Screenshot / PDF reading uses Google Gemini 3.8 Flash OCR. Save your free API key once to analyze this file immediately:'
                : 'CSV & Excel files work 100% offline with ZERO key. Add your optional Google AI Studio key only if you want Screenshot & PDF scanning.'}
            </Text>

            <View style={styles.keyInfoBox}>
              <Text style={styles.keyInfoStep}>1. Open aistudio.google.com/apikey (Free tier available)</Text>
              <Text style={styles.keyInfoStep}>2. Paste API key below — encrypted in device Keystore</Text>
              <Text style={styles.keyInfoStep}>3. Zero remote storage (store: false on every call)</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingRight: 40 }]}
                placeholder="Paste AIzaSy... Gemini API Key"
                placeholderTextColor={colors.textMuted}
                value={keyInputDraft}
                onChangeText={setKeyInputDraft}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showApiKey}
              />
              <TouchableOpacity
                onPress={() => setShowApiKey(!showApiKey)}
                style={{ position: 'absolute', right: 12, padding: 4 }}
              >
                <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnsRow}>
              {geminiApiKey ? (
                <TouchableOpacity style={styles.modalDangerBtn} onPress={handleClearGeminiKey}>
                  <Text style={styles.modalDangerText}>Remove Key</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setIsKeyModalOpen(false);
                    setPendingOcrPayload(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Use CSV Instead</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveGeminiKey}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalPrimaryGrad}>
                  <Text style={styles.modalPrimaryText}>
                    {pendingOcrPayload ? 'Save Key & Scan' : 'Save Key Securely'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: MANUAL HOLDINGS BUILDER & BULK PASTE */}
      <Modal
        visible={isBuilderModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBuilderModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Entry &amp; Edit Holdings</Text>
              <TouchableOpacity onPress={() => setIsBuilderModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sub-Tabs */}
            <View style={styles.builderTabsRow}>
              <TouchableOpacity
                style={[styles.builderTabBtn, builderTab === 'add' && styles.builderTabActive]}
                onPress={() => setBuilderTab('add')}
              >
                <Text style={[styles.builderTabText, builderTab === 'add' && styles.builderTabTextActive]}>
                  Add &amp; Edit ({stagedHoldings.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.builderTabBtn, builderTab === 'paste' && styles.builderTabActive]}
                onPress={() => setBuilderTab('paste')}
              >
                <Text style={[styles.builderTabText, builderTab === 'paste' && styles.builderTabTextActive]}>
                  Bulk Paste CSV / Text
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              {builderTab === 'paste' ? (
                <View>
                  <Text style={styles.pasteHint}>
                    Paste one asset per line (Name, Invested ₹, Current ₹) or raw CSV rows:
                  </Text>
                  <TextInput
                    style={[styles.modalInput, { height: 130, textAlignVertical: 'top' }]}
                    multiline
                    placeholder={'HDFCBANK, 150000, 178000\nSBI Bluechip Regular, 120000, 145000\nParag Parikh Flexi Cap Direct, 180000, 232000'}
                    placeholderTextColor={colors.textMuted}
                    value={pasteText}
                    onChangeText={setPasteText}
                  />
                  <TouchableOpacity style={styles.addRowBtn} onPress={handleParseBulkPaste}>
                    <Text style={styles.addRowBtnText}>+ Parse &amp; Add Rows</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* Type Toggle */}
                  <View style={styles.segRow}>
                    <TouchableOpacity
                      style={[styles.segBtn, draftType === 'STOCK' && styles.segBtnActive]}
                      onPress={() => setDraftType('STOCK')}
                    >
                      <Text style={[styles.segText, draftType === 'STOCK' && styles.segTextActive]}>
                        Stock / ETF
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segBtn, draftType === 'MF' && styles.segBtnActive]}
                      onPress={() => setDraftType('MF')}
                    >
                      <Text style={[styles.segText, draftType === 'MF' && styles.segTextActive]}>
                        Mutual Fund
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.modalInput}
                    placeholder={draftType === 'MF' ? 'e.g. SBI Bluechip Fund Regular' : 'e.g. HDFCBANK or Tata Motors'}
                    placeholderTextColor={colors.textMuted}
                    value={draftName}
                    onChangeText={setDraftName}
                  />

                  {draftType === 'MF' && (
                    <View style={styles.segRow}>
                      <TouchableOpacity
                        style={[styles.segBtn, draftPlan === 'DIRECT' && styles.segBtnActive]}
                        onPress={() => setDraftPlan('DIRECT')}
                      >
                        <Text style={[styles.segText, draftPlan === 'DIRECT' && styles.segTextActive]}>
                          Direct Plan (0% Fee)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.segBtn, draftPlan === 'REGULAR' && styles.segBtnActiveWarn]}
                        onPress={() => setDraftPlan('REGULAR')}
                      >
                        <Text style={[styles.segText, draftPlan === 'REGULAR' && { color: '#F59E0B' }]}>
                          Regular Plan (Agent)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Invested ₹"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={draftInvested}
                      onChangeText={setDraftInvested}
                    />
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      placeholder="Current Val ₹"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={draftCurrent}
                      onChangeText={setDraftCurrent}
                    />
                  </View>

                  <TouchableOpacity style={styles.addRowBtn} onPress={handleAddSingleHolding}>
                    <Text style={styles.addRowBtnText}>+ Add Holding to Audit</Text>
                  </TouchableOpacity>

                  {/* Staged List */}
                  {stagedHoldings.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.stagedHeader}>
                        HOLDINGS QUEUE (Tap Direct/Regular to toggle MFs)
                      </Text>
                      {stagedHoldings.map((item, idx) => (
                        <View key={item.id || idx} style={styles.stagedItemRow}>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text style={styles.stagedItemName} numberOfLines={1}>{item.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Text style={styles.stagedItemMeta}>{formatINR(item.currentValue, true)}</Text>
                              {item.assetType === 'MF' && (
                                <TouchableOpacity
                                  style={[
                                    styles.planTogglePill,
                                    item.planType === 'REGULAR'
                                      ? { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.4)' }
                                      : { backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.35)' },
                                  ]}
                                  onPress={() => handleToggleStagedPlan(idx)}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: '800',
                                      color: item.planType === 'REGULAR' ? '#FCA5A5' : colors.primary,
                                    }}
                                  >
                                    {item.planType}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => handleRemoveStaged(idx)} style={{ padding: 6 }}>
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.modalPrimaryBtn, { marginTop: 12 }]} onPress={handleRunBuilderAudit}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalPrimaryGrad}>
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryText}>
                  Run Real Audit ({stagedHoldings.length})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
  },
  resetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
  },
  resetHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  sourceSubFile: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resetBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  scanningCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  scanningStatus: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  scanningPulse: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 18,
  },
  scanningTip: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  uploadContainer: {
    marginTop: 12,
    gap: 11,
  },
  engineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
  },
  offlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  offlineBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  aiKeyStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiKeyReadyBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  aiKeySetupBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  aiKeyStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mainUploadBox: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  uploadGradient: {
    padding: 20,
    alignItems: 'center',
  },
  scannerAperture: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  uploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 13,
    marginTop: 14,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  altUploadGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  altUploadBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  altIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  altTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  altSub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  noKeyTag: {
    marginTop: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  noKeyTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  manualEntryCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  manualIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  manualSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  samplePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  samplePreviewText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  brokerStrip: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  brokerStripLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  brokerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  brokerChip: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  brokerChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  privacyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  reviewResults: {
    gap: 14,
    marginTop: 8,
  },
  valuationCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  valRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valCell: {
    flex: 1,
  },
  valLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  valValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  valDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  valBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  valMixText: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '600',
  },
  valPnlText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  scoreCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  scoreCard: {
    padding: 18,
    alignItems: 'center',
  },
  scoreTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  scoreRadarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreRadarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreRadarText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  gradePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreCircleWrapper: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 34,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  scoreStatusTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  percentilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  percentilePillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  subScoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subScoreItem: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subScoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subScoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
    marginRight: 4,
  },
  subScoreVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  subProgressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  subProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  leakAlertCard: {
    backgroundColor: '#1B1114',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  leakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leakSaveBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  leakItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  leakFundName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  leakSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  leakAmtPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leakAmtText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  cleanOverlapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cleanOverlapIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanOverlapTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary,
  },
  cleanOverlapSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  overlapCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  overlapCard: {
    padding: 16,
  },
  overlapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overlapTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dangerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  dangerTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.danger,
    letterSpacing: 0.8,
  },
  overlapSavedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  overlapSavedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  overlapHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  overlapBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  fundPairBlock: {
    marginBottom: 10,
  },
  fundSingleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fundBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fundNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  overlapCenterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingLeft: 3,
  },
  overlapLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginHorizontal: 8,
  },
  overlapBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  sharedHoldingsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  sharedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sharedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  sharedStockPill: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sharedStockText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  overlapVerdictText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  fixPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  fixPillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  sectorCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  sectorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectorStatusBadge: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectorStatusBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sectorRowItem: {
    marginBottom: 12,
  },
  sectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectorNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sectorPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectorPctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectorBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardSecondary,
    overflow: 'hidden',
  },
  sectorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectorNoteText: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },
  whaleCrossCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  whaleCrossHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  whaleHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whaleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentBlue,
  },
  whaleHeaderTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.accentBlue,
    letterSpacing: 0.8,
  },
  whaleCrossTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  whaleMatchItem: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  matchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  matchInfoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  matchStockName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  matchWhaleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  matchSentimentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  matchSentimentText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  noWhaleBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.cardSecondary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  noWhaleText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  holdingName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  holdingTagPill: {
    backgroundColor: colors.cardSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  holdingTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  holdingSecText: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  holdingVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  holdingPnl: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  expandHoldingsBtn: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.cardSecondary,
    borderRadius: 10,
  },
  expandHoldingsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  actionPlanCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planCardItem: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  planItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  actionTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionTypeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  planDetailText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    paddingLeft: 30,
  },
  savingsCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  savingsCard: {
    padding: 16,
    alignItems: 'center',
  },
  savingsHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  savingsAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 6,
  },
  savingsColumnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  savingsCol: {
    alignItems: 'center',
    flex: 1,
  },
  savingsColVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  savingsColLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  savingsColDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  downloadPdfBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  downloadPdfGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  downloadPdfText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 12, 0.86)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  keyInfoBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  keyInfoStep: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 13,
    marginBottom: 10,
  },
  modalBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardSecondary,
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalDangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    justifyContent: 'center',
  },
  modalDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  modalPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  builderTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  builderTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  builderTabActive: {
    backgroundColor: colors.card,
  },
  builderTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  builderTabTextActive: {
    color: colors.primary,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  segBtnActiveWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  segText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segTextActive: {
    color: colors.primary,
  },
  addRowBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addRowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60A5FA',
  },
  pasteHint: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  stagedHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stagedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  stagedItemName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  stagedItemMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  planTogglePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  quickOverlapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1322',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    marginTop: 10,
    gap: 10,
  },
  quickOverlapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
