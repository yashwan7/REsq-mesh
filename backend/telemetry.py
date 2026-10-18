"""Optional, privacy-preserving OpenTelemetry setup for the backend.

The application remains usable when the OpenTelemetry dependencies are not
installed or when no collector is running. Export happens asynchronously via
the SDK's batch processors, so telemetry is never on the request critical path.
"""

from __future__ import annotations

import hashlib
import logging
import os
from typing import Any

logger = logging.getLogger("resq_mesh.telemetry")


class _NoopSpan:
    def __enter__(self) -> "_NoopSpan":
        return self

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> None:
        return None

    def set_attribute(self, key: str, value: Any) -> None:
        return None

    def add_event(self, name: str, attributes: dict[str, Any] | None = None) -> None:
        return None

    def record_exception(self, exception: BaseException) -> None:
        return None


class _NoopTracer:
    def start_as_current_span(self, name: str) -> _NoopSpan:
        return _NoopSpan()


class _NoopMetric:
    def add(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None:
        return None

    def record(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None:
        return None


class _NoopMeter:
    def create_counter(self, *args: Any, **kwargs: Any) -> _NoopMetric:
        return _NoopMetric()

    def create_histogram(self, *args: Any, **kwargs: Any) -> _NoopMetric:
        return _NoopMetric()


try:
    from opentelemetry import metrics as _otel_metrics
    from opentelemetry import trace as _otel_trace
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    OTEL_AVAILABLE = True
except ImportError:
    _otel_metrics = None
    _otel_trace = None
    OTLPMetricExporter = None
    OTLPSpanExporter = None
    MeterProvider = None
    PeriodicExportingMetricReader = None
    Resource = None
    TracerProvider = None
    BatchSpanProcessor = None
    OTEL_AVAILABLE = False


def hash_id(value: str) -> str:
    """Return a stable pseudonym for identifiers placed in telemetry."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def get_tracer(name: str) -> Any:
    if _otel_trace is None:
        return _NoopTracer()
    return _otel_trace.get_tracer(name)


def get_current_span() -> Any:
    if _otel_trace is None:
        return _NoopSpan()
    return _otel_trace.get_current_span()


_meter = _otel_metrics.get_meter("resq_mesh") if _otel_metrics else _NoopMeter()
triage_requests = _meter.create_counter(
    "resq.triage.requests", description="Triage requests by evaluation source"
)
triage_fallbacks = _meter.create_counter(
    "resq.triage.fallbacks", description="Times the rule-based engine replaced the LLM"
)
triage_latency = _meter.create_histogram(
    "resq.triage.duration", unit="ms", description="End-to-end triage duration"
)
capsule_checks = _meter.create_counter(
    "resq.capsule.verifications", description="Capsule signature checks by status"
)
failover_transitions = _meter.create_counter(
    "resq.failover.transitions", description="Failover state transitions"
)

_configured = False


def _signal_endpoint(endpoint: str, signal: str) -> str:
    """Accept either an OTLP base URL or a signal-specific URL."""
    suffix = f"/v1/{signal}"
    return endpoint if endpoint.endswith(suffix) else f"{endpoint}{suffix}"


def setup_telemetry(app: Any) -> None:
    """Configure tracing, metrics, and library instrumentation once."""
    global _configured
    if _configured or os.getenv("OTEL_SDK_DISABLED", "false").lower() == "true":
        return
    _configured = True

    if not OTEL_AVAILABLE:
        logger.info("OpenTelemetry dependencies are not installed; telemetry disabled")
        return

    resource = Resource.create(
        {
            "service.name": os.getenv("OTEL_SERVICE_NAME", "resq-mesh-backend"),
            "service.version": "2.0.0",
            "deployment.environment": os.getenv("DEPLOY_ENV", "demo"),
        }
    )

    try:
        tracer_provider = TracerProvider(resource=resource)
        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").rstrip("/")
        if endpoint:
            tracer_provider.add_span_processor(
                BatchSpanProcessor(
                    OTLPSpanExporter(endpoint=_signal_endpoint(endpoint, "traces"))
                )
            )
        _otel_trace.set_tracer_provider(tracer_provider)

        if endpoint:
            metric_reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=_signal_endpoint(endpoint, "metrics")),
                export_interval_millis=10_000,
            )
            _otel_metrics.set_meter_provider(
                MeterProvider(resource=resource, metric_readers=[metric_reader])
            )

        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.instrumentation.logging import LoggingInstrumentor
        from opentelemetry.instrumentation.sqlite3 import SQLite3Instrumentor

        FastAPIInstrumentor.instrument_app(app, excluded_urls=r"api/health")
        HTTPXClientInstrumentor().instrument()
        SQLite3Instrumentor().instrument()
        LoggingInstrumentor().instrument(set_logging_format=True)
    except Exception:
        # Instrumentation must never prevent the service from starting.
        logger.exception("OpenTelemetry setup failed; continuing without telemetry")
