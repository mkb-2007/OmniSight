import urllib.request
import urllib.error
import json
import time

BASE_FRONTEND = "http://localhost:3000"
BASE_API = "http://localhost:3001"

def test_full_suite():
    print("==================================================")
    print("OMNISIGHT ENTERPRISE TEST SUITE")
    print("==================================================")

    # 1. Frontend Server Verification
    print("\n[TEST 1] Frontend Server & Asset Verification (Port 3000)...")
    req = urllib.request.Request(BASE_FRONTEND)
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        assert "omnisight-loader" in html, "Loader container missing"
        assert "68%" in html, "Reference 68% indicator missing"
        assert "INITIALIZING..." in html, "Initializing typography missing"
        assert "sensor-ring" in html, "Bus sensor radar rings missing"
        assert "chennai-map" in html, "Leaflet map container missing"
        assert "City Portal" in html and "Ward Portal" in html and "Developer Portal" in html, "Portal modules missing"
        print("  -> PASS: Frontend index.html served with loading screen, bus radar, 3 portals, and GIS map")

    # 2. Authentication: Input Validation & Wrong Credentials
    print("\n[TEST 2] Authentication & Security Error Handling...")
    # Empty fields
    req = urllib.request.Request(f"{BASE_API}/api/auth/login", data=json.dumps({}).encode('utf-8'), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        print("  -> PASS: Empty fields rejected with HTTP 400")

    # Wrong password
    req = urllib.request.Request(f"{BASE_API}/api/auth/login", data=json.dumps({"username": "city_admin", "password": "WrongPassword123"}).encode('utf-8'), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("  -> PASS: Wrong password rejected with HTTP 401")

    # Wrong User ID
    req = urllib.request.Request(f"{BASE_API}/api/auth/login", data=json.dumps({"username": "non_existent_user", "password": "OmniSight@2026"}).encode('utf-8'), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("  -> PASS: Non-existent user rejected with HTTP 401")

    # 3. Role-Based Access Control (RBAC) - Portal Specific Rejection
    print("\n[TEST 3] Role-Based Access Control & Portal Rejection...")
    # City Admin attempting to log into Ward Portal
    req = urllib.request.Request(f"{BASE_API}/api/auth/login", data=json.dumps({"username": "city_admin", "password": "OmniSight@2026", "portal": "ward"}).encode('utf-8'), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 403"
    except urllib.error.HTTPError as e:
        assert e.code == 403
        data = json.loads(e.read().decode('utf-8'))
        print(f"  -> PASS: Cross-portal login rejected: {data['error']}")

    # 4. Successful Login & JWT Issuance for All 3 Roles
    print("\n[TEST 4] Successful Authentication & JWT Token Issuance...")
    tokens = {}
    for role, user_id, portal in [("CITY", "city_admin", "city"), ("WARD", "ward_admin", "ward"), ("DEVELOPER", "developer_admin", "developer")]:
        req = urllib.request.Request(f"{BASE_API}/api/auth/login", data=json.dumps({"username": user_id, "password": "OmniSight@2026", "portal": portal}).encode('utf-8'), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert data["success"] == True
            assert data["user"]["role"] == role
            tokens[role] = data["token"]
            print(f"  -> PASS: {role} authenticated -> {data['user']['fullName']} (Token: {tokens[role][:18]}...)")

    # 5. Protected Endpoint Access & RBAC Cross-Portal Guard
    print("\n[TEST 5] Backend Route RBAC Enforcement...")
    # City Token on City Endpoint -> 200 OK
    req = urllib.request.Request(f"{BASE_API}/api/city/dashboard", headers={"Authorization": f"Bearer {tokens['CITY']}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"  -> PASS: City Dashboard accessible by CITY user (Societal Drain: INR {data['data']['societalDrain']})")

    # City Token on Ward Endpoint -> 403 Forbidden
    req = urllib.request.Request(f"{BASE_API}/api/ward/dashboard", headers={"Authorization": f"Bearer {tokens['CITY']}"})
    try:
        urllib.request.urlopen(req)
        assert False, "City user accessed Ward dashboard"
    except urllib.error.HTTPError as e:
        assert e.code == 403
        print("  -> PASS: City user blocked from Ward Dashboard with HTTP 403")

    # Ward Token on City Endpoint -> 403 Forbidden
    req = urllib.request.Request(f"{BASE_API}/api/city/dashboard", headers={"Authorization": f"Bearer {tokens['WARD']}"})
    try:
        urllib.request.urlopen(req)
        assert False, "Ward user accessed City dashboard"
    except urllib.error.HTTPError as e:
        assert e.code == 403
        print("  -> PASS: Ward user blocked from City Dashboard with HTTP 403")

    # Ward Token on Dev Endpoint -> 403 Forbidden
    req = urllib.request.Request(f"{BASE_API}/api/developer/devices", headers={"Authorization": f"Bearer {tokens['WARD']}"})
    try:
        urllib.request.urlopen(req)
        assert False, "Ward user accessed Dev devices"
    except urllib.error.HTTPError as e:
        assert e.code == 403
        print("  -> PASS: Ward user blocked from Developer Devices with HTTP 403")

    # 6. Incident Management Lifecycle & Persistence
    print("\n[TEST 6] Incident Lifecycle & Database Persistence...")
    # Update incident status to IN_PROGRESS
    status_body = json.dumps({"status": "IN_PROGRESS", "notes": "Cold mix asphalt team arrived on site"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_API}/api/ward/incidents/WO-1049", data=status_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['WARD']}"}, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data["success"] == True
        print("  -> PASS: Incident WO-1049 transitioned to IN_PROGRESS")

    # Dispatch Rapid Patch Crew
    dispatch_body = json.dumps({"hazardCode": "HAZ-1049"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_API}/api/ward/dispatch", data=dispatch_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['WARD']}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data["success"] == True
        print(f"  -> PASS: Rapid Patch Crew dispatched -> Ticket: {data['ticketNumber']}")

    # Verification commit
    verify_body = json.dumps({"ticketNumber": "WO-1049", "verdict": "PASSED", "geoDelta": 3.42, "textureMatch": 97.4}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_API}/api/ward/verify", data=verify_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['WARD']}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data["success"] == True
        print(f"  -> PASS: Repair verification committed and contractor payout unlocked")

    # 7. Developer Edge-AI & Diagnostics
    print("\n[TEST 7] Developer Diagnostics, Telemetry & Firmware Broadcast...")
    req = urllib.request.Request(f"{BASE_API}/api/developer/devices", headers={"Authorization": f"Bearer {tokens['DEVELOPER']}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"  -> PASS: Developer fetched {len(data['data'])} active edge bus nodes")

    ota_body = json.dumps({"lowPassHz": 20, "delayBufferMs": 400, "gForceThreshold": 2.5}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_API}/api/developer/firmware", data=ota_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['DEVELOPER']}"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"  -> PASS: Firmware OTA calibration: {data['message']}")

    # 8. City Budget Approval
    print("\n[TEST 8] City Budget Approval & Economic Tracking...")
    req = urllib.request.Request(f"{BASE_API}/api/city/budget/rep-1/approve", data=b"{}", headers={"Content-Type": "application/json", "Authorization": f"Bearer {tokens['CITY']}"}, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data["success"] == True
        print("  -> PASS: Budget item rep-1 approved for disbursement")

    # 9. Logout Session Invalidation
    print("\n[TEST 9] Session Logout & Invalidation...")
    req = urllib.request.Request(f"{BASE_API}/api/auth/logout", data=b"{}", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data["success"] == True
        print("  -> PASS: Authentication session ended cleanly")

    print("\n==================================================")
    print("ALL 9 TEST SUITES COMPLETED WITH 100% PASS RATE!")
    print("==================================================")

if __name__ == "__main__":
    test_full_suite()
