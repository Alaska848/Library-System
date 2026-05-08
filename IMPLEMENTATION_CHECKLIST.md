# 🚀 Implementation Checklist - Step by Step

## ✅ What's Already Done

### 1. **Routing Bug Fixed**

- [x] Updated `ProtectedRoute.jsx` to support both `allowedRole` and `allowedRoles`
- [x] Updated `App.js` to use consistent prop names
- **Status**: READY TO USE

### 2. **Firestore Security Rules Created**

- [x] File: `firestore.rules` with role-based access control
- [x] Rules for: books, users, loans, wishlists, reviews, facultyRequests
- **Status**: READY TO DEPLOY
- **Action**: Deploy via Firebase CLI

### 3. **Constants & Enums**

- [x] File: `src/constants/index.js`
- [x] Includes: ROLES, LOAN_STATUS, BOOK_STATUS, ERROR_MESSAGES
- **Status**: READY TO USE
- **Action**: Import and use in components

### 4. **Logger Utility**

- [x] File: `src/utils/logger.js`
- [x] Supports: dev/prod modes, different log levels
- **Status**: READY TO USE

### 5. **Shared Business Logic Hooks**

- [x] File: `src/hooks/useSharedLogic.js`
- [x] Hooks: useUserWishlist, useUserLoans, useCreateLoan, useBooks, useAuthCheck
- **Status**: READY TO USE

### 6. **Backend Auth Middleware**

- [x] File: `Server/middleware/auth.js`
- [x] Includes: verifyToken, verifyRole middleware
- **Status**: NEEDS SETUP (requires Firebase Admin SDK)

### 7. **Signed Upload Endpoint**

- [x] File: `Server/routes/upload.js`
- **Status**: NEEDS INTEGRATION

### 8. **Transaction Examples**

- [x] File: `src/utils/transactions.js`
- [x] Examples: approveLoan, returnBook, rejectLoanRequest
- **Status**: READY TO USE (copy/paste into components)

---

## 📝 TODO - Priority Order

### **🔴 CRITICAL (Do First)**

#### Step 1: Deploy Firestore Rules

```bash
# Terminal at project root
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

**Verify**: Go to Firebase Console → Firestore → Rules tab

---

#### Step 2: Replace console.log with Logger

**Files to update**:

- [x] `src/components/UserProfile.jsx` - Line 1508
- [x] `src/components/admin/BooksM.jsx` - Lines 93, 116, 132, 164
- [x] `src/components/admin/BorrowingLog.jsx` - Lines 303, 900
- [x] `src/components/CreateAccount.jsx` - Line 92
- [x] `src/components/ForgetPassword.jsx` - Lines 24, 38
- [x] `src/components/LibraryHome.jsx` - Line 119

**Pattern**:

```javascript
// ❌ Remove:
console.log("something", data);

// ✅ Replace with:
import logger from "../utils/logger";
logger.log("ComponentName", data);
```

---

#### Step 3: Add Transactions to BorrowingLog

**File**: `src/components/admin/BorrowingLog.jsx`
**Areas to update**:

- Approve loan operation → use `approveLoan()` from `transactions.js`
- Reject operation → use `rejectLoanRequest()`
- Return book → use `returnBook()`
- Suspend user → use `suspendUserAccount()`

**Example Pattern**:

```javascript
// ❌ OLD:
await updateDoc(loanRef, { status: "approved" });
await updateDoc(bookRef, { status: "borrowed" });

// ✅ NEW:
import { approveLoan } from "../utils/transactions";
await approveLoan(loanId, adminUid, bookId);
```

---

### **🟠 HIGH PRIORITY (Do Next)**

#### Step 4: Optimize Firestore Queries

**Files to update**:

- `src/components/Catalog.jsx` - Line 78 (onSnapshot on all loans)
- `src/components/admin/FacultyRequests.jsx` - Query optimization
- `src/components/LibraryHome.jsx` - Query optimization

**Pattern**:

```javascript
// ❌ OLD - fetches ALL loans:
onSnapshot(collection(db, "loans"), (snap) => {
  // 1000s of docs might be loaded
});

// ✅ NEW - fetches only user's loans:
const q = query(
  collection(db, "loans"),
  where("userId", "==", currentUid),
  limit(20),
);
onSnapshot(q, (snap) => {
  // Only relevant docs
});
```

**Specific Changes**:

1. **Catalog.jsx Line 78**: Change to filter by userId
2. **FacultyRequests.jsx**: Add limit and pagination
3. **LibraryHome.jsx**: Add status filter

---

#### Step 5: Add Backend Auth Setup

**File**: `Server/server.js`

```javascript
// Add to server.js
const admin = require("firebase-admin");
const authMiddleware = require("./middleware/auth");
const uploadRoutes = require("./routes/upload");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Use middleware
app.use("/api/auth", authMiddleware.verifyToken);
app.use("/api", uploadRoutes);
```

**Actions**:

- [ ] Download `serviceAccountKey.json` from Firebase Console
- [ ] Add to `.env` or secure location
- [ ] Test upload endpoint with token

---

### **🟡 MEDIUM PRIORITY**

#### Step 6: Use Constants in Components

**Search & Replace Pattern**:

```bash
# Find all hardcoded statuses
"pending" → LOAN_STATUS.PENDING
"approved" → LOAN_STATUS.APPROVED
"borrowed" → LOAN_STATUS.BORROWED
"returned" → LOAN_STATUS.RETURNED
"overdue" → LOAN_STATUS.OVERDUE
"admin" → ROLES.ADMIN
"user" → ROLES.USER
"doctor" → ROLES.DOCTOR
```

**Files to check**:

- [x] All admin components
- [x] Catalog.jsx
- [x] LibraryHome.jsx
- [x] UserProfile.jsx

---

#### Step 7: Replace Repeated Logic with Hooks

**Example**:

```javascript
// ❌ In Catalog.jsx AND LibraryHome.jsx (repeated):
const [wishlist, setWishlist] = useState([]);
useEffect(() => {
  const unsub = onSnapshot(collection(db, "wishlists", userId, "books"), ...);
  return () => unsub();
}, [userId]);

// ✅ Use hook instead:
import { useUserWishlist } from "../hooks/useSharedLogic";
const { wishlist } = useUserWishlist(userId);
```

**Components to refactor**:

- [ ] Catalog.jsx
- [ ] LibraryHome.jsx
- [ ] UserProfile.jsx

---

#### Step 8: Extract UserProfile Components

**File**: `src/components/UserProfile.jsx` (2393 lines - TOO LARGE)

**Structure**:

```
UserProfile.jsx (main wrapper)
├── hooks/useUserProfile.js (data fetching)
├── components/
│   ├── ProfileSettings.jsx (basic info)
│   ├── BorrowedBooks.jsx (loans display)
│   ├── Wishlist.jsx (wishlist display)
│   ├── ReviewsSection.jsx (reviews)
│   └── NotificationsCenter.jsx (notifications)
```

**Process**:

1. Create `src/components/UserProfile/` folder
2. Move sections to separate files
3. Keep main `UserProfile.jsx` as orchestrator
4. Share state via Context or hooks

---

### **🟢 LOW PRIORITY**

#### Step 9: Add Error Boundaries

Create `src/components/ErrorBoundary.jsx`:

```javascript
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary", error);
  }

  render() {
    if (this.state.hasError) {
      return <h1>حدث خطأ ما. يرجى تحديث الصفحة</h1>;
    }
    return this.props.children;
  }
}
```

Wrap main components:

```jsx
<ErrorBoundary>
  <UserProfile />
</ErrorBoundary>
```

---

#### Step 10: Add Input Validation

Create `src/utils/validation.js`:

```javascript
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validateBookData = (book) => {
  if (!book.title || book.title.length < 3) throw new Error("Title too short");
  if (!book.isbn) throw new Error("ISBN required");
  return true;
};
```

---

#### Step 11: Setup Tests

Create `src/__tests__/ProtectedRoute.test.js`:

```javascript
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "../components/ProtectedRoute";

test("blocks access without auth", () => {
  render(
    <ProtectedRoute requireAuth="full">
      <div>Protected</div>
    </ProtectedRoute>,
  );
  expect(screen.queryByText("Protected")).not.toBeInTheDocument();
});
```

---

#### Step 12: Remove Chatbase Script

**File**: `public/index.html` (Lines 42-65)

```html
<!-- ❌ REMOVE this entire script block:
<script>
  (function(){
    if (!window.chatbase || window.chatbase("getState") !== "initialized") {
      ...
    }
  })();
</script>
-->

<!-- ✅ If needed, add proper consent handling later -->
```

---

## 🎯 Quick Implementation Timeline

**Day 1 - Critical**:

- [ ] Deploy Firestore Rules (5 min)
- [ ] Replace console.log (30 min)
- [ ] Add Transactions to BorrowingLog (1 hour)

**Day 2 - High Priority**:

- [ ] Optimize Firestore Queries (1.5 hours)
- [ ] Setup Backend Auth (1 hour)
- [ ] Use Constants everywhere (1 hour)

**Day 3 - Medium Priority**:

- [ ] Extract Hooks (1.5 hours)
- [ ] Split UserProfile (2 hours)

**Day 4 - Low Priority + Testing**:

- [ ] Add Error Boundaries (30 min)
- [ ] Input Validation (1 hour)
- [ ] Basic Tests (1 hour)
- [ ] Cleanup & Review (1 hour)

---

## 🔍 Validation Checklist

After implementing everything:

- [ ] **Security**:
  - [ ] Firestore Rules deployed
  - [ ] No role can access other user's data
  - [ ] sessionStorage changes don't bypass Firestore rules
- [ ] **Performance**:
  - [ ] Firestore read count reduced by 50%+
  - [ ] No memory leaks from listeners
  - [ ] Transactions rollback on errors
- [ ] **Code Quality**:
  - [ ] No console.log in prod code
  - [ ] Constants used everywhere
  - [ ] No code duplication
  - [ ] All Transactions use proper error handling
- [ ] **User Experience**:
  - [ ] No broken routes
  - [ ] Clear error messages
  - [ ] Smooth transitions

---

## 📞 Support Commands

```bash
# Check Firestore Rules syntax
firebase rules:test

# Deploy only rules
firebase deploy --only firestore:rules

# Serve locally for testing
firebase emulators:start

# Check Firestore usage
firebase firestore:describe

# View server logs
firebase functions:log
```

---

## 💡 Need Help?

- **Firestore Rules Issues**: Check Firebase Console → Firestore → Rules
- **Transactions Failing**: Enable debug logging in transactions.js
- **Performance Issues**: Use Firestore monitoring in console
- **Deploy Errors**: Run `firebase login` again and ensure permissions
