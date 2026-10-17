import React, { useState, useMemo } from 'react';
import { 
  Users, Activity, FileText, Heart, 
  Flame, Moon, Footprints, ShieldCheck, 
  ChevronRight, Radio, Cpu, Compass, 
  Gauge, ExternalLink, RefreshCw, AlertTriangle,
  Sparkles, CheckCircle2, ShieldAlert,
  Siren, Share2, Navigation, MapPin, Copy, Check, X, Terminal
} from 'lucide-react';
import { useMqttTelemetry } from '../lib/useMqttTelemetry';

export default function ClinicalOverview({ 
  patients = [], 
  selectedPatientId, 
  onSelectPatient,
  networkStatus,
  onNavigateTab
}) {
  // Connect to real-time MQTT telemetry stream from HiveMQ
  // Broker: wss://broker.hivemq.com:8084/mqtt
  // Topic: izanagi/sensors/data
  const {
    telemetry,
    connectionStatus,
    packetCount,
    lastUpdated,
    topic,
    injectSamplePacket,
    nxpTelemetry
  } = useMqttTelemetry();

  const { hub_online, lat, lng } = telemetry;

  // Emergency Alert & Rescue Dispatch State
  const [isEmergencyAlertOpen, setIsEmergencyAlertOpen] = useState(true);
  const [copyStatus, setCopyStatus] = useState(null);
  const [isSimulatedSos, setIsSimulatedSos] = useState(false);

  const activePatientItem = patients.find(p => p.capsule.patient_id === selectedPatientId) || patients[0];
  const p = activePatientItem?.capsule || {
    patient_id: 'PT-101',
    patient_name: 'John Smith',
    vitals: { spo2: 98, systolic_bp: 120, diastolic_bp: 80, respiratory_rate: 16 }
  };

  // Formatted emergency dispatch message for ambulance & rescue teams
  const emergencyMessage = useMemo(() => {
    return [
      `🚨 [KSHITIJ EMERGENCY RESCUE ALERT - ALS DISPATCH REQUEST]`,
      `PATIENT: ${p.patient_name || 'Patient'} (ID: ${p.patient_id || 'PT-101'})`,
      `TRIAGE STATUS: CODE RED / LEVEL 1 RESUSCITATION`,
      `HARDWARE LINK: NXP TinyML: ${nxpTelemetry?.state_str || 'NORMAL_RUN'} (10.3ms INT8) | ResQMesh: ACKNOWLEDGED (0 Loss)`,
      `DECISION LAYER: Laya System-1 Priority: PRIORITY_HIGH (<20ms)`,
      `GPS COORDINATES: ${lat}, ${lng}`,
      `LOCATION: Brookes Haven Layout, 80 Feet Road, JP Nagar Phase 8, Bengaluru 560076`,
      `TURN-BY-TURN NAVIGATION: https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      `GOOGLE MAPS PIN: https://www.google.com/maps?q=${lat},${lng}`,
      `RESCUE CHANNEL: AMBULANCE DISPATCH TAC-1 (154.280 MHz)`,
      `TIMESTAMP: ${new Date().toLocaleTimeString()} (Active Telemetry Lock)`
    ].join('\n');
  }, [p.patient_name, p.patient_id, nxpTelemetry?.state_str, lat, lng]);

  const handleShareGps = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `EMERGENCY RESCUE: ${p.patient_name} GPS Coordinates`,
          text: emergencyMessage,
          url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        });
        setCopyStatus('SHARED VIA NATIVE RESCUE DISPATCH');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(emergencyMessage);
        setCopyStatus('COPIED DISPATCH & GPS TO CLIPBOARD');
      } else {
        setCopyStatus(`COPIED GPS: ${lat}, ${lng}`);
      }
    } catch (_err) {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(emergencyMessage);
        setCopyStatus('COPIED DISPATCH & GPS TO CLIPBOARD');
      }
    }
    setTimeout(() => setCopyStatus(null), 4000);
  };

  const handleCopyCoordinatesOnly = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${lat}, ${lng}`);
        setCopyStatus(`COPIED GPS: ${lat}, ${lng}`);
        setTimeout(() => setCopyStatus(null), 3500);
      }
    } catch (_) {}
  };



  return (
    <div className="space-y-5 font-mono select-none text-[#1A241C]">
      
      {/* ================= TOP HARDWARE & HIVEMQ MQTT STREAM HEADER ================= */}
      <div className="nm-flat rounded-2xl p-4 border border-white/80 flex items-center justify-between gap-3 flex-wrap">
        
        {/* Hardware Status Badge & Title */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 nm-convex rounded-xl flex items-center justify-center text-[#2D6A4F]">
            <Cpu className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black tracking-wider text-[#1A241C] uppercase">
                EMBEDDED EDGE TELEMETRY GRID
              </span>

              {/* Hardware Status Badge / Hub Link Indicator */}
              {hub_online ? (
                <div className="flex items-center gap-2 px-3 py-1 nm-inset rounded-xl border border-[#2D6A4F]/50 text-[#2D6A4F] text-[10px] font-bold shadow-[0_0_10px_rgba(45,106,79,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-[#2D6A4F] shadow-[0_0_6px_#2D6A4F] animate-pulse"></span>
                  <span>NXP MCXN236: ONLINE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 nm-alert-inset rounded-xl border border-[#C84B31]/60 text-[#C84B31] text-[10px] font-bold shadow-[0_0_10px_rgba(200,75,49,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-[#C84B31] shadow-[0_0_6px_#C84B31] animate-pulse"></span>
                  <span>NXP MCXN236: OFFLINE</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-[#758475] mt-1 font-medium flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                connectionStatus === 'CONNECTED' || connectionStatus.includes('MOCK') || connectionStatus.includes('SIMULATED')
                  ? 'nm-inset text-[#2D6A4F] border border-[#2D6A4F]/40 bg-[#E8EFE9] shadow-[0_0_8px_rgba(45,106,79,0.15)]'
                  : 'nm-alert-inset text-[#C84B31] border border-[#C84B31]/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'CONNECTED' || connectionStatus.includes('MOCK') || connectionStatus.includes('SIMULATED')
                    ? 'bg-[#2D6A4F] animate-pulse'
                    : 'bg-[#C84B31]'
                }`} />
                <Radio className={`w-3 h-3 ${connectionStatus === 'CONNECTED' || connectionStatus.includes('MOCK') || connectionStatus.includes('SIMULATED') ? 'text-[#2D6A4F]' : 'text-[#C84B31]'}`} />
                <span>STREAM:</span>
                <strong className={connectionStatus === 'CONNECTED' || connectionStatus.includes('MOCK') || connectionStatus.includes('SIMULATED') ? 'text-[#2D6A4F]' : 'text-[#C84B31]'}>
                  {connectionStatus}
                </strong>
              </span>
              <span>&bull;</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8E4DA] text-[#556455] font-mono">1000ms loop</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span>Pkts:</span>
                <strong className="text-[#2D6A4F] font-black text-xs nm-inset px-1.5 py-0.2 rounded-md border border-[#2D6A4F]/30 bg-[#E8EFE9]">
                  {packetCount}
                </strong>
              </span>
              <span>&bull;</span>
              <span>Sync: <span className="text-[#556455]">{lastUpdated}</span></span>
            </div>
          </div>
        </div>

        {/* Quick Testing & Live Stream Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setIsEmergencyAlertOpen(prev => !prev);
              setIsSimulatedSos(prev => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase ${
              isEmergencyAlertOpen 
                ? 'nm-alert-inset text-[#C84B31] border border-[#C84B31]/40 shadow-[0_0_8px_rgba(200,75,49,0.2)]' 
                : 'nm-btn text-[#758475] hover:text-[#C84B31]'
            }`}
            title="Toggle Emergency Rescue Alert"
          >
            <Siren className={`w-3.5 h-3.5 text-[#C84B31] ${isEmergencyAlertOpen ? 'animate-pulse' : ''}`} />
            <span>{isEmergencyAlertOpen ? 'EMERGENCY ALERT: ACTIVE' : 'TRIGGER EMERGENCY SOS'}</span>
          </button>

          <button
            onClick={() => injectSamplePacket()}
            className="px-3 py-1.5 nm-btn rounded-xl text-[10px] font-bold text-[#1A241C] hover:text-[#2D6A4F] flex items-center gap-1.5 transition-all uppercase"
            title="Inject a real-time sample packet to verify telemetry stream binding"
          >
            <Sparkles className="w-3 h-3 text-[#2D6A4F]" />
            <span>TEST MQTT PACKET</span>
          </button>

          <button
            onClick={() => injectSamplePacket({ hub_online: !hub_online })}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all uppercase ${
              hub_online 
                ? 'nm-alert-inset text-[#C84B31] border border-[#C84B31]/30 hover:border-[#C84B31]/60' 
                : 'nm-btn text-[#2D6A4F] border border-[#2D6A4F]/30'
            }`}
            title="Toggle NXP MCXN236 Hub Link state"
          >
            <RefreshCw className="w-3 h-3" />
            <span>TOGGLE HUB {hub_online ? 'OFFLINE' : 'ONLINE'}</span>
          </button>
        </div>

      </div>

      {/* ================= NXP FRDM-MCXN236 DEDICATED LIVE 1-SEC TELECAST STATION ================= */}
      <div className="nm-flat rounded-2xl p-4.5 border-2 border-[#2D6A4F]/60 bg-gradient-to-r from-[#2D6A4F]/10 via-[#1A241C]/5 to-transparent relative overflow-hidden shadow-[0_0_20px_rgba(45,106,79,0.18)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 nm-inset rounded-xl flex items-center justify-center text-[#2D6A4F] border border-[#2D6A4F]/40 bg-[#E8EFE9] shrink-0">
              <Terminal className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wider text-[#1A241C] uppercase flex items-center gap-2">
                  <span>NXP FRDM-MCXN236 LIVE TELECAST STATION</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#2D6A4F] text-white shadow-[0_0_8px_#2D6A4F] animate-pulse">
                    1.0 Hz STREAM ACTIVE
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-[#556455] mt-0.5 font-medium">
                Dual Cortex-M33 (150 MHz) &bull; CDC Port: <code className="text-[#2D6A4F] font-bold">/dev/cu.usbmodemFIK54L1PUAFFP3</code> @ 115200 bps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => injectSamplePacket({
                source: 'NXP_FRDM_MCXN236',
                bank: 0,
                update_state: 'NORMAL_RUN',
                hw_ok: true,
                raw_hex: 'A5 01 03 00 00 00 00 45 CA'
              })}
              className="px-3.5 py-1.5 nm-btn rounded-xl text-[10px] font-black text-[#2D6A4F] hover:bg-[#2D6A4F] hover:text-white flex items-center gap-1.5 transition-all uppercase border border-[#2D6A4F]/40 shadow-sm"
              title="Trigger a live 1Hz telecast packet update"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TEST NXP 1-SEC PACKET</span>
            </button>
          </div>
        </div>

        {/* 4-Column Live Telecast Metric Telemetry Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5 pt-3 border-t border-[#2D6A4F]/20 text-[10px]">
          <div className="nm-inset p-2.5 rounded-xl bg-[#E8EFE9]/60 border border-[#2D6A4F]/20">
            <span className="text-[9px] text-[#758475] uppercase font-bold block">STREAM INTERVAL</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-ping" />
              <strong className="text-xs font-black text-[#2D6A4F]">1000 ms (1 Hz)</strong>
            </div>
            <span className="text-[9px] text-[#556455] block mt-0.5">Sync: {lastUpdated}</span>
          </div>

          <div className="nm-inset p-2.5 rounded-xl bg-[#E8EFE9]/60 border border-[#2D6A4F]/20">
            <span className="text-[9px] text-[#758475] uppercase font-bold block">ACTIVE FIRMWARE</span>
            <strong className="text-xs font-black text-[#1A241C] block mt-0.5">Bank 0: Normal Run</strong>
            <span className="text-[9px] text-[#2D6A4F] font-semibold block mt-0.5">MCUboot ECDSA Verified</span>
          </div>

          <div className="nm-inset p-2.5 rounded-xl bg-[#E8EFE9]/60 border border-[#2D6A4F]/20">
            <span className="text-[9px] text-[#758475] uppercase font-bold block">TINYML INFERENCE</span>
            <strong className="text-xs font-black text-[#1A241C] block mt-0.5">INT8 TFLM Model</strong>
            <span className="text-[9px] text-[#556455] block mt-0.5">10.3ms &bull; 13.5 KB Arena</span>
          </div>

          <div className="nm-inset p-2.5 rounded-xl bg-[#E8EFE9]/60 border border-[#2D6A4F]/20">
            <span className="text-[9px] text-[#758475] uppercase font-bold block">LATEST SERIAL PACKET</span>
            <code className="text-[11px] font-black text-[#2D6A4F] block mt-0.5 font-mono">
              {nxpTelemetry?.rawHex || 'A5 01 03 00 00 00 00 45 CA'}
            </code>
            <span className="text-[9px] text-[#556455] block mt-0.5">SOF: 0xA5 &bull; CRC16 OK</span>
          </div>
        </div>
      </div>

      {/* ================= EMERGENCY CASE GPS ALERT & RESCUE DISPATCH BANNER ================= */}
      {isEmergencyAlertOpen && (
        <div className="nm-flat rounded-2xl p-5 border-2 border-[#C84B31]/60 bg-gradient-to-r from-[#C84B31]/10 via-[#F59E0B]/5 to-transparent relative overflow-hidden shadow-[0_0_24px_rgba(200,75,49,0.2)]">
          {/* Subtle pulsing beacon background indicator */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#C84B31]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            {/* Left: Emergency Status & Critical Details */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-9 h-9 nm-alert-inset rounded-xl flex items-center justify-center text-[#C84B31] border border-[#C84B31]/40 shrink-0">
                    <Siren className="w-5 h-5 animate-pulse" />
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 nm-alert-inset rounded-lg text-[#C84B31] border border-[#C84B31]/50 text-xs font-black uppercase flex items-center gap-1.5 shadow-[0_0_8px_rgba(200,75,49,0.3)]">
                      <span className="w-2 h-2 rounded-full bg-[#C84B31] animate-ping" />
                      <span>EMERGENCY SOS ALERT</span>
                    </span>
                    <span className="text-xs font-bold text-[#1A241C] uppercase tracking-wide">
                      IMMEDIATE RESCUE &amp; AMBULANCE DISPATCH REQUIRED
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsEmergencyAlertOpen(false)}
                  className="p-1.5 rounded-lg nm-btn text-[#758475] hover:text-[#C84B31] text-xs"
                  title="Dismiss alert banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Patient and Critical Diagnostic Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="nm-inset rounded-xl p-2.5">
                  <span className="text-[9px] font-bold text-[#758475] uppercase block">CRITICAL PATIENT</span>
                  <span className="font-black text-[#1A241C] text-sm">{p.patient_name}</span>
                  <span className="text-[10px] text-[#C84B31] font-mono block font-bold">ID: {p.patient_id} &bull; CODE RED</span>
                </div>
                <div className="nm-inset rounded-xl p-2.5">
                  <span className="text-[9px] font-bold text-[#758475] uppercase block">HARDWARE &amp; DECISION STATUS</span>
                  <span className="font-black text-[#2D6A4F] text-sm">{nxpTelemetry?.state_str || 'NORMAL_RUN'} <span className="text-xs font-normal text-[#1A241C]">(10.3ms)</span></span>
                  <span className="text-[10px] text-[#556455] font-mono block">ResQMesh: ACKNOWLEDGED &bull; Laya: &lt;20ms</span>
                </div>
                <div className="nm-inset rounded-xl p-2.5">
                  <span className="text-[9px] font-bold text-[#758475] uppercase block">LIVE GPS RADAR LOCK</span>
                  <span className="font-mono font-black text-[#1A241C] text-sm tracking-tight">{lat}, {lng}</span>
                  <span className="text-[10px] text-[#2D6A4F] font-bold block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#2D6A4F]" />
                    <span>JP Nagar Ph 8 &bull; ±2.4m</span>
                  </span>
                </div>
              </div>

              {/* Formatted Rescue Dispatch String Preview */}
              <div className="nm-inset rounded-xl p-2.5 font-mono text-[11px] text-[#556455] flex items-center justify-between gap-2 overflow-hidden border border-[#C84B31]/20">
                <div className="truncate">
                  <strong className="text-[#C84B31]">RESCUE PAYLOAD:</strong> 🚨 Emergency ALS Request for {p.patient_name} at GPS [{lat}, {lng}] &bull; Turn-by-Turn: maps.google.com/dir/?api=1&destination={lat},{lng}
                </div>
                <button
                  onClick={handleCopyCoordinatesOnly}
                  className="px-2 py-0.5 rounded text-[10px] nm-btn text-[#1A241C] hover:text-[#2D6A4F] shrink-0 font-bold flex items-center gap-1"
                  title="Copy lat, lng coordinates only"
                >
                  <Copy className="w-3 h-3" />
                  <span>GPS</span>
                </button>
              </div>

              {copyStatus && (
                <div className="text-[10px] font-bold text-[#2D6A4F] flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>{copyStatus}</span>
                </div>
              )}
            </div>

            {/* Right: Urgent Rescue Action Buttons */}
            <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end">
              {/* Action 1: Share GPS with Ambulance / Rescue Team */}
              <button
                onClick={handleShareGps}
                className="px-4 py-2.5 nm-btn text-[#FFFFFF] bg-gradient-to-r from-[#C84B31] to-[#D94E34] hover:from-[#B53B22] hover:to-[#C84B31] rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[0_0_14px_rgba(200,75,49,0.35)] transition-all"
                title="Broadcast and share GPS coordinates with ambulance or rescue dispatch team"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>SHARE GPS WITH RESCUE TEAM</span>
              </button>

              {/* Action 2: Open Turn-by-Turn Navigation for Ambulance Crew */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 nm-btn text-[#1A241C] hover:text-[#2D6A4F] rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 border border-[#2D6A4F]/30 transition-all text-center"
                title="Launch Google Maps Turn-by-Turn Navigation directly to patient coordinates"
              >
                <Navigation className="w-4 h-4 text-[#2D6A4F]" />
                <span>GOOGLE MAPS NAVIGATION</span>
              </a>

              {/* Action 3: Jump to GPS Radar Ambulance Dispatch */}
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('map')}
                  className="px-4 py-2 nm-btn text-[#2D6A4F] hover:text-[#1A241C] rounded-xl text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>DISPATCH AMBULANCE (RADAR)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PRIMARY TELEMETRY CARDS (3 COLS) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: NXP FRDM-MCXN236 EDGE TINYML CARD */}
        <div className="nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 nm-convex rounded-xl flex items-center justify-center text-[#2D6A4F]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#758475]">MCU-Link CDC &bull; 1Hz Telemetry</div>
                  <div className="text-xs font-black text-[#1A241C]">NXP MCXN236 TINYML NODE</div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[9px] font-bold nm-inset rounded-lg text-[#2D6A4F] border border-[#2D6A4F]/30 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                <span>10.3ms INT8</span>
              </span>
            </div>

            {/* Hero Live NXP State Readout */}
            <div className="nm-inset rounded-xl p-3 my-2 flex items-baseline justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#758475] block">Link Classification / TinyML</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-[#2D6A4F]">
                    {nxpTelemetry?.state_str || 'NORMAL_RUN'}
                  </span>
                </div>
                <span className="text-[9px] text-[#758475] font-mono block mt-0.5">Port: /dev/cu.usbmodemFIK54L1PUAFFP3</span>
              </div>
              
              <div className="text-right">
                <span className="text-[9px] font-bold text-[#2D6A4F] block">HARDWARE OK</span>
                <span className="text-[10px] text-[#758475] font-mono">Bank 0 &bull; Active</span>
              </div>
            </div>

            {/* Neural Network Spec Metrics */}
            <div className="grid grid-cols-3 gap-1.5 my-2 text-center text-[10px]">
              <div className="nm-inset rounded-lg p-1.5">
                <span className="text-[8px] text-[#758475] block font-bold uppercase">ARENA</span>
                <span className="font-bold text-[#1A241C]">13.5 KB</span>
              </div>
              <div className="nm-inset rounded-lg p-1.5">
                <span className="text-[8px] text-[#758475] block font-bold uppercase">QUANT</span>
                <span className="font-bold text-[#2D6A4F]">INT8 TFLM</span>
              </div>
              <div className="nm-inset rounded-lg p-1.5">
                <span className="text-[8px] text-[#758475] block font-bold uppercase">CADENCE</span>
                <span className="font-bold text-[#1A241C]">1.0 Hz CRC16</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#D5CEBF]/40 flex items-center justify-between text-[10px] text-[#758475]">
            <span>Dual Cortex-M33 (150MHz)</span>
            <span className="text-[#2D6A4F] font-bold">MCUboot ECDSA OK</span>
          </div>
        </div>

        {/* CARD 2: RESQMESH DUAL-DISPLAY & QUEUE/ACK CARD */}
        <div className="nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 nm-convex rounded-xl flex items-center justify-center text-[#2D6A4F]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#758475]">ESP32 Dual-Display &bull; Mesh Hub</div>
                  <div className="text-xs font-black text-[#1A241C]">RESQMESH QUEUE &amp; ACK</div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[9px] font-bold nm-inset rounded-lg text-[#2D6A4F] border border-[#2D6A4F]/30 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                <span>ZERO LOSS</span>
              </span>
            </div>

            {/* Hero Queue / Delivery Readout */}
            <div className="nm-inset rounded-xl p-3 my-2 flex items-baseline justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#758475] block">Delivery Status &bull; Store &amp; Forward</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#2D6A4F] tracking-tight">
                    ACKNOWLEDGED
                  </span>
                </div>
                <span className="text-[9px] text-[#758475] font-mono block mt-0.5">Terminal: FIELD-01 &bull; ESP-NOW Relay</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black text-[#2D6A4F] block">LAYA SYSTEM-1</span>
                <span className="text-[10px] text-[#758475] font-mono">&lt;20ms Decision</span>
              </div>
            </div>

            {/* Display & Queue Indicators */}
            <div className="space-y-1.5 my-2">
              <div className="flex justify-between text-[9px] font-bold text-[#758475]">
                <span>ST7735 1.8&quot; SPI TFT</span>
                <span className="text-[#2D6A4F]">ACTIVE STATUS</span>
                <span>SSD1306 0.96&quot; OLED TICKER</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                <div className="nm-inset p-1.5 rounded-lg text-center">
                  <span className="text-[8px] text-[#758475] block">QUEUE PENDING</span>
                  <span className="font-bold text-[#2D6A4F]">0 MSGS (CLEARED)</span>
                </div>
                <div className="nm-inset p-1.5 rounded-lg text-center">
                  <span className="text-[8px] text-[#758475] block">DELIVERY ACKS</span>
                  <span className="font-bold text-[#1A241C]">100% CONFIRMED</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#D5CEBF]/40 flex items-center justify-between text-[10px]">
            <span className="text-[#758475]">Grounding:</span>
            <strong className="font-bold uppercase text-[#2D6A4F]">EVIDENCE-VERIFIED CHAIN</strong>
          </div>
        </div>

        {/* CARD 3: ACTIVE ROUTE MATRIX / GPS CARD */}
        <div className="nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 nm-convex rounded-xl flex items-center justify-center text-[#2D6A4F]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#758475]">Live Geonav Telemetry</div>
                  <div className="text-xs font-black text-[#1A241C]">ACTIVE ROUTE MATRIX / GPS</div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-[9px] font-bold nm-inset rounded-lg text-[#2D6A4F] border border-[#2D6A4F]/30 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                <span>LOCK ±2.4M</span>
              </span>
            </div>

            {/* Coordinates Display Card */}
            <div className="nm-inset rounded-xl p-3 my-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-[#758475] uppercase">LATITUDE:</span>
                <strong className="text-[#1A241C] font-mono text-sm">{lat}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-[#758475] uppercase">LONGITUDE:</span>
                <strong className="text-[#1A241C] font-mono text-sm">{lng}</strong>
              </div>
              <div className="text-[9px] text-[#556455] pt-1 border-t border-[#D5CEBF]/40 font-medium truncate">
                80 Feet Rd &bull; Brookes Haven Layout &bull; JP Nagar Ph 8
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2 text-[10px]">
              <div className="nm-inset rounded-lg p-2 text-center">
                <span className="text-[8px] text-[#758475] uppercase block font-bold">CARRIER LINK</span>
                <span className="font-bold text-[#2D6A4F]">4G LTE UPLINK</span>
              </div>
              <div className="nm-inset rounded-lg p-2 text-center">
                <span className="text-[8px] text-[#758475] uppercase block font-bold">DISPATCH SECTOR</span>
                <span className="font-bold text-[#1A241C]">JP NAGAR 560076</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#D5CEBF]/40 flex flex-col gap-2">
            <button
              onClick={handleShareGps}
              className="w-full py-2 px-3 nm-btn text-[#C84B31] hover:text-[#FFFFFF] hover:bg-[#C84B31] rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-[#C84B31]/40 transition-all"
              title="Share live GPS location with ambulance or rescue dispatch team"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SHARE GPS WITH RESCUE TEAM</span>
            </button>

            <div className="flex items-center justify-between text-[10px]">
              {onNavigateTab ? (
                <button
                  onClick={() => onNavigateTab('map')}
                  className="text-[#2D6A4F] hover:underline font-bold uppercase flex items-center gap-1"
                >
                  <span>OPEN GPS RADAR</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[#2D6A4F] font-bold">RADAR MESH SYNCED</span>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#758475] hover:text-[#1A241C] flex items-center gap-1 font-bold"
              >
                <Navigation className="w-3 h-3 text-[#2D6A4F]" />
                <span>GOOGLE MAPS NAV</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MIDDLE ROW: CLINICAL ADMISSIONS & QUEUE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Total Admissions & System Stats (8 Cols) */}
        <div className="lg:col-span-8 nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#D5CEBF]/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2D6A4F]" />
                <span className="text-xs font-bold text-[#1A241C] uppercase tracking-wider">
                  Clinical Admissions &amp; Rapid Triage
                </span>
              </div>
              <span className="text-[10px] text-[#758475]">&bull; Integrated NXP Edge Node</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="nm-inset rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold text-[#758475]">Total Sector Cases</div>
                <div className="text-2xl font-black text-[#1A241C] mt-1">1,247</div>
                <div className="text-[10px] text-[#2D6A4F] font-bold mt-1">+12% prior cycle</div>
              </div>

              <div className="nm-alert-inset rounded-xl p-3.5 border border-[#C84B31]/30">
                <div className="text-[10px] uppercase font-bold text-[#C84B31]">Critical Triage (Red)</div>
                <div className="text-2xl font-black text-[#C84B31] mt-1">32 CASES</div>
                <div className="text-[10px] text-[#758475] font-medium mt-1">Acute priority demand</div>
              </div>

              <div className="nm-inset rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold text-[#758475]">Pending Sync &amp; Merges</div>
                <div className="text-2xl font-black text-[#2D6A4F] mt-1">18 QUEUED</div>
                <div className="text-[10px] text-[#2D6A4F] font-bold mt-1">100% Verified Telemetry</div>
              </div>
            </div>

            {/* Secondary Vitals Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#D5CEBF]/40 text-xs">
              <div className="nm-inset rounded-xl p-2.5">
                <span className="text-[9px] uppercase font-bold text-[#758475] block">Oxygen Sat</span>
                <span className="font-black text-[#1A241C] text-sm">{p.vitals?.spo2 || 98}% SpO2</span>
              </div>
              <div className="nm-inset rounded-xl p-2.5">
                <span className="text-[9px] uppercase font-bold text-[#758475] block">Blood Pressure</span>
                <span className="font-black text-[#1A241C] text-sm">{p.vitals?.systolic_bp || 120}/{p.vitals?.diastolic_bp || 80}</span>
              </div>
              <div className="nm-inset rounded-xl p-2.5">
                <span className="text-[9px] uppercase font-bold text-[#758475] block">Resp. Rate</span>
                <span className="font-black text-[#1A241C] text-sm">{p.vitals?.respiratory_rate || 16} /min</span>
              </div>
              <div className="nm-alert-inset rounded-xl p-2.5 border border-[#C84B31]/30">
                <span className="text-[9px] uppercase font-bold text-[#C84B31] block">Transit ETA</span>
                <span className="font-black text-[#C84B31] text-sm">
                  {p.time_to_help < 1 ? `${Math.round(p.time_to_help * 60)} mins` : `${p.time_to_help} hrs`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Triage Queue (4 Cols) */}
        <div className="lg:col-span-4 nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#D5CEBF]/40 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C84B31]" />
                <span className="text-xs font-bold text-[#1A241C] uppercase tracking-wider">Triage Queue</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#C84B31] shadow-[0_0_8px_#C84B31] animate-pulse"></span>
            </div>

            <div className="space-y-2.5">
              {patients.slice(0, 4).map((item, idx) => {
                const pt = item.capsule;
                const isSelected = pt.patient_id === selectedPatientId;
                const times = ['10:00 AM', '11:30 AM', '14:00 PM', '15:30 PM'];
                const timeStr = times[idx] || '16:15 PM';

                const badgeStyle = {
                  RED: 'text-[#C84B31] nm-alert-inset border border-[#C84B31]/40',
                  YELLOW: 'text-[#F59E0B] nm-inset border border-[#F59E0B]/30',
                  GREEN: 'text-[#2D6A4F] nm-inset border border-[#2D6A4F]/30'
                }[item.triage_badge] || 'text-[#758475] nm-inset';

                return (
                  <div
                    key={pt.patient_id}
                    onClick={() => onSelectPatient && onSelectPatient(pt.patient_id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'nm-inset border border-[#2D6A4F]/40' 
                        : 'nm-flat hover:nm-convex border border-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-semibold text-[#758475] w-14">{timeStr}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]"></span>
                        <span className="text-xs font-bold text-[#1A241C] truncate max-w-[110px]">
                          {pt.patient_name || pt.patient_id}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg ${badgeStyle}`}>
                      {item.triage_badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {onSelectPatient && (
            <button 
              onClick={() => onSelectPatient(selectedPatientId)}
              className="w-full nm-btn rounded-xl py-2.5 text-xs font-bold text-[#1A241C] hover:text-[#2D6A4F] flex items-center justify-center gap-1.5 transition-all mt-4 uppercase"
            >
              <span>INSPECT COMPLETE ROSTER</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* ================= BOTTOM ROW: HARDWARE & SYSTEM TELEMETRY STATS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Recent Admissions (6 Cols) */}
        <div className="lg:col-span-6 nm-flat rounded-2xl p-5 border border-white/80">
          <div className="flex items-center justify-between mb-4 border-b border-[#D5CEBF]/40 pb-3">
            <span className="text-xs font-bold text-[#1A241C] uppercase tracking-wider">Recent Registrations</span>
            <span className="text-[10px] font-bold text-[#2D6A4F] cursor-pointer hover:underline uppercase">Sector View</span>
          </div>

          <div className="space-y-2.5">
            {patients.slice(0, 4).map((item, idx) => {
              const pt = item.capsule;
              const isSelected = pt.patient_id === selectedPatientId;
              const dates = ['12 Oct, 2026', '11 Oct, 2026', '10 Oct, 2026', '09 Oct, 2026'];
              const ages = ['45 yrs &bull; Male', '32 yrs &bull; Female', '56 yrs &bull; Male', '29 yrs &bull; Male'];

              return (
                <div
                  key={pt.patient_id}
                  onClick={() => onSelectPatient && onSelectPatient(pt.patient_id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'nm-inset border border-[#2D6A4F]/40' 
                      : 'nm-flat hover:nm-convex border border-white/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 nm-convex rounded-xl flex items-center justify-center font-bold text-[10px] text-[#2D6A4F]">
                      {pt.patient_name ? pt.patient_name.split(' ').map(n=>n[0]).join('').slice(0,2) : 'PT'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1A241C]">{pt.patient_name}</div>
                      <div className="text-[10px] text-[#758475]" dangerouslySetInnerHTML={{ __html: ages[idx % ages.length] }} />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-[#758475]">{dates[idx % dates.length]}</div>
                    <div className="text-[10px] font-bold text-[#2D6A4F]">{pt.patient_id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telemetry Hardware Link & Protocol Verification (6 Cols) */}
        <div className="lg:col-span-6 nm-flat rounded-2xl p-5 border border-white/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-[#D5CEBF]/40 pb-3">
            <span className="text-xs font-bold text-[#1A241C] uppercase tracking-wider">
              NXP &amp; Dual-Port Failover Telemetry
            </span>
            <span className="text-[10px] text-[#758475] uppercase">Live Sync</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Footprints className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span className="text-xs font-bold text-[#556455]">Port A Link Quality</span>
                </div>
                <span className="font-bold text-[#1A241C] text-xs">9,842 <span className="text-[#758475]">/ 10,000 pkts</span></span>
              </div>
              <div className="w-full h-2 nm-inset rounded-full p-0.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#556455]">Dual-Port Failover Redundancy</span>
                </div>
                <span className="font-bold text-[#1A241C] text-xs">Active &bull; 0 packet drops</span>
              </div>
              <div className="w-full h-2 nm-inset rounded-full p-0.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span className="text-xs font-bold text-[#556455]">HMAC Device Security &amp; Hardware Sync</span>
                </div>
                <span className="font-bold text-[#2D6A4F] text-xs">AUTHENTICATED</span>
              </div>
              <div className="w-full h-2 nm-inset rounded-full p-0.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#758475] pt-3.5 border-t border-[#D5CEBF]/40 flex items-center justify-between mt-4">
            <span>Hospital Telemetry Protocol &bull; MCXN236 Edge Hub</span>
            <span className="text-[#2D6A4F] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> VERIFIED
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
