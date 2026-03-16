# DevTrack API Endpoint Documentation

This document lists the implemented API endpoints in the current DevTrack backend.

This file has been checked against the current route, controller, schema, service, and repo layers in the codebase.

All successful responses use this wrapper:

```json
{
  "statusCode": 200,
  "message": "Human-readable message",
  "data": {}
}
```

Notes:

- `data` may be an object, array, `null`, or omitted for endpoints that do not return a payload.
- Protected internal endpoints require a valid session.
- Organization-scoped endpoints depend on the user having an active organization.
- The client dashboard endpoint uses a magic-link token instead of session auth.

---

## Auth

### `POST /api/auth/sign-up`

- Auth: Public
- Params: None
- Query: None

Request body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123"
}
```

Response body:

```json
{
  "statusCode": 201,
  "message": "Account has been created.",
  "data": {
    "user": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": null,
      "emailVerified": false,
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z",
      "role": "TEAM_LEADER"
    }
  }
}
```

### `POST /api/auth/sign-in`

- Auth: Public
- Params: None
- Query: None

Request body:

```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Signed in successfully.",
  "data": {
    "user": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": null,
      "emailVerified": true,
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z",
      "role": "TEAM_LEADER"
    },
    "redirect": false,
    "url": null
  }
}
```

### `POST /api/auth/sign-out`

- Auth: Session usually present
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Signed out successfully.",
  "data": {
    "success": true
  }
}
```

### `GET /api/auth/session`

- Auth: Public, but returns session if logged in
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Session retrieved successfully.",
  "data": {
    "session": {
      "expiresAt": "2026-03-20T10:00:00.000Z",
      "activeOrganizationId": "org-id"
    },
    "user": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": null,
      "emailVerified": true,
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T10:00:00.000Z",
      "role": "TEAM_LEADER"
    }
  }
}
```

If no session exists:

```json
{
  "statusCode": 200,
  "message": "Session retrieved successfully.",
  "data": {
    "session": null,
    "user": null
  }
}
```

---

## Organization

### `POST /api/org`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params: None
- Query: None

Request body:

```json
{
  "name": "Acme Team",
  "slug": "acme-team",
  "logo": "https://example.com/logo.png"
}
```

Response body:

```json
{
  "statusCode": 201,
  "message": "Organization has been created.",
  "data": {
    "id": "org-id",
    "name": "Acme Team",
    "slug": "acme-team",
    "logo": "https://example.com/logo.png",
    "members": [
      {
        "id": "member-id",
        "organizationId": "org-id",
        "userId": "user-id",
        "role": "TEAM_LEADER",
        "createdAt": "2026-03-13T10:00:00.000Z"
      }
    ]
  }
}
```

### `GET /api/org`

- Auth: Protected
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Organization has been found.",
  "data": {
    "id": "org-id",
    "name": "Acme Team",
    "slug": "acme-team",
    "logo": null,
    "members": [
      {
        "id": "member-id",
        "organizationId": "org-id",
        "userId": "user-id",
        "role": "TEAM_LEADER",
        "createdAt": "2026-03-13T10:00:00.000Z",
        "user": {
          "id": "user-id",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "image": null
        }
      }
    ],
    "invitations": []
  }
}
```

### `POST /api/org/invite`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params: None
- Query: None

Request body:

```json
{
  "email": "ba@example.com",
  "role": "BUSINESS_ANALYST",
  "resend": false
}
```

Response body:

```json
{
  "statusCode": 201,
  "message": "Member invitation has been created.",
  "data": {
    "id": "invitation-id",
    "organizationId": "org-id",
    "email": "ba@example.com",
    "role": "BUSINESS_ANALYST",
    "status": "PENDING",
    "inviterId": "user-id",
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
}
```

### `GET /api/org/invitations`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Organization invitations have been found.",
  "data": {
    "invitations": [
      {
        "id": "invitation-id",
        "email": "ba@example.com",
        "role": "BUSINESS_ANALYST",
        "status": "PENDING",
        "inviterId": "user-id",
        "expiresAt": "2026-03-20T10:00:00.000Z",
        "createdAt": "2026-03-13T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### `GET /api/org/invitations/me`

- Auth: Protected
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "User invitations have been found.",
  "data": {
    "invitations": [
      {
        "id": "invitation-id",
        "email": "ba@example.com",
        "role": "BUSINESS_ANALYST",
        "status": "PENDING",
        "inviterId": "user-id",
        "expiresAt": "2026-03-20T10:00:00.000Z",
        "createdAt": "2026-03-13T10:00:00.000Z",
        "organizationId": "org-id",
        "organizationName": "Acme Team"
      }
    ],
    "total": 1
  }
}
```

### `POST /api/org/invitations/:id/accept`

- Auth: Protected
- Params:

```json
{
  "id": "invitation-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Invitation has been accepted.",
  "data": {
    "id": "member-id",
    "organizationId": "org-id",
    "userId": "user-id",
    "role": "BUSINESS_ANALYST",
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
}
```

### `POST /api/org/invitations/:id/reject`

- Auth: Protected
- Params:

```json
{
  "id": "invitation-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Invitation has been rejected.",
  "data": {
    "id": "invitation-id",
    "email": "ba@example.com",
    "role": "BUSINESS_ANALYST",
    "status": "REJECTED",
    "inviterId": "user-id",
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
}
```

### `POST /api/org/invitations/:id/cancel`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "invitation-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Invitation has been canceled.",
  "data": {
    "id": "invitation-id",
    "email": "ba@example.com",
    "role": "BUSINESS_ANALYST",
    "status": "CANCELED",
    "inviterId": "user-id",
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "organizationId": "org-id"
  }
}
```

### `GET /api/org/members`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Organization members have been found.",
  "data": {
    "members": [
      {
        "id": "member-id",
        "organizationId": "org-id",
        "userId": "user-id",
        "role": "TEAM_LEADER",
        "createdAt": "2026-03-13T10:00:00.000Z",
        "user": {
          "id": "user-id",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "image": null
        }
      }
    ],
    "total": 1
  }
}
```

### `PATCH /api/org/members/:id`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "member-id"
}
```

- Query: None

Request body:

```json
{
  "role": "QUALITY_ASSURANCE"
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Member role has been updated.",
  "data": {
    "id": "member-id",
    "organizationId": "org-id",
    "userId": "user-id",
    "role": "QUALITY_ASSURANCE",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "user": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": null
    }
  }
}
```

### `DELETE /api/org/members/:id`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "member-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Member has been removed.",
  "data": {
    "id": "member-id",
    "organizationId": "org-id",
    "userId": "user-id",
    "role": "QUALITY_ASSURANCE",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "user": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": null
    }
  }
}
```

---

## Projects

### `GET /api/projects`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`, `QUALITY_ASSURANCE`, `DEVELOPER`
- Params: None
- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Projects has been found.",
  "data": [
    {
      "id": "project-id",
      "name": "Website Revamp",
      "clientName": "Acme Client",
      "clientEmail": "client@example.com",
      "notionDatabaseId": "notion-db-id",
      "statusMapping": {
        "Done": "RELEASED"
      },
      "syncInterval": 15,
      "lastSyncedAt": "2026-03-13T11:00:00.000Z",
      "organizationId": "org-id",
      "createdById": "user-id",
      "createdAt": "2026-03-13T10:00:00.000Z",
      "updatedAt": "2026-03-13T11:00:00.000Z",
      "clientAccess": {
        "id": "client-access-id",
        "projectId": "project-id",
        "lastViewedAt": "2026-03-13T12:00:00.000Z",
        "createdAt": "2026-03-13T10:00:00.000Z"
      },
      "features": [],
      "_count": {
        "tickets": 0
      }
    }
  ]
}
```

### `GET /api/projects/:id`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`, `QUALITY_ASSURANCE`, `DEVELOPER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Project #project-id has been found.",
  "data": {
    "id": "project-id",
    "name": "Website Revamp",
    "clientName": "Acme Client",
    "clientEmail": "client@example.com",
    "notionDatabaseId": "notion-db-id",
    "statusMapping": {
      "In QA": "APPROVED"
    },
    "syncInterval": 15,
    "lastSyncedAt": "2026-03-13T11:00:00.000Z",
    "organizationId": "org-id",
    "createdById": "user-id",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T11:00:00.000Z",
    "clientAccess": {
      "id": "client-access-id",
      "projectId": "project-id",
      "lastViewedAt": "2026-03-13T12:00:00.000Z",
      "createdAt": "2026-03-13T10:00:00.000Z"
    },
    "features": [
      {
        "id": "feature-id",
        "name": "Client Portal",
        "order": 0,
        "projectId": "project-id",
        "createdAt": "2026-03-13T10:30:00.000Z",
        "updatedAt": "2026-03-13T10:30:00.000Z"
      }
    ],
    "_count": {
      "tickets": 12
    }
  }
}
```

### `POST /api/projects`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params: None
- Query: None

Request body:

```json
{
  "name": "Website Revamp",
  "clientName": "Acme Client",
  "clientEmail": "client@example.com"
}
```

Response body:

```json
{
  "statusCode": 201,
  "message": "Project has been created.",
  "data": {
    "id": "project-id",
    "name": "Website Revamp",
    "clientName": "Acme Client",
    "clientEmail": "client@example.com",
    "notionDatabaseId": null,
    "statusMapping": null,
    "syncInterval": null,
    "lastSyncedAt": null,
    "organizationId": "org-id",
    "createdById": "user-id",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "clientAccess": {
      "id": "client-access-id",
      "projectId": "project-id",
      "lastViewedAt": null,
      "createdAt": "2026-03-13T10:00:00.000Z"
    },
    "features": [],
    "_count": {
      "tickets": 0
    }
  }
}
```

### `PATCH /api/projects/:id`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None

Request body:

```json
{
  "name": "Website Revamp Phase 2",
  "clientName": "Acme Client",
  "clientEmail": "client@example.com",
  "syncInterval": 15
}
```

All fields are optional, but at least one meaningful change should be provided.

Current implementation note:

- `syncInterval` is optional and must be an integer between `5` and `60` when provided.
- the current schema allows an empty object, so the API does not currently enforce "at least one field must be provided" for this endpoint.

Response body:

```json
{
  "statusCode": 200,
  "message": "Project has been updated.",
  "data": {
    "id": "project-id",
    "name": "Website Revamp Phase 2",
    "clientName": "Acme Client",
    "clientEmail": "client@example.com",
    "notionDatabaseId": "notion-db-id",
    "statusMapping": {
      "Done": "RELEASED"
    },
    "syncInterval": 15,
    "lastSyncedAt": "2026-03-13T11:00:00.000Z",
    "organizationId": "org-id",
    "createdById": "user-id",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T11:15:00.000Z",
    "clientAccess": {
      "id": "client-access-id",
      "projectId": "project-id",
      "lastViewedAt": "2026-03-13T12:00:00.000Z",
      "createdAt": "2026-03-13T10:00:00.000Z"
    },
    "features": [],
    "_count": {
      "tickets": 12
    }
  }
}
```

### `DELETE /api/projects/:id`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Project has been deleted."
}
```

### `GET /api/projects/:id/client-access`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Client access link has been found.",
  "data": {
    "projectId": "project-id",
    "clientAccessLink": "https://frontend.example.com/client/uuid-token",
    "lastViewedAt": "2026-03-13T12:00:00.000Z"
  }
}
```

---

## Features

### `GET /api/projects/:projectId/features`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`, `QUALITY_ASSURANCE`, `DEVELOPER`
- Params:

```json
{
  "projectId": "project-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Features have been found.",
  "data": [
    {
      "id": "feature-id",
      "name": "Client Portal",
      "order": 0,
      "projectId": "project-id",
      "createdAt": "2026-03-13T10:30:00.000Z",
      "updatedAt": "2026-03-13T10:30:00.000Z",
      "_count": {
        "tickets": 5
      }
    }
  ]
}
```

### `POST /api/projects/:projectId/features`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "projectId": "project-id"
}
```

- Query: None

Request body:

```json
{
  "name": "Client Portal",
  "order": 0
}
```

`order` is optional.

Response body:

```json
{
  "statusCode": 201,
  "message": "Feature has been created.",
  "data": {
    "id": "feature-id",
    "name": "Client Portal",
    "order": 0,
    "projectId": "project-id",
    "createdAt": "2026-03-13T10:30:00.000Z",
    "updatedAt": "2026-03-13T10:30:00.000Z",
    "_count": {
      "tickets": 0
    }
  }
}
```

### `PATCH /api/features/:id`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "id": "feature-id"
}
```

- Query: None

Request body:

```json
{
  "name": "Client Dashboard",
  "order": 1
}
```

Both fields are optional, but at least one must be present.

Response body:

```json
{
  "statusCode": 200,
  "message": "Feature has been updated.",
  "data": {
    "id": "feature-id",
    "name": "Client Dashboard",
    "order": 1,
    "projectId": "project-id",
    "createdAt": "2026-03-13T10:30:00.000Z",
    "updatedAt": "2026-03-13T10:45:00.000Z",
    "_count": {
      "tickets": 5
    }
  }
}
```

### `DELETE /api/features/:id`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "id": "feature-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Feature has been deleted."
}
```

---

## Notion Integration

### `POST /api/projects/:id/notion/test`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None

Request body:

```json
{
  "notionToken": "secret_xxx",
  "databaseId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Notion connection has been verified.",
  "data": {
    "projectId": "project-id",
    "notionDatabaseId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "databaseTitle": "DevTrack Tickets",
    "databaseUrl": "https://www.notion.so/...",
    "dataSources": [
      {
        "id": "data-source-id",
        "name": "DevTrack Tickets"
      }
    ]
  }
}
```

### `POST /api/projects/:id/notion/connect`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None

Request body:

```json
{
  "notionToken": "secret_xxx",
  "databaseId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Notion has been connected.",
  "data": {
    "projectId": "project-id",
    "notionDatabaseId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "databaseTitle": "DevTrack Tickets",
    "databaseUrl": "https://www.notion.so/...",
    "dataSources": [
      {
        "id": "data-source-id",
        "name": "DevTrack Tickets"
      }
    ]
  }
}
```

### `GET /api/projects/:id/notion/databases`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Notion databases have been found.",
  "data": [
    {
      "projectId": "project-id",
      "notionDatabaseId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "databaseTitle": "DevTrack Tickets",
      "databaseUrl": "https://www.notion.so/...",
      "dataSources": [
        {
          "id": "data-source-id",
          "name": "DevTrack Tickets"
        }
      ]
    }
  ]
}
```

### `POST /api/projects/:id/notion/mapping`

- Auth: Protected
- Role: `TEAM_LEADER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None

Request body:

```json
{
  "statusMapping": {
    "Backlog": "NOT_STARTED",
    "In Progress": "IN_DEV",
    "In QA": "APPROVED",
    "Done": "RELEASED"
  }
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Notion status mapping has been saved.",
  "data": {
    "projectId": "project-id",
    "statusMapping": {
      "Backlog": "NOT_STARTED",
      "In Progress": "IN_DEV",
      "In QA": "APPROVED",
      "Done": "RELEASED"
    }
  }
}
```

### `POST /api/projects/:id/notion/sync`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "id": "project-id"
}
```

- Query: None
- Request body: None

Response body when newly queued:

```json
{
  "statusCode": 202,
  "message": "Project sync scheduled successfully.",
  "data": {
    "projectId": "project-id",
    "alreadyQueued": false,
    "jobId": "manual-project-sync-project-id"
  }
}
```

Response body when already queued:

```json
{
  "statusCode": 200,
  "message": "Project sync already scheduled.",
  "data": {
    "projectId": "project-id",
    "alreadyQueued": true,
    "jobId": "manual-project-sync-project-id"
  }
}
```

---

## Tickets

### `GET /api/projects/:id/tickets`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`, `QUALITY_ASSURANCE`, `DEVELOPER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query:

```json
{
  "featureId": "feature-id",
  "status": "IN_DEV",
  "unassigned": true,
  "showMissing": false
}
```

All query fields are optional.

Rules:

- `featureId` and `unassigned=true` cannot be used together.
- `showMissing` defaults to `false`.
- `unassigned` and `showMissing` accept boolean query-string values.

Response body:

```json
{
  "statusCode": 200,
  "message": "Tickets have been found.",
  "data": [
    {
      "id": "ticket-id",
      "projectId": "project-id",
      "featureId": "feature-id",
      "notionPageId": "notion-page-id",
      "title": "Build client dashboard",
      "notionStatus": "In Progress",
      "devtrackStatus": "IN_DEV",
      "assigneeName": "Jane Doe",
      "isMissingFromSource": false,
      "missingFromSourceAt": null,
      "syncedAt": "2026-03-13T11:00:00.000Z",
      "createdAt": "2026-03-13T11:00:00.000Z",
      "updatedAt": "2026-03-13T11:00:00.000Z",
      "feature": {
        "id": "feature-id",
        "name": "Client Portal",
        "order": 0
      }
    }
  ]
}
```

### `PATCH /api/tickets/:id/feature`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`
- Params:

```json
{
  "id": "ticket-id"
}
```

- Query: None

Request body to assign:

```json
{
  "featureId": "feature-id"
}
```

Request body to unassign:

```json
{
  "featureId": null
}
```

Response body:

```json
{
  "statusCode": 200,
  "message": "Ticket feature has been updated.",
  "data": {
    "id": "ticket-id",
    "projectId": "project-id",
    "featureId": "feature-id",
    "notionPageId": "notion-page-id",
    "title": "Build client dashboard",
    "notionStatus": "In Progress",
    "devtrackStatus": "IN_DEV",
    "assigneeName": "Jane Doe",
    "isMissingFromSource": false,
    "missingFromSourceAt": null,
    "syncedAt": "2026-03-13T11:00:00.000Z",
    "createdAt": "2026-03-13T11:00:00.000Z",
    "updatedAt": "2026-03-13T11:15:00.000Z",
    "feature": {
      "id": "feature-id",
      "name": "Client Portal",
      "order": 0
    }
  }
}
```

---

## Sync Logs

### `GET /api/projects/:id/sync/logs`

- Auth: Protected
- Role: `TEAM_LEADER`, `BUSINESS_ANALYST`, `QUALITY_ASSURANCE`, `DEVELOPER`
- Params:

```json
{
  "id": "project-id"
}
```

- Query:

```json
{
  "limit": 10
}
```

Query notes:

- `limit` is optional.
- Default is `10`.
- Minimum is `1`.
- Maximum is `50`.

Response body:

```json
{
  "statusCode": 200,
  "message": "Sync logs have been found.",
  "data": [
    {
      "id": "sync-log-id",
      "status": "SUCCESS",
      "ticketsAdded": 3,
      "ticketsUpdated": 7,
      "errorMessage": null,
      "createdAt": "2026-03-13T11:00:00.000Z"
    }
  ]
}
```

---

## Client Dashboard

### `GET /api/client/:token`

- Auth: Public magic-link access
- Params:

```json
{
  "token": "uuid-token"
}
```

- Query: None
- Request body: None

Response body:

```json
{
  "statusCode": 200,
  "message": "Client dashboard has been found.",
  "data": {
    "projectName": "Website Revamp",
    "overallProgress": 50,
    "lastSyncedAt": "2026-03-13T11:00:00.000Z",
    "features": [
      {
        "name": "Client Portal",
        "progress": 75,
        "status": "IN_PROGRESS",
        "totalTickets": 4,
        "completedTickets": 3
      }
    ],
    "recentActivity": [
      {
        "status": "SUCCESS",
        "message": "Project data was synced successfully.",
        "ticketsAdded": 3,
        "ticketsUpdated": 7,
        "happenedAt": "2026-03-13T11:00:00.000Z"
      }
    ]
  }
}
```

Notes:

- the client token param is validated as a UUID
- `recentActivity` currently returns at most the 5 most recent sync events

`features[].status` can be:

- `NO_WORK_LOGGED`
- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`

---

## Validation Summary

### UUID params

These routes require UUID-style identifiers:

- `/api/projects/:id`
- `/api/projects/:id/client-access`
- `/api/projects/:projectId/features`
- `/api/features/:id`
- `/api/projects/:id/notion/*`
- `/api/projects/:id/tickets`
- `/api/tickets/:id/feature`
- `/api/projects/:id/sync/logs`
- `/api/client/:token`

### Non-UUID string params

These params are validated as non-empty strings, but are not currently restricted to UUID format:

- `/api/org/invitations/:id/accept`
- `/api/org/invitations/:id/reject`
- `/api/org/invitations/:id/cancel`
- `/api/org/members/:id`

### Body and query constraints

- `POST /api/auth/sign-up` and `POST /api/auth/sign-in` require passwords with a minimum length of `8`
- `POST /api/org` requires `slug` to be `3-100` characters and match lowercase letters, numbers, and hyphens only
- `PATCH /api/projects/:id` accepts `syncInterval` only in the range `5-60`
- `POST /api/projects/:projectId/features` accepts optional `order`, which must be an integer `>= 0`
- `PATCH /api/features/:id` requires at least one of `name` or `order`
- `POST /api/projects/:id/notion/connect` and `POST /api/projects/:id/notion/test` require a Notion-style identifier for `databaseId`
- `POST /api/projects/:id/notion/mapping` requires at least one `statusMapping` entry
- `GET /api/projects/:id/tickets` rejects `featureId` together with `unassigned=true`
- `GET /api/projects/:id/sync/logs` accepts `limit` from `1` to `50`, defaulting to `10`

### Enum values

The API uses these role values:

- `TEAM_LEADER`
- `BUSINESS_ANALYST`
- `QUALITY_ASSURANCE`
- `DEVELOPER`

Ticket-related enums are validated against the Prisma enums defined in the project, including:

- ticket status values such as `NOT_STARTED`, `IN_DEV`, `APPROVED`, `RELEASED`
- sync log status values such as `SUCCESS`, `FAILED`, `RATE_LIMITED`

---

## Common Error Cases

Typical error situations across the API:

- invalid request body, params, or query
- no active organization selected
- resource not found
- forbidden role access
- invalid Notion token or inaccessible Notion resource
- Notion not connected for the target project
- conflicting ticket filters such as `featureId` plus `unassigned=true`
- invalid client dashboard token
- cross-organization access attempt

Error responses are handled by the global error handler and are not guaranteed to use the same exact payload examples shown above for successful responses.
