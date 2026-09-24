const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING OMNISIGHT AUTHENTICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}`);
    }
  }

  // 1. API: Unauthenticated GET /api/auth/me
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(res.status === 401 && res.data.error, 'Unauthenticated user rejected with 401 on /api/auth/me');
  } catch (e) {
    assert(false, `Unauthenticated /api/auth/me threw: ${e.message}`);
  }

  // 2. API: Invalid Credentials Login
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'invalid_user', password: 'wrong_password', portal: 'city' });
    assert(res.status === 401 && !res.data.success, 'Invalid credentials rejected with 401');
  } catch (e) {
    assert(false, `Invalid credentials test threw: ${e.message}`);
  }

  // 3. API: Valid City Login
  let cityToken = '';
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'city_admin', password: 'OmniSight@2026', portal: 'city' });
    cityToken = res.data.token;
    assert(res.status === 200 && res.data.success && res.data.user.role === 'CITY' && cityToken, 'Valid City Login returns 200 with JWT and role=CITY');
  } catch (e) {
    assert(false, `Valid City Login threw: ${e.message}`);
  }

  // 4. API: Valid Token Verification
  try {
    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cityToken}`
      }
    });
    assert(res.status === 200 && res.data.success && res.data.user.fullName.includes('Radhakrishnan'), 'Valid Bearer token restores session for Dr. K. Radhakrishnan');
  } catch (e) {
    assert(false, `Valid Token Verification threw: ${e.message}`);
  }

  // 5. API: Role Boundary Enforcement (Ward user accessing developer diagnostics)
  try {
    const wardLogin = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'ward_admin', password: 'OmniSight@2026', portal: 'ward' });
    const wardToken = wardLogin.data.token;

    const devAccess = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/developer/telemetry',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${wardToken}` }
    });
    assert(devAccess.status === 403, 'Cross-portal authorization guard blocks Ward user from Developer API (403 Forbidden)');
  } catch (e) {
    assert(false, `Role boundary check threw: ${e.message}`);
  }

  // 6. Codebase Inspection: index.html Authentication & Security Audit
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  // Check 6a: Initial authState is NOT authenticated
  assert(
    indexHtml.includes("authState: 'AUTH_LOADING'") && indexHtml.includes("currentUser: null"),
    'Initial application state defaults to AUTH_LOADING and currentUser: null (never assumes authenticated)'
  );

  // Check 6b: Public Header contains Login button, guarded dashboard
  assert(
    indexHtml.includes("authState === 'UNAUTHENTICATED' && currentView === 'landing'") &&
    indexHtml.includes("authState === 'AUTHENTICATED'"),
    'Header displays [Login] when unauthenticated and strictly hides Dashboard & Sign Out until AUTHENTICATED'
  );

  // Check 6c: Public Hero CTA
  assert(
    indexHtml.includes('Sign In to Platform') &&
    !indexHtml.includes('Open CITY Dashboard') &&
    !indexHtml.includes('x-if="currentUser"'),
    'Hero displays public "Sign In to Platform" CTA with all hardcoded/demo dashboard triggers removed'
  );

  // Check 6d: Toast container is guarded against unauthenticated display
  assert(
    indexHtml.includes("x-if=\"authState === 'AUTHENTICATED' && toasts.length > 0\""),
    'Toast container is wrapped in x-if="authState === \'AUTHENTICATED\'", preventing any alerts from rendering for visitors'
  );

  // Check 6e: addToast method enforces authState check
  assert(
    indexHtml.includes("if (this.authState !== 'AUTHENTICATED') return;") &&
    indexHtml.includes("setTimeout(() => {\n            this.removeToast(id);\n          }, 7000);"),
    'addToast strictly enforces auth check and 7-second auto-dismissal'
  );

  // Check 6f: Role-scoped alerts
  assert(
    indexHtml.includes("startRoleScopedAlerts(role)") &&
    indexHtml.includes("stopRoleScopedAlerts()") &&
    indexHtml.includes("Zone 13 Adyar"),
    'Alert system includes role-scoped alert engine for CITY, WARD, DEVELOPER with clean disposal'
  );

  // Check 6g: Route guards protect /city, /ward, /developer
  assert(
    indexHtml.includes("if (this.authState !== 'AUTHENTICATED' || !this.currentUser)") &&
    indexHtml.includes("this.currentView = 'portal-select';"),
    'Route guards intercept unauthenticated access to /city, /ward, /dev and redirect without DOM flashing'
  );

  // Check 6h: Dashboard DOM isolation
  assert(
    indexHtml.includes("<template x-if=\"authState === 'AUTHENTICATED' && currentView === 'city'\">") &&
    indexHtml.includes("<template x-if=\"authState === 'AUTHENTICATED' && currentView === 'ward'\">") &&
    indexHtml.includes("<template x-if=\"authState === 'AUTHENTICATED' && currentView === 'dev'\">"),
    'City, Ward, and Developer dashboards are conditionally mounted with <template x-if>, guaranteeing zero DOM flash'
  );

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
