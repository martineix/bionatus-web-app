# Central de Materiais — Design

## Objetivo

Hoje vídeos, fichas técnicas, lâminas e fotos dos produtos ficam soltos numa pasta do Google Drive, sem organização acessível de dentro do app. Este trabalho cria uma aba "Materiais" no `bionatus-web-app`, acessível a qualquer usuário logado (representante ou admin), onde é possível buscar por produto, filtrar por tipo de material, visualizar, baixar e copiar um link para compartilhar.

Pasta raiz no Drive: `https://drive.google.com/drive/folders/1VrW0uTZxwsq9DWZBONTrdCMhAdSdYdLA` — uma subpasta por produto (ex: "Bioginkgo"), e dentro de cada uma, arquivos soltos nomeados com uma tag entre `[ ]` indicando o tipo, ex: `[Ficha Técnica] Bioginkgo 80 e 120 mg.pdf`, `[Foto] Bioginkgo 80mg.jpg`, `[Lâmina] Bioginkgo 80 e 120mg.png`.

## Escopo — 2 repositórios/sistemas distintos

1. **Backend** (`C:\Users\Power BI\projetos\backend`) — novo módulo de integração com a Google Drive API (service account), novas rotas HTTP.
2. **Supabase** — uma tabela nova (favoritos) com RLS.
3. **Frontend** (`bionatus-web-app`, este repo) — nova aba "Materiais".

Sem sincronização de arquivos para o Supabase: a listagem é lida "ao vivo" do Drive (com cache curto em memória no backend). O conteúdo dos arquivos nunca é copiado para nosso storage — é sempre servido via *proxy* pelo backend no momento do acesso.

## Credencial (já provisionada pelo usuário)

Service account `bionatus-drive-sync@deep-castle-505514-g5.iam.gserviceaccount.com`, com papel de Leitor na pasta raiz. Três variáveis de ambiente novas no backend (`.env` local e produção — usuário já configurou):

```
GOOGLE_DRIVE_CLIENT_EMAIL=bionatus-drive-sync@deep-castle-505514-g5.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_MATERIAIS_FOLDER_ID=1VrW0uTZxwsq9DWZBONTrdCMhAdSdYdLA
```

`src/config/env.js` ganha os três campos correspondentes (`googleDriveClientEmail`, `googleDrivePrivateKey`, `googleDriveMateriaisFolderId`), seguindo o padrão já existente no arquivo.

## Autenticação das rotas novas (padrão novo neste backend)

Hoje as rotas desse backend não verificam quem chama — são acionadas por n8n/cron, não por navegador de usuário final. As rotas de Materiais são as primeiras pensadas para serem chamadas direto pelo navegador do representante, então precisam de um middleware novo:

**Arquivo novo:** `src/middlewares/auth-supabase.js`
- Lê o header `Authorization: Bearer <token>`.
- Chama `supabase.auth.getUser(token)` usando o client Supabase já existente (`supabaseUrlSnk`/`supabaseSnkRoleKey`, mesmo client usado nos syncs).
- Sem token válido → `401`. Não checa `role` — qualquer usuário autenticado (admin ou representante) acessa.
- Aplicado só nas rotas `/materiais/*`, via `preHandler` do Fastify.

O frontend passa o `access_token` da sessão Supabase atual (`supabase.auth.getSession()`) no header a cada chamada.

## 1. Backend

### 1.1 Módulo de integração com o Drive

**Arquivo novo:** `src/services/services-new/drive-materiais.js`

- Usa o pacote `googleapis` (adicionar em `package.json`). Autentica via `google.auth.JWT(clientEmail, null, privateKey, ["https://www.googleapis.com/auth/drive.readonly"])`.
- `listarMateriais()`:
  1. Lista subpastas de `GOOGLE_DRIVE_MATERIAIS_FOLDER_ID` (`files.list` com `q: "'<id>' in parents and mimeType='application/vnd.google-apps.folder'"`) → cada uma é um produto (`{ id, nome }`).
  2. Para cada subpasta, lista os arquivos dentro (`q: "'<idProduto>' in parents"`, campos `id, name, mimeType`).
  3. Para cada arquivo, extrai a tag com regex `^\[([^\]]+)\]\s*(.*)$` sobre `name`. Sem match → categoria `"Outro"`, nome de exibição = `name` original.
  4. Normaliza a tag capturada (uppercase, remove acentos) e mapeia para categoria canônica:
     - `FICHA TECNICA` → `Ficha Técnica`
     - `LAMINA` / `LAMINAS` → `Lâmina`
     - `FOTO` / `FOTOS` → `Foto`
     - `VIDEO` / `VIDEOS` → `Vídeo`
     - qualquer outra coisa → `Outro`
  5. Monta e retorna:
     ```js
     [{
       produtoId: string,
       produtoNome: string,
       categorias: string[],       // categorias presentes, únicas, na ordem Ficha Técnica, Lâmina, Vídeo, Foto, Outro
       arquivos: [{ id: string, nome: string, categoria: string, mimeType: string }]
     }]
     ```
- **Cache em memória no módulo** (`let cache = { data: null, expiraEm: 0 }`): se `Date.now() < cache.expiraEm`, devolve `cache.data` sem chamar o Drive. TTL de 15 minutos. Sem Redis, sem tabela — um único processo Fastify mantém isso na memória do próprio processo.
- `buscarArquivo(fileId)`: valida que `fileId` está presente no cache atual (chama `listarMateriais()` antes, que já é cacheado) — se não estiver, `404`. Se estiver, usa `drive.files.get({ fileId, alt: "media" }, { responseType: "stream" })` e retorna o stream + `mimeType` para a rota repassar.

### 1.2 Rotas novas

**Arquivo novo:** `src/routes/materiais.routes.js`, registrado em `app.js` com prefixo `/materiais` e `preHandler: authSupabase`.

- `GET /materiais` → chama `listarMateriais()`, devolve o JSON descrito acima.
- `GET /materiais/arquivo/:fileId` → chama `buscarArquivo(fileId)`; define `Content-Type` a partir do `mimeType` retornado pelo Drive e faz *pipe* do stream na resposta. Usado tanto para "Visualizar" (o navegador renderiza inline se for PDF/imagem/vídeo) quanto "Baixar" (frontend adiciona `?download=1` → rota seta `Content-Disposition: attachment` nesse caso).

## 2. Supabase

### 2.1 `materiais_favoritos` — tabela nova

```sql
create table public.materiais_favoritos (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  produto_id text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, produto_id)
);

alter table public.materiais_favoritos enable row level security;

create policy "usuario_ve_proprios_favoritos"
  on public.materiais_favoritos for select
  using (profile_id = auth.uid());

create policy "usuario_insere_proprio_favorito"
  on public.materiais_favoritos for insert
  with check (profile_id = auth.uid());

create policy "usuario_remove_proprio_favorito"
  on public.materiais_favoritos for delete
  using (profile_id = auth.uid());
```

`produto_id` é o ID da subpasta do Drive (texto, sem FK real — é um identificador externo). Sem RPC: o frontend usa `supabase.from("materiais_favoritos")` direto (select/insert/delete), protegido pelas policies acima.

## 3. Frontend

### 3.1 Cliente HTTP para o backend

**Arquivo novo:** `src/lib/materiais/materiais-api.ts`
- Lê a URL base do backend de uma env var nova (`VITE_BACKEND_URL`).
- `getMateriais(): Promise<Produto[]>` → `GET {base}/materiais` com header `Authorization: Bearer {access_token da sessão atual}`.
- `getArquivoUrl(fileId: string, download: boolean): string` → monta a URL `{base}/materiais/arquivo/{fileId}{?download=1}` para usar direto em `<a href>`/`<iframe>` (o token vai como query param `?token=` nesse caso, já que tags `<a>`/`<iframe>` não mandam headers — a rota aceita token via header OU via query `?token=`).

### 3.2 Página e rota

**Arquivo novo:** `src/pages/materiais/materiais-page.tsx`, registrado no router com path `/materiais`. Item novo no menu lateral (`AppShell`/sidebar existente), visível para qualquer usuário logado.

- Busca por nome do produto (filtro client-side sobre a lista já carregada — poucos produtos, não precisa ida ao servidor).
- Chips de filtro rápido: Todos / Ficha Técnica / Lâminas / Vídeos / Fotos (filtra pela lista de `categorias` de cada produto).
- Grid de cards por produto, replicando o mockup aprovado: ícone colorido por produto (cor derivada de um hash do nome, mesmo princípio usado em outros lugares do app para evitar cor fixa por produto), nome, subtítulo com as categorias disponíveis (`Ficha técnica • Lâminas • Vídeos`), estrela de favorito, botões Visualizar/Baixar/Enviar.
- Estrela: `useState` inicial vindo de `supabase.from("materiais_favoritos").select("produto_id").eq("profile_id", user.id)`; toggle chama insert/delete direto.

### 3.3 Modal de arquivos do produto

**Componente novo:** `src/components/materiais/produto-materiais-modal.tsx`

Aberto pelos 3 botões do card (Visualizar/Baixar/Enviar abrem o mesmo modal — a ação específica só muda qual botão já vem em foco/destacado). Lista os `arquivos` daquele produto agrupados por categoria; cada linha tem:
- **Visualizar**: abre `getArquivoUrl(id, false)` em nova aba (PDF/imagem renderizam nativo no navegador; vídeo também, já que `Content-Type` vem correto do Drive).
- **Baixar**: `<a href={getArquivoUrl(id, true)} download>`.
- **Enviar**: copia `getArquivoUrl(id, false)` para a área de transferência (`navigator.clipboard.writeText`), com toast de confirmação.

## Fora de escopo (confirmado com o usuário)

- Sincronizar arquivos/metadados para o Supabase — listagem sempre ao vivo (com cache de 15 min) direto do Drive.
- Envio direto por WhatsApp/e-mail — "Enviar" só copia o link.
- Categorização por convenção de subpastas — todos os produtos seguem o padrão de tag `[Categoria]` no nome do arquivo.
- Pasta "Descontinuados" (vista no primeiro nível junto dos produtos): tratada como um card de produto igual aos demais por padrão, já que a estrutura real dela não foi inspecionada. Se ela tiver uma estrutura diferente (ex: subpastas por produto descontinuado, aninhadas), ajusta-se na implementação, ao rodar contra o Drive real.
