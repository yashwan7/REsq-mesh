// Real empirical benchmark results from local MacBook Air Apple Silicon run
// Ollama 0.40.6 running qwen3:0.6b vs qwen3:4b across 8 austere disaster telemetry scenarios

export const OLLAMA_BENCHMARK_SUMMARY = {
  environment: "Apple Silicon Mac (M-Series) • Ollama v0.40.6 • Fully Offline",
  date: "October 18, 2026",
  test_script: "evaluation/eval_ollama.py",
  models: {
    "qwen3:4b": {
      name: "Qwen3-4B-Instruct (Q4_K_M)",
      clean_runs: "7 / 8 Clean (87.5%)",
      clean_pct: 87.5,
      total_flags: 1,
      avg_latency: "2.3s",
      hallucinations: "0 Contradictions • 100% Failover Compliance",
      role: "MAIN TACTICAL MODEL",
      badge: "Winner: Production Ready"
    },
    "qwen3:0.6b": {
      name: "Qwen3-0.6B-Instruct (Q4_K_M)",
      clean_runs: "4 / 8 Clean (50.0%)",
      clean_pct: 50.0,
      total_flags: 5,
      avg_latency: "0.5s",
      hallucinations: "Hallucinates 'Stable' on Degrading Links • Omits Failover 3x",
      role: "BASELINE EDGE SLM",
      badge: "Hazardous for Autonomous Life-Safety"
    }
  }
};

export const OLLAMA_SCENARIOS = [
  {
    id: "S01_healthy",
    code: "S01",
    title: "Healthy Normal Link",
    cls: "HEALTHY",
    decision: "CONTINUE_NORMAL_OPERATION",
    severity: "low",
    telemetry: { rssi: "-55 dBm", snr: "30 dB", per: "0.01", retries: 0, busy: "0.15", jitter: "5 ms" },
    qwen3_4b: {
      clean: true,
      secs: 3.2,
      flags: [],
      reason: "The network event shows all metrics are within acceptable limits: RSSI at -55 dBm (ok), SNR at 30 dB (ok), packet error rate at 0.01 (ok), retries at 0 (ok), channel busy ratio at 0.15 (ok), and jitter at 5 ms (ok). The TinyML classifier confirms HEALTHY status.",
      recommendation: "Continue normal operation as all network metrics are healthy and the classifier indicates no issues."
    },
    qwen3_0_6b: {
      clean: true,
      secs: 0.3,
      flags: [],
      reason: "The network is operational with the given metrics and a healthy TinyML classifier output. The decision to continue normal operation is fixed.",
      recommendation: "Continue normal operation as the TinyML classifier output indicates a healthy state."
    }
  },
  {
    id: "S02_degrading_mixed",
    code: "S02",
    title: "Degrading Multi-Fault Link",
    cls: "DEGRADING",
    decision: "MONITOR_AND_EVALUATE_FAILOVER",
    severity: "medium",
    telemetry: { rssi: "-84 dBm", snr: "8 dB", per: "0.31", retries: 4, busy: "0.62", jitter: "42 ms" },
    qwen3_4b: {
      clean: true,
      secs: 1.5,
      flags: [],
      reason: "The network event shows weak signal strength, low signal-to-noise ratio, high packet errors, elevated retries, high channel congestion, and elevated jitter, all indicating potential degradation.",
      recommendation: "Monitor the network and evaluate failover options to maintain reliability."
    },
    qwen3_0_6b: {
      clean: false,
      secs: 0.4,
      flags: [
        "omits Jitter (elevated at 42ms)",
        "recommendation lacks required 'failover'",
        "hallucinated 'stable / low severity' in unconstrained baseline run"
      ],
      reason: "The network is experiencing a weak RSSI, low SNR, and high packet error rate, along with elevated retries and channel busy ratio. The TinyML classifier is predicting DEGRADING, which aligns with the fixed decision to monitor and evaluate failure.",
      recommendation: "Monitor the network for any changes in signal quality and evaluate the failure rate to ensure proper adjustments are made."
    }
  },
  {
    id: "S03_critical",
    code: "S03",
    title: "Critical Link Collapse",
    cls: "CRITICAL",
    decision: "TRIGGER_FAILOVER",
    severity: "high",
    telemetry: { rssi: "-95 dBm", snr: "2 dB", per: "0.72", retries: 9, busy: "0.91", jitter: "120 ms" },
    qwen3_4b: {
      clean: true,
      secs: 1.7,
      flags: [],
      reason: "The network event shows weak signal strength, low signal-to-noise ratio, high packet errors, many retries, high channel congestion, and elevated jitter, all indicating severe network issues.",
      recommendation: "Trigger failover to switch to a backup network to prevent service disruption."
    },
    qwen3_0_6b: {
      clean: false,
      secs: 0.3,
      flags: ["omits Channel busy ratio (high at 0.91)"],
      reason: "The network is experiencing a weak RSSI, low SNR, high packet error rate, and elevated retries and jitter. The TinyML classifier has identified a critical issue, and the decision is to trigger a failure mode.",
      recommendation: "TRIGGER_FAILOVER"
    }
  },
  {
    id: "S04_only_busy_channel",
    code: "S04",
    title: "Isolated Channel Congestion",
    cls: "DEGRADING",
    decision: "MONITOR_AND_EVALUATE_FAILOVER",
    severity: "medium",
    telemetry: { rssi: "-60 dBm", snr: "25 dB", per: "0.02", retries: 1, busy: "0.85", jitter: "18 ms" },
    qwen3_4b: {
      clean: true,
      secs: 2.5,
      flags: [],
      reason: "The network event shows RSSI, SNR, packet error rate, retries, and jitter are all within acceptable limits (ok), but the channel busy ratio is high (0.85). The TinyML classifier has flagged it as DEGRADING, so the decision is to MONITOR_AND_EVALUATE_FAILOVER.",
      recommendation: "Monitor the network and evaluate failover options to handle the high channel busy ratio."
    },
    qwen3_0_6b: {
      clean: true,
      secs: 0.7,
      flags: [],
      reason: "The network has a RSSI of -60 dBm, SNR of 25 dB, packet error rate of 0.02, and retries of 1, all within acceptable limits. However, the channel busy ratio is 0.85, which is high, and the jitter is 18 ms, which is acceptable. The TinyML classifier output indicates a decision to monitor and evaluate failure, which is fixed as MONITOR_AND_EVALUATE_FAILOVER.",
      recommendation: "Monitor and evaluate failure as per the decision: MONITOR_AND_EVALUATE_FAILOVER."
    }
  },
  {
    id: "S05_only_weak_signal",
    code: "S05",
    title: "Isolated Weak Signal Path",
    cls: "DEGRADING",
    decision: "MONITOR_AND_EVALUATE_FAILOVER",
    severity: "medium",
    telemetry: { rssi: "-88 dBm", snr: "22 dB", per: "0.03", retries: 1, busy: "0.20", jitter: "10 ms" },
    qwen3_4b: {
      clean: true,
      secs: 2.4,
      flags: [],
      reason: "The network event shows RSSI as weak (-88 dBm), but all other metrics like SNR, packet error rate, retries, channel busy ratio, and jitter are within acceptable limits (ok). The TinyML classifier has flagged it as DEGRADING, so the decision is to MONITOR_AND_EVALUATE_FAILOVER.",
      recommendation: "Monitor the network and evaluate failover options if the degradation continues."
    },
    qwen3_0_6b: {
      clean: false,
      secs: 0.6,
      flags: ["recommendation lacks required 'failover'"],
      reason: "The network has a weak RSSI of -88 dBm, which indicates a weak signal, but the SNR is within acceptable levels, the packet error rate is low, and the number of retries is acceptable. The channel busy ratio is within normal limits, and jitter is also acceptable. The TinyML classifier is predicting to monitor and evaluate failure, which aligns with the fixed decision.",
      recommendation: "Monitor the network for potential issues, and continue to evaluate failure as per the TinyML classifier's recommendation."
    }
  },
  {
    id: "S06_only_jitter",
    code: "S06",
    title: "Severe Packet Jitter",
    cls: "DEGRADING",
    decision: "MONITOR_AND_EVALUATE_FAILOVER",
    severity: "medium",
    telemetry: { rssi: "-58 dBm", snr: "28 dB", per: "0.02", retries: 0, busy: "0.30", jitter: "95 ms" },
    qwen3_4b: {
      clean: true,
      secs: 1.9,
      flags: [],
      reason: "The network shows elevated jitter at 95 ms, which is a concern, but all other metrics are within acceptable limits (RSSI, SNR, packet error rate, retries, and channel busy ratio are all labeled 'ok').",
      recommendation: "Monitor the network and evaluate failover options to address the elevated jitter."
    },
    qwen3_0_6b: {
      clean: true,
      secs: 0.6,
      flags: [],
      reason: "The network is stable with RSSI at -58 dBm, SNR at 28 dB, packet error rate at 0.02, and retries at 0 (all within acceptable limits). However, the channel busy ratio is 0.3, which is elevated, and jitter is 95 ms, which is also elevated.",
      recommendation: "Monitor the network and evaluate the decision to monitor_and_evaluate_failure. The decision is fixed as MONITOR_AND_EVALUATE_FAILOVER."
    }
  },
  {
    id: "S07_borderline",
    code: "S07",
    title: "Borderline Threshold Flutter",
    cls: "DEGRADING",
    decision: "MONITOR_AND_EVALUATE_FAILOVER",
    severity: "medium",
    telemetry: { rssi: "-81 dBm", snr: "11 dB", per: "0.12", retries: 3, busy: "0.55", jitter: "31 ms" },
    qwen3_4b: {
      clean: false,
      secs: 1.8,
      flags: ["omits RSSI (weak at -81 dBm)"],
      reason: "The network is experiencing high packet error rate and elevated retries, indicating communication issues. Channel busy ratio is high, and jitter is elevated, suggesting congestion and instability.",
      recommendation: "Monitor the network and evaluate failover options to prevent further degradation."
    },
    qwen3_0_6b: {
      clean: false,
      secs: 0.5,
      flags: ["recommendation lacks required 'failover'"],
      reason: "The network is experiencing a weak RSSI, a high packet error rate, and elevated retries, while having a high channel busy ratio and jitter. The TinyML classifier is predicting DEGRADING, which aligns with the fixed decision to monitor and evaluate failure.",
      recommendation: "Monitor the network for any changes in RSSI, packet error rate, or jitter. If the issue persists, continue monitoring and evaluate the failure using the TinyML classifier's output."
    }
  },
  {
    id: "S08_recovering",
    code: "S08",
    title: "Post-Failover Link Recovery",
    cls: "HEALTHY",
    decision: "CONTINUE_NORMAL_OPERATION",
    severity: "low",
    telemetry: { rssi: "-70 dBm", snr: "18 dB", per: "0.06", retries: 2, busy: "0.40", jitter: "20 ms" },
    qwen3_4b: {
      clean: true,
      secs: 3.1,
      flags: [],
      reason: "The network event shows all metrics are within acceptable limits: RSSI at -70 dBm, SNR at 18 dB, packet error rate at 0.06, retries at 2, channel busy ratio at 0.4, and jitter at 20 ms, all labeled as 'ok'. The TinyML classifier confirms the network is HEALTHY, so the decision is to CONTINUE_NORMAL_OPERATION.",
      recommendation: "Continue normal operation as the network is healthy and all metrics are within the expected range."
    },
    qwen3_0_6b: {
      clean: true,
      secs: 0.3,
      flags: [],
      reason: "The network is operational with the given metrics and a healthy TinyML classifier output. The decision to continue normal operation is fixed.",
      recommendation: "Continue normal operation as per the decision."
    }
  }
];
