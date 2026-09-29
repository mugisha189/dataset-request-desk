// Small vanilla-JS single page app. No build step: everything talks to the
// JSON API under /api using the httpOnly cookie set at login.

const root = document.getElementById("root");
const state = { user: null, view: "requests", requestId: null };

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) {
    state.user = null;
    render();
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (e) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

function badge(status) {
  return h("span", { class: `badge ${status}` }, status.replace("_", " "));
}

// ---------------- Auth ----------------

async function loadMe() {
  try {
    state.user = await api("/api/auth/me");
  } catch (e) {
    state.user = null;
  }
}

function renderLogin() {
  const error = h("div", { class: "error" });
  const emailInput = h("input", { type: "email", placeholder: "you@example.com", id: "email" });
  const passInput = h("input", { type: "password", placeholder: "password", id: "password" });

  const form = h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      error.textContent = "";
      try {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: emailInput.value, password: passInput.value }),
        });
        await loadMe();
        state.view = "requests";
        render();
      } catch (err) {
        error.textContent = err.message;
      }
    },
  }, [
    h("div", { class: "field" }, [h("label", {}, "Email"), emailInput]),
    h("div", { class: "field" }, [h("label", {}, "Password"), passInput]),
    h("button", { class: "btn", type: "submit" }, "Log in"),
    error,
  ]);

  root.replaceChildren(
    h("div", { class: "login-wrap" }, [
      h("div", { class: "card login-box" }, [
        h("h1", {}, "Dataset Request Desk"),
        h("p", { class: "muted" }, "Sign in with your seeded account."),
        form,
      ]),
    ])
  );
}

// ---------------- Layout ----------------

function tabsFor(role) {
  const tabs = [{ id: "requests", label: "Requests" }];
  if (role === "operator" || role === "admin") tabs.push({ id: "episodes", label: "Episodes" });
  if (role === "operator" || role === "admin") tabs.push({ id: "analytics", label: "Analytics" });
  if (role === "admin") tabs.push({ id: "users", label: "Users" });
  return tabs;
}

function renderShell(contentEl) {
  const header = h("header", {}, [
    h("h1", {}, "Dataset Request Desk"),
    h("div", { class: "who" }, [
      `${state.user.name} · ${state.user.role}`,
      " ",
      h("button", {
        class: "btn secondary",
        style: "margin-left:10px",
        onclick: async () => {
          await api("/api/auth/logout", { method: "POST" });
          state.user = null;
          render();
        },
      }, "Log out"),
    ]),
  ]);

  const nav = h(
    "nav",
    {},
    tabsFor(state.user.role).map((t) =>
      h(
        "button",
        {
          class: t.id === state.view ? "active" : "",
          onclick: () => {
            state.view = t.id;
            state.requestId = null;
            render();
          },
        },
        t.label
      )
    )
  );

  root.replaceChildren(header, nav, h("main", {}, contentEl));
}

// ---------------- Requests ----------------

async function renderRequests() {
  const main = h("div", {}, [h("p", { class: "muted" }, "Loading...")]);
  renderShell(main);

  const requests = await api("/api/requests");

  const createForm =
    state.user.role === "client"
      ? h("div", { class: "card" }, [
          h("h3", {}, "New request"),
          buildCreateRequestForm(),
        ])
      : null;

  const table = h("table", {}, [
    h("tr", {}, [
      h("th", {}, "Task"),
      h("th", {}, state.user.role === "client" ? "" : "Client"),
      h("th", {}, "Requested"),
      h("th", {}, "Assigned"),
      h("th", {}, "Deadline"),
      h("th", {}, "Status"),
      h("th", {}, ""),
    ]),
    ...requests.map((r) =>
      h("tr", {}, [
        h("td", {}, r.task_name),
        h("td", {}, state.user.role === "client" ? "" : r.client_name || ""),
        h("td", {}, String(r.episodes_requested)),
        h("td", {}, String(r.assigned_count)),
        h("td", {}, new Date(r.deadline).toLocaleDateString()),
        h("td", {}, badge(r.status)),
        h("td", {}, [
          h(
            "button",
            {
              class: "btn secondary",
              onclick: () => {
                state.view = "request-detail";
                state.requestId = r.id;
                render();
              },
            },
            "Open"
          ),
        ]),
      ])
    ),
  ]);

  renderShell([createForm, h("div", { class: "card" }, [h("h3", {}, "Requests"), table])]);
}

function buildCreateRequestForm() {
  const error = h("div", { class: "error" });
  const taskName = h("input", { type: "text", required: "true", placeholder: "e.g. pick cup" });
  const count = h("input", { type: "number", min: "1", required: "true", value: "10" });
  const deadline = h("input", { type: "date", required: "true" });
  const notes = h("textarea", { rows: "2", placeholder: "optional notes" });

  return h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = "";
        try {
          await api("/api/requests", {
            method: "POST",
            body: JSON.stringify({
              task_name: taskName.value,
              episodes_requested: parseInt(count.value, 10),
              deadline: new Date(deadline.value).toISOString(),
              notes: notes.value || null,
            }),
          });
          render();
        } catch (err) {
          error.textContent = err.message;
        }
      },
    },
    [
      h("div", { class: "row" }, [
        h("div", { class: "field" }, [h("label", {}, "Task name"), taskName]),
        h("div", { class: "field" }, [h("label", {}, "Episodes requested"), count]),
        h("div", { class: "field" }, [h("label", {}, "Deadline"), deadline]),
      ]),
      h("div", { class: "field" }, [h("label", {}, "Notes"), notes]),
      h("button", { class: "btn", type: "submit" }, "Create request"),
      error,
    ]
  );
}

const NEXT_STATUSES = {
  submitted: [{ to: "in_progress", role: ["operator", "admin"], label: "Start work" }],
  in_progress: [{ to: "delivered", role: ["operator", "admin"], label: "Mark delivered" }],
  delivered: [
    { to: "accepted", role: ["client"], label: "Accept" },
    { to: "rejected", role: ["client"], label: "Reject" },
  ],
  rejected: [{ to: "in_progress", role: ["operator", "admin"], label: "Resume work (rework)" }],
  accepted: [],
};

async function renderRequestDetail(id) {
  const main = h("p", { class: "muted" }, "Loading...");
  renderShell(main);

  const req = await api(`/api/requests/${id}`);
  const error = h("div", { class: "error" });

  const actions = (NEXT_STATUSES[req.status] || [])
    .filter((t) => t.role.includes(state.user.role))
    .map((t) =>
      h(
        "button",
        {
          class: `btn ${t.to === "rejected" ? "danger" : ""}`,
          onclick: async () => {
            error.textContent = "";
            try {
              await api(`/api/requests/${id}/status`, {
                method: "POST",
                body: JSON.stringify({ to_status: t.to }),
              });
              renderRequestDetail(id);
            } catch (err) {
              error.textContent = err.message;
            }
          },
        },
        t.label
      )
    );

  const history = h(
    "table",
    {},
    [h("tr", {}, [h("th", {}, "From"), h("th", {}, "To"), h("th", {}, "By"), h("th", {}, "When")])].concat(
      req.status_events.map((e) =>
        h("tr", {}, [
          h("td", {}, e.from_status || "-"),
          h("td", {}, e.to_status),
          h("td", {}, e.actor_name || ""),
          h("td", {}, new Date(e.created_at).toLocaleString()),
        ])
      )
    )
  );

  const assignmentsTable = h(
    "table",
    {},
    [h("tr", {}, [h("th", {}, "Episode"), h("th", {}, "Robot"), h("th", {}, "Quality"), h("th", {}, "Export"), h("th", {}, "")])].concat(
      req.assignments.map((a) =>
        h("tr", {}, [
          h("td", {}, a.episode.episode_id),
          h("td", {}, a.episode.robot_id),
          h("td", { class: `quality-${a.episode.quality}` }, a.episode.quality),
          h("td", {}, a.export_status),
          h(
            "td",
            {},
            state.user.role === "operator" || state.user.role === "admin"
              ? h(
                  "button",
                  {
                    class: "btn secondary",
                    onclick: async () => {
                      await api(`/api/requests/${id}/assignments/${a.id}`, { method: "DELETE" });
                      renderRequestDetail(id);
                    },
                  },
                  "Unassign"
                )
              : null
          ),
        ])
      )
    )
  );

  const assignPanel =
    state.user.role === "operator" || state.user.role === "admin" ? await buildAssignPanel(id) : null;

  renderShell([
    h("button", { class: "btn secondary", onclick: () => { state.view = "requests"; render(); } }, "← Back"),
    h("div", { class: "card" }, [
      h("h2", {}, req.task_name),
      h("p", {}, [
        badge(req.status),
        `  requested by ${req.client_name} · ${req.episodes_requested} episodes · assigned ${req.assigned_count}`,
      ]),
      req.notes ? h("p", { class: "muted" }, `Notes: ${req.notes}`) : null,
      h("div", { class: "row" }, actions),
      error,
    ]),
    assignPanel,
    h("div", { class: "card" }, [h("h3", {}, "Assigned episodes"), assignmentsTable]),
    h("div", { class: "card" }, [h("h3", {}, "History"), history]),
  ]);
}

async function buildAssignPanel(requestId) {
  const taskFilter = h("input", { type: "text", placeholder: "filter by task name" });
  const qualityFilter = h("select", {}, [
    h("option", { value: "" }, "any quality"),
    h("option", { value: "good" }, "good"),
    h("option", { value: "usable" }, "usable"),
    h("option", { value: "bad" }, "bad"),
  ]);
  const results = h("div", {}, [h("p", { class: "muted" }, "Search unassigned episodes above.")]);

  async function search() {
    const params = new URLSearchParams({ unassigned_only: "true" });
    if (taskFilter.value) params.set("task_name", taskFilter.value);
    if (qualityFilter.value) params.set("quality", qualityFilter.value);
    const episodes = await api(`/api/episodes?${params.toString()}`);
    results.replaceChildren(
      h(
        "table",
        {},
        [h("tr", {}, [h("th", {}, "Episode"), h("th", {}, "Robot"), h("th", {}, "Task"), h("th", {}, "Quality"), h("th", {}, "")])].concat(
          episodes.map((ep) =>
            h("tr", {}, [
              h("td", {}, ep.episode_id),
              h("td", {}, ep.robot_id),
              h("td", {}, ep.task_name),
              h("td", { class: `quality-${ep.quality}` }, ep.quality),
              h(
                "td",
                {},
                h(
                  "button",
                  {
                    class: "btn secondary",
                    onclick: async () => {
                      await api(`/api/requests/${requestId}/assignments`, {
                        method: "POST",
                        body: JSON.stringify({ episode_ids: [ep.id] }),
                      });
                      renderRequestDetail(requestId);
                    },
                  },
                  "Assign"
                )
              ),
            ])
          )
        )
      )
    );
  }

  taskFilter.addEventListener("input", debounce(search, 300));
  qualityFilter.addEventListener("change", search);

  return h("div", { class: "card" }, [
    h("h3", {}, "Assign episodes"),
    h("div", { class: "row" }, [taskFilter, qualityFilter]),
    results,
  ]);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------------- Episodes / import ----------------

async function renderEpisodes() {
  const main = h("p", { class: "muted" }, "Loading...");
  renderShell(main);

  const taskFilter = h("input", { type: "text", placeholder: "filter by task name" });
  const qualityFilter = h("select", {}, [
    h("option", { value: "" }, "any quality"),
    h("option", { value: "good" }, "good"),
    h("option", { value: "usable" }, "usable"),
    h("option", { value: "bad" }, "bad"),
  ]);
  const results = h("div", {});

  async function search() {
    const params = new URLSearchParams();
    if (taskFilter.value) params.set("task_name", taskFilter.value);
    if (qualityFilter.value) params.set("quality", qualityFilter.value);
    const episodes = await api(`/api/episodes?${params.toString()}`);
    results.replaceChildren(
      h(
        "table",
        {},
        [
          h("tr", {}, [
            h("th", {}, "Episode"),
            h("th", {}, "Robot"),
            h("th", {}, "Task"),
            h("th", {}, "Recorded"),
            h("th", {}, "Duration (s)"),
            h("th", {}, "Operator"),
            h("th", {}, "Quality"),
            h("th", {}, "Assigned"),
          ]),
        ].concat(
          episodes.map((ep) =>
            h("tr", {}, [
              h("td", {}, ep.episode_id),
              h("td", {}, ep.robot_id),
              h("td", {}, ep.task_name),
              h("td", {}, new Date(ep.recorded_at).toLocaleString()),
              h("td", {}, String(ep.duration_seconds)),
              h("td", {}, ep.operator_name),
              h("td", { class: `quality-${ep.quality}` }, ep.quality),
              h("td", {}, ep.is_assigned ? "yes" : ""),
            ])
          )
        )
      )
    );
  }

  taskFilter.addEventListener("input", debounce(search, 300));
  qualityFilter.addEventListener("change", search);
  search();

  const importError = h("div", { class: "error" });
  const importResult = h("div", {});
  const fileInput = h("input", { type: "file", accept: ".csv" });
  const importForm = h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        importError.textContent = "";
        importResult.replaceChildren();
        if (!fileInput.files.length) return;
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        try {
          const res = await fetch("/api/episodes/import", { method: "POST", credentials: "same-origin", body: formData });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || res.statusText);
          }
          const result = await res.json();
          importResult.replaceChildren(
            h(
              "p",
              {},
              `Imported ${result.imported_count}, skipped ${result.skipped_count}, duplicates ${result.duplicate_count} (of ${result.total_rows} rows).`
            ),
            h(
              "table",
              {},
              [h("tr", {}, [h("th", {}, "Row"), h("th", {}, "Episode"), h("th", {}, "Outcome"), h("th", {}, "Reason")])].concat(
                result.details.slice(0, 100).map((d) =>
                  h("tr", {}, [
                    h("td", {}, String(d.row_number)),
                    h("td", {}, d.episode_id || ""),
                    h("td", {}, d.outcome),
                    h("td", {}, d.reason || ""),
                  ])
                )
              )
            )
          );
          search();
        } catch (err) {
          importError.textContent = err.message;
        }
      },
    },
    [fileInput, h("button", { class: "btn", type: "submit" }, "Import CSV"), importError, importResult]
  );

  renderShell([
    h("div", { class: "card" }, [h("h3", {}, "Import episode metadata"), importForm]),
    h("div", { class: "card" }, [h("h3", {}, "Episodes"), h("div", { class: "row" }, [taskFilter, qualityFilter]), results]),
  ]);
}

// ---------------- Analytics ----------------

async function renderAnalytics() {
  const main = h("p", { class: "muted" }, "Loading...");
  renderShell(main);
  const data = await api("/api/analytics");

  const stats = h("div", { class: "stat-grid" }, [
    h("div", { class: "stat" }, [
      h("div", { class: "n" }, data.median_submitted_to_delivered_hours != null ? data.median_submitted_to_delivered_hours.toFixed(1) : "-"),
      h("div", { class: "l" }, "median hours submitted → delivered"),
    ]),
    ...data.requests_by_status.map((r) => h("div", { class: "stat" }, [h("div", { class: "n" }, String(r.count)), h("div", { class: "l" }, r.status)])),
  ]);

  const topTasks = h(
    "table",
    {},
    [h("tr", {}, [h("th", {}, "Task"), h("th", {}, "Good episodes")])].concat(
      data.top_tasks_by_good_episodes.map((t) => h("tr", {}, [h("td", {}, t.task_name), h("td", {}, String(t.good_episode_count))]))
    )
  );

  const perDay = h(
    "table",
    {},
    [h("tr", {}, [h("th", {}, "Day"), h("th", {}, "Robot"), h("th", {}, "Episodes")])].concat(
      data.episodes_per_day_per_robot.map((r) => h("tr", {}, [h("td", {}, r.day), h("td", {}, r.robot_id), h("td", {}, String(r.count))]))
    )
  );

  renderShell([
    stats,
    h("div", { class: "card" }, [h("h3", {}, "Top 5 tasks by good episodes"), topTasks]),
    h("div", { class: "card" }, [h("h3", {}, "Episodes recorded per day, per robot"), perDay]),
  ]);
}

// ---------------- Users ----------------

async function renderUsers() {
  const main = h("p", { class: "muted" }, "Loading...");
  renderShell(main);
  const users = await api("/api/users");
  const error = h("div", { class: "error" });

  const table = h(
    "table",
    {},
    [h("tr", {}, [h("th", {}, "Name"), h("th", {}, "Email"), h("th", {}, "Role"), h("th", {}, "Active"), h("th", {}, "")])].concat(
      users.map((u) =>
        h("tr", {}, [
          h("td", {}, u.name),
          h("td", {}, u.email),
          h(
            "td",
            {},
            h(
              "select",
              {
                onchange: async (e) => {
                  await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) });
                  renderUsers();
                },
              },
              ["client", "operator", "admin"].map((r) => h("option", { value: r, selected: r === u.role ? "true" : undefined }, r))
            )
          ),
          h("td", {}, u.is_active ? "yes" : "no"),
          h(
            "td",
            {},
            h(
              "button",
              {
                class: "btn secondary",
                onclick: async () => {
                  try {
                    await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) });
                    renderUsers();
                  } catch (err) {
                    error.textContent = err.message;
                  }
                },
              },
              u.is_active ? "Deactivate" : "Activate"
            )
          ),
        ])
      )
    )
  );

  const createError = h("div", { class: "error" });
  const name = h("input", { type: "text", required: "true" });
  const email = h("input", { type: "email", required: "true" });
  const password = h("input", { type: "password", required: "true", minlength: "8" });
  const role = h("select", {}, ["client", "operator", "admin"].map((r) => h("option", { value: r }, r)));
  const org = h("input", { type: "text", placeholder: "organisation (clients)" });

  const createForm = h(
    "form",
    {
      onsubmit: async (e) => {
        e.preventDefault();
        createError.textContent = "";
        try {
          await api("/api/users", {
            method: "POST",
            body: JSON.stringify({ name: name.value, email: email.value, password: password.value, role: role.value, organisation: org.value || null }),
          });
          renderUsers();
        } catch (err) {
          createError.textContent = err.message;
        }
      },
    },
    [
      h("div", { class: "row" }, [
        h("div", { class: "field" }, [h("label", {}, "Name"), name]),
        h("div", { class: "field" }, [h("label", {}, "Email"), email]),
        h("div", { class: "field" }, [h("label", {}, "Password"), password]),
        h("div", { class: "field" }, [h("label", {}, "Role"), role]),
        h("div", { class: "field" }, [h("label", {}, "Organisation"), org]),
      ]),
      h("button", { class: "btn", type: "submit" }, "Create user"),
      createError,
    ]
  );

  renderShell([
    h("div", { class: "card" }, [h("h3", {}, "New user"), createForm]),
    h("div", { class: "card" }, [h("h3", {}, "Users"), error, table]),
  ]);
}

// ---------------- Router ----------------

async function render() {
  if (!state.user) {
    renderLogin();
    return;
  }
  if (state.view === "requests") await renderRequests();
  else if (state.view === "request-detail") await renderRequestDetail(state.requestId);
  else if (state.view === "episodes") await renderEpisodes();
  else if (state.view === "analytics") await renderAnalytics();
  else if (state.view === "users") await renderUsers();
}

(async function init() {
  await loadMe();
  render();
})();
