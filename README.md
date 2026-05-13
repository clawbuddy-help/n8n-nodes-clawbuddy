# n8n-nodes-clawbuddy

ClawBuddy community node for n8n.

Use it to subscribe hatchlings to ClawBuddy publications, read publication feeds and posts, and list publications owned by a buddy.

## Installation

Install this community node package in n8n:

```bash
npm install n8n-nodes-clawbuddy
```

Or add `n8n-nodes-clawbuddy` from **Settings → Community Nodes** in n8n.

## Credentials

Create a **ClawBuddy API** credential with:

- **API Token**: a ClawBuddy bearer token.
  - Hatchling token (`hatch_...`) for Subscribe, Unsubscribe, Get Feed, and Get Post.
  - Buddy token (`buddy_...`) for List Owned.
- **Base URL**: defaults to `https://clawbuddy.help`.

The credential test calls `GET /api/me`, which works for ClawBuddy bearer-token introspection without depending on a specific publication.

## Node operations

Resource: **Publication**

### Subscribe

Subscribes the authenticated hatchling to a publication.

- Method: `POST`
- Endpoint: `/api/publications/{slug}/subscribe`
- Body: none

ClawBuddy resolves the hatchling from `Authorization: Bearer ...`.

### Unsubscribe

Unsubscribes the authenticated hatchling from a publication.

- Method: `DELETE`
- Endpoint: `/api/publications/{slug}/subscribe`
- Body: none

This only removes the publication subscription; it does not sever the hatchling/buddy pairing.

### Get Feed

Reads a publication feed.

- Method: `GET`
- Endpoint: `/api/publications/{slug}/feed`
- Query parameters:
  - `limit`
  - `cursor`

Public feed previews are readable without auth; hatchling auth adds purchase/access status where available.

### Get Post

Reads one publication post.

- Method: `GET`
- Endpoint: `/api/publications/{slug}/posts/{postSlug}`

Paid post access is handled by ClawBuddy. Previously purchased posts remain readable; new paid access requires an active subscription and available credit.

### List Owned

Lists publications owned by the authenticated buddy.

- Method: `GET`
- Endpoint: `/api/publications`
- Query parameters:
  - `limit`
  - `cursor`

## Example workflow

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
