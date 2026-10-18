// Vercel Serverless Function: Laya Decision Layer & Open-Weight Edge SLM Mock Endpoint
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;

  // GET /api/decision-layer/models
  if (req.method === 'GET') {
    return res.status(200).json({
      active_model: "qwen2.5-0.5b",
      decision_layer: "Laya (System 1 Non-Autoregressive Decision Engine)",
      available_models: {
        "qwen2.5-0.5b": {
          id: "Qwen/Qwen2.5-0.5B-Instruct",
          name: "Qwen2.5-0.5B-Instruct",
          parameters: "0.49 Billion",
          context_window: "32k",
          optimal_for: "Fast structured JSON & complex clinical reasoning",
          ram_footprint: "~650 MB (FP16) / ~350 MB (INT4)"
        },
        "smollm2-360m": {
          id: "HuggingFaceTB/SmolLM2-360M-Instruct",
          name: "SmolLM2-360M-Instruct",
          parameters: "360 Million",
          context_window: "8k",
          optimal_for: "Ultra-low power tactical edge nodes & embedded SBCs",
          ram_footprint: "~450 MB (FP16) / ~220 MB (INT4)"
        }
      }
    });
  }

  // POST /api/decision-layer/evaluate
  if (req.method === 'POST') {
    const capsule = req.body?.capsule || req.body || {};
    const vitals = capsule.vitals || {};
    const t_help = parseFloat(capsule.time_to_help) || 0.5;
    const isAcute = t_help <= 0.5;

    const triage_level = isAcute ? "IMMEDIATE_RED" : "DELAYED_YELLOW";
    const protocol_mode = isAcute ? "ACUTE_STABILIZATION" : (t_help >= 24.0 ? "PROLONGED_FIELD_CARE" : "INTERIM_TACTICAL_HOLD");
    const priority_score = isAcute ? 24.8 : 8.5;

    return res.status(200).json({
      model_id: "Qwen/Qwen2.5-0.5B-Instruct",
      model_name: "Qwen2.5-0.5B-Instruct",
      decision_layer: "rule-based decision layer (calibrated softmax primitives)",
      decision_latency_ms: 16.4,
      generation_latency_ms: 184.2,
      total_latency_ms: 200.6,
      triage_level,
      protocol_mode,
      priority_score,
      nouls: {
        requires_immediate_tourniquet: {
          decision: isAcute,
          prob: isAcute ? 0.94 : 0.05,
          rationale: isAcute ? "Arterial/massive blood loss indicator detected" : "No severe hemorrhage markers active"
        },
        airway_compromise_risk: {
          decision: vitals.spo2 < 90,
          prob: vitals.spo2 < 90 ? 0.91 : 0.08,
          rationale: vitals.spo2 < 90 ? "Severe desaturation or tachypnea detected" : "Airway patent, respiratory drive stable"
        },
        fluid_rationing_mandated: {
          decision: t_help >= 12.0,
          prob: t_help >= 12.0 ? 0.96 : 0.05,
          rationale: t_help >= 12.0 ? `Evacuation delay is ${t_help}h; strict crystalloid rationing required` : "Transport window < 12h; standard fluid rehydration allowable"
        },
        escalate_emergency_beacon: {
          decision: isAcute,
          prob: isAcute ? 0.92 : 0.04,
          rationale: isAcute ? "Critical physiological decompensation or EOG distress triggered" : "Stable tactical telemetry"
        }
      },
      action_steps: isAcute ? [
        "Initiate immediate high-flow oxygenation via non-rebreather mask (15 L/min).",
        "Secure large-bore IV access (18G) and package for high-speed MEDEVAC transfer.",
        "Verify cervical collar and rigid litter placement before transport vehicle arrival."
      ] : [
        "Establish Prolonged Field Care (PFC) nursing log with vital checks every 120 minutes.",
        "Initiate decubitus ulcer turning protocol (30-degree tilt every 2 hours).",
        "Ration IV fluids to maintenance rate (75-100 mL/hr) or oral rehydration salts."
      ],
      rationing_guidelines: isAcute ? [
        "Do not restrict emergency resupply; transport team ETA < 30 mins."
      ] : [
        "Preserve crystalloid fluids: restrict to 1.5L/24h unless MAP < 65.",
        "Titrate O2 flow to target SpO2 90-92% to preserve oxygen cylinders."
      ],
      red_flag_triggers: [
        "Mean Arterial Pressure (MAP) falling below 65 mmHg",
        "Acute neurological deterioration or loss of eye-gaze responsiveness"
      ],
      clinical_narrative: `[Qwen2.5-0.5B-Instruct Synthesis] Patient evaluated under Laya Decision Layer with 16.4ms System-1 latency. ${protocol_mode} established based on evacuation window of ${t_help}h.`,
      source: "laya_decision_layer+deterministic_template"
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
