/*
 * API fictícia da demonstração pública do OSS.
 * Toda alteração é guardada no navegador da pessoa que está apresentando.
 */
(() => {
  const STORAGE_KEY = 'oss:clube-demo:v2';
  const SESSION_KEY = 'oss:clube-demo:session';
  const nativeFetch = window.fetch.bind(window);

  const isoDate = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };
  const timestamp = () => `${isoDate()} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  const templates = [
    {
      template_key: 'cadastrar_atleta', name: 'Cadastro de atleta', status: 'active', version_status: 'published',
      description: 'Um caminho acompanhado desde os dados iniciais até a liberação do atleta na equipe.',
      steps: [
        { node_key: 'dados_basicos', title: 'Dados do atleta e responsável', role_required: 'secretariat', instruction: 'Reúna os dados de identificação do atleta e de seu responsável antes de enviar o pré-cadastro.', checklist: ['Nome completo e data de nascimento', 'Equipe e modalidade pretendidas', 'Nome e contato do responsável'] },
        { node_key: 'documentacao', title: 'Conferência de documentos', role_required: 'secretariat', instruction: 'Compare os documentos recebidos com os dados informados e registre o que ainda falta.', checklist: ['Conferir identificação do atleta', 'Validar os dados do responsável', 'Registrar pendências'] },
        { node_key: 'exame_medico', title: 'Exame médico e biometria', role_required: 'secretariat', instruction: 'Confira a situação do exame médico e atualize os controles do clube.', checklist: ['Registrar a validade do exame', 'Atualizar a situação biométrica', 'Deixar pendências registradas'] },
        { node_key: 'vinculo_equipe', title: 'Liberação na equipe', role_required: 'secretariat', instruction: 'Confirme a categoria e a equipe de destino para concluir o cadastro.', checklist: ['Revisar modalidade e categoria', 'Confirmar equipe e temporada', 'Registrar a liberação'] }
      ]
    },
    {
      template_key: 'agendar_jogo', name: 'Agendamento de jogo', status: 'active', version_status: 'published',
      description: 'Organize quadra, preparação, conferências e registro do resultado.',
      steps: [
        { node_key: 'quadra', title: 'Reserva da quadra', role_required: 'secretariat', instruction: 'Defina data, horário, local e atividade. Confira a grade antes de confirmar.', checklist: ['Selecionar data e instalação', 'Conferir os horários ocupados', 'Registrar o título do jogo'] },
        { node_key: 'transporte_uniforme', title: 'Uniforme e transporte', role_required: 'secretariat', instruction: 'Prepare o que a equipe precisa para disputar o jogo.', checklist: ['Confirmar uniforme', 'Verificar transporte', 'Anotar pendências'] },
        { node_key: 'seguro_atletas', title: 'Conferência de atletas', role_required: 'secretariat', instruction: 'Confira a documentação dos atletas convocados.', checklist: ['Revisar a lista de convocados', 'Conferir documentos', 'Registrar pendências'] },
        { node_key: 'aprovacao_coordenacao', title: 'Aprovação da coordenação', role_required: 'secretariat', instruction: 'Revise data, local e equipe e registre a decisão.', checklist: ['Conferir data e local', 'Revisar preparação da equipe', 'Registrar aprovação ou ajuste'] },
        { node_key: 'sumula_resultado', title: 'Súmula e resultado', role_required: 'secretariat', instruction: 'Depois da partida, registre o resultado e encerre o processo.', checklist: ['Anotar o placar final', 'Registrar ocorrências', 'Conferir a súmula'] }
      ]
    }
  ];

  const defaultState = () => {
    const athletes = [
      ['ath_01', 'Alice Martins', 'Goleira', 'Patrícia Martins', '(31) 98841-1200'],
      ['ath_02', 'Bruno Costa', 'Fixo', 'Renato Costa', '(31) 98841-1201'],
      ['ath_03', 'Caio Nunes', 'Ala', 'Luciana Nunes', '(31) 98841-1202'],
      ['ath_04', 'Davi Rocha', 'Pivô', 'Marcelo Rocha', '(31) 98841-1203'],
      ['ath_05', 'Elisa Prado', 'Ala', 'Fernanda Prado', '(31) 98841-1204'],
      ['ath_06', 'Felipe Alves', 'Fixo', 'Rita Alves', '(31) 98841-1205'],
      ['ath_07', 'Gabriela Lima', 'Levantadora', 'Marta Lima', '(31) 98841-1206'],
      ['ath_08', 'Heitor Silva', 'Ponteiro', 'Sérgio Silva', '(31) 98841-1207'],
      ['ath_09', 'Isabela Ramos', 'Central', 'Vera Ramos', '(31) 98841-1208'],
      ['ath_10', 'João Pedro Melo', 'Armador', 'Daniela Melo', '(31) 98841-1209'],
      ['ath_11', 'Larissa Freitas', 'Ala', 'Paulo Freitas', '(31) 98841-1210'],
      ['ath_12', 'Mateus Oliveira', 'Pivô', 'Sônia Oliveira', '(31) 98841-1211']
    ].map(([id, full_name, position, guardian_name, guardian_phone], index) => ({
      id, full_name, position, guardian_name, guardian_relationship: index % 2 ? 'Pai' : 'Mãe', guardian_phone,
      start_date: isoDate(-180 + index), biometry_status: index === 4 ? 'pendente' : 'regular',
      telezaga_status: index === 8 ? 'pendente' : 'regular', medical_status: index === 10 ? 'pendente' : 'apto',
      active_teams: index < 6 ? 'Sub-15 de Futsal' : index < 9 ? 'Vôlei Sub-14' : index < 11 ? 'Basquete Sub-16' : 'Futsal Sub-13'
    }));

    const teams = [
      { id: 'team_sub15_futsal', name: 'Sub-15 de Futsal', modality: 'Futsal', category: 'Sub-15', season: 2026, gender: 'Misto', athlete_count: 6, staff_count: 2 },
      { id: 'team_sub13_futsal', name: 'Futsal Sub-13', modality: 'Futsal', category: 'Sub-13', season: 2026, gender: 'Misto', athlete_count: 1, staff_count: 2 },
      { id: 'team_sub14_volley', name: 'Vôlei Sub-14', modality: 'Vôlei', category: 'Sub-14', season: 2026, gender: 'Feminino', athlete_count: 3, staff_count: 2 },
      { id: 'team_sub16_basket', name: 'Basquete Sub-16', modality: 'Basquete', category: 'Sub-16', season: 2026, gender: 'Masculino', athlete_count: 2, staff_count: 2 }
    ];
    const staff = [
      { id: 'staff_01', full_name: 'Marina Costa', role_title: 'Treinadora principal', role_description: 'Treinadora', registry_number: 'CREF 045123-G/MG', phone: '(31) 98765-1100', start_date: isoDate(-280) },
      { id: 'staff_02', full_name: 'Lucas Mendes', role_title: 'Preparador físico', role_description: 'Preparador físico', registry_number: 'CREF 018221-G/MG', phone: '(31) 98765-1101', start_date: isoDate(-220) }
    ];
    const guardiansByAthlete = athletes.slice(0, 6).map(a => ({
      athlete_id: a.id, guardian_name: a.guardian_name, guardian_phone: a.guardian_phone,
      guardian_relationship: a.guardian_relationship
    }));
    const roster = athletes.slice(0, 6).map(a => ({ ...a, ...guardiansByAthlete.find(g => g.athlete_id === a.id) }));
    const venues = [
      { id: 'venue_quadra_a', name: 'Quadra A', type: 'Quadra coberta', capacity: 150, allowed_modalities: 'Futsal, Vôlei, Basquete' },
      { id: 'venue_ginasio', name: 'Ginásio principal', type: 'Ginásio', capacity: 320, allowed_modalities: 'Futsal, Vôlei, Basquete' },
      { id: 'venue_campo', name: 'Campo society', type: 'Campo', capacity: 80, allowed_modalities: 'Futebol, Treinamento' }
    ];
    const reservations = [
      { id: 'res_01', venue_id: 'venue_quadra_a', venue_name: 'Quadra A', team_id: 'team_sub15_futsal', team_name: 'Sub-15 de Futsal', activity_type: 'training', title: 'Treino técnico · Sub-15', date: isoDate(), start_time: '09:00', end_time: '11:00', status: 'confirmed', created_by_name: 'Marina Costa' },
      { id: 'res_02', venue_id: 'venue_quadra_a', venue_name: 'Quadra A', team_id: 'team_sub15_futsal', team_name: 'Sub-15 de Futsal', activity_type: 'match', title: 'Amistoso · Sub-15', date: isoDate(), start_time: '16:00', end_time: '18:00', status: 'confirmed', created_by_name: 'Marina Costa' },
      { id: 'res_03', venue_id: 'venue_ginasio', venue_name: 'Ginásio principal', team_id: 'team_sub14_volley', team_name: 'Vôlei Sub-14', activity_type: 'training', title: 'Treino de fundamentos', date: isoDate(), start_time: '14:00', end_time: '16:00', status: 'confirmed', created_by_name: 'Lucas Mendes' },
      { id: 'res_04', venue_id: 'venue_campo', venue_name: 'Campo society', team_id: 'team_sub16_basket', team_name: 'Basquete Sub-16', activity_type: 'other', title: 'Atividade de integração', date: isoDate(), start_time: '10:00', end_time: '12:00', status: 'confirmed', created_by_name: 'Marina Costa' },
      { id: 'res_05', venue_id: 'venue_ginasio', venue_name: 'Ginásio principal', team_id: null, team_name: null, activity_type: 'maintenance', title: 'Manutenção preventiva', date: isoDate(), start_time: '17:00', end_time: '18:00', status: 'confirmed', created_by_name: 'Administração' }
    ];

    const makeSteps = (templateKey, inProgressIndex = 0, completedCount = 0) => {
      const template = templates.find(item => item.template_key === templateKey);
      return template.steps.map((step, index) => ({
        ...step, step_order: index + 1,
        status: index < completedCount ? 'completed' : index === inProgressIndex ? 'in_progress' : 'blocked',
        completed_by_name: index < completedCount ? 'Ana Oliveira' : null,
        completed_at: index < completedCount ? timestamp() : null,
        action_data_json: index < completedCount ? JSON.stringify({ observacao: 'Conferido na demonstração' }) : null
      }));
    };
    return {
      version: 2,
      user: { id: 'user_demo_olympico', email: 'olympico@br', fullName: 'Ana Oliveira', initials: 'AO', organizationId: 'org_demo_olympico', organizationName: 'Clube Olympico', organizationSlug: 'clube-olympico', role: 'secretariat' },
      teams, athletes, roster, staff, venues, reservations,
      preRegistrations: [
        { id: 'prereg_01', team_id: teams[0].id, team_name: teams[0].name, athlete_name: 'Helena Souza', athlete_birth_date: '2012-04-18', athlete_position: 'Ala', guardian_name: 'Renata Souza', guardian_relationship: 'Mãe', guardian_phone: '(31) 98832-4401', guardian_email: 'renata@email.com', created_by_name: 'Marina Costa', status: 'pending_approval', notes: 'Veio de um projeto esportivo local.' },
        { id: 'prereg_02', team_id: teams[2].id, team_name: teams[2].name, athlete_name: 'Marcos Vinícius', athlete_birth_date: '2011-09-02', athlete_position: 'Ponteiro', guardian_name: 'Carlos Vinícius', guardian_relationship: 'Pai', guardian_phone: '(31) 98832-4402', guardian_email: 'carlos@email.com', created_by_name: 'Lucas Mendes', status: 'pending_approval', notes: 'Documentos enviados para conferência.' }
      ],
      instances: [
        { id: 'inst_jogo_demo', template_key: 'agendar_jogo', title: 'Amistoso contra Atlético do Vale — Sub-15', status: 'in_progress', created_at: `${isoDate(-1)} 09:00:00`, created_by_name: 'Marina Costa', steps: makeSteps('agendar_jogo', 2, 2), events: [
          { action: 'step_completed', details: 'Quadra A reservada para o amistoso', created_by_name: 'Marina Costa', created_at: `${isoDate(-1)} 09:30:00` },
          { action: 'step_completed', details: 'Uniforme e transporte conferidos', created_by_name: 'Marina Costa', created_at: `${isoDate(-1)} 10:00:00` }
        ] },
        { id: 'inst_cadastro_demo', template_key: 'cadastrar_atleta', title: 'Cadastro de Helena Souza — Sub-15', status: 'in_progress', created_at: `${isoDate()} 08:45:00`, created_by_name: 'Ana Oliveira', steps: makeSteps('cadastrar_atleta', 1, 1), events: [
          { action: 'step_completed', details: 'Pré-cadastro recebido pela secretaria', created_by_name: 'Ana Oliveira', created_at: `${isoDate()} 08:50:00` }
        ] }
      ],
      loggedIn: false
    };
  };

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.version === 2) return saved;
    } catch {}
    const fresh = defaultState();
    writeState(fresh);
    return fresh;
  }

  function writeState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    updateDashboard(state);
  }

  function updateDashboard(state) {
    const pending = state.preRegistrations.filter(item => item.status === 'pending_approval').length;
    const total = document.getElementById('demo-pending-total');
    if (total) total.textContent = String(pending).padStart(2, '0');
    const athletes = document.getElementById('demo-athlete-total');
    if (athletes) athletes.textContent = String(state.athletes.length).padStart(2, '0');
  }

  function json(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  function requestBody(init) {
    try { return JSON.parse(init?.body || '{}'); } catch { return {}; }
  }

  function teamsPayload(state) { return { teams: state.teams }; }
  function athleteRoster(state, teamId) {
    const team = state.teams.find(item => item.id === teamId);
    if (!team) return json({ error: 'Equipe não localizada.' }, 404);
    const athletes = teamId === 'team_sub15_futsal' ? state.roster : state.athletes.filter(item => item.active_teams === team.name).slice(0, 3);
    return json({ team, athletes, staff: state.staff });
  }
  function workflowList(state) {
    return state.instances.map(instance => ({
      id: instance.id, title: instance.title, status: instance.status,
      completed_steps: instance.steps.filter(step => step.status === 'completed').length,
      total_steps: instance.steps.length, template_key: instance.template_key
    }));
  }
  function workflowPayload(instance) {
    const template = templates.find(item => item.template_key === instance.template_key);
    return {
      instance: { ...instance, template_name: template?.name || 'Processo do clube' },
      steps: instance.steps,
      events: [...instance.events].reverse()
    };
  }
  function currentSession(state) { return sessionStorage.getItem(SESSION_KEY) === 'active' && state.loggedIn; }

  async function demoFetch(input, init = {}) {
    const url = input instanceof Request ? new URL(input.url) : new URL(String(input), window.location.href);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);

    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const route = url.pathname.replace(/\/$/, '') || '/';
    const state = readState();

    if (route === '/api/auth/login' && method === 'POST') {
      const body = requestBody(init);
      if (String(body.email || '').trim().toLowerCase() !== 'olympico@br' || body.password !== 'olympico 80') {
        return json({ message: 'Use o acesso de demonstração indicado nesta tela.' }, 401);
      }
      state.loggedIn = true;
      writeState(state);
      sessionStorage.setItem(SESSION_KEY, 'active');
      return json({ user: state.user, permissions: {}, csrfToken: 'demo-local-token' });
    }
    if (route === '/api/auth/me' && method === 'GET') {
      return currentSession(state) ? json({ user: state.user, permissions: {}, csrfToken: 'demo-local-token' }) : json({ message: 'Entre na demonstração.' }, 401);
    }
    if (route === '/api/auth/logout' && method === 'POST') {
      state.loggedIn = false;
      writeState(state);
      sessionStorage.removeItem(SESSION_KEY);
      return json({ success: true });
    }
    if (!currentSession(state)) return json({ message: 'Entre na demonstração.' }, 401);

    if (route === '/api/teams' && method === 'GET') return json(teamsPayload(state));
    const rosterMatch = route.match(/^\/api\/teams\/([^/]+)\/roster$/);
    if (rosterMatch && method === 'GET') return athleteRoster(state, decodeURIComponent(rosterMatch[1]));

    if (route === '/api/pre-registrations' && method === 'GET') {
      const status = url.searchParams.get('status');
      return json({ preRegistrations: status ? state.preRegistrations.filter(item => item.status === status) : state.preRegistrations });
    }
    if (route === '/api/pre-registrations' && method === 'POST') {
      const body = requestBody(init);
      if (!body.athlete_name || !body.team_id || !body.guardian_name || !body.guardian_phone || !body.guardian_relationship) {
        return json({ message: 'Preencha atleta, equipe e dados de contato do responsável.' }, 400);
      }
      const team = state.teams.find(item => item.id === body.team_id);
      const item = {
        id: `prereg_${Date.now()}`, ...body, team_name: team?.name || 'Equipe', status: 'pending_approval',
        created_by_name: state.user.fullName, notes: body.notes || '', created_at: timestamp()
      };
      state.preRegistrations.unshift(item);
      writeState(state);
      return json({ preRegistration: item, message: `Pré-cadastro de ${item.athlete_name} enviado para conferência da secretaria.` }, 201);
    }
    const preRegAction = route.match(/^\/api\/pre-registrations\/([^/]+)\/(approve|reject)$/);
    if (preRegAction && method === 'POST') {
      const item = state.preRegistrations.find(row => row.id === decodeURIComponent(preRegAction[1]));
      if (!item) return json({ message: 'Pré-cadastro não localizado.' }, 404);
      if (preRegAction[2] === 'approve') {
        item.status = 'approved'; item.reviewed_by_name = state.user.fullName; item.reviewed_at = timestamp();
        const team = state.teams.find(row => row.id === item.team_id);
        const athlete = { id: `ath_${Date.now()}`, full_name: item.athlete_name, position: item.athlete_position || '—', guardian_name: item.guardian_name, guardian_relationship: item.guardian_relationship, guardian_phone: item.guardian_phone, active_teams: team?.name || item.team_name, biometry_status: 'pendente', telezaga_status: 'pendente', medical_status: 'pendente', start_date: isoDate() };
        state.athletes.push(athlete);
        if (team) team.athlete_count += 1;
        if (team?.id === 'team_sub15_futsal') state.roster.push(athlete);
      } else {
        item.status = 'rejected'; item.rejection_reason = requestBody(init).reason || 'Revisão necessária.';
      }
      writeState(state);
      return json({ preRegistration: item, message: preRegAction[2] === 'approve' ? 'Cadastro aprovado e atleta vinculado à equipe.' : 'Pré-cadastro recusado com justificativa.' });
    }
    if (route === '/api/people/athletes' && method === 'GET') return json({ athletes: state.athletes });

    const date = url.searchParams.get('date') || isoDate();
    if (route === '/api/venues' && method === 'GET') {
      const venues = state.venues.map(venue => ({
        ...venue,
        reservations: state.reservations.filter(item => item.venue_id === venue.id && item.date === date && item.status === 'confirmed')
      }));
      return json({ venues, date });
    }
    if (route === '/api/reservations' && method === 'GET') {
      let reservations = state.reservations;
      if (url.searchParams.has('date')) reservations = reservations.filter(item => item.date === url.searchParams.get('date'));
      return json({ reservations });
    }
    if (route === '/api/reservations' && method === 'POST') {
      const body = requestBody(init);
      const conflict = state.reservations.find(item => item.venue_id === body.venue_id && item.date === body.date && item.status === 'confirmed' && item.start_time < body.end_time && item.end_time > body.start_time);
      if (conflict) {
        const alternatives = state.venues.filter(venue => venue.id !== body.venue_id && !state.reservations.some(item => item.venue_id === venue.id && item.date === body.date && item.status === 'confirmed' && item.start_time < body.end_time && item.end_time > body.start_time)).map(({ id, name }) => ({ id, name }));
        return json({ message: `${conflict.venue_name || 'Este espaço'} já está reservado das ${conflict.start_time} às ${conflict.end_time}. Escolha outro horário ou instalação.`, availableAlternatives: alternatives }, 409);
      }
      const venue = state.venues.find(item => item.id === body.venue_id);
      const team = state.teams.find(item => item.id === body.team_id);
      const reservation = { id: `res_${Date.now()}`, ...body, venue_name: venue?.name || 'Instalação', team_name: team?.name || null, status: 'confirmed', created_by_name: state.user.fullName };
      state.reservations.push(reservation);
      writeState(state);
      return json({ reservation, message: 'Reserva confirmada na demonstração.' }, 201);
    }
    const cancelMatch = route.match(/^\/api\/reservations\/([^/]+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      const reservation = state.reservations.find(item => item.id === decodeURIComponent(cancelMatch[1]));
      if (!reservation) return json({ message: 'Reserva não localizada.' }, 404);
      reservation.status = 'cancelled';
      reservation.cancel_reason = requestBody(init).reason || '';
      writeState(state);
      return json({ reservation, message: 'Reserva cancelada na demonstração.' });
    }

    if (route === '/api/workflows/templates' && method === 'GET') return json({ templates });
    if (route === '/api/workflows/instances' && method === 'GET') return json({ instances: workflowList(state) });
    if (route === '/api/workflows/instances' && method === 'POST') {
      const body = requestBody(init);
      const template = templates.find(item => item.template_key === body.template_key);
      if (!template || !body.title) return json({ message: 'Escolha um modelo e informe o título do processo.' }, 400);
      const instance = {
        id: `inst_${Date.now()}`, template_key: template.template_key, title: body.title, status: 'in_progress',
        created_at: timestamp(), created_by_name: state.user.fullName,
        steps: template.steps.map((step, index) => ({ ...step, step_order: index + 1, status: index === 0 ? 'in_progress' : 'blocked', completed_by_name: null, completed_at: null, action_data_json: null })),
        events: [{ action: 'created', details: 'Processo iniciado na demonstração', created_by_name: state.user.fullName, created_at: timestamp() }]
      };
      state.instances.unshift(instance);
      writeState(state);
      return json({ instance, message: 'Processo iniciado na demonstração.' }, 201);
    }
    const instanceMatch = route.match(/^\/api\/workflows\/instances\/([^/]+)$/);
    if (instanceMatch && method === 'GET') {
      const instance = state.instances.find(item => item.id === decodeURIComponent(instanceMatch[1]));
      return instance ? json(workflowPayload(instance)) : json({ message: 'Processo não localizado.' }, 404);
    }
    const stepMatch = route.match(/^\/api\/workflows\/instances\/([^/]+)\/steps\/([^/]+)\/execute$/);
    if (stepMatch && method === 'POST') {
      const instance = state.instances.find(item => item.id === decodeURIComponent(stepMatch[1]));
      const step = instance?.steps.find(item => item.node_key === decodeURIComponent(stepMatch[2]));
      if (!step || step.status !== 'in_progress') return json({ message: 'Esta etapa não está disponível para conclusão.' }, 400);
      const body = requestBody(init);
      step.status = 'completed';
      step.completed_by_name = state.user.fullName;
      step.completed_at = timestamp();
      step.action_data_json = JSON.stringify({ observacao: body.notes || 'Concluída na demonstração' });
      const next = instance.steps.find(item => item.status === 'blocked');
      if (next) next.status = 'in_progress'; else instance.status = 'completed';
      instance.events.push({ action: 'step_completed', details: body.notes || `${step.title} concluída`, created_by_name: state.user.fullName, created_at: timestamp() });
      writeState(state);
      return json({ instance, step, message: 'Etapa concluída. O histórico foi atualizado.' });
    }

    if (route === '/api/settings/layout' && method === 'GET') return json({ widgets: [] });
    if (route === '/api/search' && method === 'GET') return json({ results: [], quickActions: [
      { action: 'open_workflows', title: 'Abrir processos', category: 'Gestão do clube' },
      { action: 'reserve_venue', title: 'Criar reserva', category: 'Instalações' },
      { action: 'pre_register', title: 'Cadastrar atleta', category: 'Pessoas' }
    ] });
    return json({});
  }

  window.fetch = demoFetch;
  document.addEventListener('DOMContentLoaded', () => {
    updateDashboard(readState());
    document.getElementById('reset-demo-data')?.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      window.location.reload();
    });
  });
})();
