import pytest
from backend.merge_engine.models import CaseCapsule, Vitals, EyeGaze
from backend.merge_engine.decision_layer import laya_decision_layer
from backend.merge_engine.slm_engine import edge_slm_engine, AVAILABLE_SLM_MODELS

def test_laya_acute_decision_primitives():
    capsule = CaseCapsule(
        patient_id="PT-ACUTE-1",
        patient_name="Alex Mercer",
        time_to_help=0.25, # 15 minutes
        vitals=Vitals(heart_rate=142, spo2=84, systolic_bp=82, diastolic_bp=50, respiratory_rate=34),
        red_flags=["Arterial hemorrhage", "Tension pneumothorax"],
        eye_gaze=EyeGaze(command="CALL_NURSE", direction="LEFT", blink_count=3)
    )

    out = laya_decision_layer.evaluate(capsule)

    # 1. Verification of latency and model naming
    assert out.latency_ms < 50.0  # Ultra-fast execution
    assert "rule-based decision layer" in out.model
    assert "ModernBERT" not in out.model

    # 2. Choice Primitives
    assert out.triage_choice.selected == "IMMEDIATE_RED"
    assert out.triage_choice.confidence > 0.5
    assert out.protocol_choice.selected == "ACUTE_STABILIZATION"
    assert out.evacuation_urgency.selected == "IMMEDIATE_MEDEVAC"

    # 3. Score Primitives
    assert out.severity_score.value >= 7.0
    assert out.priority_score.value >= 15.0

    # 4. Noul Primitives (Calibrated Yes/No)
    assert out.nouls["requires_immediate_tourniquet"].decision is True
    assert out.nouls["requires_immediate_tourniquet"].probability > 0.8
    assert out.nouls["airway_compromise_risk"].decision is True
    assert out.nouls["fluid_rationing_mandated"].decision is False
    assert out.nouls["escalate_emergency_beacon"].decision is True

def test_laya_pfc_decision_primitives():
    capsule = CaseCapsule(
        patient_id="PT-PFC-2",
        patient_name="Sarah Connor",
        time_to_help=36.0, # 36 hours delay
        vitals=Vitals(heart_rate=88, spo2=94, systolic_bp=110, diastolic_bp=70, respiratory_rate=18),
        red_flags=["Crush injury right lower extremity"],
        medications=[]
    )

    out = laya_decision_layer.evaluate(capsule)

    assert out.protocol_choice.selected == "PROLONGED_FIELD_CARE"
    assert out.nouls["fluid_rationing_mandated"].decision is True
    assert out.nouls["fluid_rationing_mandated"].probability > 0.8
    assert out.nouls["requires_immediate_tourniquet"].decision is False

@pytest.mark.asyncio
async def test_edge_slm_qwen_inference():
    capsule = CaseCapsule(
        patient_id="PT-QWEN",
        patient_name="John Doe",
        time_to_help=0.4,
        vitals=Vitals(heart_rate=130, spo2=86, systolic_bp=90, diastolic_bp=60, respiratory_rate=28),
        red_flags=["Penetrating shrapnel chest wound"]
    )

    edge_slm_engine.set_active_model("qwen2.5-0.5b")
    result = await edge_slm_engine.evaluate_with_decision_layer(capsule)

    assert result.model_id == "Qwen/Qwen2.5-0.5B-Instruct"
    assert result.triage_level == "IMMEDIATE_RED"
    assert result.protocol_mode == "ACUTE_STABILIZATION"
    assert len(result.action_steps) > 0
    assert "Qwen2.5-0.5B-Instruct" in result.clinical_narrative
    assert result.source in ("laya_decision_layer+ollama:qwen2.5-0.5b", "laya_decision_layer+deterministic_template")

@pytest.mark.asyncio
async def test_edge_slm_smollm2_inference():
    capsule = CaseCapsule(
        patient_id="PT-SMOL",
        patient_name="Jane Doe",
        time_to_help=28.0,
        vitals=Vitals(heart_rate=78, spo2=96, systolic_bp=120, diastolic_bp=80, respiratory_rate=16),
        red_flags=[]
    )

    edge_slm_engine.set_active_model("smollm2-360m")
    result = await edge_slm_engine.evaluate_with_decision_layer(capsule)

    assert result.model_id == "HuggingFaceTB/SmolLM2-360M-Instruct"
    assert result.protocol_mode == "PROLONGED_FIELD_CARE"
    assert len(result.rationing_guidelines) > 0
    assert "SmolLM2-360M-Instruct" in result.clinical_narrative
