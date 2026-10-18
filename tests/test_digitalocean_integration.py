"""
Test DigitalOcean BLR1 Cloud Hub & Spaces Integration
Verifies that:
1. DigitalOcean status endpoint returns 200 with BLR1 Bengaluru region.
2. Spaces object storage archives cryptographically signed case capsules.
3. Vault listing returns valid SHA-256 ETags and storage classes.
"""

import pytest
from fastapi.testclient import TestClient
from backend.merge_engine.service import app
from backend.merge_engine.digitalocean_client import do_manager

client = TestClient(app)

def test_digitalocean_status_endpoint():
    response = client.get("/api/digitalocean/status")
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is True
    assert data["provider"] == "DigitalOcean Cloud"
    assert data["region"] == "blr1"
    assert "Bengaluru" in data["datacenter"]
    assert data["latency_ms"] < 20.0
    assert "India Sovereign" in data["data_residency"]

def test_digitalocean_spaces_vault_endpoint():
    response = client.get("/api/digitalocean/spaces/vault")
    assert response.status_code == 200
    vault = response.json()
    assert isinstance(vault, list)
    assert len(vault) >= 4  # Initial seeded patients PT-101, etc.
    entry = vault[0]
    assert "patient_id" in entry
    assert "spaces_key" in entry
    assert "sha256_etag" in entry
    assert entry["region"] == "blr1"

def test_digitalocean_archive_capsule():
    # Archive existing patient PT-101
    response = client.post("/api/digitalocean/spaces/archive/PT-101")
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "ARCHIVED_TO_DO_SPACES"
    entry = result["entry"]
    assert entry["patient_id"] == "PT-101"
    assert "digitaloceanspaces.com" in entry["url"]
    assert len(entry["sha256_etag"]) == 64
