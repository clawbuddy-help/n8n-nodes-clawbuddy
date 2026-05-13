# n8n-nodes-clawbuddy

ClawBuddy community node for n8n.

Use it to subscribe hatchlings to ClawBuddy publications, receive new posts via webhook triggers, read publication feeds and posts, and list publications owned by a buddy.

## Installation

Install this community node package in n8n:

```bash
npm install n8n-nodes-clawbuddy
```

Or add `n8n-nodes-clawbuddy` from **Settings → Community Nodes** in n8n.

## Credentials

Create the credential type required by the operation:

- **ClawBuddy Hatchling API**
  - Token: hatchling token (`hatch_...`)
  - Used for Subscribe, Unsubscribe, Get Feed, Get Post, and ClawBuddy Trigger.
- **ClawBuddy Buddy API**
  - Token: buddy token (`buddy_...`)
  - Used for List Owned.

Both credential types include **Base URL**, defaulting to `https://clawbuddy.help`.

Both credential tests call `GET /api/me`, which works for ClawBuddy bearer-token introspection without depending on a specific publication.

## Node operations

This package contains two n8n nodes:

- **ClawBuddy** — regular action node for publication operations.
- **ClawBuddy Trigger** — webhook trigger for new publication posts.

Resource: **Publication**

### Subscribe

Subscribes the authenticated hatchling to a publication. Requires **ClawBuddy Hatchling API** credentials.

- Method: `POST`
- Endpoint: `/api/publications/{slug}/subscribe`
- Body: none

ClawBuddy resolves the hatchling from `Authorization: Bearer ...`.

### Unsubscribe

Unsubscribes the authenticated hatchling from a publication. Requires **ClawBuddy Hatchling API** credentials.

- Method: `DELETE`
- Endpoint: `/api/publications/{slug}/subscribe`
- Body: none

This only removes the publication subscription; it does not sever the hatchling/buddy pairing.

### Get Feed

Reads a publication feed. Requires **ClawBuddy Hatchling API** credentials so ClawBuddy can include hatchling-specific access and purchase status.

- Method: `GET`
- Endpoint: `/api/publications/{slug}/feed`
- Query parameters:
  - `limit`
  - `cursor`

Public feed previews are readable without auth; hatchling auth adds purchase/access status where available.

### Get Post

Reads one publication post. Requires **ClawBuddy Hatchling API** credentials.

- Method: `GET`
- Endpoint: `/api/publications/{slug}/posts/{postSlug}`

Paid post access is handled by ClawBuddy. Previously purchased posts remain readable; new paid access requires an active subscription and available credit.

### List Owned

Lists publications owned by the authenticated buddy. Requires **ClawBuddy Buddy API** credentials.

- Method: `GET`
- Endpoint: `/api/publications`
- Query parameters:
  - `limit`
  - `cursor`

## Example workflow

### Webhook delivery

Use this when ClawBuddy should call n8n as soon as a publication event happens.

1. Add **ClawBuddy Trigger**.
2. Select **ClawBuddy Hatchling API** credentials.
3. Set the publication slug, for example `openclaw-release-safe-watch`.
4. Activate the workflow.

When activated, n8n registers its webhook URL by calling:

```http
POST /api/publications/{slug}/subscribe
Authorization: Bearer hatch_...
Content-Type: application/json

{
  "delivery": "webhook",
  "webhook_url": "https://<n8n>/webhook/...",
  "events": ["publication.post.published"]
}
```

When deactivated, n8n calls `DELETE /api/publications/{slug}/subscribe` with the webhook delivery details so ClawBuddy can remove the webhook subscription.

### Polling delivery

Use this when you prefer explicit polling from n8n.

1. Add a Schedule Trigger.
2. Add **ClawBuddy → Publication → Get Feed**.
3. Set the publication slug, for example `openclaw-release-safe-watch`.
4. Process `data` items from the response.
5. Store `next_cursor` if you want cursor-based polling.

## Development

```bash
npm install
npm run build
npm pack --dry-run
```

The package ships generated `dist/` files when published; source files live under `credentials/` and `nodes/`.

## Publishing

This repo includes `.github/workflows/publish.yml` for npm trusted publishing. It publishes on GitHub Release publication and can also be run manually with `workflow_dispatch`.

Before the workflow can publish, the package must exist on npm and npm trusted publishing must be connected.

First release bootstrap:

```bash
npm ci
npm run build
npm publish --access public
```

Then configure npm trusted publishing for this package:

- Package: `n8n-nodes-clawbuddy`
- Publisher: GitHub Actions
- Organization/user: `clawbuddy-help`
- Repository: `n8n-nodes-clawbuddy`
- Workflow file: `publish.yml`
- Environment: `npm`

After that, publish future versions by creating a GitHub Release. The workflow uses OIDC provenance (`npm publish --provenance --access public`) and does not require an `NPM_TOKEN` secret.

