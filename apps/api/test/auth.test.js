// Tests auth/RBAC — Phase 3.
//
// Portée couverte : RG1 (email unique), RG2 (deny-by-default, compte actif
// requis, un rôle ne voit que son périmètre), matrice de création des
// comptes (CDC section 2), "tests de matrice des rôles" exigés par le skill
// couture-dynamic-pro-auth-rbac.
//
// Nécessite une base migrée et accessible (voir apps/api/test/db-integrity.test.js).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createApp } = require("../src/app");
const { prisma } = require("../src/db/client");

let server;
let baseUrl;
const createdUserIds = [];

before(async () => {
  const app = createApp();
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await prisma.utilisateur.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
  // closeAllConnections() : sans ça, une connexion HTTP keep-alive laissée
  // ouverte par fetch() peut empêcher le processus de se terminer.
  server.close();
  server.closeAllConnections();
});

function unique(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}@test.dev`;
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0];
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json, cookie: extractCookie(response) };
}

async function registerAndVerifyClient() {
  const email = unique("client");
  const register = await api("/api/auth/register", {
    method: "POST",
    body: { email, password: "correct-horse-1", firstName: "A", lastName: "B" },
  });
  createdUserIds.push(register.body.user.id);

  const verify = await api(
    `/api/auth/verify-email?token=${register.body.devEmailVerificationToken}`,
  );
  assert.equal(verify.status, 200);

  return { email, id: register.body.user.id };
}

async function loginAs(email, password) {
  const login = await api("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(login.status, 200, `login should succeed for ${email}`);
  return login.cookie;
}

async function createActivatedInternalUser(adminCookie, role) {
  const email = unique(role.toLowerCase());
  const create = await api("/api/admin/users", {
    method: "POST",
    body: { email, firstName: "Interne", lastName: role, role },
    cookie: adminCookie,
  });
  assert.equal(create.status, 201);
  createdUserIds.push(create.body.user.id);

  await api("/api/admin/users/" + create.body.user.id + "/activate", {
    method: "PATCH",
    cookie: adminCookie,
  });

  await api("/api/auth/reset-password", {
    method: "POST",
    body: { token: create.body.devPasswordSetupToken, password: "correct-horse-1" },
  });

  return loginAs(email, "correct-horse-1");
}

async function createActivatedAdmin() {
  // Le premier ADMIN ne peut pas être créé via /api/admin/users (réservé à
  // CONTENT_MANAGER/LOGISTICS) — c'est une décision humaine hors application
  // (CDC section 2). Fixture de test uniquement : on l'insère directement.
  const email = unique("admin");
  const { hashPassword } = require("../src/auth/password");
  const user = await prisma.utilisateur.create({
    data: {
      email,
      passwordHash: await hashPassword("correct-horse-1"),
      role: "ADMIN",
      status: "ACTIVE",
      firstName: "Admin",
      lastName: "Test",
    },
  });
  createdUserIds.push(user.id);
  return loginAs(email, "correct-horse-1");
}

test("RG2 — inscription : mot de passe trop court refusé", async () => {
  const { status, body } = await api("/api/auth/register", {
    method: "POST",
    body: { email: unique("weak"), password: "short", firstName: "A", lastName: "B" },
  });
  assert.equal(status, 400);
  assert.equal(body.error, "WEAK_PASSWORD");
});

test("RG1 — inscription : email déjà utilisé refusé", async () => {
  const { email, id } = await registerAndVerifyClient();
  const { status, body } = await api("/api/auth/register", {
    method: "POST",
    body: { email, password: "correct-horse-1", firstName: "C", lastName: "D" },
  });
  assert.equal(status, 409);
  assert.equal(body.error, "EMAIL_ALREADY_USED");
  void id;
});

test("RG2 — login refusé tant que l'email n'est pas vérifié (compte non ACTIVE)", async () => {
  const email = unique("unverified");
  const register = await api("/api/auth/register", {
    method: "POST",
    body: { email, password: "correct-horse-1", firstName: "A", lastName: "B" },
  });
  createdUserIds.push(register.body.user.id);

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "correct-horse-1" },
  });
  assert.equal(login.status, 403);
  assert.equal(login.body.error, "ACCOUNT_NOT_ACTIVE");
});

test("vérification email : token invalide refusé", async () => {
  const { status } = await api("/api/auth/verify-email?token=not-a-real-token");
  assert.equal(status, 400);
});

test("login : mot de passe incorrect refusé", async () => {
  const { email } = await registerAndVerifyClient();
  const { status, body } = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "wrong-password" },
  });
  assert.equal(status, 401);
  assert.equal(body.error, "INVALID_CREDENTIALS");
});

test("RG2 — /me exige une session ; un client ne voit que ses propres données", async () => {
  const anonymous = await api("/api/auth/me");
  assert.equal(anonymous.status, 401);

  const { email } = await registerAndVerifyClient();
  const cookie = await loginAs(email, "correct-horse-1");
  const me = await api("/api/auth/me", { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
  assert.equal(me.body.user.role, "CLIENT");
});

test("RG2 — un compte suspendu perd l'accès immédiatement, même avec un token encore valide", async () => {
  const { email, id } = await registerAndVerifyClient();
  const cookie = await loginAs(email, "correct-horse-1");

  await prisma.utilisateur.update({ where: { id }, data: { status: "SUSPENDED" } });

  const me = await api("/api/auth/me", { cookie });
  assert.equal(me.status, 401);
  assert.equal(me.body.error, "ACCOUNT_NOT_ACTIVE");
});

test("réinitialisation de mot de passe : bout en bout, et l'ancien mot de passe cesse de fonctionner", async () => {
  const { email } = await registerAndVerifyClient();

  const requestReset = await api("/api/auth/request-password-reset", {
    method: "POST",
    body: { email },
  });
  assert.equal(requestReset.status, 200);
  assert.ok(requestReset.body.devPasswordResetToken);

  const reset = await api("/api/auth/reset-password", {
    method: "POST",
    body: { token: requestReset.body.devPasswordResetToken, password: "new-password-1" },
  });
  assert.equal(reset.status, 200);

  const oldLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "correct-horse-1" },
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "new-password-1" },
  });
  assert.equal(newLogin.status, 200);
});

test("demande de reset pour un email inexistant : réponse identique (anti-énumération), aucun token émis", async () => {
  const { status, body } = await api("/api/auth/request-password-reset", {
    method: "POST",
    body: { email: unique("inconnu") },
  });
  assert.equal(status, 200);
  assert.equal(body.devPasswordResetToken, undefined);
});

test("matrice des rôles — /api/admin/users est refusé à tous sauf ADMIN", async () => {
  const anonymous = await api("/api/admin/users");
  assert.equal(anonymous.status, 401);

  const { email } = await registerAndVerifyClient();
  const clientCookie = await loginAs(email, "correct-horse-1");
  const asClient = await api("/api/admin/users", { cookie: clientCookie });
  assert.equal(asClient.status, 403);

  const adminCookie = await createActivatedAdmin();
  const contentManagerCookie = await createActivatedInternalUser(adminCookie, "CONTENT_MANAGER");
  const logisticsCookie = await createActivatedInternalUser(adminCookie, "LOGISTICS");

  const asContentManager = await api("/api/admin/users", { cookie: contentManagerCookie });
  assert.equal(asContentManager.status, 403);

  const asLogistics = await api("/api/admin/users", { cookie: logisticsCookie });
  assert.equal(asLogistics.status, 403);

  const asAdmin = await api("/api/admin/users", { cookie: adminCookie });
  assert.equal(asAdmin.status, 200);
  assert.ok(Array.isArray(asAdmin.body.users));
});

test("matrice de création des comptes internes — ADMIN non créable via l'API, activation distincte de la création", async () => {
  const adminCookie = await createActivatedAdmin();

  const rejectAdminRole = await api("/api/admin/users", {
    method: "POST",
    body: { email: unique("wannabe-admin"), firstName: "A", lastName: "B", role: "ADMIN" },
    cookie: adminCookie,
  });
  assert.equal(rejectAdminRole.status, 400);
  assert.equal(rejectAdminRole.body.error, "INVALID_ROLE");

  const create = await api("/api/admin/users", {
    method: "POST",
    body: { email: unique("cm"), firstName: "C", lastName: "M", role: "CONTENT_MANAGER" },
    cookie: adminCookie,
  });
  assert.equal(create.status, 201);
  assert.equal(create.body.user.status, "PENDING_ADMIN");
  createdUserIds.push(create.body.user.id);

  // Le compte est créé mais pas encore actif : login toujours refusé.
  await api("/api/auth/reset-password", {
    method: "POST",
    body: { token: create.body.devPasswordSetupToken, password: "correct-horse-1" },
  });
  const loginBeforeActivation = await api("/api/auth/login", {
    method: "POST",
    body: { email: create.body.user.email, password: "correct-horse-1" },
  });
  assert.equal(loginBeforeActivation.status, 403);

  const activate = await api(`/api/admin/users/${create.body.user.id}/activate`, {
    method: "PATCH",
    cookie: adminCookie,
  });
  assert.equal(activate.status, 200);
  assert.equal(activate.body.user.status, "ACTIVE");

  const loginAfterActivation = await api("/api/auth/login", {
    method: "POST",
    body: { email: create.body.user.email, password: "correct-horse-1" },
  });
  assert.equal(loginAfterActivation.status, 200);
});
