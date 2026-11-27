(function () {
  "use strict";

  const STORAGE_KEY = "openclubeoss-olympico-demo-v1";
  const SESSION_KEY = "openclubeoss-demo-session";
  const processUI = window.ClubeProcesses;
  const byId = (id) => document.getElementById(id);
  const today = new Date();
  const todayISO = toISODate(today);
  const tomorrowISO = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));

  const seedState = {
    courts: [
      { id: "court-central", name: "Ginásio Central", type: "Coberto", sports: ["Futsal", "Vôlei", "Basquete"] },
      { id: "court-north", name: "Quadra Norte", type: "Aberta", sports: ["Futsal", "Vôlei"] },
      { id: "court-multi", name: "Espaço Multiuso", type: "Coberto", sports: ["Vôlei", "Atividade geral"] },
      { id: "court-field", name: "Campo de Treino", type: "Externo", sports: ["Futebol", "Atividade geral"] }
    ],
    athletes: [
      { id: "ath-001", name: "Marina Oliveira", guardian: "Paula Oliveira", team: "Vôlei feminino", sport: "Vôlei", stage: "active", createdAt: todayISO },
      { id: "ath-002", name: "Rafael Costa", guardian: "Bruno Costa", team: "Futsal Sub-15", sport: "Futsal", stage: "review", createdAt: todayISO },
      { id: "ath-003", name: "Lia Ferreira", guardian: "Renata Ferreira", team: "Basquete Sub-13", sport: "Basquete", stage: "documents", createdAt: todayISO },
      { id: "ath-004", name: "Caio Martins", guardian: "Daniel Martins", team: "Futebol Sub-17", sport: "Futebol", stage: "team", createdAt: todayISO },
      { id: "ath-005", name: "Sofia Almeida", guardian: "Carla Almeida", team: "Vôlei feminino", sport: "Vôlei", stage: "active", createdAt: todayISO },
      { id: "ath-006", name: "Pedro Nascimento", guardian: "André Nascimento", team: "Futsal Sub-13", sport: "Futsal", stage: "active", createdAt: todayISO },
      { id: "ath-007", name: "Isabela Rocha", guardian: "Marta Rocha", team: "Basquete Sub-15", sport: "Basquete", stage: "active", createdAt: todayISO },
      { id: "ath-008", name: "Miguel Santos", guardian: "Luiza Santos", team: "Futebol Sub-15", sport: "Futebol", stage: "active", createdAt: todayISO }
    ],
    reservations: [
      { id: "res-001", courtId: "court-central", date: todayISO, startTime: "08:00", endTime: "09:00", title: "Treino Futsal Sub-15", sport: "Futsal", team: "Futsal Sub-15", status: "confirmed" },
      { id: "res-002", courtId: "court-multi", date: todayISO, startTime: "10:00", endTime: "11:00", title: "Vôlei feminino", sport: "Vôlei", team: "Vôlei feminino", status: "confirmed" },
      { id: "res-003", courtId: "court-central", date: todayISO, startTime: "14:00", endTime: "15:00", title: "Basquete Sub-13", sport: "Basquete", team: "Basquete Sub-13", status: "confirmed" },
      { id: "res-004", courtId: "court-north", date: todayISO, startTime: "16:00", endTime: "17:00", title: "Futsal Sub-13", sport: "Futsal", team: "Futsal Sub-13", status: "confirmed" },
      { id: "res-005", courtId: "court-field", date: tomorrowISO, startTime: "09:00", endTime: "10:30", title: "Treino Futebol Sub-17", sport: "Futebol", team: "Futebol Sub-17", status: "confirmed" }
    ],
    activity: [
      { id: "act-001", message: "Cadastro de Lia Ferreira aguarda documentos e informações de saúde.", time: "09:42" },
      { id: "act-002", message: "Agenda de hoje atualizada com quatro atividades.", time: "09:18" },
      { id: "act-003", message: "Rafael Costa enviado para conferência da secretaria.", time: "Ontem" }
    ]
  };

  const registrationStepIds = ["pre", "review", "documents", "team", "active"];
  const registrationStepLabels = {
    pre: "Pré-cadastro", review: "Conferência", documents: "Documentos e saúde", team: "Vínculo com equipe", active: "Ativo"
  };
  let state = loadState();
  let activeView = "dashboard";
  let activeProcessKind = "registration";
  let selectedRegistrationId = null;
  let selectedStepId = null;
  let agendaDate = todayISO;
  let mapZoom = 1;
  let toastTimer = null;

  function toISODate(date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.athletes) && Array.isArray(saved.courts) && Array.isArray(saved.reservations)) return saved;
    } catch (_error) {
      // Ignore invalid browser storage and restore the fictional sample data.
    }
    return structuredClone(seedState);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function initials(name) {
    return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  }

  function formatDate(date, options = { weekday: "long", day: "numeric", month: "long" }) {
    const parsed = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat("pt-BR", options).format(parsed);
  }

  function stageIndex(athlete) {
    return Math.max(0, registrationStepIds.indexOf(athlete?.stage || "review"));
  }

  function activeAthlete() {
    const preferred = state.athletes.find((athlete) => athlete.id === selectedRegistrationId);
    if (preferred) return preferred;
    return state.athletes.find((athlete) => athlete.stage !== "active") || state.athletes[0] || null;
  }

  function sortedReservations(date = agendaDate) {
    return state.reservations.filter((reservation) => reservation.date === date && reservation.status !== "cancelled")
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
  }

  function setView(view) {
    if (!document.querySelector(`[data-view-panel="${view}"]`)) return;
    activeView = view;
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      const isActive = panel.dataset.viewPanel === view;
      panel.hidden = !isActive;
      panel.classList.toggle("is-visible", isActive);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      const isActive = button.dataset.view === view;
      button.classList.toggle("is-active", isActive);
      if (isActive) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const labels = { dashboard: "Visão geral", people: "Pessoas", agenda: "Agenda de espaços", processes: "Processos" };
    byId("page-title").textContent = labels[view];
    document.body.classList.remove("sidebar-open");
    byId("sidebar").classList.remove("is-open");
    byId("sidebar-scrim").classList.remove("is-visible");
    byId("open-sidebar").setAttribute("aria-expanded", "false");
    if (view === "dashboard") renderDashboard();
    if (view === "people") renderPeople();
    if (view === "agenda") renderAgenda();
    if (view === "processes") renderProcessView();
  }

  function signIn(event) {
    event.preventDefault();
    const email = byId("login-email").value.trim().toLowerCase();
    const password = byId("login-password").value;
    const feedback = byId("login-feedback");
    if (email !== "olympico@br" || password !== "olympico 80") {
      feedback.textContent = "Confira o e-mail e a senha demonstrativos e tente novamente.";
      byId("login-password").setAttribute("aria-invalid", "true");
      byId("login-password").focus();
      return;
    }
    feedback.textContent = "";
    byId("login-password").removeAttribute("aria-invalid");
    sessionStorage.setItem(SESSION_KEY, "open");
    byId("login-screen").hidden = true;
    byId("app-shell").hidden = false;
    setView("dashboard");
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    byId("app-shell").hidden = true;
    byId("login-screen").hidden = false;
    byId("login-password").value = "";
    byId("login-feedback").textContent = "";
    byId("login-password").focus();
  }

  function renderDashboard() {
    const pending = state.athletes.filter((athlete) => athlete.stage !== "active");
    const todayReservations = sortedReservations(todayISO);
    const nextAthlete = pending[0];
    const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today);
    byId("today-label").textContent = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    byId("metric-athletes").textContent = state.athletes.length;
    byId("metric-pending").textContent = pending.length;
    byId("metric-pending-foot").textContent = "pedem atenção da secretaria";
    byId("metric-bookings").textContent = todayReservations.length;
    byId("nav-pending-count").textContent = pending.length;
    byId("queue-count").textContent = pending.length;
    byId("queue-list").innerHTML = pending.slice(0, 3).map((athlete) => `
      <div class="queue-row"><span class="queue-avatar">${escapeHTML(initials(athlete.name))}</span><span class="queue-person"><strong>${escapeHTML(athlete.name)}</strong><span>${escapeHTML(registrationStepLabels[athlete.stage] || "Em análise")} · ${escapeHTML(athlete.team)}</span></span><span class="state-pill ${athlete.stage === "documents" ? "state-pill--issue" : "state-pill--active"}">${athlete.stage === "documents" ? "Pendência" : "Em análise"}</span></div>`).join("") || `<p class="empty-state">Nenhum cadastro aguarda revisão.</p>`;
    byId("agenda-preview").innerHTML = todayReservations.slice(0, 3).map((reservation) => {
      const court = state.courts.find((item) => item.id === reservation.courtId);
      return `<div class="agenda-preview-row"><time class="agenda-preview-time">${escapeHTML(reservation.startTime)}</time><div class="agenda-preview-item ${sportClass(reservation.sport)}"><strong>${escapeHTML(reservation.title)}</strong><span>${escapeHTML(court?.name || "Espaço esportivo")} · ${escapeHTML(reservation.endTime)}</span></div></div>`;
    }).join("") || `<p class="empty-state">Nenhuma atividade marcada para hoje.</p>`;
    byId("next-step-title").textContent = nextAthlete ? `Revisar ${nextAthlete.name.split(" ")[0]} · ${registrationStepLabels[nextAthlete.stage]}` : "Conferir disponibilidade";
    byId("next-step-detail").textContent = nextAthlete ? `${nextAthlete.team} · responsável: secretaria` : "Selecione um espaço e horário para consultar a agenda.";
    if (byId("queue-list").querySelector(".queue-row")) {
      byId("queue-list").querySelectorAll(".queue-row").forEach((row, index) => {
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `Abrir cadastro de ${pending[index]?.name || "atleta"}`);
        row.addEventListener("click", () => { selectedRegistrationId = pending[index]?.id || null; setView("processes"); selectProcessKind("registration"); });
        row.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); row.click(); } });
      });
    }
  }

  function sportClass(sport) {
    if (sport === "Vôlei") return "agenda-preview-item--volley";
    if (sport === "Basquete") return "agenda-preview-item--basket";
    return "";
  }

  function renderPeople() {
    const query = byId("people-search").value.trim().toLocaleLowerCase("pt-BR");
    const filter = byId("people-status-filter").value;
    const people = state.athletes.filter((athlete) => {
      const matchesQuery = `${athlete.name} ${athlete.team} ${athlete.sport}`.toLocaleLowerCase("pt-BR").includes(query);
      const matchesFilter = filter === "all" || filter === "active" && athlete.stage === "active" || filter === "pending" && ["review", "team"].includes(athlete.stage) || filter === "documents" && athlete.stage === "documents";
      return matchesQuery && matchesFilter;
    });
    byId("people-count").textContent = people.length;
    byId("people-empty").hidden = people.length > 0;
    byId("people-table-body").innerHTML = people.map((athlete) => {
      const active = athlete.stage === "active";
      const statusClass = athlete.stage === "documents" ? "state-pill--issue" : active ? "state-pill--complete" : "state-pill--active";
      const statusLabel = athlete.stage === "documents" ? "Com pendência" : active ? "Ativo" : "Em análise";
      return `<tr><td data-label="Atleta"><span class="person-cell"><span class="queue-avatar">${escapeHTML(initials(athlete.name))}</span><span><strong>${escapeHTML(athlete.name)}</strong><small>Responsável: ${escapeHTML(athlete.guardian)}</small></span></span></td><td data-label="Equipe">${escapeHTML(athlete.team)}</td><td data-label="Modalidade">${escapeHTML(athlete.sport)}</td><td data-label="Etapa">${escapeHTML(registrationStepLabels[athlete.stage] || "Em análise")}</td><td data-label="Situação"><span class="state-pill ${statusClass}">${statusLabel}</span></td><td data-label="Ações"><button class="table-action" type="button" data-open-athlete="${escapeHTML(athlete.id)}" aria-label="Abrir processo de ${escapeHTML(athlete.name)}">↗</button></td></tr>`;
    }).join("");
    byId("people-table-body").querySelectorAll("[data-open-athlete]").forEach((button) => button.addEventListener("click", () => {
      selectedRegistrationId = button.dataset.openAthlete;
      setView("processes");
      selectProcessKind("registration");
    }));
    renderMiniFlows();
  }

  function renderAgenda() {
    byId("agenda-date").value = agendaDate;
    byId("selected-date-label").textContent = formatDate(agendaDate);
    const hours = Array.from({ length: 13 }, (_value, index) => 8 + index);
    const entries = sortedReservations(agendaDate);
    const columns = [
      `<div class="schedule-corner">Horário</div>`,
      ...state.courts.map((court) => `<div class="schedule-space-heading" title="${escapeHTML(court.type)}">${escapeHTML(court.name)}</div>`)
    ];
    const rows = hours.flatMap((hour) => {
      const time = `${String(hour).padStart(2, "0")}:00`;
      return [
        `<div class="schedule-time">${time}</div>`,
        ...state.courts.map((court) => {
          const booking = entries.find((item) => item.courtId === court.id && item.startTime === time);
          if (booking) return `<div class="schedule-cell is-occupied"><button class="schedule-booking ${scheduleClass(booking.sport)}" type="button" data-booking-id="${escapeHTML(booking.id)}" aria-label="${escapeHTML(booking.title)}, ${escapeHTML(booking.startTime)} até ${escapeHTML(booking.endTime)}"><strong>${escapeHTML(booking.title)}</strong><span>${escapeHTML(booking.startTime)}–${escapeHTML(booking.endTime)}</span></button></div>`;
          const isInsideBooking = entries.some((item) => item.courtId === court.id && timeToMinutes(item.startTime) < timeToMinutes(time) + 60 && timeToMinutes(item.endTime) > timeToMinutes(time));
          if (isInsideBooking) return `<div class="schedule-cell is-occupied" aria-label="Ocupado"></div>`;
          return `<button class="schedule-cell is-open" type="button" data-open-slot="${court.id}" data-time="${time}" aria-label="Reservar ${escapeHTML(court.name)} às ${time}"></button>`;
        })
      ];
    });
    byId("schedule-grid").style.setProperty("--space-count", String(state.courts.length));
    byId("schedule-grid").innerHTML = [...columns, ...rows].join("");
    byId("schedule-grid").querySelectorAll("[data-open-slot]").forEach((button) => button.addEventListener("click", () => {
      openReservationDialog({ courtId: button.dataset.openSlot, date: agendaDate, startTime: button.dataset.time });
    }));
    byId("schedule-grid").querySelectorAll("[data-booking-id]").forEach((button) => button.addEventListener("click", () => {
      const booking = state.reservations.find((item) => item.id === button.dataset.bookingId);
      if (booking) toast(`${booking.title} · ${state.courts.find((item) => item.id === booking.courtId)?.name || "Espaço"} · ${booking.startTime}–${booking.endTime}`, "info");
    }));
    renderMiniFlows();
  }

  function scheduleClass(sport) {
    return sport === "Vôlei" ? "schedule-booking--volley" : sport === "Basquete" ? "schedule-booking--basket" : "";
  }

  function renderMiniFlows() {
    const athlete = activeAthlete();
    if (byId("registration-mini-flow")) {
      const index = athlete ? stageIndex(athlete) : 0;
      byId("registration-mini-flow").innerHTML = registrationStepIds.slice(0, 4).map((id, stepIndex) => `<div class="mini-stage ${stepIndex < index ? "is-complete" : stepIndex === index ? "is-current" : ""}"><strong>${escapeHTML(registrationStepLabels[id])}</strong><span>${stepIndex < index ? "Concluída" : stepIndex === index ? "Em andamento" : "Aguardando"}</span></div>`).join("");
    }
    if (byId("reservation-mini-flow")) {
      const steps = ["Solicitação", "Disponibilidade", "Confirmação", "Agenda", "Conclusão"];
      byId("reservation-mini-flow").innerHTML = steps.map((label, index) => `<div class="mini-reservation-step ${index < 2 ? "is-complete" : index === 2 ? "is-current" : ""}"><span>${index < 2 ? "✓" : String(index + 1)}</span><strong>${label}</strong></div>`).join("");
    }
  }

  function processState(kind) {
    if (kind === "registration") {
      const athlete = activeAthlete();
      const index = athlete ? stageIndex(athlete) : 0;
      return {
        kind,
        instance: athlete,
        currentStep: athlete?.stage === "active" ? "active" : athlete?.stage || "review",
        completeSteps: registrationStepIds.slice(0, index),
        selectedStep: selectedStepId,
        showException: true
      };
    }
    const latest = [...state.reservations].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))[0] || null;
    return {
      kind,
      instance: latest,
      currentStep: "check",
      completeSteps: ["request"],
      selectedStep: selectedStepId,
      showException: true
    };
  }

  function renderProcessView() {
    const data = processState(activeProcessKind);
    const definition = processUI.definitions[activeProcessKind];
    const instance = data.instance;
    const currentStep = definition.steps.find((step) => step.id === data.currentStep) || definition.steps[0];
    const progress = activeProcessKind === "registration" ? Math.round(stageIndex(instance) / (registrationStepIds.length - 1) * 100) : 20;
    byId("process-panel").setAttribute("aria-labelledby", activeProcessKind === "registration" ? "tab-registration" : "tab-reservation");
    byId("process-template-label").textContent = definition.label;
    byId("process-type-mark").textContent = definition.mark;
    byId("process-instance-title").textContent = activeProcessKind === "registration" ? instance ? `Cadastro de ${instance.name}` : "Cadastro em andamento" : instance ? instance.title : "Solicitação de espaço";
    byId("process-instance-description").textContent = activeProcessKind === "registration"
      ? instance ? `${instance.team} · responsável ${instance.guardian}. Acompanhe as etapas e a próxima ação da secretaria.` : "Veja o que já foi feito, quem responde pela etapa atual e qual é a próxima ação."
      : instance ? `${courtName(instance.courtId)} · ${formatDate(instance.date, { day: "numeric", month: "long" })} · ${instance.startTime}–${instance.endTime}. Acompanhe a análise e o uso do espaço.` : "Veja como a equipe solicita, confirma e acompanha o uso dos espaços.";
    byId("process-progress-value").textContent = `${progress}%`;
    byId("process-progress-bar").style.width = `${progress}%`;
    byId("registration-tab-count").textContent = state.athletes.filter((athlete) => athlete.stage !== "active").length;
    byId("reservation-tab-count").textContent = state.reservations.length;
    byId("tab-registration").classList.toggle("is-selected", activeProcessKind === "registration");
    byId("tab-registration").setAttribute("aria-selected", String(activeProcessKind === "registration"));
    byId("tab-registration").tabIndex = activeProcessKind === "registration" ? 0 : -1;
    byId("tab-reservation").classList.toggle("is-selected", activeProcessKind === "reservation");
    byId("tab-reservation").setAttribute("aria-selected", String(activeProcessKind === "reservation"));
    byId("tab-reservation").tabIndex = activeProcessKind === "reservation" ? 0 : -1;
    const selected = definition.steps.find((step) => step.id === selectedStepId) || (selectedStepId === definition.exception.id ? definition.exception : currentStep);
    byId("flow-canvas").innerHTML = processUI.renderProcessDiagram({ kind: activeProcessKind, state: { ...data, selectedStep: selected.id } });
    byId("process-list").innerHTML = processUI.renderProcessList({ kind: activeProcessKind, state: data });
    byId("process-list-count").textContent = `${definition.steps.length + 1} etapas`;
    processUI.bindProcessSelection(byId("flow-canvas"), (stepId) => selectStep(stepId));
    processUI.bindProcessSelection(byId("process-list"), (stepId) => selectStep(stepId));
    byId("inspector-state").textContent = selected.id === data.currentStep ? "Etapa atual" : selected.id === definition.exception.id ? "Caminho alternativo" : data.completeSteps.includes(selected.id) ? "Etapa concluída" : "Etapa seguinte";
    byId("step-inspector-heading").textContent = selected.title;
    byId("inspector-description").textContent = selected.description;
    byId("inspector-owner").textContent = selected.owner;
    byId("inspector-due").textContent = selected.due;
    byId("inspector-next").textContent = selected.next;
    byId("inspector-checklist").innerHTML = selected.checklist.map((item, index) => `<div class="checklist-row ${index < (selected.id === data.currentStep ? 1 : selected.id === definition.exception.id ? 0 : selected.id === "active" || selected.id === "done" ? selected.checklist.length : 0) ? "is-done" : ""}">${escapeHTML(item)}</div>`).join("");
    const canAdvance = activeProcessKind === "registration" && instance && instance.stage !== "active" && selected.id === data.currentStep;
    byId("advance-process").hidden = !canAdvance;
    byId("advance-process").textContent = instance?.stage === "team" ? "Ativar atleta demonstrativamente" : "Concluir etapa demonstrativa";
    byId("inspector-help").textContent = activeProcessKind === "registration" ? "Ação de exemplo: avança o cadastro guardado neste navegador." : "Conflitos e alternativas podem ser explorados no mapa e na agenda.";
    byId("process-activity-list").innerHTML = state.activity.slice(0, 5).map((entry) => `<li><span>${escapeHTML(entry.message)}</span><time>${escapeHTML(entry.time)}</time></li>`).join("");
    const svg = byId("flow-canvas").querySelector("svg");
    if (svg) {
      svg.style.transform = "none";
      svg.style.width = `${100 * mapZoom}%`;
      svg.style.minWidth = `${690 * mapZoom}px`;
    }
  }

  function selectStep(stepId) {
    selectedStepId = stepId;
    renderProcessView();
  }

  function selectProcessKind(kind) {
    activeProcessKind = kind;
    selectedStepId = null;
    renderProcessView();
  }

  function advanceRegistration() {
    const athlete = activeAthlete();
    if (!athlete || athlete.stage === "active") return;
    const nextIndex = Math.min(stageIndex(athlete) + 1, registrationStepIds.length - 1);
    const oldLabel = registrationStepLabels[athlete.stage];
    athlete.stage = registrationStepIds[nextIndex];
    state.activity.unshift({ id: `act-${Date.now()}`, message: `${athlete.name}: etapa “${oldLabel}” concluída; segue para ${registrationStepLabels[athlete.stage]}.`, time: nowTime() });
    selectedStepId = athlete.stage;
    saveState();
    renderProcessView();
    renderDashboard();
    toast(`Cadastro avançou para ${registrationStepLabels[athlete.stage]}.`);
  }

  function openAthleteDialog() {
    const teamSelect = byId("athlete-team");
    const teams = [...new Set(state.athletes.map((athlete) => athlete.team))];
    teamSelect.innerHTML = teams.map((team) => `<option value="${escapeHTML(team)}">${escapeHTML(team)}</option>`).join("");
    byId("athlete-form").reset();
    byId("athlete-feedback").textContent = "";
    byId("athlete-feedback").className = "dialog-feedback";
    byId("athlete-dialog").showModal();
    byId("athlete-name").focus();
  }

  function createAthlete(event) {
    event.preventDefault();
    const name = byId("athlete-name").value.trim();
    const guardian = byId("athlete-guardian").value.trim();
    const team = byId("athlete-team").value;
    const feedback = byId("athlete-feedback");
    if (!name || !guardian || !team) {
      feedback.textContent = "Preencha o nome, a equipe e o responsável para continuar.";
      feedback.className = "dialog-feedback is-error";
      return;
    }
    const sport = sportFromTeam(team);
    const athlete = { id: `ath-${Date.now()}`, name, guardian, team, sport, stage: "review", createdAt: todayISO };
    state.athletes.unshift(athlete);
    state.activity.unshift({ id: `act-${Date.now()}`, message: `${name} enviado para conferência da secretaria.`, time: nowTime() });
    selectedRegistrationId = athlete.id;
    saveState();
    byId("athlete-dialog").close();
    renderDashboard();
    if (activeView === "people") renderPeople();
    toast("Pré-cadastro salvo para a demonstração.");
  }

  function sportFromTeam(team) {
    return ["Futsal", "Vôlei", "Basquete", "Futebol"].find((sport) => team.toLocaleLowerCase("pt-BR").includes(sport.toLocaleLowerCase("pt-BR"))) || "Atividade geral";
  }

  function openReservationDialog(prefill = {}) {
    const courtSelect = byId("reservation-court");
    courtSelect.innerHTML = state.courts.map((court) => `<option value="${escapeHTML(court.id)}">${escapeHTML(court.name)}</option>`).join("");
    byId("reservation-form").reset();
    byId("reservation-feedback").textContent = "";
    byId("reservation-feedback").className = "dialog-feedback";
    byId("reservation-date").value = prefill.date || agendaDate;
    byId("reservation-court").value = prefill.courtId || state.courts[0]?.id || "";
    byId("reservation-start").value = prefill.startTime || "16:00";
    const startMinutes = timeToMinutes(byId("reservation-start").value);
    byId("reservation-end").value = minutesToTime(Math.min(startMinutes + 60, 23 * 60 + 59));
    byId("reservation-dialog").showModal();
    byId("reservation-title").focus();
  }

  function createReservation(event) {
    event.preventDefault();
    const title = byId("reservation-title").value.trim();
    const sport = byId("reservation-sport").value;
    const courtId = byId("reservation-court").value;
    const date = byId("reservation-date").value;
    const startTime = byId("reservation-start").value;
    const endTime = byId("reservation-end").value;
    const feedback = byId("reservation-feedback");
    const showError = (message) => { feedback.textContent = message; feedback.className = "dialog-feedback is-error"; };
    if (!title || !date || !startTime || !endTime) return showError("Preencha a atividade, a data e os horários.");
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) return showError("O horário de término deve ser depois do início.");
    const conflict = state.reservations.find((reservation) => reservation.status !== "cancelled" && reservation.courtId === courtId && reservation.date === date && timeToMinutes(startTime) < timeToMinutes(reservation.endTime) && timeToMinutes(endTime) > timeToMinutes(reservation.startTime));
    if (conflict) {
      const alternative = state.courts.find((court) => court.id !== courtId && !state.reservations.some((reservation) => reservation.status !== "cancelled" && reservation.courtId === court.id && reservation.date === date && timeToMinutes(startTime) < timeToMinutes(reservation.endTime) && timeToMinutes(endTime) > timeToMinutes(reservation.startTime)));
      showError(`Este horário se sobrepõe a “${conflict.title}” (${conflict.startTime}–${conflict.endTime}). ${alternative ? `Experimente ${alternative.name} neste mesmo horário.` : "Escolha outro horário para continuar."}`);
      return;
    }
    const reservation = { id: `res-${Date.now()}`, courtId, date, startTime, endTime, title, sport, team: "Atividade demonstrativa", status: "confirmed" };
    state.reservations.push(reservation);
    state.activity.unshift({ id: `act-${Date.now()}`, message: `Reserva “${title}” confirmada em ${courtName(courtId)}.`, time: nowTime() });
    saveState();
    agendaDate = date;
    byId("reservation-dialog").close();
    if (activeView === "agenda") renderAgenda();
    renderDashboard();
    toast("Reserva confirmada e adicionada à agenda.");
  }

  function courtName(courtId) {
    return state.courts.find((court) => court.id === courtId)?.name || "Espaço esportivo";
  }

  function timeToMinutes(value) {
    const [hours, minutes] = String(value).split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(value) {
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function nowTime() {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function toast(message, type = "success") {
    const region = byId("toast-region");
    region.innerHTML = `<div class="toast ${type === "error" ? "toast--error" : type === "info" ? "toast--info" : ""}" role="status">${escapeHTML(message)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { region.innerHTML = ""; }, 4500);
  }

  function closeDialog(dialogId) {
    const dialog = byId(dialogId);
    if (dialog?.open) dialog.close();
  }

  function resetDemo() {
    state = structuredClone(seedState);
    selectedRegistrationId = null;
    selectedStepId = null;
    saveState();
    renderDashboard();
    if (activeView === "people") renderPeople();
    if (activeView === "agenda") renderAgenda();
    if (activeView === "processes") renderProcessView();
    toast("Exemplos restaurados para o estado inicial.", "info");
  }

  function setup() {
    byId("preview-date").textContent = formatDate(todayISO, { day: "numeric", month: "short", year: "numeric" });
    byId("login-form").addEventListener("submit", signIn);
    byId("login-password").addEventListener("input", () => byId("login-password").removeAttribute("aria-invalid"));
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    document.querySelectorAll("[data-goto]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.processKind) {
        activeProcessKind = button.dataset.processKind;
        selectedStepId = null;
      }
      setView(button.dataset.goto);
    }));
    document.querySelectorAll('[data-action="new-reservation"]').forEach((button) => button.addEventListener("click", () => openReservationDialog()));
    document.querySelectorAll('[data-action="new-athlete"]').forEach((button) => button.addEventListener("click", openAthleteDialog));
    byId("logout-button").addEventListener("click", signOut);
    byId("topbar-user").addEventListener("click", signOut);
    byId("reset-demo").addEventListener("click", resetDemo);
    byId("show-demo-info").addEventListener("click", () => byId("demo-info-dialog").showModal());
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.closeDialog)));
    byId("athlete-form").addEventListener("submit", createAthlete);
    byId("reservation-form").addEventListener("submit", createReservation);
    byId("people-search").addEventListener("input", renderPeople);
    byId("people-status-filter").addEventListener("change", renderPeople);
    byId("agenda-date").addEventListener("change", (event) => { agendaDate = event.target.value || todayISO; renderAgenda(); });
    byId("previous-day").addEventListener("click", () => shiftAgenda(-1));
    byId("next-day").addEventListener("click", () => shiftAgenda(1));
    byId("agenda-today").addEventListener("click", () => { agendaDate = todayISO; renderAgenda(); });
    byId("tab-registration").addEventListener("click", () => selectProcessKind("registration"));
    byId("tab-reservation").addEventListener("click", () => selectProcessKind("reservation"));
    document.querySelectorAll(".process-tab").forEach((tab) => tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = tab.dataset.processKind === "registration" ? byId("tab-reservation") : byId("tab-registration");
      next.focus();
      next.click();
    }));
    byId("advance-process").addEventListener("click", advanceRegistration);
    byId("map-zoom-in").addEventListener("click", () => { mapZoom = Math.min(1.3, mapZoom + 0.1); renderProcessView(); });
    byId("map-zoom-out").addEventListener("click", () => { mapZoom = Math.max(0.8, mapZoom - 0.1); renderProcessView(); });
    byId("map-fit").addEventListener("click", () => { mapZoom = 1; renderProcessView(); });
    byId("inspector-close").addEventListener("click", (event) => {
      const collapsed = byId("step-inspector").classList.toggle("is-collapsed");
      event.currentTarget.setAttribute("aria-expanded", String(!collapsed));
      event.currentTarget.setAttribute("aria-label", collapsed ? "Expandir detalhes da etapa" : "Recolher detalhes da etapa");
      event.currentTarget.textContent = collapsed ? "+" : "−";
    });
    byId("open-sidebar").addEventListener("click", () => { document.body.classList.add("sidebar-open"); byId("sidebar").classList.add("is-open"); byId("sidebar-scrim").classList.add("is-visible"); byId("open-sidebar").setAttribute("aria-expanded", "true"); });
    const closeSidebar = () => { document.body.classList.remove("sidebar-open"); byId("sidebar").classList.remove("is-open"); byId("sidebar-scrim").classList.remove("is-visible"); byId("open-sidebar").setAttribute("aria-expanded", "false"); };
    byId("close-sidebar").addEventListener("click", closeSidebar);
    byId("sidebar-scrim").addEventListener("click", closeSidebar);
    document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
    renderDashboard();
    renderMiniFlows();
    if (sessionStorage.getItem(SESSION_KEY) === "open") {
      byId("login-screen").hidden = true;
      byId("app-shell").hidden = false;
      setView("dashboard");
    }
  }

  function shiftAgenda(delta) {
    const selected = new Date(`${agendaDate}T12:00:00`);
    selected.setDate(selected.getDate() + delta);
    agendaDate = toISODate(selected);
    renderAgenda();
  }

  setup();
})();
