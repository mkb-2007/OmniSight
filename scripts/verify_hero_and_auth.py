import urllib.request
import json
import re

def test_hero_and_auth():
    print("=" * 60)
    print("VERIFYING HERO PAGE & UNIFIED AUTHENTICATION")
    print("=" * 60)

    # 1. Fetch Landing Page from Vite Dev Server (port 3000)
    print("\n[STEP 1] Fetching Landing Page from http://localhost:3000...")
    req = urllib.request.Request("http://localhost:3000", headers={"User-Agent": "OmniSightTest/1.0"})
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        assert resp.status == 200, f"Expected HTTP 200, got {resp.status}"
    print("  -> PASS: HTML served successfully (Length: {} bytes)".format(len(html)))

    # 2. Check Branding & Hero Visual Elements
    print("\n[STEP 2] Verifying Branding & Hero Structure...")
    assert "omnisight-header-logo.png" in html, "OmniSight header logo image missing!"
    print("  -> PASS: OmniSight header logo present")

    assert "Safer Roads" in html and "Stronger Cities" in html, "Headline 'Safer Roads, Stronger Cities' missing!"
    print("  -> PASS: Headline 'Safer Roads, Stronger Cities' present")

    assert "Edge-AI powered road monitoring using public transport." in html, "Supporting text missing!"
    print("  -> PASS: Edge-AI infrastructure monitoring supporting text present")

    # 4 Pillars
    pillars = ["Safer Commute", "Data-Driven Decisions", "Lower Maintenance Cost", "Sustainable Cities"]
    for p in pillars:
        assert p in html, f"Pillar '{p}' missing from hero!"
    print("  -> PASS: All 4 value pillars present in hero (Safer Commute, Data-Driven Decisions, Lower Maintenance Cost, Sustainable Cities)")

    # Right side visual & bottom skyline
    assert "hero-bus-visual.jpg" in html, "Hero bus visual missing!"
    assert "hero-skyline.png" in html, "Hero skyline sketch missing!"
    print("  -> PASS: Hero bus visual and landmark skyline present")

    # Confirm NO portal cards in hero
    assert "3 Minimal Cards" not in html, "Found old portal card container!"
    assert "Executive Access" not in html, "Found old City Portal card!"
    assert "Choose Ward & Sign In" not in html, "Found old Ward Portal card!"
    assert "Hardware & AI Diagnostics" not in html, "Found old Developer Portal card!"
    print("  -> PASS: Zero portal cards in hero section (clean & spacious)")

    # Top-right Login Button
    assert 'id="header-login-btn"' in html, "Header login button missing!"
    assert "openUnifiedLogin()" in html, "openUnifiedLogin action missing!"
    print("  -> PASS: Prominent top-right Login button present with openUnifiedLogin()")

    # Unified Login Modal
    assert "Sign In to OmniSight" in html, "Unified Login Modal title missing!"
    assert "fillUnifiedDemo" in html, "Demo quick-fill chips missing!"
    assert "showPassword" in html, "Password show/hide toggle missing!"
    print("  -> PASS: Unified Login Modal present with show/hide password and 1-click demo chips")

    # 3. Test Unified Authentication Backend (port 3001)
    print("\n[STEP 3] Testing Backend Unified Authentication...")
    
    # 3a. City Admin
    data = json.dumps({"username": "city_admin", "password": "OmniSight@2026"}).encode("utf-8")
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        assert res_data["success"] is True
        assert res_data["user"]["role"] == "CITY"
        city_token = res_data["token"]
    print("  -> PASS: city_admin authenticated without portal param -> Role: CITY")

    # 3b. Ward Admin
    data = json.dumps({"username": "ward_admin", "password": "OmniSight@2026"}).encode("utf-8")
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        assert res_data["success"] is True
        assert res_data["user"]["role"] == "WARD"
        assert "Zone 13" in res_data["user"]["wardName"]
        ward_token = res_data["token"]
    print("  -> PASS: ward_admin authenticated without portal param -> Role: WARD (Zone 13 Adyar)")

    # 3c. Developer Admin
    data = json.dumps({"username": "developer_admin", "password": "OmniSight@2026"}).encode("utf-8")
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        assert res_data["success"] is True
        assert res_data["user"]["role"] == "DEVELOPER"
        dev_token = res_data["token"]
    print("  -> PASS: developer_admin authenticated without portal param -> Role: DEVELOPER")

    # 3d. Invalid credentials handling
    data = json.dumps({"username": "city_admin", "password": "WrongPassword123"}).encode("utf-8")
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as resp:
            assert False, "Expected 401 for wrong password!"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        err_res = json.loads(e.read().decode("utf-8"))
        assert err_res["success"] is False
        assert "Invalid" in err_res["error"]
    print("  -> PASS: Invalid credentials correctly rejected with HTTP 401")

    # 4. Role-based Dashboard API Security
    print("\n[STEP 4] Verifying Dashboard API Security & RBAC Enforcement...")
    # City user accesses City Dashboard -> OK
    req = urllib.request.Request("http://localhost:3001/api/city/dashboard", headers={"Authorization": f"Bearer {city_token}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        city_dash = json.loads(resp.read().decode("utf-8"))
        assert city_dash["success"] is True
    print("  -> PASS: CITY token granted access to City Dashboard")

    # City user blocked from Ward Dashboard -> 403 Forbidden
    req = urllib.request.Request("http://localhost:3001/api/ward/dashboard", headers={"Authorization": f"Bearer {city_token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            assert False, "City user should be blocked from Ward Dashboard!"
    except urllib.error.HTTPError as e:
        assert e.code == 403
    print("  -> PASS: CITY token blocked from Ward Dashboard (HTTP 403 Forbidden)")

    # Ward user accesses Ward Dashboard -> OK
    req = urllib.request.Request("http://localhost:3001/api/ward/dashboard", headers={"Authorization": f"Bearer {ward_token}"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
    print("  -> PASS: WARD token granted access to Ward Dashboard")

    # Ward user blocked from City Dashboard -> 403 Forbidden
    req = urllib.request.Request("http://localhost:3001/api/city/dashboard", headers={"Authorization": f"Bearer {ward_token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            assert False, "Ward user should be blocked from City Dashboard!"
    except urllib.error.HTTPError as e:
        assert e.code == 403
    print("  -> PASS: WARD token blocked from City Dashboard (HTTP 403 Forbidden)")

    print("\n" + "=" * 60)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)!")
    print("=" * 60)

if __name__ == "__main__":
    test_hero_and_auth()
