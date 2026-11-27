(() => {
  const typeLabels = {
    text: 'Texto',
    textarea: 'Texto longo',
    number: 'Número',
    currency: 'Moeda',
    date: 'Data',
    select: 'Seleção',
    status: 'Status',
    boolean: 'Sim ou não',
    email: 'E-mail',
    phone: 'Telefone',
    url: 'URL',
    person: 'Pessoa',
    file: 'Anexo',
    formula: 'Fórmula',
    auto_number: 'Código automático'
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const search = document.getElementById('catalog-search');
  const status = document.getElementById('catalog-status');
  const list = document.getElementById('catalog-list');
  const more = document.getElementById('catalog-more');
  const filters = document.getElementById('category-filters');
  const packsList = document.getElementById('packs-list');
  const dialog = document.getElementById('module-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogContent = document.getElementById('dialog-content');
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-nav');
  const navToggleLabel = navToggle.querySelector('.visually-hidden');

  let catalog;
  let activeCategory = 'Todas as áreas';
  const pageSize = 6;
  let visibleCount = pageSize;

  function renderFilters() {
    const categories = ['Todas as áreas', ...(catalog.categories || [])];
    filters.innerHTML = categories.map(category => `
      <button
        class="filter-button"
        type="button"
        data-category="${escapeHtml(category)}"
        aria-pressed="${activeCategory === category}">
        ${escapeHtml(category)}
      </button>
    `).join('');
  }

  function renderCatalog() {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    const matches = catalog.modules.filter(module => {
      const categoryMatches = activeCategory === 'Todas as áreas' || module.category === activeCategory;
      const searchable = `${module.name} ${module.description} ${module.category}`.toLocaleLowerCase('pt-BR');
      return categoryMatches && (!query || searchable.includes(query));
    });

    status.textContent = `${matches.length} ${matches.length === 1 ? 'módulo encontrado' : 'módulos encontrados'}.`;
    list.innerHTML = matches.slice(0, visibleCount).map(module => `
      <button class="module-result" type="button" data-module="${escapeHtml(module.key)}">
        <span class="module-result-name">${escapeHtml(module.name)}</span>
        <span class="module-result-category">${escapeHtml(module.category)}</span>
      </button>
    `).join('');

    more.hidden = matches.length <= visibleCount;
  }

  function renderPacks() {
    packsList.innerHTML = catalog.packs.map(pack => `
      <li class="pack-row">
        <details
          class="pack-disclosure"
          data-description="${escapeHtml(pack.description)}"
          data-process-count="${pack.workflowTemplates.length}"
          data-automation-count="${pack.automations.length}">
          <summary>
            <span class="pack-name">${escapeHtml(pack.name)}</span>
            <span class="pack-module-count">${pack.moduleKeys.length} ${pack.moduleKeys.length === 1 ? 'módulo' : 'módulos'}</span>
          </summary>
        </details>
      </li>
    `).join('');

    packsList.querySelectorAll('.pack-disclosure').forEach(disclosure => {
      disclosure.addEventListener('toggle', () => {
        if (!disclosure.open || disclosure.dataset.loaded) return;

        const detail = document.createElement('div');
        const description = document.createElement('p');
        const counts = document.createElement('p');
        const processCount = Number(disclosure.dataset.processCount);
        const automationCount = Number(disclosure.dataset.automationCount);

        detail.className = 'pack-detail';
        description.textContent = disclosure.dataset.description;
        counts.textContent = `${processCount} ${processCount === 1 ? 'processo' : 'processos'} e ${automationCount} ${automationCount === 1 ? 'automação' : 'automações'}.`;
        detail.append(description, counts);
        disclosure.append(detail);
        disclosure.dataset.loaded = 'true';
      });
    });
  }

  function openModule(key) {
    const module = catalog.modules.find(item => item.key === key);
    if (!module) return;

    const fields = module.definition?.fields || [];
    const outputs = module.definition?.outputs || [];
    dialogTitle.textContent = module.name;
    dialogContent.innerHTML = `
      <p>${escapeHtml(module.description)}</p>
      <section aria-labelledby="dialog-fields-title">
        <h3 id="dialog-fields-title">Campos do módulo</h3>
        ${fields.length
          ? `<ul class="dialog-fields">${fields.map(field => `
              <li>
                <strong>${escapeHtml(field.label)}</strong>
                <span>${escapeHtml(typeLabels[field.type] || field.type)}${field.required ? ' (obrigatório)' : ''}</span>
              </li>
            `).join('')}</ul>`
          : '<p class="dialog-empty">Este módulo ainda não lista campos no catálogo.</p>'}
      </section>
      <section aria-labelledby="dialog-outputs-title">
        <h3 id="dialog-outputs-title">Saídas para conexões</h3>
        <p>${outputs.length ? outputs.map(escapeHtml).join(', ') : 'Os campos publicados podem ser conectados a outros módulos.'}</p>
      </section>
    `;
    dialog.showModal();
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    visibleCount = pageSize;
    renderFilters();
    renderCatalog();
  });

  search.addEventListener('input', () => {
    visibleCount = pageSize;
    renderCatalog();
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-module]');
    if (button) openModule(button.dataset.module);
  });

  more.addEventListener('click', () => {
    visibleCount += pageSize;
    renderCatalog();
  });

  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('is-open', !expanded);
    navToggleLabel.textContent = expanded ? 'Abrir navegação' : 'Fechar navegação';
  });

  siteNav.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggleLabel.textContent = 'Abrir navegação';
    siteNav.classList.remove('is-open');
  });

  fetch('./data/catalog.json')
    .then(response => {
      if (!response.ok) throw new Error(`O catálogo respondeu com HTTP ${response.status}.`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.modules) || !Array.isArray(data.packs) || !Array.isArray(data.categories)) {
        throw new Error('O arquivo do catálogo está incompleto.');
      }
      catalog = data;
      renderFilters();
      renderCatalog();
      renderPacks();
    })
    .catch(error => {
      status.textContent = `Não foi possível carregar o catálogo. ${error.message}`;
      list.innerHTML = '<p class="dialog-empty">Confira a conexão e tente recarregar a página.</p>';
      packsList.innerHTML = '<li class="dialog-empty">Os pacotes não puderam ser carregados.</li>';
    });
})();
