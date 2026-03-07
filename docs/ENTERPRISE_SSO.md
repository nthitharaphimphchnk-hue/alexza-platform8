# Enterprise SSO (SAML 2.0)

Enterprise SSO allows organizations to log in using their identity provider (IdP): Okta, Azure AD, Google Workspace, or any SAML 2.0–compliant provider.

## Overview

- **Routes**: `GET /auth/saml/login`, `POST /auth/saml/callback`
- **Configuration**: Per-workspace (SAML entry point, issuer, certificate)
- **User provisioning**: New users are created automatically and added to the workspace
- **Security**: SAML response signature is validated using the IdP certificate

## Setup

### 1. Configure SAML in ALEXZA

1. Go to **Settings** → **Enterprise SSO** (`/app/settings/sso`)
2. Select the workspace to configure
3. Enter:
   - **SAML Entry Point**: Your IdP’s SSO URL (e.g. `https://idp.example.com/sso`)
   - **Issuer (Entity ID)**: Your application identifier (e.g. `https://app.alexza.ai/saml`)
   - **IdP Certificate**: The IdP’s X.509 public certificate (PEM format)
4. Save and copy the **SSO Login URL**

### 2. Configure your IdP

In your IdP (Okta, Azure AD, etc.):

1. Create a new SAML application
2. Set **ACS URL** (Assertion Consumer Service) to:  
   `https://<your-domain>/auth/saml/callback`
3. Set **Entity ID** to match the Issuer you configured in ALEXZA
4. Map attributes:
   - **Email**: `email`, `mail`, or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - **Name**: `name`, `displayName`, or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`

### 3. Share the login link

Share the **SSO Login URL** from the settings page with your organization. Users who open it will be redirected to your IdP to sign in.

## User Provisioning

- If the SSO user **does not exist**: A new user is created and added to the workspace as a viewer
- If the user **exists** (by email): The SAML provider is linked and the user is added to the workspace if not already a member

## Security

- **Signature validation**: The SAML response is validated using the IdP certificate. Invalid signatures are rejected.
- **Workspace isolation**: Each workspace has its own SAML configuration. Users authenticate in the context of a specific workspace.
- **State cookie**: A short-lived cookie stores the workspace ID during the login flow to prevent tampering.

## API Reference

### GET /auth/saml/login

Initiates SAML login for a workspace.

**Query parameters:**

| Param        | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| workspaceId | string | Yes      | Workspace ID (MongoDB ObjectId) |
| next        | string | No       | Path to redirect after login   |
| redirect    | string | No       | Full URL to redirect after login |

**Example:**  
`/auth/saml/login?workspaceId=507f1f77bcf86cd799439011&next=/app/dashboard`

### POST /auth/saml/callback

Receives the SAML response from the IdP. Called by the IdP after authentication. Do not call directly.

### GET /api/workspaces/:id/saml

Returns SAML configuration for a workspace. Requires `workspace:manage` permission.

### PATCH /api/workspaces/:id/saml

Updates SAML configuration. Requires `workspace:manage` permission.

**Body:**

```json
{
  "samlEntryPoint": "https://idp.example.com/sso",
  "samlIssuer": "https://app.alexza.ai/saml",
  "samlCertificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
}
```

## Supported IdPs

- **Okta**: Use the SAML 2.0 app template
- **Azure AD**: Use Enterprise Application → Single sign-on → SAML
- **Google Workspace**: Use SAML SSO in the Admin console
- **Other**: Any SAML 2.0–compliant IdP

## Troubleshooting

| Error                    | Cause                                      | Solution                                      |
|--------------------------|--------------------------------------------|-----------------------------------------------|
| `SAML_CONFIG`            | Workspace not found or SAML not configured | Ensure workspace exists and SAML is configured |
| `SAML_STATE_INVALID`     | Session expired or cookie missing         | Retry the login flow from the SSO login URL   |
| `SAML_INCOMPLETE_PROFILE`| IdP did not provide email or name ID      | Map email and name attributes in your IdP    |
| `SAML_ERROR`             | Signature validation or parsing failed    | Verify certificate and ACS URL in IdP         |
