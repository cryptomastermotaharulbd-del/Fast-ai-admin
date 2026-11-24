// ============================================================
// Fast AI — Web Admin Panel
//
// SETUP (owner): set ADMIN_EMAIL below to your own email — the same
// email must also be put in the Firestore rules (see
// firestore-rules-additions.txt and README.md). Until then the panel
// refuses every login.
// ============================================================
const ADMIN_EMAIL = "motaharulm49@gmail.com";

// Firebase web config for project fast-ai-43cdf (public client config —
// the same values that ship inside the Android app; security comes from
// Firebase Auth + Firestore rules, not from hiding these).
const firebaseConfig = {
  apiKey: "AIzaSyCKZFOFBN9l5DoBXpGaUR1yorWb6rPRXGQ",
  authDomain: "fast-ai-43cdf.firebaseapp.com",
  projectId: "fast-ai-43cdf",
  storageBucket: "fast-ai-43cdf.firebasestorage.app",
  messagingSenderId: "889234522249"
  // appId: register a Web app in Firebase Console → Project settings to get
  // a web appId. Auth + Firestore work without it; add it here if you create one.
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const loginView = $("login-view");
const panelView = $("panel-view");
const sessionBar = $("session-bar");

let usersCache = [];

// ---------- Auth ----------

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
  } catch (err) {
    $("login-error").textContent = "Login failed: " + err.message;
  }
});

$("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loginView.classList.remove("hidden");
    panelView.classList.add("hidden");
    sessionBar.classList.add("hidden");
    return;
  }
  // Admin-only gate: the signed-in email must match ADMIN_EMAIL exactly.
  if (user.email !== ADMIN_EMAIL) {
    $("login-error").textContent =
      "Access denied: this account is not the admin.";
    await signOut(auth);
    return;
  }
  $("admin-email").textContent = user.email;
  sessionBar.classList.remove("hidden");
  loginView.classList.add("hidden");
  panelView.classList.remove("hidden");
  loadUsers();
  loadAnnouncement();
  loadFlags();
});

// ---------- Tabs ----------

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    ["users", "announcement", "features", "keys"].forEach((name) => {
      $("tab-" + name).classList.toggle("hidden", name !== tab.dataset.tab);
    });
  });
});

// ---------- Users ----------

async function loadUsers() {
  $("users-status").textContent = "Loading…";
  try {
    const snap = await getDocs(collection(db, "users"));
    usersCache = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    renderUsers();
    fillKeyUserSelect();
    $("users-status").textContent = usersCache.length + " user(s)";
  } catch (err) {
    $("users-status").textContent = "Could not load users: " + err.message;
  }
}

function renderUsers() {
  const body = $("users-body");
  body.innerHTML = "";
  usersCache.forEach((u) => {
    const tr = document.createElement("tr");
    const banned = u.banned === true;
    tr.innerHTML =
      "<td></td><td></td><td></td>" +
      '<td><span class="badge ' + (banned ? "badge-banned" : "badge-ok") + '">' +
      (banned ? "Banned" : "Active") + "</span></td><td></td>";
    tr.children[0].textContent = u.displayName || u.name || "(no name)";
    tr.children[1].textContent = u.email || "";
    tr.children[2].textContent = u.plan || "free";
    const btn = document.createElement("button");
    btn.className = "btn " + (banned ? "btn-ok" : "btn-danger");
    btn.textContent = banned ? "Unban" : "Ban";
    btn.addEventListener("click", () => toggleBan(u.uid, !banned));
    tr.children[4].appendChild(btn);
    body.appendChild(tr);
  });
}

async function toggleBan(uid, banned) {
  try {
    await updateDoc(doc(db, "users", uid), { banned: banned });
    const u = usersCache.find((x) => x.uid === uid);
    if (u) u.banned = banned;
    renderUsers();
  } catch (err) {
    $("users-status").textContent = "Ban update failed: " + err.message;
  }
}

$("refresh-users").addEventListener("click", loadUsers);

// ---------- Announcement ----------

async function loadAnnouncement() {
  try {
    const snap = await getDoc(doc(db, "config", "announcement"));
    if (snap.exists()) {
      const d = snap.data();
      $("ann-active").checked = d.active === true;
      $("ann-title").value = d.title || "";
      $("ann-message").value = d.message || "";
    }
  } catch (err) {
    $("ann-status").textContent = "Could not load announcement: " + err.message;
  }
}

$("ann-save").addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "config", "announcement"), {
      active: $("ann-active").checked,
      title: $("ann-title").value.trim(),
      message: $("ann-message").value.trim(),
      updatedAt: new Date().toISOString()
    });
    $("ann-status").textContent = "Saved ✓ — the app picks it up live.";
  } catch (err) {
    $("ann-status").textContent = "Save failed: " + err.message;
  }
});

// ---------- Feature flags ----------

async function loadFlags() {
  try {
    const snap = await getDoc(doc(db, "config", "features"));
    if (snap.exists()) {
      const d = snap.data();
      $("flag-website-builder").checked = d.websiteBuilder !== false;
      $("flag-floating-avatar").checked = d.floatingAvatar !== false;
    }
  } catch (err) {
    $("flags-status").textContent = "Could not load flags: " + err.message;
  }
}

$("flags-save").addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "config", "features"), {
      websiteBuilder: $("flag-website-builder").checked,
      floatingAvatar: $("flag-floating-avatar").checked,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    $("flags-status").textContent = "Saved ✓ — the app picks it up live.";
  } catch (err) {
    $("flags-status").textContent = "Save failed: " + err.message;
  }
});

// ---------- API key status (metadata only — NEVER full keys) ----------
// Reads users/{uid}/keyStatus/* documents written by the app. Those docs
// contain only: provider, hasKey, maskedSuffix (last 4 chars at most),
// keyAddedAt, keyUpdatedAt. There is intentionally no code here that could
// request or render a full key.

function fillKeyUserSelect() {
  const sel = $("key-user-select");
  sel.innerHTML = "";
  usersCache.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.uid;
    opt.textContent = (u.displayName || u.name || u.email || u.uid) + " (" + (u.email || u.uid) + ")";
    sel.appendChild(opt);
  });
}

function fmtTs(v) {
  if (!v) return "—";
  try {
    const d = typeof v.toDate === "function" ? v.toDate() : new Date(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

$("keys-load").addEventListener("click", async () => {
  const uid = $("key-user-select").value;
  if (!uid) {
    $("keys-status").textContent = "No user selected.";
    return;
  }
  $("keys-status").textContent = "Loading…";
  try {
    const snap = await getDocs(collection(db, "users", uid, "keyStatus"));
    const body = $("keys-body");
    body.innerHTML = "";
    if (snap.empty) {
      $("keys-status").textContent = "No key status reported by this user's app yet.";
      return;
    }
    snap.forEach((d) => {
      const k = d.data();
      const tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
      tr.children[0].textContent = k.provider || d.id;
      tr.children[1].textContent = k.hasKey ? "Yes" : "No";
      // Masked suffix only — at most the last 4 characters, always bulleted.
      tr.children[2].textContent = k.hasKey && k.maskedSuffix ? "••••" + k.maskedSuffix : "—";
      tr.children[3].textContent = fmtTs(k.keyAddedAt);
      tr.children[4].textContent = fmtTs(k.keyUpdatedAt);
      body.appendChild(tr);
    });
    $("keys-status").textContent = snap.size + " provider(s) reported.";
  } catch (err) {
    $("keys-status").textContent = "Could not load key status: " + err.message;
  }
});
