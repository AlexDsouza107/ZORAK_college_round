export const USERS = {
  alex: { id: 'alex', name: 'Alex D\'Souza', role: 'admin', color: '#7c5cff' },
  jordan: { id: 'jordan', name: 'Jordan Lee', role: 'reviewer', color: '#10b981' },
  sam: { id: 'sam', name: 'Sam Rivera', role: 'developer', color: '#f59e0b' },
  riya: { id: 'riya', name: 'Riya Shah', role: 'developer', color: '#ec4899' }
};
export const ROLE_RANK = { developer: 1, reviewer: 2, admin: 3 };
export const userFrom = (req) => USERS[req.headers['x-pw-user']] || USERS.alex;
export const requireRole = (user, role) => {
  if (ROLE_RANK[user.role] < ROLE_RANK[role]) {
    const e = new Error(`${user.name} (${user.role}) cannot do this — requires ${role}.`); e.status = 403; throw e;
  }
};
