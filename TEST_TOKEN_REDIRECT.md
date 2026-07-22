# Test Token-Based Redirect

## Steps to test auto-redirect with existing token:

1. **Open DevTools Console** in browser at `http://localhost:5174/`

2. **Paste this to inject a valid token** (or use one from your actual login):
```javascript
// Paste a REAL superadmin JWT token from your backend
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with real token

localStorage.setItem('accessToken', testToken);
localStorage.setItem('refreshToken', testToken);
localStorage.setItem('user', JSON.stringify({
  id: 1,
  username: 'superadmin',
  email: 'admin@test.com',
  first_name: 'Super',
  last_name: 'Admin'
}));
localStorage.setItem('role', 'superadmin');
```

3. **Reload the page** (`F5` or `Cmd+R`). Watch console for these logs:
   - `[AuthContext] Restored from localStorage: ...`
   - `[AuthContext redirect] Has access token ...`
   - `[AuthContext redirect] Navigating to: ...`

4. **Expected result**: Should redirect to `/admin/dashboard`

## Get a Real Token

To test with a REAL superadmin token from your backend:

```bash
# Terminal 1: Start backend
cd backend
python manage.py runserver

# Terminal 2: Get token via curl (replace credentials)
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin_username", "password": "password"}'
```

Copy the `access` token from the response.

## Debug if redirect doesn't work:

Check browser console for these possible issues:
- `[AuthContext] No tokens in localStorage` → token wasn't stored
- `[AuthContext redirect] No access token, skipping redirect` → accessToken missing after restore
- `[AuthContext redirect] Effective role: null` → role not extracted from token or stored

If you see JWT parsing error, the token format might be invalid. Use `https://jwt.io` to validate.

