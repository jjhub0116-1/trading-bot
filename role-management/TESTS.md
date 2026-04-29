# Role Management Module - Testing Guide

## Running Tests

Before running tests, ensure you have:
1. Node.js installed
2. MongoDB running locally on port 27017 (or set MONGODB_URI in .env)
3. Dependencies installed: `npm install`

### Install Test Dependencies
```bash
cd role-management
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

---

## Test Coverage

### 1. Authentication & Authorization Tests
- ✅ Request without JWT token → 401 Unauthorized
- ✅ Invalid JWT token → 403 Forbidden
- ✅ Valid token with user not in database → 404 User not found

### 2. Create Admin Route (`POST /admin/create-admin`)
- ✅ Unauthorized: No token
- ✅ Unauthorized: Invalid token
- ✅ Forbidden: User is not superadmin
- ✅ Forbidden: Admin trying to create admin
- ✅ Success: Superadmin creates admin with proper limits
- ✅ Verify createdBy field is set correctly

### 3. Create User Route (`POST /admin/create-user`)
- ✅ Unauthorized: No token
- ✅ Forbidden: Non-admin user trying to create user
- ✅ Bad Request: Equity exceeds admin's lot limit
- ✅ Bad Request: Loss limit exceeds admin's limit
- ✅ Success: Admin creates user with valid limits
- ✅ Verify: Admin's equityLotLimit is properly deducted
- ✅ Success: Create multiple users sequentially
- ✅ Bad Request: Insufficient equity to create another user

### 4. Update User Route (`PUT /admin/users/:userId`)
- ✅ Unauthorized: No token
- ✅ Forbidden: Non-admin trying to update user
- ✅ Not Found: User not created by requesting admin
- ✅ Success: Update user's lossLimit
- ✅ Success: Update user's equity within limits
- ✅ Bad Request: Insufficient equity to increase user's equity
- ✅ Success: Decrease user's equity (frees up resources)
- ✅ Success: Update multiple properties simultaneously

### 5. Integration Tests
- ✅ Complete workflow: Superadmin → Create Admins → Admin creates Users
- ✅ Verify resource allocation flows correctly
- ✅ Verify limits are enforced at each level

---

## Expected Test Results

All tests should pass with the following outcomes:

```
✓ POST /admin/create-admin
  ✓ Should fail - No token provided
  ✓ Should fail - Invalid token
  ✓ Should create superadmin (test setup)
  ✓ Should fail - Non-superadmin trying to create admin
  ✓ Should successfully create admin with valid superadmin token

✓ POST /admin/create-user
  ✓ Should fail - No token provided
  ✓ Should fail - Non-admin trying to create user
  ✓ Should fail - Equity exceeds admin lot limit
  ✓ Should fail - Loss limit exceeds admin loss limit
  ✓ Should successfully create user and deduct from admin limit
  ✓ Should successfully create another user
  ✓ Should fail - Insufficient equity to create another user

✓ PUT /admin/users/:userId
  ✓ Should fail - No token provided
  ✓ Should fail - Non-admin trying to update user
  ✓ Should fail - Updating user not created by admin
  ✓ Should successfully update user lossLimit
  ✓ Should successfully update user equity within limits
  ✓ Should fail - Insufficient equity to increase user equity
  ✓ Should successfully decrease user equity (frees up admin resources)
  ✓ Should successfully update multiple user properties

✓ Integration Tests
  ✓ Complete workflow: Superadmin creates Admin, Admin creates Users
```

---

## Manual Testing with cURL

If tests fail or you want to manually verify, use these cURL commands:

### 1. Create Superadmin (Direct Database)
First, create a superadmin in MongoDB manually or use a script.

### 2. Get Superadmin Token
```bash
# Assuming you have a login endpoint or generate token manually
SUPERADMIN_TOKEN="<your_jwt_token>"
```

### 3. Create Admin
```bash
curl -X POST http://localhost:3000/admin/create-admin \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Admin John",
    "email": "admin.john@example.com",
    "password": "securePassword123",
    "equityLotLimit": 500000,
    "lossLimit": 50000
  }'
```

### 4. Create User
```bash
ADMIN_TOKEN="<admin_jwt_token>"

curl -X POST http://localhost:3000/admin/create-user \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Trader Alice",
    "email": "alice@example.com",
    "password": "traderPass456",
    "equity": 50000,
    "lossLimit": 5000
  }'
```

### 5. Update User
```bash
USER_ID="<user_mongodb_id>"

curl -X PUT http://localhost:3000/admin/users/$USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equity": 75000,
    "lossLimit": 7500
  }'
```

---

## Troubleshooting

### Tests fail with "Cannot connect to MongoDB"
- Ensure MongoDB is running: `mongod`
- Or set `MONGODB_URI` in `.env` file

### Tests fail with "JWT_SECRET env var is required"
- Create a `.env` file in role-management directory
- Add: `JWT_SECRET=your_test_secret_key`

### Tests timeout
- Increase Jest timeout in test file or add: `jest.setTimeout(30000);`

---

## Performance Notes

- All tests should complete in < 5 seconds
- Database connections are properly cleaned up after tests
- No data persists after test suite completes

