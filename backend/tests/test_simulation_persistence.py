"""
Tests for simulation persistence — specifically the serialization contract.

A stored run keeps the full SimulationResult as JSON (JSONB in Postgres).
The /run/{id} endpoint reads that JSON back and returns it as a
SimulationResult, so the result must survive a model_dump -> JSON ->
SimulationResult round-trip without loss. These tests guard that contract
without needing a live database.
"""

import json

from app.schemas.simulation import SimulationResult
from app.services.simulator import BreachSimulator
from app.schemas.simulation import SimulationRequest


def _run() -> SimulationResult:
    nodes = [
        {"id": "user-1", "data": {"node_type": "identity", "properties": {"segment": "corp"}}},
        {"id": "app-1", "data": {"node_type": "application", "properties": {"segment": "corp"}}},
    ]
    edges = [{"id": "e1", "source": "user-1", "target": "app-1",
              "policy": {"action": "allow", "conditions": {}}}]
    sim = BreachSimulator(nodes, edges, [])
    req = SimulationRequest(
        canvas_id="00000000-0000-0000-0000-000000000001",
        scenario="insider_threat",
        source_node_id="user-1",
    )
    return sim.run(req)


def test_result_dump_is_json_serializable():
    """What we store in JSONB must be plain-JSON encodable."""
    result = _run()
    dumped = result.model_dump()
    # Should not raise — JSONB persistence depends on this
    json.dumps(dumped)


def test_result_survives_storage_round_trip():
    """Reading a stored run back must reproduce an equivalent result."""
    original = _run()
    stored = json.loads(json.dumps(original.model_dump()))
    restored = SimulationResult.model_validate(stored)

    assert restored.simulation_id == original.simulation_id
    assert restored.risk_score == original.risk_score
    assert restored.risk_level == original.risk_level
    assert len(restored.attack_path) == len(original.attack_path)
    assert restored.compromised_nodes == original.compromised_nodes
