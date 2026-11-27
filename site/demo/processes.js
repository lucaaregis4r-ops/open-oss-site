(function () {
  "use strict";

  const processDefinitions = {
    registration: {
      label: "Entrada de atleta",
      mark: "P",
      steps: [
        { id: "pre", title: "Pré-cadastro", owner: "Família ou atleta", due: "1 dia útil", next: "Enviar os dados iniciais", description: "A família informa os dados básicos e escolhe a equipe de interesse.", checklist: ["Dados de contato", "Equipe de interesse"] },
        { id: "review", title: "Conferência", owner: "Secretaria", due: "2 dias úteis", next: "Conferir dados e responsável", description: "A secretaria revisa os dados enviados e confirma quem responde pelo atleta.", checklist: ["Identificação conferida", "Contato do responsável", "Equipe compatível"] },
        { id: "documents", title: "Documentos e saúde", owner: "Família e secretaria", due: "3 dias úteis", next: "Registrar documentos necessários", description: "Documentos e informações de saúde ficam organizados antes do primeiro treino.", checklist: ["Autorização do responsável", "Informações de saúde", "Documentos do atleta"] },
        { id: "team", title: "Vínculo com equipe", owner: "Coordenação esportiva", due: "1 dia útil", next: "Confirmar modalidade e equipe", description: "A coordenação confirma a modalidade, a equipe e a pessoa de referência.", checklist: ["Modalidade definida", "Equipe confirmada", "Responsável técnico"] },
        { id: "active", title: "Atleta ativo", owner: "Equipe do clube", due: "Concluído", next: "Acompanhar participação", description: "O cadastro está completo e o atleta já pode ser acompanhado pela equipe.", checklist: ["Cadastro completo", "Equipe vinculada", "Família informada"] }
      ],
      exception: { id: "return", title: "Complementar dados", owner: "Família", due: "A combinar", next: "Enviar a informação pendente", description: "Quando falta alguma informação, a secretaria devolve o cadastro com uma orientação clara para a família.", checklist: ["Pendência descrita", "Responsável avisado"] }
    },
    reservation: {
      label: "Reserva de espaço",
      mark: "A",
      steps: [
        { id: "request", title: "Solicitação", owner: "Equipe solicitante", due: "No pedido", next: "Informar atividade e horário", description: "A equipe registra a atividade, o espaço preferido, a data e a duração.", checklist: ["Atividade identificada", "Data e duração", "Equipe solicitante"] },
        { id: "check", title: "Disponibilidade", owner: "Agenda do clube", due: "Imediato", next: "Consultar conflitos no espaço", description: "O sistema consulta a agenda e verifica se já existe uma reserva no mesmo intervalo.", checklist: ["Espaço selecionado", "Horário consultado", "Conflitos verificados"] },
        { id: "decision", title: "Espaço livre?", owner: "Coordenação", due: "Imediato", next: "Confirmar ou sugerir alternativa", description: "Se o horário estiver livre, a equipe segue para confirmação. Se estiver ocupado, escolhe uma alternativa.", checklist: ["Horário disponível", "Regras do espaço atendidas"] },
        { id: "confirm", title: "Reserva confirmada", owner: "Equipe solicitante", due: "Após aprovação", next: "Compartilhar horário com a equipe", description: "A reserva confirmada aparece na agenda compartilhada do clube.", checklist: ["Horário bloqueado", "Equipe avisada", "Agenda atualizada"] },
        { id: "done", title: "Atividade concluída", owner: "Equipe esportiva", due: "Após a atividade", next: "Registrar observações", description: "Depois do uso do espaço, a equipe encerra a atividade e registra observações úteis.", checklist: ["Espaço utilizado", "Atividade encerrada"] }
      ],
      exception: { id: "alternative", title: "Escolher alternativa", owner: "Equipe solicitante", due: "No pedido", next: "Selecionar outro horário ou espaço", description: "Se já houver uma reserva, a equipe compara opções livres e escolhe outro espaço ou horário.", checklist: ["Conflito informado", "Opções livres apresentadas"] }
    }
  };

  const layouts = {
    registration: {
      width: 1000,
      height: 390,
      positions: [
        { x: 28, y: 82 }, { x: 220, y: 82 }, { x: 412, y: 82 }, { x: 604, y: 82 }, { x: 796, y: 82 }
      ],
      exception: { x: 412, y: 250 }
    },
    reservation: {
      width: 1000,
      height: 390,
      positions: [
        { x: 28, y: 82 }, { x: 220, y: 82 }, { x: 412, y: 82 }, { x: 604, y: 82 }, { x: 796, y: 82 }
      ],
      exception: { x: 412, y: 250 }
    }
  };

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function renderProcessDiagram({ kind, state = {}, onSelect = () => {} }) {
    const definition = processDefinitions[kind];
    const layout = layouts[kind];
    if (!definition || !layout) return "";

    const currentStep = state.currentStep || definition.steps[0].id;
    const completeSteps = new Set(state.completeSteps || []);
    const nodes = definition.steps.map((step, index) => {
      const position = layout.positions[index];
      const status = completeSteps.has(step.id) ? "complete" : currentStep === step.id ? "current" : "waiting";
      return { ...step, ...position, status, index };
    });
    const exceptionPosition = layout.exception;
    const exceptionVisible = state.showException !== false;
    const nodeWidth = 176;
    const nodeHeight = 100;
    const mainEdges = nodes.slice(0, -1).map((node, index) => {
      const next = nodes[index + 1];
      const edgeStatus = completeSteps.has(node.id) && (completeSteps.has(next.id) || currentStep === next.id) ? "is-complete" : node.id === currentStep ? "is-current" : "";
      return `<path class="flow-edge ${edgeStatus}" d="M ${node.x + nodeWidth} ${node.y + 52} C ${node.x + nodeWidth + 16} ${node.y + 52}, ${next.x - 16} ${next.y + 52}, ${next.x} ${next.y + 52}" />`;
    }).join("");
    const exceptionEdges = exceptionVisible
      ? `<path class="flow-edge flow-edge--exception" d="M ${nodes[2].x + 88} ${nodes[2].y + nodeHeight} C ${nodes[2].x + 88} ${nodes[2].y + 128}, ${exceptionPosition.x + 88} ${exceptionPosition.y - 18}, ${exceptionPosition.x + 88} ${exceptionPosition.y}" />
         <path class="flow-edge flow-edge--return" d="M ${exceptionPosition.x} ${exceptionPosition.y + 44} C ${exceptionPosition.x - 70} ${exceptionPosition.y + 44}, ${nodes[1].x + 88} ${nodes[1].y + 140}, ${nodes[1].x + 88} ${nodes[1].y + nodeHeight}" />
         <text class="flow-edge-label" x="${exceptionPosition.x + nodeWidth + 10}" y="${exceptionPosition.y + 28}">com pendência</text>
         <text class="flow-edge-label" x="${nodes[1].x + 120}" y="${exceptionPosition.y + 85}">${kind === "registration" ? "retorna para conferência" : "reconsulta disponibilidade"}</text>`
      : "";
    const renderedNodes = nodes.map((node) => renderNode(node, nodeWidth, nodeHeight, state.selectedStep === node.id)).join("");
    const exceptionNode = exceptionVisible ? renderNode({ ...definition.exception, ...exceptionPosition, status: state.currentStep === definition.exception.id ? "exception is-current" : "exception", index: "!" }, nodeWidth, 88, state.selectedStep === definition.exception.id) : "";
    const svg = `<svg viewBox="0 0 ${layout.width} ${layout.height}" role="group" aria-label="Fluxo: ${escapeHTML(definition.label)}" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="flow-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="flow-arrowhead" /></marker></defs>
      <text class="flow-lane-label" x="28" y="42">CAMINHO PRINCIPAL</text>
      ${mainEdges}${exceptionEdges}${renderedNodes}${exceptionNode}
      <text class="flow-footer-label" x="28" y="365">ETAPAS COM RESPONSÁVEIS, PRAZOS E PRÓXIMA AÇÃO</text>
    </svg>`;

    return `<div class="process-diagram" data-process-diagram="${kind}">${svg}<div class="process-diagram-live visually-hidden" aria-live="polite"></div></div>`;

    function renderNode(node, width, height, selected) {
      const classes = ["flow-node", `flow-node--${String(node.status).split(" ")[0]}`, selected ? "is-selected" : ""].filter(Boolean).join(" ");
      const title = escapeHTML(node.title);
      const owner = escapeHTML(node.owner);
      const statusLabel = node.status === "complete" ? "Concluída" : node.status === "current" ? "Etapa atual" : node.status === "exception is-current" ? "Pendência atual" : node.status.startsWith("exception") ? "Caminho alternativo" : "Aguardando";
      const aria = `${title}. ${statusLabel}. Responsável: ${owner}. Selecione para ver detalhes.`;
      return `<g class="${classes}" data-step-id="${escapeHTML(node.id)}" tabindex="0" role="button" aria-label="${escapeHTML(aria)}" aria-pressed="${selected ? "true" : "false"}">
        <rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="12" />
        <circle class="flow-node__badge" cx="${node.x + 23}" cy="${node.y + 23}" r="11" />
        <text class="flow-node__number" x="${node.x + 23}" y="${node.y + 27}" text-anchor="middle">${escapeHTML(node.index === "!" ? "!" : String(node.index + 1).padStart(2, "0"))}</text>
        <text class="flow-node__status" x="${node.x + 42}" y="${node.y + 27}">${escapeHTML(statusLabel)}</text>
        <text class="flow-node__title" x="${node.x + 14}" y="${node.y + 54}">${title}</text>
        <text class="flow-node__owner" x="${node.x + 14}" y="${node.y + 77}">Por ${owner}</text>
        <path class="flow-node__chevron" d="M ${node.x + width - 20} ${node.y + height - 18} l 5 5 5 -5" />
      </g>`;
    }
  }

  function renderProcessList({ kind, state = {}, onSelect = () => {} }) {
    const definition = processDefinitions[kind];
    if (!definition) return "";
    const currentStep = state.currentStep || definition.steps[0].id;
    const completeSteps = new Set(state.completeSteps || []);
    const allSteps = [...definition.steps, definition.exception];
    return `<ol class="process-list">${allSteps.map((step, index) => {
      const isException = step.id === definition.exception.id;
      const status = isException ? (currentStep === step.id ? "is-current" : "is-exception") : completeSteps.has(step.id) ? "is-complete" : currentStep === step.id ? "is-current" : "";
      const label = isException ? "Alternativa" : completeSteps.has(step.id) ? "Concluída" : currentStep === step.id ? "Em andamento" : "Aguardando";
      return `<li class="process-list-item ${status}"><span class="process-list-number">${isException ? "↶" : String(index + 1).padStart(2, "0")}</span><button type="button" class="process-list-select" data-step-id="${escapeHTML(step.id)}" aria-current="${currentStep === step.id ? "step" : "false"}"><strong>${escapeHTML(step.title)}</strong><small>${escapeHTML(step.owner)} · ${label}</small></button></li>`;
    }).join("")}</ol>`;
  }

  function bindProcessSelection(container, onSelect) {
    container.onclick = (event) => {
      const node = event.target.closest("[data-step-id]");
      if (node) onSelect(node.dataset.stepId);
    };
    container.onkeydown = (event) => {
      const node = event.target.closest(".flow-node[data-step-id]");
      if (!node || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      onSelect(node.dataset.stepId);
    };
  }

  window.ClubeProcesses = {
    definitions: processDefinitions,
    renderProcessDiagram,
    renderProcessList,
    bindProcessSelection
  };
})();
