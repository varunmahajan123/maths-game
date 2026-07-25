// Thin fetch wrapper. Identity rides along as x-player-id.

export function getIdentity() {
  try {
    return JSON.parse(localStorage.getItem('galti-id'));
  } catch {
    return null;
  }
}

export function saveIdentity(identity) {
  localStorage.setItem('galti-id', JSON.stringify(identity));
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-player-id': getIdentity()?.id ?? '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `http-${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function createIdentity(name, emoji) {
  const created = await api('/player', { method: 'POST', body: { name, avatar_emoji: emoji } });
  const identity = { id: created.id, name: created.name, emoji: created.avatar_emoji };
  saveIdentity(identity);
  return identity;
}
