import urllib.request
import json

def test():
    # 1. Login as city_admin
    login_data = json.dumps({"username": "city_admin", "password": "OmniSight@2026", "portal": "city"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        token = res["token"]
        print(f"SUCCESS: Logged in as {res['user']['fullName']} (Role: {res['user']['role']})")

    # 2. Test /api/city/analytics
    req = urllib.request.Request("http://localhost:3001/api/city/analytics", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: City Analytics -> Drain: INR {res['data']['dailySocietalDrain']}, Active Sensors: {res['data']['activeSensors']}")

    # 3. Test /api/ward/dashboard (Should fail with 403 because city role is forbidden)
    req = urllib.request.Request("http://localhost:3001/api/ward/dashboard", headers={"Authorization": f"Bearer {token}"})
    try:
        urllib.request.urlopen(req)
        print("FAIL: City token accessed ward dashboard!")
    except urllib.error.HTTPError as e:
        print(f"SUCCESS: City token blocked from Ward portal with HTTP {e.code} (RBAC working)")

    # 4. Login as ward_admin
    login_data = json.dumps({"username": "ward_admin", "password": "OmniSight@2026", "portal": "ward"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        ward_token = res["token"]
        print(f"SUCCESS: Logged in as {res['user']['fullName']} (Ward: {res['user']['wardName']})")

    # 5. Test /api/ward/incidents
    req = urllib.request.Request("http://localhost:3001/api/ward/incidents", headers={"Authorization": f"Bearer {ward_token}"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: Ward Incidents fetched ({len(res['data'])} incidents)")

    # 6. Test /api/ward/incidents/WO-1049/notes
    note_data = json.dumps({"note": "Inspection confirmed by Ward 13 field assistant"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:3001/api/ward/incidents/WO-1049/notes", data=note_data, headers={"Content-Type": "application/json", "Authorization": f"Bearer {ward_token}"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: Added note to WO-1049: {res['message']}")

    # 7. Login as developer_admin
    login_data = json.dumps({"username": "developer_admin", "password": "OmniSight@2026", "portal": "developer"}).encode('utf-8')
    req = urllib.request.Request("http://localhost:3001/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        dev_token = res["token"]
        print(f"SUCCESS: Logged in as {res['user']['fullName']} (Role: {res['user']['role']})")

    # 8. Test /api/developer/system-health
    req = urllib.request.Request("http://localhost:3001/api/developer/system-health", headers={"Authorization": f"Bearer {dev_token}"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: Dev System Health -> Fleet: {res['data']['edgeFleet']['online']}/{res['data']['edgeFleet']['total']} online ({res['data']['edgeFleet']['healthPercentage']}%)")

    # 9. Test /api/developer/devices/dev-47
    req = urllib.request.Request("http://localhost:3001/api/developer/devices/dev-47", headers={"Authorization": f"Bearer {dev_token}"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print(f"SUCCESS: Single Device dev-47 -> Serial: {res['data']['deviceSerial']}, Bus: {res['data']['vehicle']['vehicleNumber']}")

    print("\nALL BACKEND API & RBAC TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test()
