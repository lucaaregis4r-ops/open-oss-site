// OSS — plataforma aberta para criação de apps administrativos
// Conexão com a API REST, gestão de estado e navegação

let currentUser = null;
let currentTeams = [];
let selectedTeamId = 'team_sub15_futsal';
let currentNav = 'meu-espaco';
let csrfToken = null;

async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const method = String(init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await window.fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || 'same-origin'
  });

  if (response.status === 401 && !String(input).includes('/api/auth/login')) {
    csrfToken = null;
    showLogin('Sua sessão expirou. Entre novamente.');
  }
  return response;
}

function showLogin(message = '') {
  currentUser = null;
  currentTeams = [];
  const appShell = document.getElementById('app-shell');
  const loginScreen = document.getElementById('login-screen');
  if (appShell) appShell.hidden = true;
  if (loginScreen) loginScreen.hidden = false;
  document.getElementById('skip-link')?.setAttribute('href', '#login-title');
  const error = document.getElementById('login-error');
  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }
}

function showAuthenticatedApp() {
  const appShell = document.getElementById('app-shell');
  const loginScreen = document.getElementById('login-screen');
  if (appShell) appShell.hidden = false;
  if (loginScreen) loginScreen.hidden = true;
  document.getElementById('skip-link')?.setAttribute('href', '#main');
  const error = document.getElementById('login-error');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}

// Elementos de Feedback e Busca
const feedbackEl = document.getElementById('interaction-feedback');
const searchFeedbackEl = document.getElementById('search-feedback');
const searchInput = document.getElementById('global-search');
const emptySearch = document.getElementById('empty-search');

function showFeedback(message, isError = false) {
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  feedbackEl.style.color = isError ? 'var(--color-error)' : 'var(--color-accent)';
  setTimeout(() => {
    if (feedbackEl.textContent === message) {
      feedbackEl.textContent = '';
    }
  }, 6000);
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

const sidebarToggle = document.getElementById('btn-sidebar-toggle');
const sidebarScrim = document.getElementById('sidebar-scrim');

function setAppSidebarOpen(open) {
  document.body.classList.toggle('sidebar-open', open);
  sidebarToggle?.setAttribute('aria-expanded', String(open));
  sidebarToggle?.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
  if (sidebarScrim) sidebarScrim.hidden = !open;
}

sidebarToggle?.addEventListener('click', () => {
  setAppSidebarOpen(sidebarToggle.getAttribute('aria-expanded') !== 'true');
});
sidebarScrim?.addEventListener('click', () => setAppSidebarOpen(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setAppSidebarOpen(false);
});

// -------------------------------------------------------------
// 1. Navegação entre Visões (Meu Espaço, Equipe, Pessoas)
// -------------------------------------------------------------
const viewIds = [
  'meu-espaco', 'catalogo-modulos', 'criar-modulo', 'modulo', 'automacoes', 'assistente', 'publicacao',
  'fluxos', 'administracao-contas', 'administracao-processos'
];
const ossCoreViews = new Set(['meu-espaco', 'catalogo-modulos', 'criar-modulo', 'modulo', 'automacoes', 'assistente', 'publicacao']);

function setView(viewId, options = {}) {
  if (!viewIds.includes(viewId)) viewId = 'meu-espaco';
  const adminViews = new Set(['administracao-contas', 'administracao-processos']);
  if (adminViews.has(viewId) && currentUser?.role !== 'admin') {
    showFeedback('Esta área está disponível somente para a administração do OSS.', true);
    viewId = 'meu-espaco';
    window.history.replaceState({ viewId }, '', `#${viewId}`);
    options.fromHistory = true;
  }

  currentNav = viewId;
  setAppSidebarOpen(false);
  if (!options.fromHistory && window.location.hash !== `#${viewId}`) {
    window.history.pushState({ viewId }, '', `#${viewId}`);
  }
  const views = {
    'meu-espaco': document.getElementById('view-meu-espaco'),
    'catalogo-modulos': document.getElementById('view-catalogo-modulos'),
    'criar-modulo': document.getElementById('view-criar-modulo'),
    'modulo': document.getElementById('view-modulo'),
    'automacoes': document.getElementById('view-automacoes'),
    'assistente': document.getElementById('view-assistente'),
    'publicacao': document.getElementById('view-publicacao'),
    'equipe': document.getElementById('view-equipe'),
    'pessoas': document.getElementById('view-pessoas'),
    'agenda': document.getElementById('view-agenda'),
    'fluxos': document.getElementById('view-fluxos'),
    'competicoes': document.getElementById('view-competicoes'),
    'viagens': document.getElementById('view-viagens'),
    'projetos': document.getElementById('view-projetos'),
    'administracao-contas': document.getElementById('view-administracao-contas'),
    'administracao-processos': document.getElementById('view-administracao-processos')
  };

  Object.keys(views).forEach(key => {
    if (views[key]) {
      views[key].hidden = (key !== viewId);
    }
  });

  document.querySelectorAll('.primary-nav [data-nav]').forEach(btn => {
    const isActive = btn.dataset.nav === viewId;
    btn.classList.toggle('nav-item--current', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  const heading = views[viewId]?.querySelector('h1, h2');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    if (options.focus !== false) heading.focus();
  }

  if (ossCoreViews.has(viewId)) {
    document.dispatchEvent(new CustomEvent('oss:view', { detail: { viewId } }));
    return;
  }

  // Atualizar dados da visão ativa
  if (viewId === 'equipe') {
    return loadTeamView(selectedTeamId);
  } else if (viewId === 'pessoas') {
    return loadPessoasView();
  } else if (viewId === 'agenda') {
    return loadAgendaView();
  } else if (viewId === 'fluxos') {
    return loadWorkflowsView();
  } else if (viewId === 'competicoes') {
    return loadCompetitionsView();
  } else if (viewId === 'viagens') {
    return loadTripsView();
  } else if (viewId === 'projetos') {
    return loadProjectsView();
  } else if (viewId === 'administracao-contas') {
    return loadAccountsView();
  } else if (viewId === 'administracao-processos') {
    return loadWorkflowAdminView();
  } else {
    return loadHomeView();
  }
}

function restoreViewFromLocation() {
  let requested = '';
  try { requested = decodeURIComponent(window.location.hash.slice(1)); } catch { requested = ''; }
  const viewId = viewIds.includes(requested) ? requested : 'meu-espaco';
  if (viewId !== requested) window.history.replaceState({ viewId }, '', `#${viewId}`);
  if (viewId === currentNav) return;
  setView(viewId, { fromHistory: true });
}

window.addEventListener('popstate', restoreViewFromLocation);
window.addEventListener('hashchange', restoreViewFromLocation);

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', event => {
    if (btn.tagName === 'A') event.preventDefault();
    setView(btn.dataset.nav);
  });
});

document.getElementById('btn-role-home-action')?.addEventListener('click', async event => {
  const action = event.currentTarget.dataset.homeAction;
  if (action === 'attendance') openQuickAttendanceModal(selectedTeamId || currentTeams[0]?.id, localIsoDate());
  else if (action === 'people') await setView('pessoas');
  else if (action === 'agenda') await setView('agenda');
  else if (action === 'projects') await setView('projetos');
  else if (action === 'accounts') await setView('administracao-contas');
  else if (action) await setView(action);
});

document.querySelectorAll('[data-nav-future]').forEach(btn => {
  btn.addEventListener('click', () => {
    showFeedback(btn.dataset.feedback || 'Esta funcionalidade será ativada nas próximas etapas.');
  });
});

document.querySelectorAll('[data-feedback]').forEach(btn => {
  btn.addEventListener('click', () => {
    showFeedback(btn.dataset.feedback);
  });
});

// -------------------------------------------------------------
// 2. Abas da Tela B (Equipe)
// -------------------------------------------------------------
document.querySelectorAll('[data-team-tab]').forEach(tabBtn => {
  tabBtn.addEventListener('click', () => {
    const tabName = tabBtn.dataset.teamTab;
    document.querySelectorAll('[data-team-tab]').forEach(b => {
      b.classList.toggle('subnav__tab--active', b === tabBtn);
      b.setAttribute('aria-selected', String(b === tabBtn));
    });

    document.querySelectorAll('.team-tab-content').forEach(panel => {
      panel.hidden = panel.id !== `tab-${tabName}`;
    });
  });
});

// -------------------------------------------------------------
// 3. Modais e Diálogos
// -------------------------------------------------------------
function setupDialogs() {
  document.querySelectorAll('[data-open-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = document.getElementById(btn.dataset.openDialog);
      if (dialog) dialog.showModal();
    });
  });

  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = btn.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
  });
}

const preregDialog = document.getElementById('prereg-dialog');
const rejectDialog = document.getElementById('reject-dialog');

document.getElementById('btn-quick-prereg')?.addEventListener('click', () => openWorkflowTemplate('cadastrar_atleta'));
document.getElementById('btn-team-add-athlete')?.addEventListener('click', () => openWorkflowTemplate('cadastrar_atleta'));
document.getElementById('btn-pessoas-prereg')?.addEventListener('click', () => openWorkflowTemplate('cadastrar_atleta'));
document.getElementById('btn-go-to-team')?.addEventListener('click', () => setView('equipe'));

// -------------------------------------------------------------
// 4. Carregamento de Dados da API
// -------------------------------------------------------------
async function fetchMe() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (res.status === 401) {
      showLogin();
      return false;
    }
    if (!res.ok) throw new Error('Falha ao carregar a sessão.');

    const data = await res.json();
    currentUser = data.user;
    csrfToken = data.csrfToken;
    showAuthenticatedApp();

    // Atualizar cabeçalho e chip do usuário
    const profileNameEl = document.getElementById('profile-name');
    const profileInitialsEl = document.getElementById('profile-initials');
    const profileRoleEl = document.getElementById('profile-role');
    const tenantBannerEl = document.getElementById('tenant-banner-text');
    if (profileNameEl) profileNameEl.textContent = currentUser.fullName;
    if (profileInitialsEl) profileInitialsEl.textContent = currentUser.initials;
    const roleLabels = { coach: 'Editor', secretariat: 'Operações', coordination: 'Gestor', director: 'Leitor', admin: 'Administrador' };
    if (profileRoleEl) profileRoleEl.textContent = `${roleLabels[currentUser.role] || currentUser.role} · ${currentUser.organizationName || 'Workspace'}`;
    if (tenantBannerEl) tenantBannerEl.textContent = `${currentUser.organizationName || 'Workspace OSS'}`;
    const sidebarClubName = document.getElementById('sidebar-club-name');
    if (sidebarClubName) sidebarClubName.textContent = currentUser.organizationName;
    const isAdmin = currentUser.role === 'admin';
    const adminNavLabel = document.getElementById('admin-nav-label');
    const adminNav = document.getElementById('admin-nav');
    if (adminNavLabel) adminNavLabel.hidden = !isAdmin;
    if (adminNav) adminNav.hidden = !isAdmin;

    // Ajustar visibilidade de painéis legados se existirem, sem quebrar caso removidos
    const isCoach = currentUser.role === 'coach';
    const coachGrid = document.getElementById('coach-grid');
    const coordGrid = document.getElementById('coord-grid');
    const quickPreregBtn = document.getElementById('btn-quick-prereg');
    if (coachGrid) coachGrid.hidden = !isCoach;
    if (coordGrid) coordGrid.hidden = isCoach;
    if (quickPreregBtn) quickPreregBtn.hidden = !isCoach;

    const homeActions = {
      coach: ['Explorar módulos', 'catalogo-modulos', 'Adicione módulos, registre dados e acompanhe suas entregas no OSS.'],
      secretariat: ['Abrir processos', 'fluxos', 'Confira módulos ativos, solicitações e etapas de processos do workspace.'],
      coordination: ['Abrir automações', 'automacoes', 'Conecte módulos com fluxos visuais estilo n8n e acompanhe execuções.'],
      director: ['Ver módulos', 'meu-espaco', 'Acompanhe os apps, indicadores e registros autorizados do workspace.'],
      admin: ['Gerenciar acessos', 'accounts', 'Administre módulos, automações n8n, processos e acessos do workspace.']
    };
    const [actionLabel, actionName, caption] = homeActions[currentUser.role] || homeActions.coach;
    const roleActionButton = document.getElementById('btn-role-home-action');
    if (roleActionButton) {
      roleActionButton.textContent = actionLabel;
      roleActionButton.dataset.homeAction = actionName;
      roleActionButton.hidden = false;
    }
    const viewCaptionEl = document.getElementById('view-caption');
    if (viewCaptionEl) viewCaptionEl.textContent = caption;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const firstName = currentUser.fullName.split(/\s+/)[0];
    const homeHeadingEl = document.getElementById('home-heading');
    if (homeHeadingEl) homeHeadingEl.textContent = `${greeting}, ${firstName}`;

    // Carregar equipes para preencher os formulários e os resumos do workspace.
    await fetchTeams();

    // Carregar módulos no menu lateral e modelos de processo
    window.ModuleUI?.refreshModules?.().catch(() => {});
    const workflowTemplatesResponse = await apiFetch('/api/workflows/templates');
    if (workflowTemplatesResponse.ok) {
      const workflowTemplatesData = await workflowTemplatesResponse.json();
      applyPublishedWorkflowTemplates(workflowTemplatesData.templates || []);
    }
    return true;
  } catch (err) {
    console.error('Erro ao identificar usuário:', err);
    showLogin('Não foi possível conectar ao servidor. Tente novamente.');
    return false;
  }
}

document.getElementById('toggle-login-password')?.addEventListener('click', event => {
  const btn = event.currentTarget;
  const pwd = document.getElementById('login-password');
  if (!pwd) return;
  const show = pwd.type === 'password';
  pwd.type = show ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  btn.textContent = show ? 'Ocultar' : 'Mostrar';
});

document.getElementById('login-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = document.getElementById('login-submit');
  const formData = new FormData(form);
  submitButton.disabled = true;

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showLogin(data.message || 'E-mail ou senha inválidos.');
      return;
    }

    csrfToken = data.csrfToken;
    if (await fetchMe()) {
      form.reset();
      setView('meu-espaco');
    }
  } catch (err) {
    console.error('Erro ao entrar:', err);
    showLogin('Não foi possível conectar ao servidor. Tente novamente.');
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    const res = await apiFetch('/api/auth/logout', { method: 'POST' });
    if (res.status === 401) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showFeedback(data.message || 'Não foi possível encerrar a sessão.', true);
      return;
    }

    currentUser = null;
    csrfToken = null;
    document.getElementById('login-form')?.reset();
    showLogin('Sessão encerrada.');
    document.getElementById('login-email')?.focus();
  } catch (err) {
    console.error('Erro ao encerrar sessão:', err);
    showFeedback('Não foi possível conectar ao servidor.', true);
  }
});

async function fetchTeams() {
  try {
    const res = await apiFetch('/api/teams');
    const data = await res.json();
    currentTeams = data.teams || [];

    // Preencher select de equipes no modal de pré-cadastro
    const teamSelect = document.getElementById('prereg-team');
    if (teamSelect) {
      teamSelect.innerHTML = currentTeams.map(t => `<option value="${t.id}">${t.name} (${t.category} - ${t.modality})</option>`).join('');
    }

    // Se o usuário pertencer a outra org (ex: Alvorada), atualizar o selectedTeamId
    if (currentTeams.length > 0 && !currentTeams.some(t => t.id === selectedTeamId)) {
      selectedTeamId = currentTeams[0].id;
    }
    const homeActionButton = document.getElementById('btn-role-home-action');
    if (homeActionButton?.dataset.homeAction === 'attendance') {
      homeActionButton.disabled = currentTeams.length === 0;
      homeActionButton.title = currentTeams.length ? '' : 'Nenhuma equipe disponível para registrar presença.';
    }

    // Atualizar equipes na visão da coordenação
    const coordList = document.getElementById('coord-team-list');
    if (coordList) {
      coordList.innerHTML = currentTeams.map(t => `
        <li data-searchable>
          <strong>${t.category}</strong>
          <span>${t.name}</span>
          <span>${t.athlete_count || 0} atletas</span>
        </li>
      `).join('');
      document.getElementById('org-teams-count').textContent = `${currentTeams.length} equipes`;
    }
  } catch (err) {
    console.error('Erro ao carregar equipes:', err);
  }
}

async function loadHomeView() {
  await fetchPreRegistrations();
  await loadTeamPreview();
  await loadUserLayout();
  if (currentUser && currentUser.role !== 'coach') {
    await loadCoordinationSchedule();
  } else if (currentUser) {
    await Promise.all([loadCoachNextTraining(), loadCoachNextMatch()]);
  }
}

function localIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localClockTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function setCurrentDateDefaults() {
  const today = localIsoDate();
  const agendaDate = document.getElementById('agenda-date-picker');
  const reservationDate = document.getElementById('res-date');
  if (agendaDate && !agendaDate.value) agendaDate.value = today;
  if (reservationDate && !reservationDate.value) reservationDate.value = today;

  const dateNode = document.getElementById('home-current-date');
  if (dateNode) {
    const date = new Date(`${today}T12:00:00`);
    dateNode.dateTime = today;
    dateNode.textContent = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  }
  const agendaLabel = document.getElementById('agenda-date-label');
  if (agendaLabel) agendaLabel.textContent = `Visualizando reservas para ${formatDate(today)}`;
}

function formatStatusLabel(value) {
  const labels = {
    regular: 'Em dia', pendente: 'Precisa atualizar', pending: 'Pendente',
    approved: 'Aprovado', rejected: 'Recusado', missing: 'Não informado',
    active: 'Ativo', inactive: 'Inativo'
  };
  return labels[value] || value || 'Não informado';
}

async function loadCoachNextTraining() {
  try {
    const response = await apiFetch('/api/reservations');
    if (!response.ok) throw new Error('Falha ao carregar os treinos.');
    const data = await response.json();
    const today = localIsoDate();
    const nowTime = localClockTime();
    const next = (data.reservations || [])
      .filter(item => item.team_id === selectedTeamId && item.activity_type === 'training' && item.status === 'confirmed'
        && (item.date > today || (item.date === today && item.start_time >= nowTime)))
      .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))[0];

    const title = document.getElementById('coach-next-training-title');
    const time = document.getElementById('coach-next-training-time');
    const label = document.getElementById('coach-next-training-label');
    const venue = document.getElementById('coach-next-training-venue');
    const modality = document.getElementById('coach-next-training-modality');
    const attendance = document.querySelector('[data-attendance]');
    const detailsButton = document.getElementById('coach-training-details');
    const status = document.querySelector('.next-panel .status');
    if (!next) {
      if (title) title.textContent = 'Nenhum treino agendado';
      if (time) { time.textContent = '—'; time.removeAttribute('datetime'); }
      if (label) label.textContent = 'Próximo treino';
      if (venue) venue.textContent = '—';
      if (modality) modality.textContent = '—';
      if (attendance) attendance.disabled = true;
      if (detailsButton) detailsButton.disabled = true;
      if (status) {
        status.textContent = 'Sem treino';
        status.className = 'status status--pending';
      }
      return;
    }

    const isToday = next.date === today;
    if (title) title.textContent = next.title;
    if (time) {
      time.textContent = next.start_time;
      time.dateTime = `${next.date}T${next.start_time}`;
    }
    if (label) label.textContent = isToday ? `Hoje, às ${next.start_time}` : `${formatDate(next.date)}, às ${next.start_time}`;
    if (venue) venue.textContent = next.venue_name || 'Instalação não informada';
    if (modality) modality.textContent = currentTeams.find(team => team.id === selectedTeamId)?.modality || '—';
    if (attendance) {
      attendance.disabled = !isToday;
      attendance.title = isToday ? '' : 'A chamada fica disponível no dia do treino.';
    }
    if (detailsButton) detailsButton.disabled = false;
    const drawerDate = document.getElementById('activity-drawer-time');
    const drawerVenue = document.getElementById('activity-drawer-venue');
    const drawerModality = document.getElementById('activity-drawer-modality');
    const drawerTeam = document.getElementById('activity-drawer-team');
    const drawerStatus = document.getElementById('activity-drawer-status');
    if (drawerDate) drawerDate.textContent = `${formatDate(next.date)}, às ${next.start_time}`;
    if (drawerVenue) drawerVenue.textContent = next.venue_name || 'Instalação não informada';
    if (drawerModality) drawerModality.textContent = currentTeams.find(team => team.id === selectedTeamId)?.modality || '—';
    if (drawerTeam) drawerTeam.textContent = currentTeams.find(team => team.id === selectedTeamId)?.name || '—';
    if (drawerStatus) drawerStatus.textContent = 'Confirmado';
    if (status) {
      status.textContent = isToday ? 'Hoje' : 'Agendado';
      status.className = 'status status--scheduled';
    }
  } catch (error) {
    console.error('Erro ao carregar o próximo treino:', error);
  }
}

async function loadCoachNextMatch() {
  const opponent = document.getElementById('coach-next-match-opponent');
  const meta = document.getElementById('coach-next-match-meta');
  const dateLabel = document.getElementById('coach-next-match-date');
  const status = document.getElementById('coach-next-match-status');
  try {
    const response = await apiFetch('/api/competitions');
    if (!response.ok) throw new Error('Falha ao carregar as competições.');
    const data = await response.json();
    const details = await Promise.all((data.competitions || []).map(async competition => {
      const result = await apiFetch(`/api/competitions/${competition.id}`);
      if (!result.ok) return null;
      return result.json();
    }));
    const today = localIsoDate();
    const nowTime = localClockTime();
    const upcoming = details
      .filter(Boolean)
      .flatMap(item => (item.matches || []).map(match => ({ ...match, competition_name: item.competition.name })))
      .filter(match => match.team_id === selectedTeamId && !['finished', 'cancelled'].includes(match.status)
        && (match.match_date > today || (match.match_date === today && (!match.start_time || match.start_time >= nowTime))))
      .sort((a, b) => `${a.match_date} ${a.start_time || ''}`.localeCompare(`${b.match_date} ${b.start_time || ''}`))[0];

    if (!upcoming) {
      if (opponent) opponent.textContent = 'Nenhum jogo agendado';
      if (meta) meta.textContent = '';
      if (dateLabel) dateLabel.textContent = 'Próximos compromissos';
      if (status) status.textContent = 'Sem jogo';
      return;
    }
    if (opponent) opponent.textContent = `Contra ${upcoming.opponent_name}`;
    if (meta) meta.textContent = [upcoming.venue_name, upcoming.start_time].filter(Boolean).join(' · ');
    if (dateLabel) dateLabel.textContent = `${formatDate(upcoming.match_date)} · ${upcoming.competition_name}`;
    if (status) status.textContent = 'Agendado';
  } catch (error) {
    console.error('Erro ao carregar o próximo jogo:', error);
    if (opponent) opponent.textContent = 'Não foi possível carregar as partidas.';
    if (status) status.textContent = 'Indisponível';
  }
}

async function loadCoordinationSchedule() {
  const date = document.getElementById('agenda-date-picker')?.value || localIsoDate();
  const tbody = document.getElementById('coord-facility-summary');
  const note = document.getElementById('coord-conflict-note');
  if (!tbody) return;

  try {
    const response = await apiFetch(`/api/venues?date=${encodeURIComponent(date)}`);
    if (!response.ok) throw new Error('Falha ao carregar a agenda.');
    const data = await response.json();
    const venues = data.venues || [];
    const reservations = venues.flatMap(venue => (venue.reservations || []).map(item => ({
      ...item,
      venueName: venue.name
    })));

    if (venues.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.textContent = 'Nenhuma instalação cadastrada.';
      row.append(cell);
      tbody.replaceChildren(row);
    } else {
      const today = localIsoDate();
      const nowTime = localClockTime();
      const rows = venues.map(venue => {
        const allUses = (venue.reservations || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
        const nextUse = allUses.find(item => date !== today || item.start_time >= nowTime);
        const row = document.createElement('tr');
        const values = [
          venue.name,
          nextUse ? `${nextUse.title}${nextUse.team_name ? ` · ${nextUse.team_name}` : ''}` : allUses.length ? 'Agenda encerrada hoje' : 'Sem reserva cadastrada',
          nextUse ? `${nextUse.start_time}–${nextUse.end_time}` : '—'
        ];
        values.forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        });
        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        status.className = `status status--${nextUse ? 'busy' : allUses.length ? 'scheduled' : 'free'}`;
        status.textContent = nextUse ? 'Com reserva' : allUses.length ? 'Encerrada' : 'Sem reserva';
        statusCell.append(status);
        row.append(statusCell);
        return row;
      });
      tbody.replaceChildren(...rows);
    }

    let conflictCount = 0;
    const byVenue = new Map();
    reservations.forEach(item => {
      if (!byVenue.has(item.venueName)) byVenue.set(item.venueName, []);
      byVenue.get(item.venueName).push(item);
    });
    byVenue.forEach(items => {
      const ordered = items.slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let index = 0; index < ordered.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < ordered.length; nextIndex += 1) {
          if (ordered[nextIndex].start_time >= ordered[index].end_time) break;
          conflictCount += 1;
        }
      }
    });
    if (note) note.textContent = conflictCount
      ? `${conflictCount} conflito${conflictCount === 1 ? '' : 's'} de horário identificado${conflictCount === 1 ? '' : 's'} na agenda.`
      : 'Nenhum conflito de horário identificado para esta data.';
  } catch (error) {
    console.error('Erro ao carregar agenda da coordenação:', error);
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Não foi possível carregar a agenda.';
    row.append(cell);
    tbody.replaceChildren(row);
  }
}

async function loadTeamPreview() {
  if (!selectedTeamId) return;
  try {
    const res = await apiFetch(`/api/teams/${selectedTeamId}/roster`);
    if (res.status === 403 || res.status === 404) {
      return;
    }
    const data = await res.json();
    const athletes = data.athletes || [];
    const staff = data.staff || [];

    document.getElementById('my-team-name').textContent = data.team.name;
    document.getElementById('my-team-season').textContent = `Temporada ${data.team.season}`;
    document.getElementById('my-team-athletes-count').textContent = athletes.length;
    document.getElementById('my-team-staff').textContent = staff.map(s => s.full_name).join(', ') || 'Não definida';

    const rosterPreview = document.getElementById('coach-roster-preview');
    if (rosterPreview) {
      rosterPreview.innerHTML = athletes.slice(0, 5).map(a => `
        <li data-searchable>
          <span><strong>${a.full_name}</strong> (${a.position || 'Geral'})</span>
          <span class="status status--${a.biometry_status}">Bio: ${escapeHTML(formatStatusLabel(a.biometry_status))}</span>
        </li>
      `).join('');
      document.getElementById('roster-count-label').textContent = `${athletes.length} atletas cadastrados`;
    }
  } catch (err) {
    console.error('Erro ao carregar prévia da equipe:', err);
  }
}

async function loadTeamView(teamId) {
  if (!teamId) return;
  try {
    const res = await apiFetch(`/api/teams/${teamId}/roster`);
    if (res.status === 403) {
      showFeedback('Acesso negado: Este registro pertence a outro clube e não pode ser visualizado.', true);
      document.getElementById('team-view-name').textContent = 'Equipe indisponível (Outro Clube)';
      document.getElementById('athletes-roster-tbody').innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--color-error);">Acesso bloqueado pela política de segurança multitenant.</td></tr>`;
      return;
    }

    const data = await res.json();
    const team = data.team;
    const athletes = data.athletes || [];
    const staff = data.staff || [];

    document.getElementById('team-tenant-badge').textContent = currentUser.organizationName;
    document.getElementById('team-view-name').textContent = team.name;
    document.getElementById('team-view-category').textContent = `Categoria: ${team.category}`;
    document.getElementById('team-view-modality').textContent = `Modalidade: ${team.modality}`;
    document.getElementById('team-view-gender').textContent = `Gênero: ${team.gender}`;

    // Roster de Atletas
    const tbody = document.getElementById('athletes-roster-tbody');
    if (athletes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--color-muted);">Nenhum atleta vinculado ainda. Use o botão acima para pré-cadastrar.</td></tr>`;
    } else {
      tbody.innerHTML = athletes.map(a => `
        <tr data-searchable>
          <td><strong>${a.full_name}</strong></td>
          <td>${a.position || '—'}</td>
          <td>${a.guardian_name ? `${a.guardian_name} (${a.guardian_relationship})` : '—'}</td>
          <td><time datetime="${a.start_date}">${formatDate(a.start_date)}</time></td>
          <td><span class="status status--${a.biometry_status}">${escapeHTML(formatStatusLabel(a.biometry_status))}</span></td>
          <td><span class="status status--${a.telezaga_status}">${escapeHTML(formatStatusLabel(a.telezaga_status))}</span></td>
          <td><span class="status status--medical-${a.medical_status || 'apto'}">${a.medical_status === 'vencido' ? '⚠ Vencido' : (a.medical_status === 'pendente' ? 'Pendente' : 'Apto')}</span></td>
          <td><span class="status status--active">Ativo</span></td>
        </tr>
      `).join('');
    }

    // Roster da Comissão Técnica
    const staffTbody = document.getElementById('staff-roster-tbody');
    if (staff.length === 0) {
      staffTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--color-muted);">Nenhum profissional vinculado.</td></tr>`;
    } else {
      staffTbody.innerHTML = staff.map(s => `
        <tr data-searchable>
          <td><strong>${s.full_name}</strong></td>
          <td>${s.role_title}</td>
          <td>${s.registry_number || '—'}</td>
          <td>${s.phone || s.email || '—'}</td>
          <td><span class="status status--active">Ativo desde ${formatDate(s.start_date)}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar detalhes da equipe:', err);
    showFeedback('Não foi possível carregar a equipe.', true);
  }
}

async function loadPessoasView() {
  await fetchPreRegistrations();
  await fetchAllAthletes();
}

async function fetchPreRegistrations() {
  try {
    const res = await apiFetch('/api/pre-registrations');
    const data = await res.json();
    const items = data.preRegistrations || [];

    const pending = items.filter(i => i.status === 'pending_approval');
    const history = items.filter(i => i.status !== 'pending_approval');

    // Atualizar contadores
    const countBadge = document.getElementById('prereg-count-badge');
    if (countBadge) countBadge.textContent = `${pending.length} pendente${pending.length === 1 ? '' : 's'}`;

    const coachCount = document.getElementById('coach-pending-count');
    if (coachCount) coachCount.textContent = `${pending.length} item${pending.length === 1 ? '' : 's'}`;

    const coachList = document.getElementById('coach-pending-list');
    if (coachList) {
      coachList.innerHTML = pending.length ? pending.map(item => `
        <li data-searchable>
          <span class="task-marker task-marker--attention" aria-hidden="true"></span>
          <div><strong>Pré-cadastro em análise</strong><span>${escapeHTML(item.athlete_name)} · ${escapeHTML(item.team_name || 'Equipe não informada')}</span></div>
          <span class="status status--pending">Aguardando conferência</span>
        </li>
      `).join('') : '<li class="empty-state">Nenhum cadastro pendente.</li>';
    }

    // Renderizar fila de pré-cadastros na tela de Pessoas
    const container = document.getElementById('prereg-cards-container');
    const historyContainer = document.getElementById('prereg-history-container');
    const historyCount = document.getElementById('prereg-history-count');
    if (historyCount) historyCount.textContent = `${history.length} registro${history.length === 1 ? '' : 's'}`;
    const canApprove = ['secretariat', 'coordination', 'admin'].includes(currentUser?.role);
    const renderCards = records => records.length ? records.map(item => `
          <div class="prereg-card prereg-card--${item.status}">
            <div>
              <div class="prereg-card__head">
                <span class="prereg-card__title">${escapeHTML(item.athlete_name)}</span>
                <span class="status status--${item.status === 'pending_approval' ? 'pending' : (item.status === 'approved' ? 'active' : 'missing')}">
                  ${item.status === 'pending_approval' ? 'Aguardando Secretaria' : (item.status === 'approved' ? 'Aprovado' : 'Recusado')}
                </span>
              </div>
              <div class="prereg-card__details">
                <dl>
                  <dt>Equipe:</dt><dd><strong>${escapeHTML(item.team_name || 'Não informada')}</strong></dd>
                  <dt>Posição:</dt><dd>${escapeHTML(item.athlete_position || 'Não informada')}</dd>
                  <dt>Nascimento:</dt><dd>${item.athlete_birth_date ? formatDate(item.athlete_birth_date) : 'Não informado'}</dd>
                  <dt>Responsável:</dt><dd>${escapeHTML(item.guardian_name)} (${escapeHTML(item.guardian_relationship)})</dd>
                  <dt>Telefone:</dt><dd>${escapeHTML(item.guardian_phone)}</dd>
                  <dt>Enviado por:</dt><dd>${escapeHTML(item.created_by_name)}</dd>
                </dl>
                ${item.notes ? `<div class="prereg-card__notes"><strong>Obs:</strong> ${escapeHTML(item.notes)}</div>` : ''}
                ${item.rejection_reason ? `<div class="prereg-card__notes" style="border-color: var(--color-error); color: var(--color-error);"><strong>Motivo da recusa:</strong> ${escapeHTML(item.rejection_reason)}</div>` : ''}
              </div>
            </div>
            ${item.status === 'pending_approval' ? `
              <div class="prereg-card__actions">
                ${canApprove ? `
                  <button class="button button--primary" type="button" style="padding: 4px 12px; font-size: 0.8rem;" onclick="approvePreReg('${escapeHTML(item.id)}', '${escapeHTML(item.athlete_name)}')">
                    Aprovar cadastro
                  </button>
                  <button class="button button--quiet" type="button" style="padding: 4px 12px; font-size: 0.8rem; color: var(--color-error);" onclick="openRejectDialog('${escapeHTML(item.id)}')">
                    Recusar
                  </button>
                ` : `
                  <span style="font-size: 0.78rem; color: var(--color-muted);">Aguardando decisão da secretaria.</span>
                `}
              </div>
            ` : ''}
          </div>
        `).join('') : '<p class="empty-state">Nenhum registro nesta lista.</p>';
    if (container) container.innerHTML = renderCards(pending);
    if (historyContainer) historyContainer.innerHTML = renderCards(history);

    // Renderizar fila rápida no Meu Espaço da coordenação
    const quickQueue = document.getElementById('secretariat-quick-queue');
    if (quickQueue) {
      if (pending.length === 0) {
        quickQueue.innerHTML = `<p style="padding: var(--space-md); color: var(--color-muted); font-size: 0.88rem;">Não há pré-cadastros pendentes.</p>`;
      } else {
        quickQueue.innerHTML = pending.map(item => `
          <div style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--color-rule); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${item.athlete_name}</strong>
              <div style="font-size: 0.8rem; color: var(--color-muted);">${item.team_name} · Resp: ${item.guardian_name}</div>
            </div>
            ${canApprove ? `<button class="button button--primary" style="padding: 2px 8px; font-size: 0.75rem;" onclick="approvePreReg('${escapeHTML(item.id)}', '${escapeHTML(item.athlete_name)}')">Aprovar</button>` : '<span class="status status--pending">Aguardando secretaria</span>'}
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao buscar pré-cadastros:', err);
  }
}

async function fetchAllAthletes() {
  try {
    const res = await apiFetch('/api/people/athletes');
    const data = await res.json();
    const athletes = data.athletes || [];

    const tbody = document.getElementById('all-athletes-tbody');
    if (!tbody) return;

    if (athletes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--color-muted);">Nenhum atleta cadastrado no clube.</td></tr>`;
      return;
    }

    tbody.innerHTML = athletes.map(a => `
      <tr data-searchable data-athlete-id="${escapeHTML(a.id)}" tabindex="-1">
        <td><strong>${a.full_name}</strong></td>
        <td>${a.active_teams || '<span style="color:var(--color-muted)">Sem equipe</span>'}</td>
        <td>${a.guardian_name ? `${a.guardian_name} (${a.guardian_relationship})` : '—'}</td>
        <td>${a.guardian_phone || '—'}</td>
        <td><span class="status status--${a.biometry_status}">${escapeHTML(formatStatusLabel(a.biometry_status))}</span></td>
        <td><span class="status status--${a.telezaga_status}">${escapeHTML(formatStatusLabel(a.telezaga_status))}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao listar atletas:', err);
  }
}

// -------------------------------------------------------------
// 5. Ações Operacionais: Criar, Aprovar e Rejeitar Pré-Cadastro
// -------------------------------------------------------------
window.approvePreReg = async function(id, athleteName) {
  try {
    const res = await apiFetch(`/api/pre-registrations/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao aprovar pré-cadastro.', true);
      return;
    }

    showFeedback(`Solicitação aprovada. ${athleteName} agora faz parte da equipe.`);
    await fetchPreRegistrations();
    if (currentNav === 'equipe') {
      await loadTeamView(selectedTeamId);
    } else {
      await loadTeamPreview();
    }
  } catch (err) {
    console.error('Erro ao aprovar:', err);
    showFeedback('Erro de comunicação com o servidor.', true);
  }
};

window.openRejectDialog = function(id) {
  document.getElementById('reject-prereg-id').value = id;
  document.getElementById('reject-reason').value = '';
  rejectDialog.showModal();
};

document.getElementById('reject-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('reject-prereg-id').value;
  const reason = document.getElementById('reject-reason').value;

  try {
    const res = await apiFetch(`/api/pre-registrations/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao rejeitar.', true);
      return;
    }

    rejectDialog.close();
    showFeedback('Pré-cadastro recusado com justificativa.');
    await fetchPreRegistrations();
  } catch (err) {
    console.error('Erro ao rejeitar pré-cadastro:', err);
    showFeedback('Erro ao enviar recusa.', true);
  }
});

document.getElementById('prereg-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const payload = {
    team_id: document.getElementById('prereg-team').value,
    athlete_name: document.getElementById('prereg-athlete-name').value,
    athlete_birth_date: document.getElementById('prereg-athlete-birth').value,
    athlete_cpf: document.getElementById('prereg-athlete-cpf').value,
    athlete_position: document.getElementById('prereg-athlete-position').value,
    guardian_name: document.getElementById('prereg-guardian-name').value,
    guardian_relationship: document.getElementById('prereg-guardian-rel').value,
    guardian_phone: document.getElementById('prereg-guardian-phone').value,
    guardian_email: document.getElementById('prereg-guardian-email').value,
    notes: document.getElementById('prereg-notes').value
  };

  try {
    const res = await apiFetch('/api/pre-registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Não foi possível salvar o pré-cadastro.', true);
      return;
    }

    preregDialog.close();
    document.getElementById('prereg-form').reset();
    showFeedback(data.message);

    await fetchPreRegistrations();
    if (currentNav === 'equipe') {
      await loadTeamView(selectedTeamId);
    }
  } catch (err) {
    console.error('Erro ao criar pré-cadastro:', err);
    showFeedback('Erro ao conectar ao servidor.', true);
  }
});

// -------------------------------------------------------------
// 5.1 Agenda de Instalações e Reservas (Sprint 2)
// -------------------------------------------------------------
let currentVenues = [];
const reservationDialog = document.getElementById('reservation-dialog');
const cancelReservationDialog = document.getElementById('cancel-reservation-dialog');

document.getElementById('btn-open-new-reservation')?.addEventListener('click', () => {
  openReservationDialog();
});

// Botão Solicitar Jogo na Tela B
document.querySelector('#view-equipe button[data-feedback*="solicitação de jogos"]')?.addEventListener('click', e => {
  e.stopImmediatePropagation();
  openReservationDialog(null, 'match', 'Jogo Oficial / Amistoso');
});

// Botões "Ver agenda" e "Abrir agenda" no Meu Espaço
document.querySelectorAll('button[data-feedback*="agenda completa"]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopImmediatePropagation();
    setView('agenda');
  });
});

window.openReservationDialog = function(venueId = null, activityType = 'training', title = '') {
  document.getElementById('modal-conflict-box').style.display = 'none';
  const venueSelect = document.getElementById('res-venue');
  if (venueId && venueSelect) {
    venueSelect.value = venueId;
  }
  const typeSelect = document.getElementById('res-type');
  if (typeSelect) typeSelect.value = activityType;
  const titleInput = document.getElementById('res-title');
  if (titleInput && title) titleInput.value = title;
  const teamSelect = document.getElementById('res-team');
  if (teamSelect && selectedTeamId) teamSelect.value = selectedTeamId;
  const reservationDate = document.getElementById('res-date');
  if (reservationDate) reservationDate.value = document.getElementById('agenda-date-picker')?.value || localIsoDate();

  if (reservationDialog) reservationDialog.showModal();
};

window.openCancelReservationDialog = function(resId) {
  document.getElementById('cancel-reservation-id').value = resId;
  document.getElementById('cancel-res-reason').value = '';
  if (cancelReservationDialog) cancelReservationDialog.showModal();
};

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function renderAgendaSchedule(venues) {
  const grid = document.getElementById('agenda-schedule-grid');
  if (!grid) return;

  const bookings = venues.flatMap(venue => (venue.reservations || [])
    .filter(reservation => reservation.status === 'confirmed')
    .map(reservation => ({ ...reservation, venue_name: venue.name })));

  if (bookings.length === 0) {
    grid.innerHTML = `
      <div class="schedule-empty-state">
        <span class="schedule-empty-state__mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17"></path></svg></span>
        <div><strong>Sem reservas confirmadas nesta data</strong><span>Escolha outro dia ou crie uma reserva para começar a preencher a grade.</span></div>
      </div>
    `;
    return;
  }

  const starts = bookings.map(item => timeToMinutes(item.start_time));
  const ends = bookings.map(item => timeToMinutes(item.end_time));
  const rangeStart = Math.floor(Math.min(...starts) / 60) * 60;
  const rangeEnd = Math.min(24 * 60, Math.ceil(Math.max(...ends) / 60) * 60 || rangeStart + 60);
  const hourCount = Math.max(1, (rangeEnd - rangeStart) / 60);
  const hourLabels = Array.from({ length: hourCount }, (_, index) => rangeStart + index * 60);
  const formatHour = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`;

  const axis = `
    <div class="schedule-axis" role="row">
      <span class="schedule-lane-label" role="columnheader">Instalação</span>
      <div class="schedule-axis__track" role="columnheader" style="--hour-count:${hourCount}">
        ${hourLabels.map(minutes => `<span>${formatHour(minutes)}</span>`).join('')}
        <span class="schedule-axis__end">${formatHour(rangeEnd)}</span>
      </div>
    </div>
  `;

  const lanes = venues.map(venue => {
    const venueBookings = (venue.reservations || []).filter(item => item.status === 'confirmed');
    const events = venueBookings.map(item => {
      const left = Math.max(0, (timeToMinutes(item.start_time) - rangeStart) / (hourCount * 60) * 100);
      const width = Math.max(0, (timeToMinutes(item.end_time) - timeToMinutes(item.start_time)) / (hourCount * 60) * 100);
      const type = ['training', 'match'].includes(item.activity_type) ? item.activity_type : 'other';
      const typeLabels = { training: 'Treino', match: 'Jogo', maintenance: 'Manutenção', event: 'Evento' };
      const isCompact = width < 19;
      const label = `${typeLabels[item.activity_type] || 'Atividade'}: ${item.title}, ${item.start_time} às ${item.end_time}${item.team_name ? `, ${item.team_name}` : ''}`;
      return `
        <div class="schedule-event schedule-event--${type}${isCompact ? ' schedule-event--compact' : ''}"
             style="--event-left:${left}%;--event-width:${width}%"
             role="group" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">
          <span class="schedule-event__time">${escapeHTML(item.start_time)}–${escapeHTML(item.end_time)}</span>
          <strong class="schedule-event__title">${escapeHTML(item.title)}</strong>
          <span class="schedule-event__team">${escapeHTML(item.team_name || 'Atividade do clube')}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="schedule-lane" role="row">
        <div class="schedule-lane-label" role="rowheader">
          <strong>${escapeHTML(venue.name)}</strong>
          <span>${escapeHTML(venue.allowed_modalities || 'Instalação esportiva')}</span>
        </div>
        <div class="schedule-lane__track" role="cell" style="--hour-count:${hourCount}">
          <div class="schedule-lane__grid" aria-hidden="true">${hourLabels.map(() => '<i></i>').join('')}</div>
          ${events || '<span class="schedule-lane__empty">Sem reservas confirmadas</span>'}
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = `<div class="schedule-grid" role="table" aria-label="Reservas confirmadas por instalação e horário">${axis}${lanes}</div>`;
}

async function loadAgendaView() {
  const dateInput = document.getElementById('agenda-date-picker');
  if (dateInput && !dateInput.value) dateInput.value = localIsoDate();
  const targetDate = dateInput?.value || localIsoDate();

  try {
    const [resVenues, resList] = await Promise.all([
      apiFetch(`/api/venues?date=${targetDate}`),
      apiFetch(`/api/reservations?date=${targetDate}`)
    ]);

    const dataVenues = await resVenues.json();
    const dataList = await resList.json();

    currentVenues = dataVenues.venues || [];
    const reservations = dataList.reservations || [];
    renderAgendaSchedule(currentVenues);

    // Preencher select de instalações no modal
    const venueSelect = document.getElementById('res-venue');
    if (venueSelect) {
      venueSelect.innerHTML = currentVenues.map(v => `<option value="${v.id}">${v.name} (${v.allowed_modalities})</option>`).join('');
    }

    // Preencher select de equipes no modal
    const teamSelect = document.getElementById('res-team');
    if (teamSelect) {
      teamSelect.innerHTML = '<option value="">Nenhuma equipe específica</option>' +
        currentTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }

    // Atualizar cabeçalho da agenda
    const dateLabel = document.getElementById('agenda-date-label');
    if (dateLabel) dateLabel.textContent = `Visualizando reservas para ${formatDate(targetDate)}`;

    const countLabel = document.getElementById('agenda-reservations-count');
    if (countLabel) {
      const activeCount = reservations.filter(r => r.status === 'confirmed').length;
      countLabel.textContent = `${activeCount} reserva${activeCount === 1 ? '' : 's'} ativa${activeCount === 1 ? '' : 's'}`;
    }

    // Renderizar tabela de instalações
    const tbody = document.getElementById('agenda-venues-tbody');
    if (tbody) {
      tbody.innerHTML = currentVenues.map(v => {
        const activeRes = (v.reservations || []).filter(r => r.status === 'confirmed');
        const isFree = activeRes.length === 0;

        return `
          <tr data-searchable data-venue-id="${escapeHTML(v.id)}" tabindex="-1">
            <td><strong>${v.name}</strong></td>
            <td>${v.allowed_modalities}</td>
            <td>${v.capacity ? `${v.capacity} pessoas` : '—'}</td>
            <td>
              ${isFree ? '<span style="color: var(--color-muted);">Nenhum horário reservado</span>' :
                activeRes.map(r => `<div><strong>${r.start_time} às ${r.end_time}</strong>: ${r.title}</div>`).join('')
              }
            </td>
            <td>
              <span class="status status--${isFree ? 'free' : 'busy'}">${isFree ? 'Livre' : 'Reservada'}</span>
            </td>
            <td>
              <button class="button button--quiet" style="padding: 2px 8px; font-size: 0.75rem;" onclick="openReservationDialog('${v.id}')">
                Reservar
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Renderizar linha cronológica de atividades
    const timelineTbody = document.getElementById('agenda-timeline-tbody');
    if (timelineTbody) {
      if (reservations.length === 0) {
        timelineTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--color-muted);">Nenhuma atividade agendada para esta data.</td></tr>`;
      } else {
        timelineTbody.innerHTML = reservations.map(r => `
          <tr data-searchable>
            <td><strong>${r.start_time} às ${r.end_time}</strong></td>
            <td>${r.venue_name}</td>
            <td><strong>${r.title}</strong></td>
            <td>${r.team_name || 'Geral'}</td>
            <td>${r.created_by_name}</td>
            <td>
              <span class="status status--${r.status === 'confirmed' ? 'scheduled' : 'missing'}">
                ${r.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
              </span>
              ${r.cancelled_reason ? `<div style="font-size: 0.72rem; color: var(--color-error); margin-top: 2px;">${r.cancelled_reason}</div>` : ''}
            </td>
            <td>
              ${r.status === 'confirmed' ? `
                <button class="button button--quiet" style="padding: 2px 8px; font-size: 0.75rem; color: var(--color-error);" onclick="openCancelReservationDialog('${r.id}')">
                  Cancelar
                </button>
              ` : '<span style="color: var(--color-muted); font-size: 0.75rem;">Horário liberado</span>'}
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar agenda:', err);
    showFeedback('Não foi possível carregar a agenda.', true);
  }
}

// Alteração de data na agenda
document.getElementById('agenda-date-picker')?.addEventListener('change', () => {
  loadAgendaView();
});

document.querySelectorAll('[data-agenda-shift]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById('agenda-date-picker');
    if (!input?.value) return;
    const [year, month, day] = input.value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    date.setDate(date.getDate() + Number(button.dataset.agendaShift));
    input.value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    loadAgendaView();
  });
});

// Envio do formulário de reserva
document.getElementById('reservation-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const payload = {
    venue_id: document.getElementById('res-venue').value,
    date: document.getElementById('res-date').value,
    start_time: document.getElementById('res-start').value,
    end_time: document.getElementById('res-end').value,
    title: document.getElementById('res-title').value,
    team_id: document.getElementById('res-team').value || null,
    activity_type: document.getElementById('res-type').value
  };

  try {
    const res = await apiFetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.status === 409) {
      // Conflito detectado
      const conflictBox = document.getElementById('modal-conflict-box');
      const conflictMsg = document.getElementById('modal-conflict-msg');
      const altList = document.getElementById('modal-alternatives-list');

      conflictBox.style.display = 'block';
      conflictMsg.textContent = data.message;

      if (data.availableAlternatives && data.availableAlternatives.length > 0) {
        altList.innerHTML = '<span style="font-size: 0.78rem; font-weight: 600;">Opções livres:</span> ' +
          data.availableAlternatives.map(alt => `
            <button type="button" class="button button--quiet" style="padding: 2px 6px; font-size: 0.75rem;" onclick="document.getElementById('res-venue').value='${alt.id}'; document.getElementById('modal-conflict-box').style.display='none';">
              Trocar para ${alt.name}
            </button>
          `).join('');
      } else {
        altList.innerHTML = '<span style="font-size: 0.78rem; color: var(--color-muted);">Nenhuma outra instalação disponível neste horário.</span>';
      }
      return;
    }

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao realizar reserva.', true);
      return;
    }

    reservationDialog.close();
    showFeedback(data.message);
    await loadAgendaView();
  } catch (err) {
    console.error('Erro na solicitação de reserva:', err);
    showFeedback('Erro de conexão com o servidor.', true);
  }
});

// Envio do formulário de cancelamento de reserva
document.getElementById('cancel-reservation-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('cancel-reservation-id').value;
  const reason = document.getElementById('cancel-res-reason').value;

  try {
    const res = await apiFetch(`/api/reservations/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao cancelar.', true);
      return;
    }

    cancelReservationDialog.close();
    showFeedback(data.message);
    await loadAgendaView();
  } catch (err) {
    console.error('Erro ao cancelar reserva:', err);
    showFeedback('Erro de conexão ao cancelar reserva.', true);
  }
});

// -------------------------------------------------------------
// Busca Global em Tempo Real
// -------------------------------------------------------------
function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function updateSearch() {
  const query = normalize(searchInput.value.trim());
  const activeView = document.querySelector('.main-view:not([hidden])');
  if (!activeView) return;

  const items = Array.from(activeView.querySelectorAll('[data-searchable]'));
  let visibleCount = 0;

  items.forEach(item => {
    const matches = !query || normalize(item.textContent).includes(query);
    item.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  if (emptySearch) {
    emptySearch.hidden = !query || visibleCount > 0;
  }

  if (searchFeedbackEl) {
    searchFeedbackEl.textContent = query
      ? `${visibleCount} item${visibleCount === 1 ? '' : 'ns'} encontrado${visibleCount === 1 ? '' : 's'} nesta tela.`
      : '';
  }
}

searchInput?.addEventListener('input', updateSearch);
searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    updateSearch();
    searchInput.blur();
  }
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchInput?.focus();
  }
});

// -------------------------------------------------------------
// 5.2 Fluxos de Processo (Sprint 3)
// -------------------------------------------------------------
let currentWorkflowInstances = [];
let selectedWorkflowId = null;
let selectedWorkflowTemplate = null;
const workflowDrawer = document.getElementById('workflow-drawer');
const startWorkflowDialog = document.getElementById('start-workflow-dialog');

const workflowRoleLabels = {
  coach: 'Editor', secretariat: 'Operações', coordination: 'Gestor',
  director: 'Leitor', admin: 'Administrador', any: 'Qualquer papel'
};

let workflowTemplates = Object.create(null);
let publishedWorkflowTemplates = [];
let adminWorkflowTemplates = [];

function workflowStatus(status, preview = false) {
  if (preview) return { label: 'Etapa do modelo', className: 'preview' };
  if (status === 'completed') return { label: 'Concluída', className: 'completed' };
  if (status === 'in_progress') return { label: 'Em andamento', className: 'in_progress' };
  return { label: 'Aguardando etapa anterior', className: 'blocked' };
}

function renderWorkflowSteps(container, steps, instance = null) {
  if (!container) return;
  const preview = !instance;
  const itemsHtml = steps.map((step, index) => {
    const status = workflowStatus(step.status, preview);
    const role = workflowRoleLabels[step.role_required] || step.role_required;
    return `
      <li class="workflow-step">
        <button class="workflow-node workflow-node--${status.className}" type="button" data-step-index="${index}" ${step.status === 'in_progress' ? 'aria-current="step"' : ''} aria-label="Etapa ${step.step_order}: ${escapeHTML(step.title)}. ${status.label}. Responsável: ${escapeHTML(role)}.">
          <span class="workflow-node__top"><span class="workflow-node__step">Etapa ${step.step_order}</span><span class="workflow-node__dot" aria-hidden="true"></span></span>
          <strong class="workflow-node__title">${escapeHTML(step.title)}</strong>
          <span class="workflow-node__role">${escapeHTML(role)}</span>
          <span class="workflow-node__status">${status.label}</span>
          ${!preview && step.completed_by_name ? `<span class="workflow-node__byline">Concluída por ${escapeHTML(step.completed_by_name)}</span>` : ''}
        </button>
      </li>
    `;
  }).join('');
  const stepList = container.tagName.toLowerCase() === 'ol' ? container : null;
  if (stepList) {
    stepList.innerHTML = itemsHtml;
    stepList.style.setProperty('--step-count', steps.length);
  } else {
    container.innerHTML = `<ol class="workflow-steps" style="--step-count:${steps.length}">${itemsHtml}</ol>`;
  }
  const listRoot = stepList || container.querySelector('.workflow-steps');
  listRoot?.querySelectorAll('[data-step-index]').forEach(button => {
    button.addEventListener('click', () => window.openWorkflowStepDrawer(steps[Number(button.dataset.stepIndex)], instance));
  });
}

function setWorkflowPanels({ preview = false, empty = false } = {}) {
  const showList = document.getElementById('btn-wf-view-list')?.getAttribute('aria-pressed') === 'true';
  document.getElementById('wf-template-preview').hidden = !preview;
  document.getElementById('wf-empty-state').hidden = !empty;
  document.getElementById('workflow-instance-header').hidden = preview || empty;
  document.getElementById('wf-graph-wrapper').hidden = preview || empty || showList;
  document.getElementById('wf-list-wrapper').hidden = preview || empty || !showList;
  document.getElementById('wf-history-panel').hidden = preview || empty;
}

function applyPublishedWorkflowTemplates(templates) {
  publishedWorkflowTemplates = templates.filter(template => template.status === 'active' && template.version_status === 'published');
  workflowTemplates = Object.fromEntries(publishedWorkflowTemplates.map(template => [template.template_key, {
    title: template.name,
    name: template.name,
    description: template.description || '',
    startLabel: 'Iniciar processo',
    titlePlaceholder: `Ex.: ${template.name}`,
    steps: (template.steps || []).map(step => ({ ...step, checklist: Array.isArray(step.checklist) ? step.checklist : [] }))
  }]));

  const options = document.getElementById('workflow-template-options');
  if (options) {
    options.innerHTML = publishedWorkflowTemplates.length ? publishedWorkflowTemplates.map(template => `
      <button class="workflow-template-option" type="button" data-workflow-template="${escapeHTML(template.template_key)}">
        <span class="workflow-template-option__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h5v5H5zM14 14h5v5h-5zM10 7.5h3a2 2 0 0 1 2 2V14M14 16.5h-3a2 2 0 0 1-2-2V10"></path></svg></span>
        <span><strong>${escapeHTML(template.name)}</strong><small>${escapeHTML(template.description || `${template.steps?.length || 0} etapas em sequência`)}</small></span>
        <svg class="workflow-template-option__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
      </button>
    `).join('') : '<p class="admin-empty">Ainda não há processos publicados. Peça à administração do clube para publicar um modelo.</p>';
    options.querySelectorAll('[data-workflow-template]').forEach(button => {
      button.addEventListener('click', () => openWorkflowTemplate(button.dataset.workflowTemplate));
    });
  }

  const select = document.getElementById('wf-tpl-select');
  if (select) {
    select.innerHTML = '<option value="">Selecione um modelo</option>' + publishedWorkflowTemplates.map(template =>
      `<option value="${escapeHTML(template.template_key)}">${escapeHTML(template.name)}</option>`
    ).join('');
  }
}

function renderWorkflowTemplatePreview(templateKey) {
  const template = workflowTemplates[templateKey];
  if (!template) return;
  selectedWorkflowTemplate = templateKey;
  document.getElementById('wf-preview-title').textContent = template.title;
  document.getElementById('wf-preview-description').textContent = template.description;
  const steps = template.steps.map((step, index) => ({ ...step, step_order: index + 1, status: 'preview' }));
  renderWorkflowSteps(document.getElementById('wf-preview-steps'), steps);
  document.getElementById('btn-start-template').textContent = template.startLabel || 'Iniciar processo';
  setWorkflowPanels({ preview: true });
}

function openWorkflowTemplate(templateKey) {
  if (!workflowTemplates[templateKey]) return;
  selectedWorkflowTemplate = templateKey;
  setView('fluxos');
}

function showWorkflowTemplateChooser() {
  setWorkflowPanels({ empty: true });
}

document.getElementById('btn-open-start-wf')?.addEventListener('click', () => {
  selectedWorkflowTemplate = null;
  const templateSelect = document.getElementById('wf-tpl-select');
  if (templateSelect && !templateSelect.value && publishedWorkflowTemplates[0]) {
    templateSelect.value = publishedWorkflowTemplates[0].template_key;
  }
  const dialogHeading = startWorkflowDialog?.querySelector('.dialog__heading h2');
  if (dialogHeading) dialogHeading.textContent = 'Iniciar novo processo';
  if (startWorkflowDialog) startWorkflowDialog.showModal();
});

document.querySelectorAll('[data-workflow-template]').forEach(button => {
  button.addEventListener('click', () => openWorkflowTemplate(button.dataset.workflowTemplate));
});

document.getElementById('btn-back-to-workflows')?.addEventListener('click', () => {
  selectedWorkflowTemplate = null;
  loadWorkflowsView();
});

document.getElementById('btn-start-template')?.addEventListener('click', () => {
  const template = workflowTemplates[selectedWorkflowTemplate];
  if (!template) return;
  document.getElementById('wf-tpl-select').value = selectedWorkflowTemplate;
  document.getElementById('wf-new-title').placeholder = template.titlePlaceholder || `Ex.: ${template.title}`;
  const dialogHeading = startWorkflowDialog?.querySelector('.dialog__heading h2');
  if (dialogHeading) dialogHeading.textContent = template.startLabel;
  if (startWorkflowDialog) startWorkflowDialog.showModal();
});

document.getElementById('btn-team-request-match')?.addEventListener('click', () => {
  openWorkflowTemplate('agendar_jogo');
});

document.getElementById('btn-wf-view-graph')?.addEventListener('click', () => {
  document.getElementById('btn-wf-view-graph').setAttribute('aria-pressed', 'true');
  document.getElementById('btn-wf-view-list').setAttribute('aria-pressed', 'false');
  document.getElementById('btn-wf-view-graph').classList.add('active');
  document.getElementById('btn-wf-view-list').classList.remove('active');
  document.getElementById('wf-graph-wrapper').hidden = false;
  document.getElementById('wf-list-wrapper').hidden = true;
});

document.getElementById('btn-wf-view-list')?.addEventListener('click', () => {
  document.getElementById('btn-wf-view-list').setAttribute('aria-pressed', 'true');
  document.getElementById('btn-wf-view-graph').setAttribute('aria-pressed', 'false');
  document.getElementById('btn-wf-view-list').classList.add('active');
  document.getElementById('btn-wf-view-graph').classList.remove('active');
  document.getElementById('wf-graph-wrapper').hidden = true;
  document.getElementById('wf-list-wrapper').hidden = false;
});

async function loadWorkflowsView() {
  try {
    const templateRes = await apiFetch('/api/workflows/templates');
    if (!templateRes.ok) {
      showFeedback('Não foi possível carregar os processos publicados.', true);
      return;
    }
    const templateData = await templateRes.json();
    applyPublishedWorkflowTemplates(templateData.templates || []);

    const res = await apiFetch('/api/workflows/instances');
    if (res.status === 403) {
      showFeedback('Acesso negado: fluxos de outro clube.', true);
      return;
    }
    const data = await res.json();
    currentWorkflowInstances = data.instances || [];

    if (selectedWorkflowTemplate) {
      renderWorkflowTemplatePreview(selectedWorkflowTemplate);
      return;
    }

    if (currentWorkflowInstances.length === 0) {
      selectedWorkflowId = null;
      const emptySelect = document.getElementById('wf-instance-select');
      if (emptySelect) emptySelect.innerHTML = '<option value="">Nenhum processo iniciado</option>';
      showWorkflowTemplateChooser();
      return;
    }

    const selectEl = document.getElementById('wf-instance-select');
    if (selectEl) {
      selectEl.innerHTML = currentWorkflowInstances.map(inst => `
        <option value="${escapeHTML(inst.id)}" ${inst.id === selectedWorkflowId ? 'selected' : ''}>
          ${escapeHTML(inst.title)} (${inst.completed_steps}/${inst.total_steps} etapas)
        </option>
      `).join('');

      if (!selectedWorkflowId || !currentWorkflowInstances.some(i => i.id === selectedWorkflowId)) {
        selectedWorkflowId = currentWorkflowInstances[0].id;
        selectEl.value = selectedWorkflowId;
      }
    }

    if (selectedWorkflowId) {
      await loadWorkflowDetails(selectedWorkflowId);
    }
  } catch (err) {
    console.error('Erro ao listar fluxos:', err);
  }
}

document.getElementById('wf-instance-select')?.addEventListener('change', async e => {
  selectedWorkflowId = e.target.value;
  await loadWorkflowDetails(selectedWorkflowId);
});

async function loadWorkflowDetails(instanceId) {
  try {
    const res = await apiFetch(`/api/workflows/instances/${instanceId}`);
    if (!res.ok) {
      showFeedback('Não foi possível carregar o processo.', true);
      return;
    }
    const data = await res.json();
    const instance = data.instance;
    const steps = data.steps || [];
    const events = data.events || [];
    selectedWorkflowTemplate = null;
    setWorkflowPanels();

    document.getElementById('wf-instance-title').textContent = instance.title;
    document.getElementById('wf-instance-meta').textContent = `${instance.template_name} · Iniciado por ${instance.created_by_name} em ${formatDate(instance.created_at.split(' ')[0])}`;

    const statusBadge = document.getElementById('wf-instance-status');
    if (statusBadge) {
      const isDone = instance.status === 'completed';
      statusBadge.textContent = isDone ? 'Concluído' : 'Em andamento';
      statusBadge.className = `status status--${isDone ? 'active' : 'scheduled'}`;
    }

    const completedCount = steps.filter(s => s.status === 'completed').length;
    document.getElementById('wf-progress-label').textContent = `${completedCount} de ${steps.length} etapas concluídas`;
    const nextStep = steps.find(step => step.status === 'in_progress')
      || steps.find(step => ['pending', 'blocked'].includes(step.status));
    const nextStepMeta = nextStep
      ? ` · Próxima ação: ${nextStep.title} (${workflowRoleLabels[nextStep.role_required] || nextStep.role_required})`
      : ' · Todas as etapas foram concluídas';
    document.getElementById('wf-instance-meta').textContent += nextStepMeta;

    // Etapas semânticas, navegáveis por teclado e com um detalhe por botão.
    renderWorkflowSteps(document.getElementById('wf-graph-canvas'), steps, instance);

    // 2. Renderizar Modo Lista
    const listContainer = document.getElementById('wf-list-container');
    if (listContainer) {
      listContainer.innerHTML = steps.map((step, index) => {
        const status = workflowStatus(step.status);
        const role = workflowRoleLabels[step.role_required] || step.role_required;
        return `
          <div class="workflow-list-item workflow-list-item--${status.className}">
            <div class="workflow-list-num">${step.step_order}</div>
            <div>
              <strong>${escapeHTML(step.title)}</strong>
              <div class="workflow-list-role">Responsável: ${escapeHTML(role)}</div>
              ${step.completed_by_name ? `<div class="workflow-list-completed">Concluída por ${escapeHTML(step.completed_by_name)}</div>` : ''}
            </div>
            <span class="workflow-list-status workflow-list-status--${status.className}">${status.label}</span>
            <button class="button button--quiet workflow-list-action" type="button" data-list-step-index="${index}">Ver etapa</button>
          </div>
        `;
      }).join('');
      listContainer.querySelectorAll('[data-list-step-index]').forEach(button => {
        button.addEventListener('click', () => window.openWorkflowStepDrawer(steps[Number(button.dataset.listStepIndex)], instance));
      });
    }

    // 3. Renderizar Histórico / Linha do Tempo
    const timeline = document.getElementById('wf-timeline-container');
    if (timeline) {
      if (events.length === 0) {
        timeline.innerHTML = '<p style="color: var(--color-muted); font-size: 0.85rem;">Nenhum evento registrado ainda.</p>';
      } else {
        timeline.innerHTML = events.map(evt => `
          <div class="workflow-timeline-item">
            <time>${formatDate(evt.created_at.split(' ')[0])} ${escapeHTML(evt.created_at.split(' ')[1] || '')}</time>
            <div>
              <strong>${escapeHTML(evt.user_name)}</strong>: ${escapeHTML(evt.details)}
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar detalhes do fluxo:', err);
  }
}

window.openWorkflowStepDrawer = function(step, instance) {
  document.getElementById('wf-drawer-step-title').textContent = `${step.step_order}. ${step.title}`;
  document.getElementById('wf-drawer-role').textContent = workflowRoleLabels[step.role_required] || step.role_required;

  const statusEl = document.getElementById('wf-drawer-status');
  statusEl.textContent = instance ? workflowStatus(step.status).label : 'Prévia do modelo';

  const templateKey = instance?.template_key || selectedWorkflowTemplate;
  const guide = workflowTemplates[templateKey]?.steps.find(item => item.node_key === step.node_key);
  document.getElementById('wf-drawer-instruction').textContent = step.instruction || guide?.instruction || 'Confira as informações disponíveis e registre o que foi feito ou o que ainda falta.';
  let checklist = null;
  try { checklist = step.checklist_json ? JSON.parse(step.checklist_json) : null; } catch {}
  document.getElementById('wf-drawer-checklist').innerHTML = (checklist || guide?.checklist || ['Conferir as informações disponíveis', 'Registrar a decisão ou a pendência']).map(item => `<li>${escapeHTML(item)}</li>`).join('');
  document.getElementById('wf-drawer-note').textContent = guide?.note || 'As etapas seguem as regras configuradas para o clube.';

  const actionContainer = document.getElementById('wf-drawer-action-container');

  if (!instance) {
    actionContainer.innerHTML = `
      <div class="workflow-drawer-preview">
        <strong>Roteiro de referência</strong>
        <p>Este modelo explica o caminho do processo. Inicie um cadastro para registrar dados e acompanhar cada etapa.</p>
      </div>
    `;
  } else if (step.status === 'completed') {
    actionContainer.innerHTML = `
      <div class="workflow-action-message workflow-action-message--success">
        <strong>Etapa finalizada com sucesso.</strong>
        <div>Concluída por ${escapeHTML(step.completed_by_name || 'Usuário')} em ${escapeHTML(step.completed_at || 'data registrada')}.</div>
        ${step.action_data_json ? `<pre>${escapeHTML(step.action_data_json)}</pre>` : ''}
      </div>
    `;
  } else if (step.status === 'blocked') {
    actionContainer.innerHTML = `
      <div class="workflow-action-message workflow-action-message--blocked">
        <strong>Etapa bloqueada.</strong>
        <p>Esta etapa depende da conclusão da etapa anterior. Você já pode consultar as instruções acima.</p>
      </div>
    `;
  } else {
    // Em andamento: verificar permissão do usuário logado
    const isAuthorized = currentUser?.role === 'admin' || step.role_required === 'any' || step.role_required === currentUser?.role;

    if (!isAuthorized) {
      actionContainer.innerHTML = `
        <div class="workflow-action-message workflow-action-message--restricted">
          <strong>Ação restrita a ${escapeHTML(workflowRoleLabels[step.role_required] || step.role_required)}.</strong>
          <p>Você está autenticado como <strong>${escapeHTML(currentUser.fullName)} (${escapeHTML(workflowRoleLabels[currentUser.role] || currentUser.role)})</strong>. A etapa continua disponível para consulta.</p>
        </div>
      `;
    } else {
      actionContainer.innerHTML = `
        ${step.node_key === 'dados_basicos' ? `
          <div class="workflow-action-message workflow-action-message--support">
            <strong>Primeiro, envie o pré-cadastro do atleta.</strong>
            <p>Depois de salvar o formulário, retorne a esta etapa e registre a conferência para continuar.</p>
            <button class="button button--quiet" type="button" id="wf-open-prereg-from-step">Abrir formulário de pré-cadastro</button>
          </div>
        ` : ''}
        <form id="wf-step-exec-form">
          <p class="workflow-action-intro">
            Registre o que foi conferido ou decidido. A próxima etapa só é liberada quando você concluir esta.
          </p>
          <div class="form-group">
            <label for="wf-step-notes">Observação da etapa *</label>
            <textarea id="wf-step-notes" class="form-textarea" required placeholder="Descreva o que foi conferido ou o que falta."></textarea>
          </div>
          <button class="button button--primary workflow-action-submit" type="submit">
            Concluir etapa
          </button>
        </form>
      `;

      document.getElementById('wf-open-prereg-from-step')?.addEventListener('click', () => {
        workflowDrawer.close();
        preregDialog?.showModal();
      });

      document.getElementById('wf-step-exec-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const notes = document.getElementById('wf-step-notes').value;

        try {
          const execRes = await apiFetch(`/api/workflows/instances/${encodeURIComponent(instance.id)}/steps/${encodeURIComponent(step.node_key)}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
          });
          const execData = await execRes.json();

          if (!execRes.ok) {
            showFeedback(execData.message || 'Erro ao executar etapa.', true);
            return;
          }

          workflowDrawer.close();
          showFeedback(execData.message);
          await loadWorkflowDetails(instance.id);
        } catch (err) {
          console.error('Erro ao executar etapa:', err);
          showFeedback('Erro ao conectar ao servidor.', true);
        }
      });
    }
  }

  if (workflowDrawer) workflowDrawer.showModal();
};

document.getElementById('start-workflow-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const templateKey = document.getElementById('wf-tpl-select').value;
  const title = document.getElementById('wf-new-title').value;

  try {
    const res = await apiFetch('/api/workflows/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_key: templateKey, title })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao iniciar fluxo.', true);
      return;
    }

    startWorkflowDialog.close();
    document.getElementById('start-workflow-form').reset();
    showFeedback(data.message);

    selectedWorkflowId = data.instance.id;
    selectedWorkflowTemplate = null;
    await loadWorkflowsView();
  } catch (err) {
    console.error('Erro ao iniciar processo:', err);
    showFeedback('Erro de conexão ao iniciar fluxo.', true);
  }
});


// -------------------------------------------------------------
// 5.3 Competições, Súmulas e Dossiês (Sprint 4)
// -------------------------------------------------------------
let currentCompetitions = [];
let selectedCompetitionId = 'comp_metropolitano';
let activeDossierData = null;

const attachSumulaDialog = document.getElementById('modal-attach-sumula');
const matchResultDialog = document.getElementById('modal-match-result');
const dossierDialog = document.getElementById('modal-dossier-preview');

async function loadCompetitionsView() {
  try {
    const res = await apiFetch('/api/competitions');
    if (res.status === 403) {
      showFeedback('Acesso negado: competições de outro clube.', true);
      return;
    }
    const data = await res.json();
    currentCompetitions = data.competitions || [];

    if (currentCompetitions.length === 0) {
      showFeedback('Nenhuma competição cadastrada para o seu clube.');
      return;
    }

    if (!currentCompetitions.some(c => c.id === selectedCompetitionId)) {
      selectedCompetitionId = currentCompetitions[0].id;
    }

    await loadCompetitionDetails(selectedCompetitionId);
  } catch (err) {
    console.error('Erro ao listar competições:', err);
  }
}

async function loadCompetitionDetails(compId) {
  try {
    const res = await apiFetch(`/api/competitions/${compId}`);
    if (!res.ok) {
      showFeedback('Não foi possível carregar a competição.', true);
      return;
    }
    const data = await res.json();
    const comp = data.competition;
    const matches = data.matches || [];
    const attachments = data.attachments || [];
    const pendingItems = data.pendingItems || [];

    document.getElementById('comp-tenant-badge').textContent = currentUser.organizationName;
    document.getElementById('comp-title').textContent = comp.name;
    document.getElementById('comp-location').textContent = `Local: ${comp.location}`;
    document.getElementById('comp-period').textContent = `${formatDate(comp.start_date)} até ${formatDate(comp.end_date)}`;
    document.getElementById('comp-matches-count').textContent = `${matches.length} jogo${matches.length === 1 ? '' : 's'}`;

    // Alerta de Pendências
    const pendingBox = document.getElementById('comp-pending-alert-box');
    const pendingList = document.getElementById('comp-pending-list-container');
    if (pendingItems.length > 0) {
      pendingBox.style.display = 'block';
      pendingList.innerHTML = pendingItems.map(p => `
        <div style="margin-top: 4px;">• <strong>${p.title}</strong> — ${p.message}</div>
      `).join('');
    } else {
      pendingBox.style.display = 'none';
    }

    // Tabela de Partidas
    const matchesTbody = document.getElementById('comp-matches-tbody');
    if (matchesTbody) {
      matchesTbody.innerHTML = matches.map(m => {
        const isFinished = m.status === 'finished';
        const hasSumula = Boolean(m.sumula_attachment_id);
        const scoreLabel = isFinished ? `${m.score_home} x ${m.score_away}` : 'A disputar';

        return `
          <tr data-searchable>
            <td><strong>${formatDate(m.match_date)}</strong> às ${m.start_time}</td>
            <td>${m.home_or_away === 'home' ? 'Em casa' : 'Fora'}</td>
            <td><strong>${m.opponent_name}</strong></td>
            <td>
              <span class="status status--${isFinished ? 'active' : 'scheduled'}">
                ${scoreLabel} (${isFinished ? 'Finalizado' : 'Agendado'})
              </span>
            </td>
            <td>
              <span class="status status--${hasSumula ? 'active' : (isFinished ? 'missing' : 'disabled')}">
                ${hasSumula ? 'Anexada' : (isFinished ? 'Pendente' : 'Aguardando jogo')}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 4px;">
                ${!isFinished ? `
                  <button class="button button--quiet" style="padding: 2px 6px; font-size: 0.75rem;" onclick="openMatchResultDialog('${m.id}', '${m.opponent_name}')">
                    Placar
                  </button>
                ` : ''}
                <button class="button button--primary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="openAttachSumulaDialog('${m.id}', '${m.opponent_name}')">
                  ${hasSumula ? 'Atualizar Súmula' : 'Anexar Súmula'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Tabela de Documentos Anexados
    const attTbody = document.getElementById('comp-attachments-tbody');
    if (attTbody) {
      if (attachments.length === 0) {
        attTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--color-muted);">Nenhum documento anexado ainda.</td></tr>`;
      } else {
        attTbody.innerHTML = attachments.map(a => `
          <tr data-searchable>
            <td><strong>${a.file_name}</strong></td>
            <td>${a.file_type === 'sumula' ? 'Súmula oficial' : a.file_type}</td>
            <td>${(a.file_size / 1024).toFixed(1)} KB</td>
            <td>${a.uploaded_by_name}</td>
            <td>${formatDate(a.created_at.split(' ')[0])}</td>
            <td><span class="status status--active">Acesso Restrito ao Clube</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar detalhes da competição:', err);
  }
}

window.openAttachSumulaDialog = function(matchId, opponentName) {
  document.getElementById('attach-match-id').value = matchId;
  document.getElementById('attach-match-info').textContent = `Envio de súmula oficial do confronto contra ${opponentName}:`;
  document.getElementById('attach-file-name').value = `sumula_jogo_${opponentName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  if (attachSumulaDialog) attachSumulaDialog.showModal();
};

window.openMatchResultDialog = function(matchId, opponentName) {
  document.getElementById('result-match-id').value = matchId;
  document.getElementById('result-match-info').textContent = `Informe o resultado final contra ${opponentName}:`;
  if (matchResultDialog) matchResultDialog.showModal();
};

document.getElementById('attach-sumula-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const matchId = document.getElementById('attach-match-id').value;
  const fileName = document.getElementById('attach-file-name').value;
  const fileType = document.getElementById('attach-file-type').value;

  try {
    const res = await apiFetch(`/api/competitions/matches/${matchId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: fileName, file_type: fileType })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao anexar arquivo.', true);
      return;
    }

    attachSumulaDialog.close();
    showFeedback(data.message);
    await loadCompetitionDetails(selectedCompetitionId);
  } catch (err) {
    console.error('Erro ao anexar documento:', err);
    showFeedback('Erro ao enviar documento.', true);
  }
});

document.getElementById('match-result-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const matchId = document.getElementById('result-match-id').value;
  const scoreHome = document.getElementById('score-home').value;
  const scoreAway = document.getElementById('score-away').value;

  try {
    const res = await apiFetch(`/api/competitions/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score_home: scoreHome, score_away: scoreAway })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao salvar resultado.', true);
      return;
    }

    matchResultDialog.close();
    showFeedback(data.message);
    await loadCompetitionDetails(selectedCompetitionId);
  } catch (err) {
    console.error('Erro ao salvar placar:', err);
    showFeedback('Erro ao comunicar com o servidor.', true);
  }
});

// Exportar Dossiê Documental
document.getElementById('btn-export-dossier')?.addEventListener('click', async () => {
  try {
    const res = await apiFetch(`/api/competitions/${selectedCompetitionId}/dossier`);
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao gerar dossiê.', true);
      return;
    }

    activeDossierData = data;
    const dossier = data.dossier;

    const previewBody = document.getElementById('dossier-preview-body');
    previewBody.innerHTML = `
      <div style="background: var(--color-paper-3); padding: var(--space-md); border: 1px solid var(--color-rule); margin-bottom: var(--space-md);">
        <strong>${dossier.titulo}</strong>
        <div>Clube Emissor: ${dossier.clube} · Gerado por: ${dossier.gerado_por}</div>
        <div>Data de Emissão: ${formatDate(dossier.data_emissao.split('T')[0])}</div>
        <div style="margin-top: 6px;">
          <span class="status status--${dossier.pendencias_identificadas.length === 0 ? 'active' : 'missing'}">
            ${dossier.status_conformidade}
          </span>
        </div>
      </div>

      <h4>Documentos Consolidados no Manifesto (${dossier.documentos_anexados.length}):</h4>
      <ul style="padding-left: 20px; margin: 8px 0 16px;">
        ${dossier.documentos_anexados.length > 0
          ? dossier.documentos_anexados.map(d => `<li><strong>${d.file_name}</strong> (${(d.file_size/1024).toFixed(1)} KB) — Enviado por ${d.uploaded_by}</li>`).join('')
          : '<li>Nenhum documento anexado</li>'}
      </ul>

      ${dossier.pendencias_identificadas.length > 0 ? `
        <div style="padding: var(--space-sm); background: var(--color-alert-soft); border: 1px solid var(--color-alert-rule); color: var(--color-alert-ink); margin-bottom: var(--space-md);">
          <strong>Ressalvas Documentais Identificadas:</strong>
          <ul style="padding-left: 18px; margin: 4px 0 0;">
            ${dossier.pendencias_identificadas.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    if (dossierDialog) dossierDialog.showModal();
  } catch (err) {
    console.error('Erro ao gerar dossiê:', err);
    showFeedback('Não foi possível compilar o dossiê.', true);
  }
});

document.getElementById('btn-download-dossier-json')?.addEventListener('click', () => {
  if (!activeDossierData) return;
  const jsonStr = JSON.stringify(activeDossierData.dossier, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = activeDossierData.downloadFileName;
  a.click();
  URL.revokeObjectURL(url);
  showFeedback('Download do manifesto do dossiê concluído.');
  dossierDialog.close();
});

// -------------------------------------------------------------
// 5.4 Chamada Rápida e Projetos CBC (Sprint 5)
// -------------------------------------------------------------
let currentProjects = [];
let selectedProjectId = 'proj_cbc_2026';
let activeCbcReportData = null;
const quickAttendanceDialog = document.getElementById('modal-quick-attendance');

// Conectar os atalhos de chamada às presenças da equipe
document.querySelectorAll('button[data-attendance]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopImmediatePropagation();
    openQuickAttendanceModal(selectedTeamId, localIsoDate());
  });
});

window.openQuickAttendanceModal = async function(teamId, date) {
  const targetTeamId = teamId || selectedTeamId;
  const targetDate = date || localIsoDate();

  document.getElementById('attendance-team-id').value = targetTeamId;
  document.getElementById('attendance-date').value = targetDate;
  document.getElementById('attendance-dialog-info').textContent = `Frequência da equipe para a atividade de ${formatDate(targetDate)}:`;

  const rosterList = document.getElementById('attendance-roster-list');
  rosterList.innerHTML = '<p style="padding: 12px; color: var(--color-muted);">Carregando atletas...</p>';

  if (quickAttendanceDialog) quickAttendanceDialog.showModal();

  try {
    const res = await apiFetch(`/api/attendance?team_id=${targetTeamId}&date=${targetDate}`);
    const data = await res.json();
    const roster = data.roster || [];

    if (roster.length === 0) {
      rosterList.innerHTML = '<p style="padding: 12px; color: var(--color-muted);">Nenhum atleta vinculado a esta equipe.</p>';
      return;
    }

    rosterList.innerHTML = roster.map(a => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--color-rule); background: var(--color-paper-2);">
        <div>
          <strong>${a.full_name}</strong>
          <span style="font-size: 0.78rem; color: var(--color-muted); margin-left: 6px;">(${a.position || 'Geral'})</span>
        </div>
        <div style="display: flex; gap: 6px;" class="attendance-radios" data-ath-id="${a.athlete_id}">
          <label style="font-size: 0.75rem; cursor: pointer; padding: 3px 8px; border: 1px solid var(--color-rule); border-radius: 2px;">
            <input type="radio" name="att_${a.athlete_id}" value="present" ${a.status === 'present' || a.status === 'not_recorded' ? 'checked' : ''}> Presente
          </label>
          <label style="font-size: 0.75rem; cursor: pointer; padding: 3px 8px; border: 1px solid var(--color-rule); border-radius: 2px;">
            <input type="radio" name="att_${a.athlete_id}" value="absent" ${a.status === 'absent' ? 'checked' : ''}> Falta
          </label>
          <label style="font-size: 0.75rem; cursor: pointer; padding: 3px 8px; border: 1px solid var(--color-rule); border-radius: 2px;">
            <input type="radio" name="att_${a.athlete_id}" value="justified" ${a.status === 'justified' ? 'checked' : ''}> Justificada
          </label>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar lista de presença:', err);
    rosterList.innerHTML = '<p style="color: var(--color-error); padding: 12px;">Não foi possível carregar os atletas.</p>';
  }
};

document.getElementById('attendance-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamId = document.getElementById('attendance-team-id').value;
  const date = document.getElementById('attendance-date').value;

  const records = [];
  document.querySelectorAll('.attendance-radios').forEach(el => {
    const athleteId = el.dataset.athId;
    const selected = el.querySelector('input:checked');
    if (selected) {
      records.push({
        athlete_id: athleteId,
        status: selected.value
      });
    }
  });

  try {
    const res = await apiFetch('/api/attendance/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, date, records })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao registrar chamada.', true);
      return;
    }

    quickAttendanceDialog.close();
    showFeedback(data.message);
    if (currentNav === 'projetos') {
      await loadProjectsView();
    }
  } catch (err) {
    console.error('Erro ao salvar presença:', err);
    showFeedback('Erro de conexão ao salvar presença.', true);
  }
});

// View de Projetos e Relatórios
async function loadProjectsView() {
  try {
    const res = await apiFetch('/api/projects');
    if (res.status === 403) {
      showFeedback('Acesso negado: projetos de outro clube.', true);
      return;
    }
    const data = await res.json();
    currentProjects = data.projects || [];

    if (currentProjects.length === 0) {
      showFeedback('Nenhum projeto cadastrado.');
      return;
    }

    if (!currentProjects.some(p => p.id === selectedProjectId)) {
      selectedProjectId = currentProjects[0].id;
    }

    await Promise.all([loadProjectReport(selectedProjectId), loadProjectRequirements(selectedProjectId)]);
  } catch (err) {
    console.error('Erro ao listar projetos:', err);
  }
}

async function loadProjectReport(projectId) {
  const start = document.getElementById('proj-filter-start')?.value || '2026-11-01';
  const end = document.getElementById('proj-filter-end')?.value || '2026-11-30';

  try {
    const res = await apiFetch(`/api/projects/${projectId}/reports?date_from=${start}&date_to=${end}`);
    const data = await res.json();
    activeCbcReportData = data;
    const report = data.report;

    document.getElementById('proj-tenant-badge').textContent = currentUser.organizationName;
    document.getElementById('proj-instrument-badge').textContent = `Instrumento: ${report.cabecalho.tipo_instrumento}`;
    document.getElementById('proj-name').textContent = report.cabecalho.instrumento;
    document.getElementById('proj-term').textContent = report.cabecalho.termo_compromisso;
    document.getElementById('proj-period').textContent = `Período: ${report.cabecalho.periodo_analisado}`;

    // Indicadores
    document.getElementById('ind-beneficiaries').textContent = report.resumo_indicadores.total_beneficiarios_ativos;
    document.getElementById('ind-planned').textContent = report.resumo_indicadores.treinos_previstos_agenda;
    document.getElementById('ind-executed').textContent = report.resumo_indicadores.treinos_com_chamada_executada;
    document.getElementById('ind-attendance-rate').textContent = report.resumo_indicadores.taxa_media_assiduidade;
    document.getElementById('ind-attendance-details').textContent = `${report.resumo_indicadores.presencas_confirmadas} presenças, ${report.resumo_indicadores.faltas_justificadas} justificadas`;

    // Tabela de Beneficiários
    const tbody = document.getElementById('proj-beneficiaries-tbody');
    if (tbody) {
      tbody.innerHTML = (report.beneficiarios || []).map(b => `
        <tr data-searchable>
          <td><strong>${b.full_name}</strong></td>
          <td>${formatDate(b.birth_date)}</td>
          <td>${b.position || '—'}</td>
          <td><time datetime="${b.data_inicio_vinculo}">${formatDate(b.data_inicio_vinculo)}</time></td>
          <td><span class="status status--${b.biometry_status}">${b.biometry_status}</span></td>
          <td>${b.nome_responsavel ? `${b.nome_responsavel} (${b.telefone_responsavel})` : '—'}</td>
        </tr>
      `).join('');
      document.getElementById('proj-beneficiaries-count').textContent = `${(report.beneficiarios || []).length} atletas`;
    }
  } catch (err) {
    console.error('Erro ao carregar relatório do projeto:', err);
  }
}

document.getElementById('btn-filter-proj-report')?.addEventListener('click', () => {
  loadProjectReport(selectedProjectId);
  loadProjectRequirements(selectedProjectId);
});

document.getElementById('btn-export-project-csv')?.addEventListener('click', async () => {
  if (!selectedProjectId) return;
  const type = document.getElementById('proj-export-type')?.value || 'beneficiaries';
  const start = document.getElementById('proj-filter-start')?.value || '';
  const end = document.getElementById('proj-filter-end')?.value || '';
  const button = document.getElementById('btn-export-project-csv');
  button.disabled = true;
  try {
    const params = new URLSearchParams({ date_from: start, date_to: end });
    const response = await apiFetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/exports/${encodeURIComponent(type)}?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Não foi possível gerar o CSV.');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || `exportacao_${type}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback(`CSV gerado (${response.headers.get('x-export-model-version') || 'versão 1'}). Confira o instrumento antes de usar em prestação externa.`);
  } catch (err) {
    showFeedback(err.message || 'Erro ao gerar o CSV.', true);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('btn-export-cbc-report')?.addEventListener('click', () => {
  if (!activeCbcReportData) return;
  const jsonStr = JSON.stringify(activeCbcReportData.report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = activeCbcReportData.exportFileName;
  a.click();
  URL.revokeObjectURL(url);
  showFeedback('Download do relatório de prestação de contas CBC concluído.');
});

const requirementForm = document.getElementById('project-requirement-form');
const requirementList = document.getElementById('project-requirements-list');
const requirementAssignee = document.getElementById('requirement-assignee');
const requirementStatusLabels = {
  pending: 'Pendente',
  in_review: 'Em revisão',
  reviewed: 'Revisado pelo clube',
  needs_action: 'Precisa de ajuste',
  submitted: 'Submetido externamente',
  waived: 'Dispensado com justificativa'
};
const requirementAllowedTransitions = {
  pending: ['in_review', 'waived'],
  in_review: ['pending', 'reviewed', 'needs_action', 'waived'],
  reviewed: ['in_review', 'needs_action'],
  needs_action: ['pending', 'in_review', 'waived'],
  submitted: ['in_review', 'needs_action'],
  waived: ['pending']
};

async function loadProjectRequirements(projectId) {
  if (!projectId || !requirementList) return;
  const canManageRequirements = ['admin', 'coordination', 'secretariat'].includes(currentUser?.role);
  if (requirementForm) requirementForm.hidden = !canManageRequirements;
  requirementList.innerHTML = '<p class="empty-state">Carregando obrigações…</p>';
  try {
    const [requirementsResponse, assigneesResponse] = await Promise.all([
      apiFetch(`/api/projects/${encodeURIComponent(projectId)}/requirements`),
      apiFetch(`/api/projects/${encodeURIComponent(projectId)}/requirement-assignees`)
    ]);
    const requirementsData = await requirementsResponse.json();
    if (!requirementsResponse.ok) {
      requirementList.innerHTML = `<p class="empty-state">${escapeHTML(requirementsData.message || 'Não foi possível carregar os requisitos.')}</p>`;
      return;
    }
    if (canManageRequirements && requirementAssignee && assigneesResponse.ok) {
      const assigneesData = await assigneesResponse.json();
      requirementAssignee.innerHTML = '<option value="">Selecione uma pessoa</option>' + (assigneesData.users || []).map(user =>
        `<option value="${escapeHTML(user.id)}">${escapeHTML(user.full_name)} · ${escapeHTML(user.role)}</option>`
      ).join('');
    }
    renderProjectRequirements(requirementsData.requirements || [], projectId, canManageRequirements);
  } catch (error) {
    console.error('Erro ao carregar obrigações do projeto:', error);
    requirementList.innerHTML = '<p class="empty-state">Não foi possível carregar as obrigações agora.</p>';
  }
}

function renderProjectRequirements(requirements, projectId, canManage) {
  if (!requirementList) return;
  if (!requirements.length) {
    requirementList.innerHTML = '<p class="empty-state">Nenhuma obrigação cadastrada. Confira o instrumento e adicione apenas os requisitos confirmados.</p>';
    return;
  }

  requirementList.innerHTML = requirements.map(item => {
    const evidence = item.evidence || [];
    const submissions = item.submissions || [];
    const events = item.events || [];
    const statusLabel = requirementStatusLabels[item.status] || item.status;
    const dueLabel = item.due_date ? formatDate(item.due_date) : 'Sem prazo definido';
    const eventLabels = {
      requirement_created: 'Obrigação cadastrada',
      status_changed: 'Estado alterado',
      evidence_added: 'Evidência anexada',
      external_submission_recorded: 'Envio externo registrado'
    };
    const source = item.regulation_url
      ? `<a href="${escapeHTML(item.regulation_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.regulation_name)}</a>`
      : escapeHTML(item.regulation_name);
    const workflow = canManage ? `
      <div class="compliance-requirement__actions">
        ${item.status === 'reviewed' || item.status === 'submitted' ? `
          <form class="compliance-submission-form" data-requirement-id="${escapeHTML(item.id)}">
            <div class="form-field"><label>Canal externo</label><input type="text" name="channel" maxlength="160" required placeholder="Ex.: Comitê Digital"></div>
            <div class="form-field"><label>Protocolo/recibo (opcional)</label><input type="text" name="protocol_reference" maxlength="200" placeholder="Número de protocolo"></div>
            <button class="button button--quiet" type="submit">Registrar envio</button>
          </form>` : ''}
        ${item.status !== 'submitted' && item.status !== 'waived' ? `
          <form class="compliance-transition-form" data-requirement-id="${escapeHTML(item.id)}">
            <div class="form-field"><label>Atualizar estado</label><select name="status" required>
              ${(requirementAllowedTransitions[item.status] || []).map(status => `<option value="${status}">${requirementStatusLabels[status]}</option>`).join('')}
            </select></div>
            <div class="form-field"><label>Nota ou justificativa</label><input type="text" name="note" maxlength="1000" placeholder="Obrigatória para dispensa"></div>
            <button class="button button--quiet" type="submit">Salvar estado</button>
          </form>` : ''}
        ${item.status === 'submitted' ? `
          <form class="compliance-transition-form" data-requirement-id="${escapeHTML(item.id)}">
            <input type="hidden" name="status" value="needs_action">
            <div class="form-field"><label>Retorno/diligência</label><input type="text" name="note" maxlength="1000" required placeholder="Descreva o retorno recebido"></div>
            <button class="button button--quiet" type="submit">Registrar retorno</button>
          </form>` : ''}
        ${item.status === 'waived' ? `
          <form class="compliance-transition-form" data-requirement-id="${escapeHTML(item.id)}">
            <input type="hidden" name="status" value="pending">
            <button class="button button--quiet" type="submit">Reabrir obrigação</button>
          </form>` : ''}
        ${item.status !== 'waived' ? `
          <form class="compliance-evidence-form" data-requirement-id="${escapeHTML(item.id)}">
            <div class="form-field"><label>Adicionar evidência (máx. 3 MiB)</label><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx" required></div>
            <div class="form-field"><label>Descrição</label><input type="text" name="description" maxlength="1000" placeholder="O que este arquivo comprova?"></div>
            <button class="button button--quiet" type="submit">Anexar</button>
          </form>` : ''}
      </div>` : '';

    return `<article class="compliance-requirement">
      <div class="compliance-requirement__header">
        <div><h3>${escapeHTML(item.title)}</h3><div class="compliance-requirement__meta"><span>${source}</span>${item.regulation_version ? `<span>Versão: ${escapeHTML(item.regulation_version)}</span>` : ''}${item.article_reference ? `<span>${escapeHTML(item.article_reference)}</span>` : ''}<span>Prazo: ${escapeHTML(dueLabel)}</span><span>Responsável: ${escapeHTML(item.responsible_name || 'Não atribuído')}</span></div></div>
        <span class="status compliance-status--${escapeHTML(item.status)}">${escapeHTML(statusLabel)}</span>
      </div>
      ${item.description ? `<p class="compliance-requirement__body">${escapeHTML(item.description)}</p>` : ''}
      ${item.evidence_expected ? `<p class="compliance-requirement__body"><strong>Evidência esperada:</strong> ${escapeHTML(item.evidence_expected)}</p>` : ''}
      ${item.status_note ? `<p class="compliance-requirement__body"><strong>Nota:</strong> ${escapeHTML(item.status_note)}</p>` : ''}
      ${evidence.length ? `<ul class="compliance-evidence-list"><strong>Evidências anexadas</strong>${evidence.map(file => `<li><a href="/api/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(item.id)}/evidence/${encodeURIComponent(file.id)}/download">${escapeHTML(file.file_name)}</a> · ${Math.ceil(file.file_size / 1024)} KiB${file.description ? ` — ${escapeHTML(file.description)}` : ''}</li>`).join('')}</ul>` : '<p class="compliance-requirement__body">Nenhuma evidência anexada.</p>'}
      ${submissions.length ? `<ul class="compliance-submission-list"><strong>Envios externos registrados</strong>${submissions.map(submission => `<li>${escapeHTML(submission.channel)} · ${escapeHTML(new Date(submission.submitted_at).toLocaleString('pt-BR'))}${submission.protocol_reference ? ` · protocolo ${escapeHTML(submission.protocol_reference)}` : ''}${submission.notes ? ` — ${escapeHTML(submission.notes)}` : ''}</li>`).join('')}</ul>` : ''}
      ${events.length ? `<details class="compliance-history"><summary>Histórico de alterações (${events.length})</summary><ul>${events.map(event => {
        let details = {};
        try { details = JSON.parse(event.details || '{}'); } catch {}
        const context = event.action === 'status_changed'
          ? `${requirementStatusLabels[details.from] || details.from || ''} → ${requirementStatusLabels[details.to] || details.to || ''}`
          : event.action === 'evidence_added' ? details.file_name || ''
            : event.action === 'external_submission_recorded' ? details.channel || ''
              : details.regulation_name || '';
        return `<li><time>${escapeHTML(new Date(event.created_at).toLocaleString('pt-BR'))}</time> · ${escapeHTML(eventLabels[event.action] || event.action)} · ${escapeHTML(event.user_name)}${context ? ` — ${escapeHTML(context)}` : ''}</li>`;
      }).join('')}</ul></details>` : ''}
      ${workflow}
    </article>`;
  }).join('');
}

requirementForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const formData = new FormData(requirementForm);
  const body = Object.fromEntries(formData.entries());
  const submit = requirementForm.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const response = await apiFetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/requirements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Não foi possível adicionar o requisito.');
    requirementForm.reset();
    await loadProjectRequirements(selectedProjectId);
    showFeedback('Obrigação adicionada ao projeto.');
  } catch (error) {
    showFeedback(error.message, true);
  } finally {
    if (submit) submit.disabled = false;
  }
});

requirementList?.addEventListener('submit', async event => {
  const form = event.target.closest('form');
  if (!form) return;
  event.preventDefault();
  const requirementId = form.dataset.requirementId;
  const formData = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    let response;
    if (form.classList.contains('compliance-evidence-form')) {
      const file = formData.get('file');
      if (!file || !file.size) throw new Error('Escolha um arquivo antes de anexar.');
      if (file.size > 3 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 3 MiB.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
        reader.readAsDataURL(file);
      });
      response = await apiFetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/requirements/${encodeURIComponent(requirementId)}/evidence`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: file.name, mime_type: file.type, file_content_base64: dataUrl, description: formData.get('description') })
      });
    } else if (form.classList.contains('compliance-submission-form')) {
      response = await apiFetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/requirements/${encodeURIComponent(requirementId)}/submissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: formData.get('channel'), protocol_reference: formData.get('protocol_reference') })
      });
    } else {
      response = await apiFetch(`/api/projects/${encodeURIComponent(selectedProjectId)}/requirements/${encodeURIComponent(requirementId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: formData.get('status'), note: formData.get('note') })
      });
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Não foi possível atualizar a obrigação.');
    await loadProjectRequirements(selectedProjectId);
    showFeedback('Obrigação atualizada.');
  } catch (error) {
    showFeedback(error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
});

// -------------------------------------------------------------
// 5.5 Personalização de Meu Espaço (Sprint 6)
// -------------------------------------------------------------
const customizeLayoutDialog = document.getElementById('modal-customize-layout');
let currentUserWidgets = [];

document.getElementById('btn-open-customize-layout')?.addEventListener('click', () => {
  openCustomizeLayoutModal();
});

async function loadUserLayout() {
  try {
    const res = await apiFetch('/api/settings/layout');
    const data = await res.json();
    currentUserWidgets = data.widgets || [];

    // Mapeamento dos widgets no DOM
    const widgetClassMap = {
      team_panel: document.querySelector('.team-panel'),
      next_panel: document.querySelector('.next-panel'),
      agenda_panel: document.querySelector('.agenda-panel'),
      pending_panel: document.querySelector('.pending-panel'),
      roster_panel: document.querySelector('.roster-panel'),
      facility_panel: document.querySelector('.facility-panel'),
      teams_panel: document.querySelector('.teams-panel')
    };

    currentUserWidgets.forEach(w => {
      const el = widgetClassMap[w.id];
      if (el) {
        el.style.display = w.visible ? '' : 'none';
      }
    });
  } catch (err) {
    console.error('Erro ao carregar layout do usuário:', err);
  }
}

function openCustomizeLayoutModal() {
  const container = document.getElementById('customize-widgets-list');
  if (!container) return;

  container.innerHTML = currentUserWidgets.map(w => `
    <label style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--color-rule); background: var(--color-paper-2); cursor: pointer;">
      <span style="font-size: 0.88rem; font-weight: 600; color: var(--color-ink);">${w.label}</span>
      <input type="checkbox" data-widget-id="${w.id}" ${w.visible ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-accent);">
    </label>
  `).join('');

  if (customizeLayoutDialog) customizeLayoutDialog.showModal();
}

document.getElementById('customize-layout-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const updatedWidgets = currentUserWidgets.map(w => {
    const cb = document.querySelector(`input[data-widget-id="${w.id}"]`);
    return {
      ...w,
      visible: cb ? cb.checked : true
    };
  });

  try {
    const res = await apiFetch('/api/settings/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: updatedWidgets })
    });
    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || 'Erro ao salvar layout.', true);
      return;
    }

    customizeLayoutDialog.close();
    showFeedback(data.message);
    await loadUserLayout();
  } catch (err) {
    console.error('Erro ao salvar layout:', err);
    showFeedback('Erro de conexão ao salvar personalização.', true);
  }
});

document.getElementById('btn-reset-layout')?.addEventListener('click', async () => {
  try {
    const res = await apiFetch('/api/settings/layout/reset', { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      customizeLayoutDialog.close();
      showFeedback(data.message);
      await loadUserLayout();
    }
  } catch (err) {
    console.error('Erro ao restaurar layout:', err);
  }
});

// ==========================================
// SPRINT 7: VIAGENS, DIÁRIAS E PRESTAÇÃO DE CONTAS
// ==========================================
let currentSelectedTripId = null;
const tripDetailsDialog = document.getElementById('modal-trip-details');
const createTripDialog = document.getElementById('modal-create-trip');
const addExpenseDialog = document.getElementById('modal-add-expense');
const commandPaletteDialog = document.getElementById('command-palette-dialog');

async function loadTripsView() {
  try {
    const res = await apiFetch('/api/trips');
    if (!res.ok) throw new Error('Erro ao listar viagens');
    const { trips } = await res.json();

    document.getElementById('kpi-trips-count').textContent = trips.length;
    const totalAllowances = trips.reduce((acc, t) => acc + (t.total_allowances_amount || 0), 0);
    const totalApproved = trips.reduce((acc, t) => acc + (t.approved_expenses_amount || 0), 0);
    const totalPending = trips.reduce((acc, t) => acc + (t.pending_expenses_count || 0), 0);

    document.getElementById('kpi-trips-allowances').textContent = formatBRL(totalAllowances);
    document.getElementById('kpi-trips-approved-expenses').textContent = formatBRL(totalApproved);
    document.getElementById('kpi-trips-pending-expenses').textContent = totalPending;

    const tbody = document.getElementById('trips-table-tbody');
    if (trips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--color-muted);">Nenhuma viagem programada no momento.</td></tr>`;
      return;
    }

    tbody.innerHTML = trips.map(t => {
      const transportMap = {
        'onibus_fretado': 'Ônibus fretado',
        'van_clube': 'Van do clube',
        'aereo': 'Aéreo',
        'transporte_proprio': 'Próprio'
      };
      return `
        <tr>
          <td><strong>${t.title}</strong></td>
          <td>${t.destination_city}/${t.destination_state}</td>
          <td>${formatDate(t.departure_date)} a ${formatDate(t.return_date)}</td>
          <td>${t.team_name}</td>
          <td>${transportMap[t.transport_type] || t.transport_type}</td>
          <td>
            <span class="status status--active">${t.participants_count} convocados</span>
            ${t.pending_authorizations_count > 0 ? `<br><small style="color: var(--color-warning); font-weight:600;">⚠ ${t.pending_authorizations_count} autorização pendente</small>` : ''}
          </td>
          <td>
            <span style="font-size: 0.85rem; font-weight: 600;">${formatBRL(t.approved_expenses_amount)}</span>
            ${t.pending_expenses_count > 0 ? `<br><span class="status status--pending">${t.pending_expenses_count} a conferir</span>` : ''}
          </td>
          <td>
            <button class="button button--quiet" type="button" onclick="openTripDetails('${t.id}')" style="padding: 4px 8px; font-size: 0.8rem;">Ver Detalhes</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao carregar viagens:', err);
  }
}

async function openTripDetails(tripId) {
  currentSelectedTripId = tripId;
  try {
    const res = await apiFetch(`/api/trips/${tripId}`);
    if (!res.ok) throw new Error('Erro ao carregar detalhes da viagem');
    const data = await res.json();
    const { trip, participants, expenses, financial_summary } = data;

    document.getElementById('trip-details-title').textContent = trip.title;
    document.getElementById('trip-detail-destination').textContent = `${trip.destination_city}/${trip.destination_state}`;
    document.getElementById('trip-detail-period').textContent = `${formatDate(trip.departure_date)} até ${formatDate(trip.return_date)}`;
    document.getElementById('trip-detail-transport').textContent = trip.transport_type.replace('_', ' ');
    document.getElementById('trip-detail-project').textContent = trip.project_name || 'Recursos Próprios / Geral';

    document.getElementById('trip-financial-allowances').textContent = formatBRL(financial_summary.total_allowances);
    document.getElementById('trip-financial-approved').textContent = formatBRL(financial_summary.total_approved_expenses);
    document.getElementById('trip-financial-pending').textContent = formatBRL(financial_summary.total_pending_expenses);

    // Renderizar Participantes & Diárias
    const pTbody = document.getElementById('trip-participants-tbody');
    pTbody.innerHTML = participants.map(p => `
      <tr>
        <td><strong>${p.person_name}</strong><br><small style="color: var(--color-muted);">${p.person_role_desc}</small></td>
        <td>${p.person_type === 'professional' ? 'Comissão' : 'Atleta'}</td>
        <td>${formatBRL(p.daily_rate)}</td>
        <td>${p.days_count} dias</td>
        <td><strong>${formatBRL(p.total_allowance)}</strong></td>
        <td>
          <span class="status status--${p.authorization_status === 'regular' ? 'active' : 'warning'}">
            ${p.authorization_status === 'regular' ? 'Regularizada' : 'Pendente de Envio'}
          </span>
        </td>
      </tr>
    `).join('');

    // Renderizar Despesas & Comprovantes
    const eTbody = document.getElementById('trip-expenses-tbody');
    if (expenses.length === 0) {
      eTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 16px; color: var(--color-muted);">Nenhum comprovante anexado ainda.</td></tr>`;
    } else {
      eTbody.innerHTML = expenses.map(e => {
        const canReview = ['coordination', 'secretariat', 'admin'].includes(currentUser?.role);
        return `
          <tr>
            <td><strong>${e.description}</strong></td>
            <td>${e.expense_type}</td>
            <td><strong>${formatBRL(e.amount)}</strong></td>
            <td><span class="status status--active">${e.source_type.toUpperCase()}</span></td>
            <td><a href="#" onclick="alert('Visualização do comprovante: ${e.voucher_file_name}'); return false;">${e.voucher_file_name}</a></td>
            <td>
              <span class="status status--${e.status === 'approved' ? 'active' : (e.status === 'rejected' ? 'rejected' : 'pending')}">
                ${e.status === 'approved' ? 'Aprovado' : (e.status === 'rejected' ? 'Devolvido' : 'Em Análise')}
              </span>
              ${e.rejection_reason ? `<br><small style="color: var(--color-error);">${e.rejection_reason}</small>` : ''}
            </td>
            <td>
              ${e.status === 'pending_review' && canReview ? `
                <div style="display: flex; gap: 4px;">
                  <button class="button button--quiet" type="button" style="padding: 2px 6px; font-size: 0.75rem; color: var(--color-success);" onclick="reviewTripExpense('${tripId}', '${e.id}', 'approved')">Aprovar</button>
                  <button class="button button--quiet" type="button" style="padding: 2px 6px; font-size: 0.75rem; color: var(--color-error);" onclick="promptRejectExpense('${tripId}', '${e.id}')">Devolver</button>
                </div>
              ` : '—'}
            </td>
          </tr>
        `;
      }).join('');
    }

    tripDetailsDialog.showModal();
  } catch (err) {
    console.error('Erro ao abrir viagem:', err);
    showFeedback('Não foi possível carregar os detalhes da viagem.', true);
  }
}

async function reviewTripExpense(tripId, expenseId, status, rejectionReason) {
  try {
    const res = await apiFetch(`/api/trips/${tripId}/expenses/${expenseId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejection_reason: rejectionReason })
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || 'Erro ao revisar despesa.', true);
      return;
    }
    showFeedback(data.message);
    await openTripDetails(tripId);
    await loadTripsView();
  } catch (err) {
    showFeedback('Erro de comunicação com o servidor.', true);
  }
}

function promptRejectExpense(tripId, expenseId) {
  const reason = prompt('Informe a justificativa da devolução do comprovante:');
  if (reason) {
    reviewTripExpense(tripId, expenseId, 'rejected', reason);
  }
}

document.getElementById('btn-open-create-trip')?.addEventListener('click', () => {
  createTripDialog.showModal();
});

document.getElementById('create-trip-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('trip-form-title').value,
    team_id: document.getElementById('trip-form-team').value,
    transport_type: document.getElementById('trip-form-transport').value,
    destination_city: document.getElementById('trip-form-city').value,
    destination_state: document.getElementById('trip-form-state').value,
    departure_date: document.getElementById('trip-form-dep-date').value,
    return_date: document.getElementById('trip-form-ret-date').value,
    lodging_details: document.getElementById('trip-form-lodging').value
  };

  try {
    const res = await apiFetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || 'Erro ao criar viagem.', true);
      return;
    }
    createTripDialog.close();
    showFeedback(data.message);
    loadTripsView();
  } catch (err) {
    showFeedback('Erro ao conectar ao servidor.', true);
  }
});

document.getElementById('btn-open-add-expense')?.addEventListener('click', () => {
  document.getElementById('expense-trip-id').value = currentSelectedTripId;
  addExpenseDialog.showModal();
});

document.getElementById('add-expense-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tripId = document.getElementById('expense-trip-id').value;
  const payload = {
    expense_type: document.getElementById('exp-type').value,
    source_type: document.getElementById('exp-source').value,
    description: document.getElementById('exp-desc').value,
    amount: parseFloat(document.getElementById('exp-amount').value),
    voucher_file_name: document.getElementById('exp-file').files[0]?.name || 'nota_fiscal_viagem.pdf'
  };

  try {
    const res = await apiFetch(`/api/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.error || 'Erro ao anexar comprovante.', true);
      return;
    }
    addExpenseDialog.close();
    showFeedback(data.message);
    await openTripDetails(tripId);
    await loadTripsView();
  } catch (err) {
    showFeedback('Erro de conexão ao salvar despesa.', true);
  }
});

document.getElementById('tab-btn-trip-roster')?.addEventListener('click', () => {
  document.getElementById('tab-btn-trip-roster').classList.add('subnav__tab--active');
  document.getElementById('tab-btn-trip-expenses').classList.remove('subnav__tab--active');
  document.getElementById('tab-content-trip-roster').hidden = false;
  document.getElementById('tab-content-trip-expenses').hidden = true;
});

document.getElementById('tab-btn-trip-expenses')?.addEventListener('click', () => {
  document.getElementById('tab-btn-trip-expenses').classList.add('subnav__tab--active');
  document.getElementById('tab-btn-trip-roster').classList.remove('subnav__tab--active');
  document.getElementById('tab-content-trip-expenses').hidden = false;
  document.getElementById('tab-content-trip-roster').hidden = true;
});

document.getElementById('btn-export-trip-dossier')?.addEventListener('click', async () => {
  if (!currentSelectedTripId) return;
  try {
    const res = await apiFetch(`/api/trips/${currentSelectedTripId}/dossier`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossie_viagem_${currentSelectedTripId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Manifesto do dossiê de viagem baixado com sucesso!');
  } catch (err) {
    showFeedback('Erro ao baixar dossiê.', true);
  }
});

// ==========================================
// PALETA DE COMANDOS E BUSCA GLOBAL (CTRL + K)
// ==========================================
let searchDebounceTimeout = null;
let activePaletteIndex = -1;

async function loadAccountsView() {
  if (currentUser?.role !== 'admin') return;
  const feedback = document.getElementById('account-form-feedback');
  if (feedback) feedback.textContent = '';
  try {
    const res = await apiFetch('/api/accounts');
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.message || 'Não foi possível carregar as contas.', true);
      return;
    }
    renderAccounts(data.accounts || [], data.roles || []);
  } catch (error) {
    console.error('Erro ao carregar contas:', error);
    showFeedback('Não foi possível conectar ao servidor.', true);
  }
}

function renderAccounts(accounts, roles) {
  const body = document.getElementById('accounts-table-body');
  const empty = document.getElementById('accounts-empty');
  if (!body || !empty) return;
  empty.hidden = accounts.length > 0;
  body.innerHTML = accounts.map(account => `
    <tr data-account-row="${escapeHTML(account.id)}">
      <td data-label="Pessoa"><span class="account-person"><strong>${escapeHTML(account.fullName)}</strong><small>${escapeHTML(account.email)}</small></span></td>
      <td data-label="Papel"><div class="account-role-control"><select class="form-select" data-account-role aria-label="Papel de ${escapeHTML(account.fullName)}">${roles.map(role => `<option value="${escapeHTML(role.value)}" ${account.role === role.value ? 'selected' : ''}>${escapeHTML(role.label)}</option>`).join('')}</select><button class="button button--quiet" type="button" data-account-save>Salvar papel</button></div></td>
      <td data-label="Acesso"><span class="status ${account.isActive ? 'status--active' : 'status--inactive'}">${account.isActive ? 'Ativo' : 'Desativado'}</span></td>
      <td data-label="Ação"><button class="button button--quiet account-toggle" type="button" data-account-toggle="${account.isActive ? 'false' : 'true'}" ${account.id === currentUser?.id ? 'disabled title="Você não pode desativar sua própria conta"' : ''}>${account.isActive ? 'Desativar' : 'Reativar'}</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('[data-account-save]').forEach(button => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-account-row]');
      const select = row?.querySelector('[data-account-role]');
      if (row && select) await updateAccount(row.dataset.accountRow, { role: select.value });
    });
  });
  body.querySelectorAll('[data-account-toggle]').forEach(button => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-account-row]');
      if (!row) return;
      const isActive = button.dataset.accountToggle === 'true';
      if (!isActive && !window.confirm('Desativar esta conta? A pessoa perderá o acesso ao workspace; o histórico será mantido.')) return;
      await updateAccount(row.dataset.accountRow, { isActive });
    });
  });
}

async function updateAccount(userId, changes) {
  try {
    const res = await apiFetch(`/api/accounts/${encodeURIComponent(userId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes)
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.message || 'Não foi possível atualizar esta conta.', true);
      return;
    }
    showFeedback('Acesso atualizado.');
    if (userId === currentUser?.id && changes.role) {
      await fetchMe();
      if (currentUser?.role !== 'admin') setView('meu-espaco');
    } else {
      await loadAccountsView();
    }
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    showFeedback('Não foi possível conectar ao servidor.', true);
  }
}

document.getElementById('account-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById('account-form-feedback');
  const submit = form.querySelector('[type="submit"]');
  const formData = new FormData(form);
  if (feedback) feedback.textContent = '';
  if (submit) submit.disabled = true;
  try {
    const res = await apiFetch('/api/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: formData.get('fullName'), email: formData.get('email'),
        role: formData.get('role'), password: formData.get('password')
      })
    });
    const data = await res.json();
    if (!res.ok) {
      if (feedback) feedback.textContent = data.message || 'Revise os dados e tente novamente.';
      return;
    }
    form.reset();
    if (feedback) feedback.textContent = 'Acesso criado. Compartilhe a senha inicial com a pessoa de forma segura.';
    await loadAccountsView();
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    if (feedback) feedback.textContent = 'Não foi possível conectar ao servidor.';
  } finally {
    if (submit) submit.disabled = false;
  }
});

let workflowEditorSteps = [];
let workflowEditorEdges = [];

function collectWorkflowEditorDefinition() {
  const stepRows = Array.from(document.querySelectorAll('#workflow-step-editor .workflow-step-row'));
  const steps = stepRows.map(row => ({
    node_key: row.dataset.nodeKey,
    title: row.querySelector('[data-field="title"]')?.value.trim() || '',
    role_required: row.querySelector('[data-field="role_required"]')?.value || '',
    instruction: row.querySelector('[data-field="instruction"]')?.value.trim() || '',
    checklist: (row.querySelector('[data-field="checklist"]')?.value || '').split('\n').map(item => item.trim()).filter(Boolean)
  }));
  const rules = (document.getElementById('workflow-editor-rules')?.value || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^([a-z][a-z0-9_]*)\s*(=|!=|contém|vazio|preenchido)\s*(.*)$/i);
    if (!match) return { field: '', operator: '', value: '' };
    const operator = { '=': 'equals', '!=': 'not_equals', 'contém': 'contains', 'vazio': 'empty', 'preenchido': 'not_empty' }[match[2].toLocaleLowerCase('pt-BR')];
    return { field: match[1], operator, ...(operator === 'empty' || operator === 'not_empty' ? {} : { value: match[3].trim() }) };
  });
  return {
    name: document.getElementById('workflow-editor-name')?.value.trim() || '',
    description: document.getElementById('workflow-editor-description')?.value.trim() || '',
    moduleId: document.getElementById('workflow-editor-module')?.value || null,
    recordType: document.getElementById('workflow-editor-record-type')?.value.trim() || '',
    dueDays: document.getElementById('workflow-editor-due-days')?.value || null,
    rules,
    steps,
    edges: workflowEditorEdges
  };
}

async function refreshWorkflowModuleOptions(selectedId = '') {
  const select = document.getElementById('workflow-editor-module');
  if (!select) return;
  try {
    const response = await apiFetch('/api/modules');
    const data = await response.json();
    if (!response.ok) return;
    select.innerHTML = '<option value="">Processo geral</option>' + (data.modules || []).filter(module => module.status === 'active').map(module => `<option value="${escapeHTML(module.id)}" ${module.id === selectedId ? 'selected' : ''}>${escapeHTML(module.name)}</option>`).join('');
  } catch {}
}

function renderWorkflowStepEditor(steps, edges = null) {
  workflowEditorSteps = steps.map(step => ({
    node_key: step.node_key || `node_${crypto.randomUUID()}`,
    title: step.title || '', role_required: step.role_required || 'coach',
    instruction: step.instruction || '', checklist: Array.isArray(step.checklist) ? step.checklist : []
  }));
  if (edges) workflowEditorEdges = edges.map(edge => ({ from: edge.from, to: edge.to }));
  else if (!workflowEditorEdges.length && workflowEditorSteps.length > 1) workflowEditorEdges = workflowEditorSteps.slice(0, -1).map((step, index) => ({ from: step.node_key, to: workflowEditorSteps[index + 1].node_key }));
  const container = document.getElementById('workflow-step-editor');
  if (!container) return;
  const roles = [
    ...Object.entries(workflowRoleLabels).filter(([value]) => value !== 'any').map(([value, label]) => ({ value, label })),
    { value: 'any', label: workflowRoleLabels.any }
  ];
  container.innerHTML = workflowEditorSteps.map((step, index) => `
    <fieldset class="workflow-step-row" data-step-index="${index}" data-node-key="${escapeHTML(step.node_key)}">
      <legend>Etapa ${index + 1}</legend>
      <div class="workflow-step-row__actions">
        <button class="button button--quiet" type="button" data-step-action="up" aria-label="Mover etapa ${index + 1} para cima" ${index === 0 ? 'disabled' : ''}>Subir</button>
        <button class="button button--quiet" type="button" data-step-action="down" aria-label="Mover etapa ${index + 1} para baixo" ${index === workflowEditorSteps.length - 1 ? 'disabled' : ''}>Descer</button>
        <button class="button button--quiet" type="button" data-step-action="remove" aria-label="Remover etapa ${index + 1}">Remover</button>
      </div>
      <div class="workflow-step-row__fields">
        <div class="form-group"><label>Título da etapa<input class="form-input" data-field="title" maxlength="120" required value="${escapeHTML(step.title)}"></label></div>
        <div class="form-group"><label>Papel responsável<select class="form-select" data-field="role_required">${roles.map(role => `<option value="${role.value}" ${step.role_required === role.value ? 'selected' : ''}>${escapeHTML(role.label)}</option>`).join('')}</select></label></div>
        <div class="form-group form-group--full"><label>Instruções<textarea class="form-textarea" data-field="instruction" maxlength="3000" rows="3" placeholder="Explique o que precisa ser feito.">${escapeHTML(step.instruction)}</textarea></label></div>
        <div class="form-group form-group--full"><label>Checklist <span class="form-help">Um item por linha, até 20 itens.</span><textarea class="form-textarea" data-field="checklist" rows="3" placeholder="Conferir as informações\nRegistrar pendências">${escapeHTML(step.checklist.join('\n'))}</textarea></label></div>
      </div>
    </fieldset>
  `).join('');
  const from = document.getElementById('workflow-connect-from');
  const to = document.getElementById('workflow-connect-to');
  const options = '<option value="">Escolha um nó</option>' + workflowEditorSteps.map((step, index) => `<option value="${escapeHTML(step.node_key)}">${index + 1}. ${escapeHTML(step.title || 'Novo nó')}</option>`).join('');
  if (from) from.innerHTML = options;
  if (to) to.innerHTML = options;
  const graph = document.getElementById('workflow-canvas');
  if (graph) graph.innerHTML = workflowEditorSteps.map((step, index) => {
    const outgoing = workflowEditorEdges.filter(edge => edge.from === step.node_key).map(edge => workflowEditorSteps.findIndex(item => item.node_key === edge.to) + 1);
    const incoming = workflowEditorEdges.filter(edge => edge.to === step.node_key).length;
    return `<article class="workflow-node-card" data-workflow-node="${escapeHTML(step.node_key)}"><span class="workflow-node-card__kind">${incoming === 0 ? 'INÍCIO' : incoming > 1 ? 'JUNÇÃO · ' + incoming + ' ENTRADAS' : 'ETAPA ' + (index + 1)}</span><strong>${escapeHTML(step.title || 'Novo nó')}</strong><span>${escapeHTML(workflowRoleLabels[step.role_required] || step.role_required)}</span><span class="workflow-node-card__outputs">${outgoing.length ? outgoing.map(number => `<i>→ nó ${number}</i>`).join('') : '<i>Saída livre</i>'}</span><button type="button" class="button button--quiet button--small" data-focus-node="${escapeHTML(step.node_key)}">Editar nó</button></article>`;
  }).join('') + (workflowEditorEdges.length ? `<div class="workflow-edge-list"><strong>CONEXÕES DO FLUXO</strong>${workflowEditorEdges.map(edge => `<span class="workflow-edge-visual"><i>${escapeHTML(workflowEditorSteps.find(item => item.node_key === edge.from)?.title || 'Nó')}</i><b aria-hidden="true">⟶</b><i>${escapeHTML(workflowEditorSteps.find(item => item.node_key === edge.to)?.title || 'Nó')}</i><button type="button" data-remove-edge="${escapeHTML(edge.from)}|${escapeHTML(edge.to)}" aria-label="Remover conexão">×</button></span>`).join('')}</div>` : '');
}

function setWorkflowEditorFeedback(message, isError = false) {
  const feedback = document.getElementById('workflow-editor-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle('form-feedback--error', isError);
}

function openNewWorkflowEditor() {
  document.getElementById('workflow-editor-form')?.reset();
  document.getElementById('workflow-editor-id').value = '';
  document.getElementById('workflow-editor-heading').textContent = 'Novo processo';
  document.getElementById('workflow-editor-preview').hidden = true;
  refreshWorkflowModuleOptions();
  setWorkflowEditorFeedback('');
  workflowEditorEdges = [];
  renderWorkflowStepEditor([{ title: '', role_required: 'coach', instruction: '', checklist: [] }]);
  document.getElementById('workflow-editor-panel').hidden = false;
  document.querySelector('.workflow-admin-layout')?.classList.replace('is-editor-closed', 'is-editor-open');
  document.getElementById('workflow-editor-name').focus();
}

async function openWorkflowEditor(templateId) {
  try {
    const res = await apiFetch(`/api/workflows/templates/${encodeURIComponent(templateId)}`);
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.message || 'Não foi possível abrir o processo.', true);
      return;
    }
    const template = data.template;
    document.getElementById('workflow-editor-form')?.reset();
    document.getElementById('workflow-editor-id').value = template.id;
    document.getElementById('workflow-editor-heading').textContent = template.name;
    document.getElementById('workflow-editor-name').value = template.name;
    document.getElementById('workflow-editor-description').value = template.description || '';
    refreshWorkflowModuleOptions(template.module_id || '');
    document.getElementById('workflow-editor-record-type').value = template.record_type || '';
    document.getElementById('workflow-editor-due-days').value = template.due_days ?? '';
    document.getElementById('workflow-editor-rules').value = (template.rules || []).map(rule => `${rule.field} ${{ equals: '=', not_equals: '!=', contains: 'contém', empty: 'vazio', not_empty: 'preenchido' }[rule.operator]}${['empty', 'not_empty'].includes(rule.operator) ? '' : ` ${rule.value}`}`).join('\n');
    document.getElementById('workflow-editor-preview').hidden = true;
    setWorkflowEditorFeedback(template.version_status === 'published' ? `Versão publicada ${template.version_number}. Salvar cria um rascunho novo.` : 'Editando rascunho. A publicação cria uma versão para novos processos.');
    renderWorkflowStepEditor(template.steps || [], template.edges || []);
    document.getElementById('workflow-editor-panel').hidden = false;
    document.querySelector('.workflow-admin-layout')?.classList.replace('is-editor-closed', 'is-editor-open');
    document.getElementById('workflow-editor-name').focus();
  } catch (error) {
    console.error('Erro ao abrir processo:', error);
    showFeedback('Não foi possível conectar ao servidor.', true);
  }
}

function renderWorkflowAdminList() {
  const list = document.getElementById('workflow-admin-list');
  const empty = document.getElementById('workflow-admin-empty');
  if (!list || !empty) return;
  empty.hidden = adminWorkflowTemplates.length > 0;
  list.innerHTML = adminWorkflowTemplates.map(template => {
    const statusLabel = template.status === 'archived' ? 'Arquivado' : template.version_status === 'published'
      ? `Publicado · versão ${template.version_number}` : 'Rascunho';
    return `
      <article class="workflow-admin-row" data-template-id="${escapeHTML(template.id)}">
        <div class="workflow-admin-row__info"><strong>${escapeHTML(template.name)}</strong><span>${escapeHTML(template.description || 'Sem descrição')}</span></div>
        <span class="status ${template.status === 'archived' ? 'status--inactive' : template.version_status === 'published' ? 'status--active' : 'status--scheduled'}">${statusLabel}</span>
        <div class="workflow-admin-row__actions">
          <button class="button button--quiet" type="button" data-workflow-action="edit">Editar</button>
          <button class="button button--quiet" type="button" data-workflow-action="clone">Duplicar</button>
          <button class="button button--quiet" type="button" data-workflow-action="export">Exportar</button>
          ${template.status === 'active' ? '<button class="button button--quiet" type="button" data-workflow-action="archive">Arquivar</button>' : ''}
        </div>
      </article>
    `;
  }).join('');

  list.querySelectorAll('[data-workflow-action]').forEach(button => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-template-id]');
      if (!row) return;
      const action = button.dataset.workflowAction;
      const templateId = row.dataset.templateId;
      if (action === 'edit') return openWorkflowEditor(templateId);
      if (action === 'archive' && !window.confirm('Arquivar este processo? Ele não poderá iniciar novos registros, mas os processos existentes continuarão disponíveis.')) return;
      if (action === 'export') {
        try {
          const res = await apiFetch(`/api/workflows/templates/${encodeURIComponent(templateId)}/export`);
          const data = await res.json();
          if (!res.ok) return showFeedback(data.message || 'Não foi possível exportar o processo.', true);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${templateId}.json`;
          link.click();
          URL.revokeObjectURL(url);
        } catch (error) { showFeedback('Não foi possível exportar o processo.', true); }
        return;
      }
      const endpoint = action === 'clone' ? 'clone' : 'archive';
      try {
        const res = await apiFetch(`/api/workflows/templates/${encodeURIComponent(templateId)}/${endpoint}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) return showFeedback(data.message || 'Não foi possível atualizar o processo.', true);
        showFeedback(action === 'clone' ? 'Processo duplicado como rascunho.' : 'Processo arquivado.');
        await loadWorkflowAdminView();
      } catch (error) { showFeedback('Não foi possível conectar ao servidor.', true); }
    });
  });
}

async function loadWorkflowAdminView() {
  if (currentUser?.role !== 'admin') return;
  try {
    const res = await apiFetch('/api/workflows/templates');
    const data = await res.json();
    if (!res.ok) {
      showFeedback(data.message || 'Não foi possível carregar os modelos.', true);
      return;
    }
    adminWorkflowTemplates = data.templates || [];
    renderWorkflowAdminList();
  } catch (error) {
    console.error('Erro ao carregar modelos de processo:', error);
    showFeedback('Não foi possível conectar ao servidor.', true);
  }
}

async function saveWorkflowDraft() {
  const definition = collectWorkflowEditorDefinition();
  const templateId = document.getElementById('workflow-editor-id').value;
  const isNew = !templateId;
  try {
    const res = await apiFetch(isNew ? '/api/workflows/templates' : `/api/workflows/templates/${encodeURIComponent(templateId)}/draft`, {
      method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(definition)
    });
    const data = await res.json();
    if (!res.ok) {
      setWorkflowEditorFeedback(data.message || 'Revise o processo e tente novamente.', true);
      return null;
    }
    document.getElementById('workflow-editor-id').value = data.template.id;
    document.getElementById('workflow-editor-heading').textContent = data.template.name;
    setWorkflowEditorFeedback('Rascunho salvo. Você pode continuar editando ou publicar quando estiver pronto.');
    await loadWorkflowAdminView();
    return data.template;
  } catch (error) {
    console.error('Erro ao salvar processo:', error);
    setWorkflowEditorFeedback('Não foi possível conectar ao servidor.', true);
    return null;
  }
}

document.getElementById('btn-workflow-new')?.addEventListener('click', openNewWorkflowEditor);
document.getElementById('btn-workflow-editor-close')?.addEventListener('click', () => {
  document.getElementById('workflow-editor-panel').hidden = true;
  document.querySelector('.workflow-admin-layout')?.classList.replace('is-editor-open', 'is-editor-closed');
});
document.getElementById('btn-workflow-add-step')?.addEventListener('click', () => {
  const definition = collectWorkflowEditorDefinition();
  definition.steps.push({ title: '', role_required: 'coach', instruction: '', checklist: [] });
  const addedStep = definition.steps[definition.steps.length - 1];
  addedStep.node_key = `node_${crypto.randomUUID()}`;
  workflowEditorEdges = definition.edges;
  if (definition.steps.length > 1 && !workflowEditorEdges.length) workflowEditorEdges = definition.steps.slice(0, -1).map((step, index) => ({ from: step.node_key, to: definition.steps[index + 1].node_key }));
  renderWorkflowStepEditor(definition.steps, workflowEditorEdges);
});
document.getElementById('workflow-step-editor')?.addEventListener('click', event => {
  const button = event.target.closest('[data-step-action]');
  if (!button) return;
  const rows = Array.from(document.querySelectorAll('#workflow-step-editor .workflow-step-row'));
  const index = rows.indexOf(button.closest('.workflow-step-row'));
  const steps = collectWorkflowEditorDefinition().steps;
  const action = button.dataset.stepAction;
  if (action === 'remove') {
    const [removed] = steps.splice(index, 1);
    workflowEditorEdges = workflowEditorEdges.filter(edge => edge.from !== removed.node_key && edge.to !== removed.node_key);
  }
  if (action === 'up' && index > 0) [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
  if (action === 'down' && index < steps.length - 1) [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
  renderWorkflowStepEditor(steps, workflowEditorEdges);
});
document.getElementById('workflow-connect-button')?.addEventListener('click', () => {
  const from = document.getElementById('workflow-connect-from')?.value;
  const to = document.getElementById('workflow-connect-to')?.value;
  if (!from || !to || from === to) return setWorkflowEditorFeedback('Escolha dois nós diferentes para conectar.', true);
  if (workflowEditorEdges.some(edge => edge.from === from && edge.to === to)) return setWorkflowEditorFeedback('Essa conexão já existe.', true);
  workflowEditorEdges.push({ from, to });
  renderWorkflowStepEditor(collectWorkflowEditorDefinition().steps, workflowEditorEdges);
  setWorkflowEditorFeedback('Conexão adicionada ao fluxograma.');
});
document.getElementById('workflow-canvas')?.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-edge]');
  if (remove) {
    const [from, to] = remove.dataset.removeEdge.split('|');
    workflowEditorEdges = workflowEditorEdges.filter(edge => edge.from !== from || edge.to !== to);
    renderWorkflowStepEditor(collectWorkflowEditorDefinition().steps, workflowEditorEdges);
  }
  const focus = event.target.closest('[data-focus-node]');
  if (focus) {
    const details = document.querySelector('.workflow-node-details');
    if (details) details.open = true;
    document.querySelector(`[data-node-key="${CSS.escape(focus.dataset.focusNode)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector(`[data-node-key="${CSS.escape(focus.dataset.focusNode)}"] [data-field="title"]`)?.focus();
  }
});
document.getElementById('workflow-step-editor')?.addEventListener('input', event => {
  if (event.target.matches('[data-field="title"]')) {
    const nodeKey = event.target.closest('[data-node-key]')?.dataset.nodeKey;
    const card = document.querySelector(`[data-workflow-node="${CSS.escape(nodeKey || '')}"]`);
    const title = card?.querySelector('strong');
    if (title) title.textContent = event.target.value.trim() || 'Novo nó';
  }
});
document.getElementById('btn-workflow-preview')?.addEventListener('click', () => {
  const definition = collectWorkflowEditorDefinition();
  const preview = document.getElementById('workflow-editor-preview');
  preview.innerHTML = `<h3>${escapeHTML(definition.name || 'Prévia do processo')}</h3><p>${escapeHTML(definition.description)}</p><ol>${definition.steps.map((step, index) => `<li><strong>${index + 1}. ${escapeHTML(step.title || 'Etapa sem título')}</strong><span>${escapeHTML(workflowRoleLabels[step.role_required] || step.role_required)}</span><p>${escapeHTML(step.instruction)}</p>${step.checklist.length ? `<ul>${step.checklist.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ol>`;
  preview.hidden = false;
});
document.getElementById('btn-workflow-save')?.addEventListener('click', saveWorkflowDraft);
document.getElementById('btn-workflow-publish')?.addEventListener('click', async () => {
  const saved = await saveWorkflowDraft();
  if (!saved) return;
  try {
    const res = await apiFetch(`/api/workflows/templates/${encodeURIComponent(saved.id)}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setWorkflowEditorFeedback(data.message || 'Não foi possível publicar o processo.', true);
      return;
    }
    setWorkflowEditorFeedback(`Versão ${data.template.version_number} publicada. Novos processos usarão esta versão.`);
    await loadWorkflowAdminView();
  } catch (error) { setWorkflowEditorFeedback('Não foi possível conectar ao servidor.', true); }
});
document.getElementById('btn-workflow-import')?.addEventListener('click', () => document.getElementById('workflow-import-file')?.click());
document.getElementById('workflow-import-file')?.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 96 * 1024) throw new Error('O arquivo deve ter no máximo 96 KiB.');
    const content = await file.text();
    JSON.parse(content);
    const res = await apiFetch('/api/workflows/templates/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: content
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Não foi possível importar este arquivo.');
    showFeedback('Processo importado como rascunho. Revise antes de publicar.');
    await loadWorkflowAdminView();
    await openWorkflowEditor(data.template.id);
  } catch (error) {
    showFeedback(error.message || 'O arquivo JSON não pôde ser lido.', true);
  } finally {
    event.target.value = '';
  }
});

function openCommandPalette() {
  const dialog = document.getElementById('command-palette-dialog');
  const input = document.getElementById('palette-search-input');
  if (!dialog || !input) return;
  input.value = '';
  if (!dialog.open) dialog.showModal();
  input.focus();
  performPaletteSearch('');
}

async function performPaletteSearch(q) {
  const container = document.getElementById('palette-results-container');
  if (!container) return;
  try {
    const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!q) {
      container.innerHTML = `
        <div class="palette-group-title">Ações Rápidas Sugeridas</div>
        ${data.quickActions.map(a => `
          <button type="button" role="option" class="palette-item" data-palette-item data-category="Ação Rápida" data-action="${escapeHTML(a.action)}" aria-selected="false">
            <div class="palette-item__info">
              <span class="palette-item__title">${escapeHTML(a.title)}</span>
              <span class="palette-item__subtitle">${escapeHTML(a.category)}</span>
            </div>
            <span class="palette-item__badge">Ação</span>
          </button>
        `).join('')}
      `;
      setActivePaletteItem(-1);
      return;
    }

    if ((data.results || []).length === 0) {
      container.innerHTML = `<div class="palette-empty">Nenhum registro encontrado para “${escapeHTML(q)}”.</div>`;
      setActivePaletteItem(-1);
      return;
    }

    container.innerHTML = data.results.map(r => `
      <button type="button" role="option" class="palette-item" data-palette-item data-category="${escapeHTML(r.category)}" data-id="${escapeHTML(r.id || '')}" data-module-id="${escapeHTML(r.moduleId || '')}" data-status="${escapeHTML(r.status || '')}" data-action="${escapeHTML(r.action || '')}" aria-selected="false">
        <div class="palette-item__info">
          <span class="palette-item__title">${escapeHTML(r.title)}</span>
          <span class="palette-item__subtitle">${escapeHTML(r.subtitle || r.category)}</span>
        </div>
        <span class="palette-item__badge">${escapeHTML(r.category)}</span>
      </button>
    `).join('');
    setActivePaletteItem(-1);
  } catch (err) {
    console.error('Erro na busca global:', err);
  }
}

function setActivePaletteItem(index) {
  const input = document.getElementById('palette-search-input');
  const items = [...document.querySelectorAll('#palette-results-container [data-palette-item]')];
  activePaletteIndex = items.length ? Math.max(-1, Math.min(index, items.length - 1)) : -1;
  items.forEach((item, itemIndex) => {
    item.removeAttribute('id');
    const active = itemIndex === activePaletteIndex;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
  });
  const active = items[activePaletteIndex];
  if (active) {
    active.id = 'palette-active-result';
    active.scrollIntoView({ block: 'nearest' });
    input?.setAttribute('aria-activedescendant', active.id);
  } else {
    input?.removeAttribute('aria-activedescendant');
  }
}

async function handleSearchResultClick(category, id, action, dataset = {}) {
  const dialog = document.getElementById('command-palette-dialog');
  dialog?.close();

  if (category === 'Ação Rápida') {
    await executeQuickAction(action);
    return;
  }

  if (category === 'Módulo') {
    if (dataset.status === 'active') {
      sessionStorage.setItem('oss:currentModuleId', id);
      await setView('modulo');
      window.ModuleUI?.openRuntime?.(id);
    } else {
      const res = await apiFetch(`/api/modules/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (data.module) {
        window.ModuleUI?.openBuilder?.(data.module);
        await setView('criar-modulo');
      }
    }
    return;
  }

  if (category === 'Registro' && dataset.moduleId) {
    sessionStorage.setItem('oss:currentModuleId', dataset.moduleId);
    await setView('modulo');
    await window.ModuleUI?.openRuntime?.(dataset.moduleId);
    window.ModuleUI?.openRecordDetail?.(dataset.moduleId, id);
    return;
  }

  if (category === 'Automação') {
    sessionStorage.setItem('oss:currentFlowId', id);
    await setView('automacoes');
    window.AutomationUI?.openFlow?.(id);
    return;
  }

  if (category === 'Processo') {
    await setView('fluxos');
    return;
  }

  if (category === 'Atleta') {
    await setView('pessoas');
    const row = [...document.querySelectorAll('[data-athlete-id]')].find(item => item.dataset.athleteId === id);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.focus({ preventScroll: true });
  } else if (category === 'Equipe') {
    selectedTeamId = id;
    await setView('equipe');
  } else if (category === 'Instalação') {
    await setView('agenda');
    const row = [...document.querySelectorAll('[data-venue-id]')].find(item => item.dataset.venueId === id);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.focus({ preventScroll: true });
  } else if (category === 'Competição') {
    selectedCompetitionId = id;
    await setView('competicoes');
  } else if (category === 'Viagem') {
    await setView('viagens');
    await openTripDetails(id);
  }
}

async function executeQuickAction(action) {
  const dialog = document.getElementById('command-palette-dialog');
  dialog?.close();

  if (action === 'create_module') {
    window.ModuleUI?.openBuilder?.(null);
    await setView('criar-modulo');
  } else if (action === 'open_catalog') {
    await setView('catalogo-modulos');
  } else if (action === 'open_automations') {
    await setView('automacoes');
  } else if (action === 'open_workflows') {
    await setView('fluxos');
  } else if (action === 'open_assistant') {
    await setView('assistente');
  } else if (action === 'attendance') {
    openQuickAttendanceModal(selectedTeamId || currentTeams[0]?.id, localIsoDate());
  } else if (action === 'reserve_venue') {
    await setView('agenda');
    openReservationDialog();
  } else if (action === 'pre_register') {
    if (['coach', 'secretariat'].includes(currentUser?.role)) {
      selectedWorkflowTemplate = 'cadastrar_atleta';
      await setView('fluxos');
      document.getElementById('btn-start-template')?.click();
    } else showFeedback('Seu perfil não pode iniciar um pré-cadastro.', true);
  } else if (action === 'new_trip') {
    await setView('viagens');
    createTripDialog?.showModal();
  } else if (action === 'cbc_report') {
    await setView('projetos');
    document.getElementById('btn-export-cbc-report')?.click();
  }
}

document.getElementById('palette-results-container')?.addEventListener('click', event => {
  const item = event.target.closest('[data-palette-item]');
  if (item) handleSearchResultClick(item.dataset.category, item.dataset.id, item.dataset.action, item.dataset);
});

document.getElementById('palette-search-input')?.addEventListener('keydown', event => {
  const items = document.querySelectorAll('#palette-results-container [data-palette-item]');
  if (event.key === 'ArrowDown' && items.length) {
    event.preventDefault();
    setActivePaletteItem(activePaletteIndex < items.length - 1 ? activePaletteIndex + 1 : 0);
  } else if (event.key === 'ArrowUp' && items.length) {
    event.preventDefault();
    setActivePaletteItem(activePaletteIndex > 0 ? activePaletteIndex - 1 : items.length - 1);
  } else if (event.key === 'Enter' && activePaletteIndex >= 0) {
    event.preventDefault();
    items[activePaletteIndex]?.click();
  } else if (event.key === 'Escape') {
    document.getElementById('command-palette-dialog')?.close();
  }
});

// Atalhos globais de teclado
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
});

document.getElementById('global-search')?.addEventListener('click', () => {
  openCommandPalette();
});

document.getElementById('palette-search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchDebounceTimeout);
  const val = e.target.value.trim();
  searchDebounceTimeout = setTimeout(() => {
    performPaletteSearch(val);
  }, 200);
});

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

function formatBRL(amount) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount) || 0);
}

// Sincronizar aria-invalid apenas após interação (:user-invalid)
function initAccessibleValidationSync() {
  const sync = el => {
    if (!el?.matches?.('input, select, textarea')) return;
    const isInvalid = el.matches(':user-invalid');
    el.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
  };
  document.querySelectorAll('input, select, textarea').forEach(el => el.setAttribute('aria-invalid', 'false'));
  document.addEventListener('blur', e => sync(e.target), true);
  document.addEventListener('change', e => sync(e.target), true);
  document.addEventListener('input', e => {
    if (e.target?.getAttribute?.('aria-invalid') === 'true') sync(e.target);
  });
  document.addEventListener('invalid', e => sync(e.target), true);
  document.addEventListener('reset', e => {
    setTimeout(() => [...(e.target?.elements || [])].forEach(el => el.setAttribute?.('aria-invalid', 'false')));
  }, true);
}

window.announceLive = function announceLive(message) {
  const el = document.getElementById('oss-live-announcer');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = message; }, 40);
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupDialogs();
  setCurrentDateDefaults();
  initAccessibleValidationSync();
  fetchMe().then(authenticated => {
    if (authenticated) {
      let requestedView = '';
      try { requestedView = decodeURIComponent(window.location.hash.slice(1)); } catch { requestedView = ''; }
      if (viewIds.includes(requestedView)) setView(requestedView, { fromHistory: true });
      else setView('meu-espaco');
    }
  });
});
