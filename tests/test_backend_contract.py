from backend.app.service import service


def test_frontend_contract_has_required_sections():
    scan_id = service.latest_scan()["id"]
    assert service.resources(scan_id)
    assert service.findings(scan_id)
    assert service.graph(scan_id)["edges"]
    assert service.attack_paths(scan_id)
    assert service.risk(scan_id)["compositeScore"] > 0
    assert service.recommendations(scan_id)


def test_backend_simulation_reduces_risk():
    scan_id = service.latest_scan()["id"]
    rec_id = service.recommendations(scan_id)[0]["id"]
    result = service.simulate(scan_id, [rec_id])
    assert result["after"] <= result["before"]

