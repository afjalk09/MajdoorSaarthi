const BASE = 'http://localhost:5000/api';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  // 1. Employer login
  let r = await api('/auth/login', { method: 'POST', body: { email: 'vinod.fernandes20@employer.com', password: 'Employer@123' } });
  if (!r.json.success) throw new Error('employer login failed: ' + JSON.stringify(r.json));
  const empToken = r.json.data.token;

  // 2. Create a job requiring only "Painter" (worker will NOT match this)
  r = await api('/jobs', {
    method: 'POST', token: empToken,
    body: {
      title: 'Painting job - smoke test',
      description: 'Test that hire works with no skills/skill-mismatch',
      location_text: 'Boisar',
      wage_amount: 500,
      wage_type: 'DAILY',
      duration_days: 3,
      role_requirements: [{ roleName: 'Painter', count: 1 }]
    }
  });
  if (!r.json.success) throw new Error('create job failed: ' + JSON.stringify(r.json));
  const jobId = r.json.data.id;
  const roleId = r.json.data.jobRoles[0].id;
  console.log('JOB created:', jobId, 'role:', roleId, 'status:', r.json.data.status);

  // 3. Worker login (roles = [Cobbler], never matches Painter)
  r = await api('/auth/login', { method: 'POST', body: { email: 'vinod.bharvad25@worker.com', password: 'Worker@123' } });
  if (!r.json.success) throw new Error('worker login failed: ' + JSON.stringify(r.json));
  const workerToken = r.json.data.token;
  const workerUserId = r.json.data.user.id;

  // 4. Worker applies (no explicit role -> auto-pick most remaining capacity)
  r = await api(`/worker/jobs/${jobId}/apply`, { method: 'POST', token: workerToken, body: {} });
  if (!r.json.success) throw new Error('apply failed: ' + JSON.stringify(r.json));
  const applicationId = r.json.data.id;
  console.log('APPLY ok:', applicationId, 'appRole:', r.json.data.jobRoleId);

  // 5. Employer sends OFFER (previously: 400 "Worker doesn't have the skills required for Painter")
  r = await api(`/jobs/${jobId}/hire/${workerUserId}`, { method: 'POST', token: empToken, body: {} });
  if (!r.json.success) throw new Error('HIRE/OFFER FAILED: ' + JSON.stringify(r.json));
  console.log('OFFER sent, app status:', r.json.data.status);

  // 6. Worker accepts offer
  r = await api(`/worker/applications/${applicationId}/accept`, { method: 'POST', token: workerToken });
  if (!r.json.success) throw new Error('accept failed: ' + JSON.stringify(r.json));
  console.log('ACCEPT ok');

  // 7. Verify job flipped IN_PROGRESS and role filledCount=1
  r = await api(`/jobs/${jobId}`, { token: empToken });
  const job = r.json.data;
  console.log('FINAL job.status:', job.status, '| roles:', job.jobRoles.map(x => `${x.roleName}:${x.filledCount}/${x.count}`).join(', '));
}

main().then(() => process.exit(0)).catch(e => { console.error('SMOKE TEST FAILED:', e.message); process.exit(1); });