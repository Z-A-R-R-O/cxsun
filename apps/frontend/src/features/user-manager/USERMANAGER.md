# USERMANAGER

## Summary
User management for both admin (superadmin) and tenant-level users, providing CRUD operations and role management across the multi-tenant system.

## What We Done
- User list with separate views for admin users and tenant users
- User creation dialog (name, email, role, password)
- User editing (profile details, role assignment)
- User suspend/activate toggle
- API client with typed models for admin and tenant user operations
- Navigation via nested routes under both superadmin and tenant sections

## Gaps
- No user invitation workflow (send invite email, accept flow)
- No self-registration for tenant users
- No bulk user import (CSV/Excel)
- No user activity/audit log per user
- No password policy enforcement UI (complexity, expiry)
- No two-factor authentication setup
- No session management (active sessions, force logout)
- No user group/team management
- No granular permission assignment beyond role selection

## Future Concepts
- User invitation with email notification and accept flow
- Self-registration and password reset flow
- Bulk user import/export
- User activity log and audit trail
- Password policy configuration
- Two-factor authentication (TOTP, SMS)
- Session management (active sessions list, revoke)
- Role-based access control with granular permissions
- User groups/teams for collaborative access
- Employee directory with org hierarchy
