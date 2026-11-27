# Site do Open OSS

Site público de apresentação do Open OSS, publicado pelo GitHub Pages a partir da pasta `site/`. O catálogo completo e as capturas reais do app vivem junto com a página; a vitrine não precisa de backend nem etapa de build e pode ser hospedada como arquivos estáticos.

## Conteúdo

- Catálogo pesquisável de módulos por área, com detalhes de campos e saídas.
- Os seis pacotes integrados e o que cada um instala.
- Capturas reais do criador de módulos e do estúdio de automações.
- Recursos de dados, acessos, processos, IA e execução autogerida.
- Comandos de execução local e Docker.

O arquivo `site/data/catalog.json` é uma fotografia gerada do catálogo da plataforma. Para atualizá-lo, gere novamente os dados no repositório `open-oss` com `node scripts/build_site_catalog.js` e copie o arquivo para esta pasta.

## GitHub Pages

O workflow em `.github/workflows/pages.yml` publica `site/` quando há push em `main`. Configure a origem do GitHub Pages como **GitHub Actions** nas configurações do repositório.

## Desenvolvimento local

Sirva `site/` com qualquer servidor HTTP estático. Por exemplo:

```sh
python3 -m http.server 8000 --directory site
```

Depois abra `http://localhost:8000`. O catálogo busca `data/catalog.json` por caminho relativo e também funciona sob o caminho de projeto do GitHub Pages.

## Material visual

As imagens em `site/images/screens/` foram capturadas do app local em um workspace fictício. Não contêm dados de produção. O código da plataforma fica no repositório `lucaaregis4r-ops/open-oss`; ele exige acesso autorizado.
