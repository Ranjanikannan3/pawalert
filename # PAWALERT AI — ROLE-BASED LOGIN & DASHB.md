# PAWALERT AI — ROLE-BASED LOGIN & DASHBOARD IMPLEMENTATION

You are working on the existing **PawAlert AI** full-stack application.

Implement a professional authentication and role-based access system.

## IMPORTANT

Do NOT rebuild the entire existing PawAlert AI application.

Do NOT remove existing functionality.

Inspect the current project structure and integrate this feature into the existing application.

The application must have ONE professional login page where the user first selects their role and then logs in.

Supported roles:

1. 👤 Citizen / User
2. 🐾 NGO / Veterinary Volunteer
3. 🏛️ Authority
4. 🚗 Driver
5. ⚙️ Admin

---

# 1. LOGIN PAGE

Create a beautiful, modern PawAlert AI login page.

The page should have:

### Left side

PawAlert AI branding:

🐾 PawAlert AI

Tagline:

> "Prevent accidents before they happen. Rescue lives when they do."

Short description:

> "An AI and GIS-powered platform for street animal accident reporting, hotspot detection, driver safety alerts, and rescue coordination."

Use an attractive animal/civic-tech visual design.

### Right side

Login card.

At the top:

**Welcome Back**

**Sign in to PawAlert AI**

---

# 2. ROLE SELECTION

Before the login fields, display role-selection cards/buttons.

The user must select one role.

Display:

### 👤 Citizen

"Report animal accidents and track rescue requests."

### 🐾 NGO / Veterinary

"Manage rescue requests and coordinate animal rescue."

### 🏛️ Authority

"Monitor accident reports and manage accident hotspots."

### 🚗 Driver

"Receive alerts when approaching animal accident hotspots."

### ⚙️ Admin

"Manage users, reports, hotspots and the platform."

Only ONE role can be selected at a time.

The selected role should have a clear visual active state.

Example:

```text
┌─────────────────────────────┐
│ 👤 Citizen                  │
│ Report accidents            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🐾 NGO / Veterinary         │
│ Manage rescue requests      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🏛️ Authority               │
│ Monitor accident hotspots   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🚗 Driver                   │
│ Get safety alerts           │
└─────────────────────────────┘
```

On mobile, make these responsive.

---

# 3. LOGIN FORM

After role selection display:

Email

Password

Remember me

Forgot password?

Login button

Also provide:

"Don't have an account? Register"

The login button should be disabled until:

* A role is selected
* Email is entered
* Password is entered

---

# 4. ROLE-SPECIFIC LOGIN

The selected role must be sent to the backend during login.

Example:

```json
{
  "email": "user@example.com",
  "password": "password",
  "role": "citizen"
}
```

Backend must verify:

1. User exists
2. Password is correct
3. User's actual role matches the selected role

If the user selects:

Authority

but the account is registered as:

Citizen

DO NOT allow login.

Show:

> "This account is not registered as an Authority account."

Do not simply trust the role selected by the frontend.

The backend must verify the user's actual role.

---

# 5. AUTHENTICATION

Use:

* JWT
* bcrypt
* HTTP-only cookies if the existing architecture supports them
* Otherwise secure token handling consistent with the current project

Never store plaintext passwords.

Create proper authentication middleware.

Example:

```text
authenticateUser()
authorizeRole()
```

---

# 6. ROLE-BASED ROUTING

This is the MOST IMPORTANT requirement.

After successful login, redirect the user ONLY to the dashboard belonging to the selected/verified role.

### Citizen login

Redirect to:

```text
/citizen/dashboard
```

Citizen should ONLY see Citizen pages.

---

### NGO login

Redirect to:

```text
/ngo/dashboard
```

NGO should ONLY see NGO pages.

---

### Authority login

Redirect to:

```text
/authority/dashboard
```

Authority should ONLY see Authority pages.

---

### Driver login

Redirect to:

```text
/driver/dashboard
```

Driver should ONLY see Driver pages.

---

### Admin login

Redirect to:

```text
/admin/dashboard
```

Admin should ONLY see Admin pages.

---

# 7. STRICT ROLE PROTECTION

Do NOT only hide navigation buttons.

Actually protect the routes.

For example:

A Citizen must NOT be able to manually type:

```text
/authority/dashboard
```

into the browser.

If a Citizen attempts to access an Authority route:

Redirect them to:

```text
/citizen/dashboard
```

and display:

> "You do not have permission to access this page."

Similarly:

NGO → cannot access Authority pages.

Authority → cannot access NGO management pages.

Driver → cannot access Authority pages.

Citizen → cannot access Admin pages.

---

# 8. FRONTEND ROUTE STRUCTURE

Use React Router.

Recommended structure:

```text
/
├── login
├── register
│
├── citizen
│   ├── dashboard
│   ├── report
│   ├── reports
│   ├── hotspots
│   ├── notifications
│   └── profile
│
├── ngo
│   ├── dashboard
│   ├── rescue-requests
│   ├── active-rescues
│   ├── completed-rescues
│   └── profile
│
├── authority
│   ├── dashboard
│   ├── reports
│   ├── hotspots
│   ├── analytics
│   ├── actions
│   └── profile
│
├── driver
│   ├── dashboard
│   ├── safety-map
│   ├── alerts
│   └── profile
│
└── admin
    ├── dashboard
    ├── users
    ├── reports
    ├── hotspots
    └── settings
```

---

# 9. ROLE-SPECIFIC SIDEBARS

Each role must have its OWN navigation.

## CITIZEN SIDEBAR

🐾 PawAlert AI

* Dashboard
* Report Accident
* My Reports
* Nearby Hotspots
* Notifications
* Profile
* Logout

---

## NGO SIDEBAR

🐾 PawAlert AI

* Dashboard
* Rescue Requests
* Active Rescues
* Completed Rescues
* Rescue Map
* Notifications
* Profile
* Logout

---

## AUTHORITY SIDEBAR

🐾 PawAlert AI

* Dashboard
* Accident Reports
* Hotspot Map
* Hotspot Analytics
* Authority Actions
* Reports
* Notifications
* Profile
* Logout

---

## DRIVER SIDEBAR

🐾 PawAlert AI

* Dashboard
* Live Safety Map
* Nearby Hotspots
* Alerts
* Alert History
* Profile
* Logout

---

## ADMIN SIDEBAR

🐾 PawAlert AI

* Dashboard
* Users
* Accident Reports
* Hotspots
* Rescue Requests
* Analytics
* Settings
* Logout

---

# 10. DASHBOARD ISOLATION

This requirement is extremely important.

When a user logs in as:

### Citizen

Show ONLY:

```text
Citizen Dashboard
Citizen Sidebar
Citizen Features
```

Do NOT show:

* Authority analytics
* NGO rescue management
* Admin user management
* Driver management

---

When a user logs in as:

### NGO

Show ONLY:

```text
NGO Dashboard
NGO Sidebar
NGO Features
```

Do NOT show:

* Citizen report creation
* Authority controls
* Admin controls

---

When a user logs in as:

### Authority

Show ONLY:

```text
Authority Dashboard
Authority Sidebar
Authority Features
```

Do NOT show:

* Admin user management
* NGO rescue controls
* Citizen-only reporting interface

---

When a user logs in as:

### Driver

Show ONLY:

```text
Driver Dashboard
Driver Sidebar
Driver Features
```

Focus on:

* Current location
* Nearby hotspots
* Driver alerts
* Safety map

---

# 11. AUTH CONTEXT

Create an authentication context/provider.

Example:

```text
AuthContext
```

It should expose:

```javascript
user
role
isAuthenticated
login()
logout()
loading()
```

Example:

```javascript
const { user, role, isAuthenticated, logout } = useAuth();
```

---

# 12. ROLE CONSTANTS

Do not scatter role strings throughout the application.

Create a centralized role configuration.

Example:

```javascript
const ROLES = {
  CITIZEN: "citizen",
  NGO: "ngo",
  AUTHORITY: "authority",
  DRIVER: "driver",
  ADMIN: "admin"
};
```

Use these constants throughout the application.

---

# 13. BACKEND USER MODEL

User schema should include:

```text
name
email
passwordHash
role
phone
profileImage
isActive
createdAt
updatedAt
```

Role must be restricted to:

```text
citizen
ngo
authority
driver
admin
```

---

# 14. LOGIN API

Create:

```text
POST /api/auth/login
```

Request:

```json
{
  "email": "...",
  "password": "...",
  "role": "citizen"
}
```

Response:

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "citizen"
  }
}
```

Do not return:

```text
passwordHash
```

---

# 15. CURRENT USER API

Create:

```text
GET /api/auth/me
```

This should return the authenticated user's information.

Use this when the application starts to restore the login session.

---

# 16. LOGOUT

Create:

```text
POST /api/auth/logout
```

Clear authentication state.

After logout:

Redirect to:

```text
/login
```

Prevent access to protected pages after logout.

---

# 17. REGISTER PAGE

Create a registration page.

Fields:

Full Name
Email
Phone
Password
Confirm Password
Role

Role options:

Citizen
NGO / Veterinary
Driver

For security, Authority and Admin accounts should NOT be freely self-created.

Authority/Admin accounts should be created by an Admin or through a controlled process.

---

# 18. DEMO LOGIN ACCOUNTS

Because this is a college project, create demo accounts.

Seed these users in DEMO_MODE:

```text
Citizen
email: citizen@pawalert.demo
password: Citizen@123

NGO
email: ngo@pawalert.demo
password: Ngo@123

Authority
email: authority@pawalert.demo
password: Authority@123

Driver
email: driver@pawalert.demo
password: Driver@123

Admin
email: admin@pawalert.demo
password: Admin@123
```

Hash all passwords using bcrypt.

Do not hardcode plaintext passwords into the database.

---

# 19. LOGIN PAGE DEMO ACCOUNT HELPER

For development/demo mode, optionally provide small buttons:

"Try Citizen Demo"

"Try NGO Demo"

"Try Authority Demo"

"Try Driver Demo"

"Try Admin Demo"

Clicking one should automatically:

* Select the role
* Fill the demo email
* Fill the demo password

Then the user can click Login.

Make this visible only when:

```text
DEMO_MODE=true
```

---

# 20. LOGIN ERROR HANDLING

Display clear errors.

Wrong email/password:

> "Invalid email or password."

Wrong role:

> "This account does not have permission to log in as Authority."

Inactive account:

> "Your account has been deactivated. Please contact the administrator."

Server error:

> "Unable to connect to PawAlert AI. Please try again."

---

# 21. LOADING STATE

When logging in:

Disable the login button.

Display:

> "Signing you in..."

Prevent multiple login requests.

---

# 22. UI DESIGN

The login page should look premium and unique.

Theme:

🐾 Animal welfare
🤖 AI
📍 GIS
🚗 Road safety
🏛️ Civic technology

Use:

* clean typography
* rounded cards
* subtle shadows
* modern icons
* responsive design
* subtle animations
* professional spacing

Do NOT make it look like a generic Bootstrap login page.

---

# 23. ROLE CARD DESIGN

Each role card should have:

Icon
Role name
Short description

When selected:

* Highlight card
* Show checkmark
* Change border
* Slight elevation
* Update login heading

For example:

If Authority is selected:

```text
Authority Login
Sign in to monitor accident reports and hotspots.
```

If NGO is selected:

```text
NGO / Veterinary Login
Sign in to coordinate animal rescue operations.
```

If Driver is selected:

```text
Driver Login
Sign in to receive animal accident hotspot alerts.
```

---

# 24. ROLE-SPECIFIC LOGIN HEADING

Dynamically update the login panel.

Citizen:

"Welcome, Citizen"

NGO:

"Welcome, Rescue Partner"

Authority:

"Welcome, Authority"

Driver:

"Welcome, Driver"

Admin:

"Welcome, Administrator"

---

# 25. SECURITY REQUIREMENTS

Implement:

* bcrypt password hashing
* JWT authentication
* protected API routes
* role-based middleware
* input validation
* rate limiting on login
* secure cookies where appropriate
* CORS configuration
* no password exposure
* no sensitive credentials in frontend code

---

# 26. ROLE MIDDLEWARE

Create middleware such as:

```javascript
authenticate
authorizeRoles
```

Example:

```javascript
router.get(
  "/authority/reports",
  authenticate,
  authorizeRoles("authority", "admin"),
  getReports
);
```

NGO APIs should be restricted to NGO/admin where appropriate.

Driver APIs should be restricted to driver.

Citizen report APIs should be restricted to citizen.

---

# 27. IMPORTANT — BACKEND SECURITY

Do NOT rely on:

```javascript
if (frontendRole === "authority")
```

for security.

The backend must determine the user's role from the authenticated JWT/session and database.

Frontend role selection is ONLY for choosing which type of account the user intends to log in with.

---

# 28. AUTOMATIC REDIRECT

After successful login:

```text
citizen → /citizen/dashboard

ngo → /ngo/dashboard

authority → /authority/dashboard

driver → /driver/dashboard

admin → /admin/dashboard
```

Create a centralized function:

```javascript
getDashboardRoute(role)
```

Do not duplicate redirect logic across components.

---

# 29. PROTECTED ROUTE COMPONENT

Create:

```text
ProtectedRoute
```

It should support:

```jsx
<ProtectedRoute allowedRoles={["authority"]}>
    <AuthorityDashboard />
</ProtectedRoute>
```

If unauthorized:

Redirect to the correct dashboard.

---

# 30. EXISTING PAWALERT FEATURES

Integrate this authentication system with the existing PawAlert AI modules.

After login:

Citizen:
→ Submit accident
→ AI identifies animal
→ Save report
→ Track report

NGO:
→ Receive rescue requests
→ Accept rescue
→ Update status

Authority:
→ View reports
→ Analyze hotspots
→ View GIS map
→ Create authority actions

Driver:
→ GPS
→ Detect nearby hotspots
→ Receive alerts

Admin:
→ Manage platform

Do NOT break these existing features.

---

# 31. FINAL TESTING

After implementation, test ALL roles.

### Test 1

Login as Citizen.

Expected:

```text
/citizen/dashboard
```

Only Citizen navigation visible.

---

### Test 2

Login as NGO.

Expected:

```text
/ngo/dashboard
```

Only NGO navigation visible.

---

### Test 3

Login as Authority.

Expected:

```text
/authority/dashboard
```

Only Authority navigation visible.

---

### Test 4

Login as Driver.

Expected:

```text
/driver/dashboard
```

Only Driver navigation visible.

---

### Test 5

Login as Admin.

Expected:

```text
/admin/dashboard
```

Only Admin navigation visible.

---

### Test 6

Login as Citizen and manually enter:

```text
/authority/dashboard
```

Expected:

Access denied.

Redirect to:

```text
/citizen/dashboard
```

---

### Test 7

Logout.

Expected:

Redirect to:

```text
/login
```

Then manually attempt to access:

```text
/citizen/dashboard
```

Expected:

Redirect to login.

---

# 32. FINAL REQUIREMENT

The final experience should be:

```text
                 PAWALERT AI
                      ↓
                  LOGIN PAGE
                      ↓
              SELECT YOUR ROLE
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     CITIZEN         NGO        AUTHORITY
        ↓             ↓             ↓
   Own Dashboard  Rescue UI    GIS/Analytics
        │             │             │
        └─────────────┼─────────────┘
                      │
                    DRIVER
                      ↓
                 Safety Alerts
```

Every role must have a completely separate dashboard experience.

The user must NEVER see pages or navigation belonging to another role.

Implement this feature into the existing PawAlert AI project, preserve all working functionality, test every role, and fix any errors before finishing.

After implementation, provide a concise summary of:

1. Files created/modified
2. Authentication flow
3. Role-based routing
4. Backend authorization
5. Demo accounts
6. How to run and test the application
fix from thr scratch add database to store the information anfrom the citizen immediate reflect to other dashboard,,,add GIS technology and live GPS gor both citizen and driver dashboard ..ai shouls identify whether the iploaded phpto is animal or not if it is animal tell which animal