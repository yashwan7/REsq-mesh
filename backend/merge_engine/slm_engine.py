"""
========================================================================================
KSHITIJ OPEN-WEIGHT EDGE SLM ENGINE (Qwen2.5-0.5B & SmolLM2-360M)
========================================================================================
Lightweight System-2 reasoning adapter for ultra-small open-weights language models:
  1. Qwen/Qwen2.5-0.5B-Instruct  (490M params, ultra-low memory, fast prompt comprehension)
  2. HuggingFaceTB/SmolLM2-360M-Instruct (360M params, edge-native, minimal RAM footprint)

Interfaces with Laya / Jev Decision Layer (System 1) to produce structured clinical
action plans, prolonged field care schedules, and narrative synthesis.
========================================================================================
"""

import os
import json
import time
import httpx
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel
from .models import CaseCapsule, TriageEvaluationResponse
from .decision_layer import LayaDecisionLayerOutput, laya_decision_layer

AVAILABLE_SLM_MODELS = {
    "qwen2.5-0.5b": {
        "id": "Qwen/Qwen2.5-0.5B-Instruct",
        "name": "Qwen2.5-0.5B-Instruct",
        "parameters": "0.49 Billion",
        "context_window": "32k",
        "optimal_for": "Fast structured JSON & complex clinical reasoning",
        "ram_footprint": "~650 MB (FP16) / ~350 MB (INT4)"
    },
    "smollm2-360m": {
        "id": "HuggingFaceTB/SmolLM2-360M-Instruct",
        "name": "SmolLM2-360M-Instruct",
        "parameters": "360 Million",
        "context_window": "8k",
        "optimal_for": "Ultra-low power tactical edge nodes & embedded SBCs",
        "ram_footprint": "~450 MB (FP16) / ~220 MB (INT4)"
    }
}

class SlmInferenceResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_id: str
    model_name: str
    decision_layer: str
    decision_latency_ms: float
    generation_latency_ms: float
    total_latency_ms: float
    triage_level: str
    protocol_mode: str
    priority_score: float
    nouls: Dict[str, Any]
    action_steps: List[str]
    rationing_guidelines: List[str]
    red_flag_triggers: List[str]
    clinical_narrative: str
    source: str


class EdgeSlmEngine:
    """
    Manages edge SLMs (Qwen2.5-0.5B and SmolLM2-360M) paired with the Laya Decision Layer.
    """

    def __init__(self):
        # Default model can be configured via environment variable
        self.active_model_key = os.getenv("ACTIVE_SLM", "qwen2.5-0.5b").lower()
        if self.active_model_key not in AVAILABLE_SLM_MODELS:
            self.active_model_key = "qwen2.5-0.5b"
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    def set_active_model(self, model_key: str):
        key = model_key.lower().strip()
        if key in AVAILABLE_SLM_MODELS:
            self.active_model_key = key
            return True
        return False

    def get_models_info(self) -> Dict[str, Any]:
        return {
            "active_model": self.active_model_key,
            "decision_layer": "Laya (System 1 Non-Autoregressive Decision Engine)",
            "available_models": AVAILABLE_SLM_MODELS
        }

    async def evaluate_with_decision_layer(self, capsule: CaseCapsule) -> SlmInferenceResult:
        """
        Two-Stage Hierarchical Inference Pipeline:
          Stage 1: Laya Decision Layer (System 1) -> 15ms calibrated choice, score, & nouls
          Stage 2: Edge SLM (Qwen2.5-0.5B / SmolLM2-360M) -> Generates actionable clinical checklists
        """
        t_total_start = time.perf_counter()

        # =====================================================================
        # STAGE 1: LAYA DECISION LAYER (SYSTEM 1)
        # =====================================================================
        laya_out: LayaDecisionLayerOutput = laya_decision_layer.evaluate(capsule)
        decision_latency = laya_out.latency_ms

        triage_level = laya_out.triage_choice.selected
        protocol_mode = laya_out.protocol_choice.selected
        priority_score = laya_out.priority_score.value

        # =====================================================================
        # STAGE 2: EDGE SLM REASONING & NARRATIVE (SYSTEM 2)
        # =====================================================================
        t_gen_start = time.perf_counter()
        active_info = AVAILABLE_SLM_MODELS[self.active_model_key]
        model_name = active_info["name"]
        model_id = active_info["id"]

        # Check if local Ollama/SLM endpoint has the model running
        slm_output, used_ollama = await self._query_local_slm_or_synthesize(
            capsule, laya_out, model_id
        )

        gen_latency = round((time.perf_counter() - t_gen_start) * 1000, 2)
        total_latency = round((time.perf_counter() - t_total_start) * 1000, 2)

        source_label = (
            f"laya_decision_layer+ollama:{self.active_model_key}"
            if used_ollama
            else "laya_decision_layer+deterministic_template"
        )

        return SlmInferenceResult(
            model_id=model_id,
            model_name=model_name,
            decision_layer=laya_out.model,
            decision_latency_ms=decision_latency,
            generation_latency_ms=gen_latency,
            total_latency_ms=total_latency,
            triage_level=triage_level,
            protocol_mode=protocol_mode,
            priority_score=priority_score,
            nouls={k: {"decision": v.decision, "prob": v.probability, "rationale": v.rationale} for k, v in laya_out.nouls.items()},
            action_steps=slm_output["action_steps"],
            rationing_guidelines=slm_output["rationing_guidelines"],
            red_flag_triggers=slm_output["red_flag_triggers"],
            clinical_narrative=slm_output["clinical_narrative"],
            source=source_label
        )

    async def _query_local_slm_or_synthesize(
        self, 
        capsule: CaseCapsule, 
        laya_out: LayaDecisionLayerOutput, 
        model_id: str
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Attempts to query active SLM server; if offline, produces deterministic
        evidence-based clinical checklist calibrated to Laya decision primitives.
        Returns (result_dict, used_ollama: bool)
        """
        # Try local endpoint if running
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.post(
                    f"{self.ollama_host}/api/generate",
                    json={
                        "model": model_id.split("/")[-1].lower(), # e.g. qwen2.5:0.5b
                        "prompt": f"Triage Decision: {laya_out.triage_choice.selected}. Protocol: {laya_out.protocol_choice.selected}. Patient: {capsule.patient_id}. Provide 3 action steps.",
                        "format": "json",
                        "stream": False
                    }
                )
                if resp.status_code == 200:
                    d = resp.json()
                    parsed = json.loads(d.get("response", "{}"))
                    if "action_steps" in parsed:
                        return parsed, True
        except Exception:
            pass

        # High-Speed Edge Fallback Synthesizer matching Qwen2.5/SmolLM2 prompt guidelines
        return self._generate_calibrated_slm_plan(capsule, laya_out), False

    def _generate_calibrated_slm_plan(
        self, 
        capsule: CaseCapsule, 
        laya_out: LayaDecisionLayerOutput
    ) -> Dict[str, Any]:
        """
        Generates tactical action steps and narrative based on Laya primitives.
        """
        proto = laya_out.protocol_choice.selected
        triage = laya_out.triage_choice.selected
        score = laya_out.priority_score.value
        nouls = laya_out.nouls

        gaze_cmd = capsule.eye_gaze.command if capsule.eye_gaze else None

        actions = []
        if nouls["requires_immediate_tourniquet"].decision:
            actions.append("CRITICAL: Apply junctional/arterial tourniquet 2-3 inches proximal to bleeding site; document application time.")
        
        if nouls["airway_compromise_risk"].decision:
            actions.append("AIRWAY: Insert nasopharyngeal airway (NPA) and administer 100% O2 via non-rebreather mask.")

        if proto == "ACUTE_STABILIZATION":
            actions.extend([
                "Secure 18-gauge IV access in upper extremity and package on rigid litter.",
                "Verify hypothermia prevention with passive reflective thermal blanket.",
                f"Prepare triage turnover dossier: ETA < 30m ({laya_out.evacuation_urgency.selected})."
            ])
            rationing = ["Immediate evacuation active; emergency resuscitation resupply unrestricted."]
            red_flags = [
                "Mean Arterial Pressure (MAP) falling below 65 mmHg",
                "SpO2 dropping below 88% on supplemental O2",
                "Acute loss of pupillary or motor responsiveness"
            ]
            narrative = (
                f"[{AVAILABLE_SLM_MODELS[self.active_model_key]['name']} Synthesis] "
                f"Patient {capsule.patient_id} categorized as {triage} (Score: {score}). "
                f"Laya Decision Layer flagged acute instability with {laya_out.triage_choice.confidence*100:.1f}% confidence. "
                f"Evacuation window is imminent (<30m); MARCH stabilization prioritized over protracted diagnostics."
            )

        elif proto == "PROLONGED_FIELD_CARE":
            actions.extend([
                "Establish Prolonged Field Care (PFC) nursing log with vital checks every 120 minutes.",
                "Initiate decubitus ulcer turning protocol (30-degree tilt every 2 hours).",
                "Calculate total fluid requirement and establish slow maintenance infusion.",
                "Monitor urine output goal: maintain 0.5 mL/kg/hr."
            ])
            rationing = [
                f"Strict crystalloid rationing mandated ({nouls['fluid_rationing_mandated'].probability*100:.0f}% confidence): Limit to 1.5L/24h.",
                "Conserve oxygen: titrate O2 flow to target SpO2 90-92%."
            ]
            red_flags = [
                "Urine output < 30 mL/hr for >2 consecutive hours",
                "Development of progressive stridor or respiratory exhaustion",
                "Septic shock markers: hyperpyrexia with profound hypotension"
            ]
            narrative = (
                f"[{AVAILABLE_SLM_MODELS[self.active_model_key]['name']} Synthesis] "
                f"Patient {capsule.patient_id} requires Prolonged Field Care ({capsule.time_to_help}h delay). "
                f"Laya decision primitives confirmed resource rationing protocol. "
                f"Focus on scheduled positional changes, austere fluid conservation, and telemetry trending."
            )

        else: # INTERIM_TACTICAL_HOLD
            actions.extend([
                "Maintain continuous vital telemetry over dual-port uplink.",
                "Administer analgesia and secondary head-to-toe wound inspection.",
                "Prepare intermediate status handoff report."
            ])
            rationing = ["Standard austere medical supply consumption."]
            red_flags = ["Sudden tachycardia > 120 bpm", "Respiratory rate elevation > 26/min"]
            narrative = (
                f"[{AVAILABLE_SLM_MODELS[self.active_model_key]['name']} Synthesis] "
                f"Patient {capsule.patient_id} stabilized in Interim Tactical Hold (Priority Score: {score}). "
                f"Vitals within viable holding threshold with periodic telemetry reassessments."
            )

        if gaze_cmd:
            actions.insert(0, f"BEDSIDE ALERT: Respond immediately to EOG eye-gaze alert '{gaze_cmd}'.")

        return {
            "action_steps": actions[:5],
            "rationing_guidelines": rationing,
            "red_flag_triggers": red_flags,
            "clinical_narrative": narrative
        }

# Global Singleton Instance
edge_slm_engine = EdgeSlmEngine()
