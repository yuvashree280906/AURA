/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, PageId } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomeDashboard } from './components/pages/HomeDashboard';
import { BroadcastSetup } from './components/pages/BroadcastSetup';
import { LiveBroadcastStudio } from './components/pages/LiveBroadcastStudio';
import { NetworkLab } from './components/pages/NetworkLab';
import { PerformanceAnalytics } from './components/pages/PerformanceAnalytics';
import { TestReports } from './components/pages/TestReports';
import {
  BroadcastMode,
  ContentItem,
  NetworkProfile,
  TestSessionReport,
} from './types/scheduler';
import { NETWORK_PROFILES, SAMPLE_SCENARIOS } from './services/sampleScenarios';
import { getStoredReports, saveReportToStorage } from './services/reportStorage';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [mode, setMode] = useState<BroadcastMode>('AURA');
  const [network, setNetwork] = useState<NetworkProfile>(NETWORK_PROFILES.weak_2g);

  // Active Broadcast Session Config
  const defaultScenario = SAMPLE_SCENARIOS[0]; // Flash flood emergency
  const [scenarioTitle, setScenarioTitle] = useState<string>(defaultScenario.title);
  const [scenarioDomain, setScenarioDomain] = useState<string>(defaultScenario.domain);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(defaultScenario.sampleVideoUrl);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(defaultScenario.id);

  const [broadcastItems, setBroadcastItems] = useState<ContentItem[]>(
    defaultScenario.items.map((it, idx) => ({
      ...it,
      status: 'queued',
      retryCount: 0,
      segmentIndex: idx + 1,
    }))
  );

  // Reports
  const [reports, setReports] = useState<TestSessionReport[]>([]);
  const [activeReportToAnalyze, setActiveReportToAnalyze] = useState<TestSessionReport | undefined>();

  // Load initial reports on mount
  useEffect(() => {
    const loaded = getStoredReports();
    if (loaded.length > 0) {
      setReports(loaded);
      setActiveReportToAnalyze(loaded[0]);
    } else {
      // Seed an initial benchmark comparison report so the user can immediately explore analytics
      const seedReport: TestSessionReport = {
        id: `seed_report_01`,
        timestamp: new Date().toLocaleTimeString(),
        scenarioTitle: defaultScenario.title,
        domain: defaultScenario.domain,
        mode: 'AURA',
        networkProfile: NETWORK_PROFILES.weak_2g,
        metrics: {
          timeToFirstEssentialMs: 380,
          timeToDeliverAllEssentialMs: 3200,
          videoStartupDelayMs: 6500,
          totalBufferingDurationMs: 1200,
          rebufferingCount: 1,
          totalBytesTransferred: 420000,
          successfulDeliveryRate: 100,
          missedDeadlines: 0,
          deferredSegmentsRecovered: 2,
          averageEffectiveBandwidthKbps: 220,
          playbackContinuityScore: 92,
          isRealMeasurement: false,
        },
        itemCount: defaultScenario.items.length,
        deliveredCount: defaultScenario.items.length,
        expiredCount: 0,
        deferredCount: 1,
        simulatedOrReal: 'SIMULATED',
        durationSeconds: 40,
        eventsCount: 36,
      };
      saveReportToStorage(seedReport);
      setReports([seedReport]);
      setActiveReportToAnalyze(seedReport);
    }
  }, []);

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'AURA' ? 'BASELINE' : 'AURA'));
  };

  const handleQuickStartScenario = (scenarioId: string) => {
    const sc = SAMPLE_SCENARIOS.find((s) => s.id === scenarioId) || defaultScenario;
    setSelectedScenarioId(sc.id);
    setScenarioTitle(sc.title);
    setScenarioDomain(sc.domain);
    setVideoUrl(sc.sampleVideoUrl);
    setNetwork(NETWORK_PROFILES[sc.defaultNetworkProfile] || NETWORK_PROFILES.weak_2g);

    setBroadcastItems(
      sc.items.map((it, idx) => ({
        ...it,
        status: 'queued',
        retryCount: 0,
        segmentIndex: idx + 1,
      }))
    );

    setActivePage('studio');
  };

  const handleStartBroadcast = (config: {
    title: string;
    description: string;
    speaker: string;
    domain: string;
    videoUrl?: string;
    videoFileName?: string;
    videoFileSizeMb?: number;
    items: ContentItem[];
    mode: BroadcastMode;
    networkProfileType: string;
  }) => {
    setScenarioTitle(config.title);
    setScenarioDomain(config.domain);
    setVideoUrl(config.videoUrl);
    setMode(config.mode);
    setNetwork(NETWORK_PROFILES[config.networkProfileType] || NETWORK_PROFILES.weak_2g);
    setBroadcastItems(config.items);
    setActivePage('studio');
  };

  const handleSaveReport = (report: TestSessionReport) => {
    setReports((prev) => [report, ...prev]);
    setActiveReportToAnalyze(report);
  };

  const handleSelectReportToAnalyze = (report: TestSessionReport) => {
    setActiveReportToAnalyze(report);
    setActivePage('analytics');
  };

  const handleRepeatTest = (report: TestSessionReport) => {
    setScenarioTitle(report.scenarioTitle);
    setScenarioDomain(report.domain);
    setMode(report.mode);
    setNetwork(report.networkProfile);
    setActivePage('studio');
  };

  const handleClearAllReports = () => {
    localStorage.removeItem('aura_broadcast_reports_v1');
    setReports([]);
    setActiveReportToAnalyze(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080d19] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Universal Responsive Navbar */}
      <Navbar
        activePage={activePage}
        onSelectPage={setActivePage}
        mode={mode}
        network={network}
        isStreamingLive={activePage === 'studio'}
        onToggleMode={handleToggleMode}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activePage === 'home' && (
          <HomeDashboard
            onNavigate={setActivePage}
            recentReports={reports}
            currentMode={mode}
            currentNetwork={network}
            onQuickStartScenario={handleQuickStartScenario}
          />
        )}

        {activePage === 'setup' && (
          <BroadcastSetup
            onStartBroadcast={handleStartBroadcast}
            initialScenarioId={selectedScenarioId}
          />
        )}

        {activePage === 'studio' && (
          <LiveBroadcastStudio
            key={`${scenarioTitle}_${mode}_${network.bandwidthKbps}_${broadcastItems[0]?.id || 'empty'}_${broadcastItems.length}`}
            initialItems={broadcastItems}
            scenarioTitle={scenarioTitle}
            scenarioDomain={scenarioDomain}
            videoUrl={videoUrl}
            initialMode={mode}
            initialNetwork={network}
            onNavigate={setActivePage}
            onSaveReport={handleSaveReport}
          />
        )}

        {activePage === 'network' && (
          <NetworkLab
            currentNetwork={network}
            onApplyNetwork={setNetwork}
            onNavigateToStudio={() => setActivePage('studio')}
          />
        )}

        {activePage === 'analytics' && (
          <PerformanceAnalytics
            currentReport={activeReportToAnalyze}
            allReports={reports}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'reports' && (
          <TestReports
            reports={reports}
            onSelectReportToAnalyze={handleSelectReportToAnalyze}
            onRepeatTest={handleRepeatTest}
            onClearAllReports={handleClearAllReports}
            onNavigate={setActivePage}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={setActivePage} />
    </div>
  );
}
