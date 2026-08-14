# Central de Materiais — Plano de Implementação

> **Para quem for executar:** USE O SUB-SKILL OBRIGATÓRIO superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Objetivo:** Criar a aba "Materiais" no `bionatus-web-app`, onde qualquer usuário logado busca, filtra, visualiza, baixa e copia link de compartilhamento de vídeos/fichas técnicas/lâminas/fotos dos produtos, lidos ao vivo de uma pasta do Google Drive (sem sincronizar arquivos para o Supabase).

**Arquitetura:** Backend Node/Fastify (`C:\Users\Power BI\projetos\backend`) ganha um módulo que fala com a Google Drive API via service account, com cache em memória de 15 min, e duas rotas HTTP novas protegidas por um middleware que valida o token de sessão do Supabase. Supabase ganha só uma tabela nova (favoritos por usuário, com RLS). O frontend (este repo) ganha uma página nova que consome essas rotas e a tabela de favoritos.

**Tech Stack:** `googleapis` (novo, backend), Fastify (rotas/middleware), PostgreSQL/Supabase (tabela + RLS via `mcp__supabase__apply_migration`), React/TypeScript (frontend). Nenhum framework de testes automatizados existe no frontend nem no Supabase (verificação manual, igual às demais features deste projeto); o backend também não tem framework de testes configurado, mas a Task 1 usa o runner nativo do Node (`node --test`, disponível sem instalar nada) para a única peça de lógica pura e determinística deste trabalho.

**Spec:** `docs/superpowers/specs/2026-08-14-central-materiais-design.md`

## Global Constraints

- Pasta raiz no Drive: `1VrW0uTZxwsq9DWZBONTrdCMhAdSdYdLA`. Uma subpasta = um produto. Arquivos soltos dentro, nomeados `[Categoria] resto do nome.ext`.
- Categorias reconhecidas (normalizando a tag: uppercase, sem acento): `FICHA TECNICA` → `Ficha Técnica`; `LAMINA`/`LAMINAS` → `Lâmina`; `FOTO`/`FOTOS` → `Foto`; `VIDEO`/`VIDEOS` → `Vídeo`. Qualquer tag fora dessa lista, ou arquivo sem tag `[...]` no início do nome, cai em `Outro` — nunca lança erro.
- As três variáveis de ambiente do backend já existem em `C:\Users\Power BI\projetos\backend\.env` (usuário já configurou): `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY`, `GOOGLE_DRIVE_MATERIAIS_FOLDER_ID`. `src/config/env.js` já expõe `env.googleDriveClientEmail`, `env.googleDrivePrivateKey`, `env.googleDriveMateriaisFolderId` — não recriar, só consumir.
- Backend usa `env.supabaseUrlSnk`/`env.supabaseSnkRoleKey` (projeto `lbsrhplahyusmcexnwfw`, o mesmo do frontend) para o client Supabase usado na validação de sessão — nunca `env.supabaseUrl`/`env.supabaseKey` (projeto Fideliza legado, não relacionado a este app).
- Nenhum arquivo de conteúdo do Drive é copiado para o Supabase ou para disco — sempre servido via *stream* (proxy) no momento do acesso.
- Nunca imprimir/logar o valor de `env.googleDrivePrivateKey` ou de tokens de acesso em `console.log`.

---

### Task 1: Backend — categorização de arquivos por tag

**Repositório:** `C:\Users\Power BI\projetos\backend`

**Files:**
- Create: `src/services/services-new/materiais-categorias.js`
- Test: `src/services/services-new/materiais-categorias.test.js`

**Interfaces:**
- Produces: `parseTagCategoria(nomeArquivo: string): { categoria: string, nomeExibicao: string }` — usada pela Task 2.

- [ ] **Passo 1: Escrever os testes**

Criar `src/services/services-new/materiais-categorias.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTagCategoria } from "./materiais-categorias.js";

test("reconhece Ficha Técnica com acento na tag", () => {
  const resultado = parseTagCategoria("[Ficha Técnica] Bioginkgo 80 e 120 mg.pdf");
  assert.deepEqual(resultado, {
    categoria: "Ficha Técnica",
    nomeExibicao: "Bioginkgo 80 e 120 mg.pdf",
  });
});

test("reconhece Foto", () => {
  const resultado = parseTagCategoria("[Foto] Bioginkgo 80mg.jpg");
  assert.deepEqual(resultado, {
    categoria: "Foto",
    nomeExibicao: "Bioginkgo 80mg.jpg",
  });
});

test("reconhece Lamina mesmo sem acento na tag", () => {
  const resultado = parseTagCategoria("[Lamina] Bioginkgo 80 e 120mg.png");
  assert.deepEqual(resultado, {
    categoria: "Lâmina",
    nomeExibicao: "Bioginkgo 80 e 120mg.png",
  });
});

test("reconhece Video no plural", () => {
  const resultado = parseTagCategoria("[Videos] Bioginkgo institucional.mp4");
  assert.deepEqual(resultado, {
    categoria: "Vídeo",
    nomeExibicao: "Bioginkgo institucional.mp4",
  });
});

test("tag desconhecida cai em Outro", () => {
  const resultado = parseTagCategoria("[Catálogo] Bioginkgo.pdf");
  assert.deepEqual(resultado, {
    categoria: "Outro",
    nomeExibicao: "Bioginkgo.pdf",
  });
});

test("sem tag no inicio do nome cai em Outro, com o nome original", () => {
  const resultado = parseTagCategoria("Bioginkgo solto.pdf");
  assert.deepEqual(resultado, {
    categoria: "Outro",
    nomeExibicao: "Bioginkgo solto.pdf",
  });
});
```

- [ ] **Passo 2: Rodar os testes e confirmar que falham**

```bash
cd "C:\Users\Power BI\projetos\backend"
node --test src/services/services-new/materiais-categorias.test.js
```
Esperado: falha com `Cannot find module '...materiais-categorias.js'` (o arquivo de implementação ainda não existe).

- [ ] **Passo 3: Implementar**

Criar `src/services/services-new/materiais-categorias.js`:
```js
const MAPA_CATEGORIAS = {
  "FICHA TECNICA": "Ficha Técnica",
  LAMINA: "Lâmina",
  LAMINAS: "Lâmina",
  FOTO: "Foto",
  FOTOS: "Foto",
  VIDEO: "Vídeo",
  VIDEOS: "Vídeo",
};

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function parseTagCategoria(nomeArquivo) {
  const match = nomeArquivo.match(/^\[([^\]]+)\]\s*(.*)$/);

  if (!match) {
    return { categoria: "Outro", nomeExibicao: nomeArquivo };
  }

  const tag = normalizar(match[1]);
  const categoria = MAPA_CATEGORIAS[tag] ?? "Outro";
  const nomeExibicao = match[2].trim() || nomeArquivo;

  return { categoria, nomeExibicao };
}
```

- [ ] **Passo 4: Rodar os testes e confirmar que passam**

```bash
node --test src/services/services-new/materiais-categorias.test.js
```
Esperado: 6 testes, todos `pass`.

- [ ] **Passo 5: Commit**

```bash
git add src/services/services-new/materiais-categorias.js src/services/services-new/materiais-categorias.test.js
git commit -m "feat: categorizacao de materiais por tag no nome do arquivo"
```

---

### Task 2: Backend — integração com Drive, autenticação e rotas

**Repositório:** `C:\Users\Power BI\projetos\backend`

**Files:**
- Create: `src/services/services-new/drive-materiais.js`
- Create: `src/middlewares/auth-supabase.js`
- Create: `src/routes/materiais.routes.js`
- Modify: `src/app.js`
- Modify: `package.json` (dependência nova)

**Interfaces:**
- Consumes: `parseTagCategoria` (Task 1), `env.googleDriveClientEmail`/`env.googleDrivePrivateKey`/`env.googleDriveMateriaisFolderId`/`env.supabaseUrlSnk`/`env.supabaseSnkRoleKey`.
- Produces: rotas `GET /materiais` e `GET /materiais/arquivo/:fileId`, consumidas pela Task 4 (frontend).

- [ ] **Passo 1: Instalar a dependência**

```bash
cd "C:\Users\Power BI\projetos\backend"
npm install googleapis
```

- [ ] **Passo 2: Criar o módulo de integração com o Drive**

Criar `src/services/services-new/drive-materiais.js`:
```js
import { google } from "googleapis";
import { env } from "../../config/env.js";
import { parseTagCategoria } from "./materiais-categorias.js";

const TTL_CACHE_MS = 15 * 60 * 1000;
const ORDEM_CATEGORIAS = ["Ficha Técnica", "Lâmina", "Vídeo", "Foto", "Outro"];

let cache = { data: null, expiraEm: 0 };

function getDriveClient() {
  const auth = new google.auth.JWT(
    env.googleDriveClientEmail,
    null,
    env.googleDrivePrivateKey,
    ["https://www.googleapis.com/auth/drive.readonly"]
  );
  return google.drive({ version: "v3", auth });
}

async function listarPastasProdutos(drive) {
  const { data } = await drive.files.list({
    q: `'${env.googleDriveMateriaisFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 200,
  });
  return data.files ?? [];
}

async function listarArquivosDoProduto(drive, produtoId) {
  const { data } = await drive.files.list({
    q: `'${produtoId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name, mimeType)",
    pageSize: 200,
  });
  return data.files ?? [];
}

function ordenarCategorias(categorias) {
  return ORDEM_CATEGORIAS.filter((categoria) => categorias.has(categoria));
}

async function carregarMateriais() {
  const drive = getDriveClient();
  const pastas = await listarPastasProdutos(drive);
  const produtos = [];

  for (const pasta of pastas) {
    const arquivosDrive = await listarArquivosDoProduto(drive, pasta.id);
    const categoriasDoProduto = new Set();

    const arquivos = arquivosDrive.map((arquivo) => {
      const { categoria, nomeExibicao } = parseTagCategoria(arquivo.name);
      categoriasDoProduto.add(categoria);
      return {
        id: arquivo.id,
        nome: nomeExibicao,
        categoria,
        mimeType: arquivo.mimeType,
      };
    });

    produtos.push({
      produtoId: pasta.id,
      produtoNome: pasta.name,
      categorias: ordenarCategorias(categoriasDoProduto),
      arquivos,
    });
  }

  return produtos.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, "pt-BR"));
}

export async function listarMateriais() {
  if (cache.data && Date.now() < cache.expiraEm) {
    return cache.data;
  }

  const produtos = await carregarMateriais();
  cache = { data: produtos, expiraEm: Date.now() + TTL_CACHE_MS };
  return produtos;
}

export async function buscarArquivo(fileId) {
  const produtos = await listarMateriais();
  const encontrado = produtos.flatMap((p) => p.arquivos).find((a) => a.id === fileId);

  if (!encontrado) {
    return null;
  }

  const drive = getDriveClient();
  const resposta = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return { stream: resposta.data, mimeType: encontrado.mimeType, nome: encontrado.nome };
}
```

- [ ] **Passo 3: Criar o middleware de autenticação**

Criar `src/middlewares/auth-supabase.js`:
```js
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

const supabase = createClient(env.supabaseUrlSnk, env.supabaseSnkRoleKey);

export async function authSupabase(request, reply) {
  const authHeader = request.headers.authorization;
  const tokenDoHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = tokenDoHeader ?? request.query?.token ?? null;

  if (!token) {
    return reply.status(401).send({ status: "error", message: "Token de autenticação ausente." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return reply.status(401).send({ status: "error", message: "Token inválido." });
  }
}
```
(Aceita o token tanto por header `Authorization: Bearer <token>` quanto por query `?token=<token>` — o segundo caso é pra links usados direto em `<a href>`/`<iframe>`, que não mandam headers customizados.)

- [ ] **Passo 4: Criar as rotas**

Criar `src/routes/materiais.routes.js`:
```js
import { listarMateriais, buscarArquivo } from "../services/services-new/drive-materiais.js";
import { authSupabase } from "../middlewares/auth-supabase.js";

export default async function materiaisRoutes(app) {
  app.addHook("preHandler", authSupabase);

  app.get("/", async (request, reply) => {
    try {
      const produtos = await listarMateriais();
      return { status: "ok", produtos };
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ status: "error", message: err.message });
    }
  });

  app.get("/arquivo/:fileId", async (request, reply) => {
    try {
      const resultado = await buscarArquivo(request.params.fileId);

      if (!resultado) {
        return reply.status(404).send({ status: "error", message: "Arquivo não encontrado." });
      }

      reply.header("Content-Type", resultado.mimeType);
      if (request.query.download) {
        reply.header("Content-Disposition", `attachment; filename="${resultado.nome}"`);
      }

      return reply.send(resultado.stream);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ status: "error", message: err.message });
    }
  });
}
```

- [ ] **Passo 5: Registrar a rota em `app.js`**

Em `src/app.js`, adicionar o import junto dos demais:
```js
import materiaisRoutes from "./routes/materiais.routes.js";
```
E o registro, junto dos demais `app.register`:
```js
app.register(materiaisRoutes, { prefix: "/materiais" });
```

- [ ] **Passo 6: Verificar manualmente — sem token**

```bash
npm run dev
```
Em outro terminal:
```bash
curl -i http://localhost:3000/materiais
```
Esperado: `HTTP/1.1 401` com `{"status":"error","message":"Token de autenticação ausente."}`.

- [ ] **Passo 7: Verificar manualmente — com token real**

Pegar um token de sessão válido: logar no frontend (`npm run dev` no `bionatus-web-app`, abrir `http://localhost:5173`, fazer login), abrir o DevTools do navegador → aba Application/Storage → Local Storage → chave que começa com `sb-` e termina em `-auth-token` → copiar o valor de `access_token` de dentro do JSON.

```bash
curl -i http://localhost:3000/materiais -H "Authorization: Bearer <access_token colado aqui>"
```
Esperado: `HTTP/1.1 200` com `{"status":"ok","produtos":[...]}` — confirmar que aparece pelo menos um produto real da pasta do Drive, com `categorias` e `arquivos` preenchidos corretamente (bate com a estrutura vista na pasta real).

Pegar um `id` de um arquivo retornado e testar o proxy:
```bash
curl -i "http://localhost:3000/materiais/arquivo/<fileId>?token=<access_token>" -o teste-download.pdf
```
Esperado: `HTTP/1.1 200`, `Content-Type` correspondente ao arquivo, e `teste-download.pdf` (ou extensão equivalente) abre corretamente. Apagar o arquivo de teste depois (`rm teste-download.pdf` ou equivalente).

- [ ] **Passo 8: Commit**

```bash
git add src/services/services-new/drive-materiais.js src/middlewares/auth-supabase.js src/routes/materiais.routes.js src/app.js package.json package-lock.json
git commit -m "feat: integracao com Google Drive para a Central de Materiais"
```

---

### Task 3: Supabase — tabela de favoritos

**Files:**
- Migration via `mcp__supabase__apply_migration` (sem arquivo local — este projeto aplica migrations direto no Supabase, sem versionar `.sql` no repo).

**Interfaces:**
- Produces: tabela `materiais_favoritos(profile_id, produto_id, created_at)`, consumida diretamente pelo frontend (Task 4) via `supabase.from(...)`, sem RPC.

- [ ] **Passo 1: Criar a tabela e as policies**

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

- [ ] **Passo 2: Verificar manualmente**

Via `mcp__supabase__execute_sql`, simulando dois usuários diferentes (trocar pelos UUIDs de dois profiles reais existentes):
```sql
-- como usuário A: insere um favorito
select set_config('request.jwt.claims', '{"sub":"<uuid do profile A>"}', true);
insert into public.materiais_favoritos (profile_id, produto_id) values ('<uuid do profile A>', 'produto-teste-1');

-- como usuário A: ve o proprio favorito
select * from public.materiais_favoritos;
-- esperado: 1 linha (produto-teste-1)

-- como usuário B: NAO ve o favorito do usuário A
select set_config('request.jwt.claims', '{"sub":"<uuid do profile B>"}', true);
select * from public.materiais_favoritos;
-- esperado: 0 linhas

-- limpa o dado de teste (como usuário A de novo, ou via service role)
select set_config('request.jwt.claims', '{"sub":"<uuid do profile A>"}', true);
delete from public.materiais_favoritos where produto_id = 'produto-teste-1';
```
Confirmar que os resultados batem com o esperado nos comentários.

---

### Task 4: Frontend — cliente HTTP para o backend e para favoritos

**Files:**
- Create: `src/lib/materiais/materiais-api.ts`
- Create: `src/lib/materiais/materiais-favoritos.ts`
- Modify: `.env` (variável nova)

**Interfaces:**
- Produces: `getMateriais(): Promise<MaterialProduto[]>`, `getArquivoUrl(fileId: string, download: boolean): Promise<string>`, `getFavoritos(): Promise<string[]>`, `toggleFavorito(produtoId: string, favoritado: boolean): Promise<void>` — usadas pela Task 5.

- [ ] **Passo 1: Adicionar a variável de ambiente**

Em `.env` (raiz do `bionatus-web-app`), adicionar:
```
VITE_BACKEND_URL=http://localhost:3000
```
(Valor local — quando este trabalho for para produção, trocar pela URL pública do backend implantado, a combinar com o usuário nesse momento.)

- [ ] **Passo 2: Criar `src/lib/materiais/materiais-api.ts`**

```ts
import { supabase } from "@/lib/supabase"

export type MaterialArquivo = {
  id: string
  nome: string
  categoria: string
  mimeType: string
}

export type MaterialProduto = {
  produtoId: string
  produtoNome: string
  categorias: string[]
  arquivos: MaterialArquivo[]
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    throw new Error("Sessão não encontrada.")
  }

  return data.session.access_token
}

export async function getMateriais(): Promise<MaterialProduto[]> {
  const token = await getAccessToken()

  const response = await fetch(`${BACKEND_URL}/materiais`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error("Não foi possível carregar os materiais.")
  }

  const json = await response.json()
  return json.produtos as MaterialProduto[]
}

export async function getArquivoUrl(fileId: string, download: boolean): Promise<string> {
  const token = await getAccessToken()
  const params = new URLSearchParams({ token })
  if (download) params.set("download", "1")

  return `${BACKEND_URL}/materiais/arquivo/${fileId}?${params.toString()}`
}
```

- [ ] **Passo 3: Criar `src/lib/materiais/materiais-favoritos.ts`**

```ts
import { supabase } from "@/lib/supabase"

export async function getFavoritos(): Promise<string[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from("materiais_favoritos")
    .select("produto_id")
    .eq("profile_id", userData.user.id)

  if (error) throw error

  return (data ?? []).map((row) => row.produto_id as string)
}

export async function toggleFavorito(produtoId: string, favoritado: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error("Usuário não autenticado.")

  if (favoritado) {
    const { error } = await supabase
      .from("materiais_favoritos")
      .insert({ profile_id: userData.user.id, produto_id: produtoId })

    if (error) throw error
  } else {
    const { error } = await supabase
      .from("materiais_favoritos")
      .delete()
      .eq("profile_id", userData.user.id)
      .eq("produto_id", produtoId)

    if (error) throw error
  }
}
```

- [ ] **Passo 4: Rodar o typecheck**

```bash
cd "c:\Users\Power BI\Projeto Web\bionatus-web-app"
npx tsc --noEmit
```
Esperado: sem erros novos (estes dois arquivos não são importados por ninguém ainda, então não afetam o build).

- [ ] **Passo 5: Commit**

```bash
git add src/lib/materiais/materiais-api.ts src/lib/materiais/materiais-favoritos.ts .env
git commit -m "feat: cliente HTTP da Central de Materiais e favoritos"
```
(`.env` está no `.gitignore` deste repo — se o commit não incluir esse arquivo, é esperado; adicionar a variável só localmente já é suficiente.)

---

### Task 5: Frontend — página, hook e card de produto

**Files:**
- Create: `src/hooks/materiais/use-materiais.ts`
- Create: `src/components/materiais/produto-card.tsx`
- Create: `src/pages/materiais/materiais-page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `getMateriais`, `getFavoritos`, `toggleFavorito` (Task 4).
- Produces: rota `/materiais`; `ProdutoCard` (usado pela Task 6, que abre o modal a partir dele).

- [ ] **Passo 1: Criar o hook `src/hooks/materiais/use-materiais.ts`**

```ts
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { getMateriais, type MaterialProduto } from "@/lib/materiais/materiais-api"
import { getFavoritos, toggleFavorito } from "@/lib/materiais/materiais-favoritos"
import { logger } from "@/lib/logger"

export type CategoriaFiltro = "Todos" | "Ficha Técnica" | "Lâmina" | "Vídeo" | "Foto"

export const CATEGORIAS_FILTRO: CategoriaFiltro[] = [
  "Todos",
  "Ficha Técnica",
  "Lâmina",
  "Vídeo",
  "Foto",
]

// Rótulo exibido no chip (plural, igual ao mockup aprovado) vs. valor usado na comparação
// com `produto.categorias` (sempre no singular, igual ao que o backend produz).
export const CATEGORIA_LABELS: Record<CategoriaFiltro, string> = {
  Todos: "Todos",
  "Ficha Técnica": "Ficha técnica",
  Lâmina: "Lâminas",
  Vídeo: "Vídeos",
  Foto: "Fotos",
}

export function useMateriais() {
  const [produtos, setProdutos] = useState<MaterialProduto[]>([])
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState<CategoriaFiltro>("Todos")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([getMateriais(), getFavoritos()])
      .then(([produtosData, favoritosData]) => {
        if (!mounted) return
        setProdutos(produtosData)
        setFavoritos(new Set(favoritosData))
      })
      .catch((error) => {
        logger.error("use-materiais", error)
        toast.error("Não foi possível carregar os materiais.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      const bateBusca = termo === "" || produto.produtoNome.toLowerCase().includes(termo)
      const bateCategoria = categoria === "Todos" || produto.categorias.includes(categoria)
      return bateBusca && bateCategoria
    })
  }, [produtos, busca, categoria])

  async function alternarFavorito(produtoId: string) {
    const jaFavoritado = favoritos.has(produtoId)
    const anterior = favoritos
    const proximo = new Set(favoritos)

    if (jaFavoritado) {
      proximo.delete(produtoId)
    } else {
      proximo.add(produtoId)
    }
    setFavoritos(proximo)

    try {
      await toggleFavorito(produtoId, !jaFavoritado)
    } catch (error) {
      logger.error("use-materiais-favorito", error)
      toast.error("Não foi possível salvar o favorito.")
      setFavoritos(anterior)
    }
  }

  return {
    produtos: produtosFiltrados,
    totalProdutos: produtos.length,
    favoritos,
    busca,
    setBusca,
    categoria,
    setCategoria,
    loading,
    alternarFavorito,
  }
}
```

- [ ] **Passo 2: Criar `src/components/materiais/produto-card.tsx`**

```tsx
import { Download, Eye, Share2, Star } from "lucide-react"
import type { MaterialProduto } from "@/lib/materiais/materiais-api"

type ProdutoCardProps = {
  produto: MaterialProduto
  favoritado: boolean
  onToggleFavorito: () => void
  onAbrir: () => void
}

const PALETA_CORES = [
  "bg-teal-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-blue-600",
  "bg-pink-500",
  "bg-lime-600",
]

function corDoProduto(nome: string) {
  const soma = nome.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PALETA_CORES[soma % PALETA_CORES.length]
}

export function ProdutoCard({ produto, favoritado, onToggleFavorito, onAbrir }: ProdutoCardProps) {
  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onToggleFavorito}
        aria-label={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={favoritado}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800"
      >
        <Star className={`h-4 w-4 ${favoritado ? "fill-amber-400 text-amber-400" : ""}`} />
      </button>

      <div className={`flex h-24 items-center justify-center rounded-xl ${corDoProduto(produto.produtoNome)}`}>
        <span className="px-2 text-center text-sm font-semibold text-white">
          {produto.produtoNome}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{produto.produtoNome}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {produto.categorias.join(" • ")}
        </p>
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </button>
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" /> Baixar
        </button>
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#006426] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00551f] dark:bg-[#7DD3A2] dark:text-slate-900"
        >
          <Share2 className="h-3.5 w-3.5" /> Enviar
        </button>
      </div>
    </div>
  )
}
```
(Os 3 botões abrem o mesmo modal — Task 6 — onde o representante escolhe o arquivo específico dentro da categoria desejada, já que um produto pode ter mais de um arquivo por categoria.)

- [ ] **Passo 3: Criar `src/pages/materiais/materiais-page.tsx`**

```tsx
import { useState } from "react"
import { Search } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { ProdutoCard } from "@/components/materiais/produto-card"
import { useMateriais, CATEGORIAS_FILTRO, CATEGORIA_LABELS } from "@/hooks/materiais/use-materiais"
import type { MaterialProduto } from "@/lib/materiais/materiais-api"

export default function MateriaisPage() {
  const {
    produtos,
    totalProdutos,
    favoritos,
    busca,
    setBusca,
    categoria,
    setCategoria,
    loading,
    alternarFavorito,
  } = useMateriais()
  const [produtoAberto, setProdutoAberto] = useState<MaterialProduto | null>(null)

  return (
    <AppShell
      title="Central de Materiais Bionatus"
      subtitle="Encontre, visualize e compartilhe materiais promocionais dos nossos produtos."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome do produto..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIAS_FILTRO.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setCategoria(opcao)}
                className={
                  categoria === opcao
                    ? "rounded-full bg-[#006426] px-4 py-1.5 text-sm font-medium text-white dark:bg-[#7DD3A2] dark:text-slate-900"
                    : "rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                {CATEGORIA_LABELS[opcao]}
              </button>
            ))}
          </div>
        </section>

        {!loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {produtos.length} de {totalProdutos} produto{totalProdutos === 1 ? "" : "s"} encontrado{produtos.length === 1 ? "" : "s"}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {produtos.map((produto) => (
              <ProdutoCard
                key={produto.produtoId}
                produto={produto}
                favoritado={favoritos.has(produto.produtoId)}
                onToggleFavorito={() => alternarFavorito(produto.produtoId)}
                onAbrir={() => setProdutoAberto(produto)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task 6 adiciona aqui o modal de arquivos, controlado por produtoAberto/setProdutoAberto */}
    </AppShell>
  )
}
```

- [ ] **Passo 4: Registrar a rota em `src/App.tsx`**

Adicionar o import junto dos demais:
```tsx
import MateriaisPage from "@/pages/materiais/materiais-page"
```
E a rota, junto das demais protegidas por `ProtectedRoute` (antes da rota `/produtos`, por exemplo):
```tsx
      <Route
        path="/materiais"
        element={
          <ProtectedRoute>
            <MateriaisPage />
          </ProtectedRoute>
        }
      />
```

- [ ] **Passo 5: Adicionar o item no menu lateral**

Em `src/components/layout/sidebar.tsx`, adicionar `FolderOpen` à lista de ícones importados de `lucide-react`:
```tsx
import {
  Gauge,
  Package,
  Users,
  Activity,
  Repeat2,
  PieChart,
  Star,
  CalendarPlus,
  CalendarClock,
  History,
  Ban,
  ShieldCheck,
  FolderCog,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"
```
E, junto de `produtosNavItems`, adicionar um array novo:
```tsx
const materiaisNavItems: NavItem[] = [
  {
    to: "/materiais",
    label: "Materiais",
    icon: FolderOpen,
  },
]
```
No `<nav>`, renderizar junto dos demais itens de topo (depois de `produtosNavItems.map(...)`):
```tsx
          {produtosNavItems.map((item) => renderNavItem(item))}

          {materiaisNavItems.map((item) => renderNavItem(item))}
```

- [ ] **Passo 6: Rodar o build**

```bash
cd "c:\Users\Power BI\Projeto Web\bionatus-web-app"
npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Passo 7: Commit**

```bash
git add src/hooks/materiais/use-materiais.ts src/components/materiais/produto-card.tsx src/pages/materiais/materiais-page.tsx src/App.tsx src/components/layout/sidebar.tsx
git commit -m "feat: pagina Central de Materiais (busca, filtros, favoritos)"
```

---

### Task 6: Frontend — modal de arquivos do produto

**Files:**
- Create: `src/components/materiais/produto-materiais-modal.tsx`
- Modify: `src/pages/materiais/materiais-page.tsx`

**Interfaces:**
- Consumes: `getArquivoUrl` (Task 4), `MaterialProduto`/`MaterialArquivo` (Task 4), `produtoAberto`/`setProdutoAberto` (Task 5).

- [ ] **Passo 1: Criar `src/components/materiais/produto-materiais-modal.tsx`**

```tsx
import { useState } from "react"
import { toast } from "sonner"
import { Download, Eye, Share2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getArquivoUrl, type MaterialProduto } from "@/lib/materiais/materiais-api"
import { logger } from "@/lib/logger"

type ProdutoMateriaisModalProps = {
  produto: MaterialProduto | null
  onOpenChange: (open: boolean) => void
}

export function ProdutoMateriaisModal({ produto, onOpenChange }: ProdutoMateriaisModalProps) {
  const [carregandoId, setCarregandoId] = useState<string | null>(null)

  async function visualizar(fileId: string) {
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, false)
      window.open(url, "_blank")
    } catch (error) {
      logger.error("materiais-visualizar", error)
      toast.error("Não foi possível abrir o arquivo.")
    } finally {
      setCarregandoId(null)
    }
  }

  async function baixar(fileId: string) {
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, true)
      window.open(url, "_blank")
    } catch (error) {
      logger.error("materiais-baixar", error)
      toast.error("Não foi possível baixar o arquivo.")
    } finally {
      setCarregandoId(null)
    }
  }

  async function enviar(fileId: string) {
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, false)
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado para a área de transferência.")
    } catch (error) {
      logger.error("materiais-enviar", error)
      toast.error("Não foi possível copiar o link.")
    } finally {
      setCarregandoId(null)
    }
  }

  const categorias = produto ? [...new Set(produto.arquivos.map((a) => a.categoria))] : []

  return (
    <Dialog open={produto !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(92vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
          <DialogTitle>{produto?.produtoNome}</DialogTitle>
          <DialogDescription>
            {produto?.arquivos.length ?? 0} arquivo{(produto?.arquivos.length ?? 0) === 1 ? "" : "s"} disponíve{(produto?.arquivos.length ?? 0) === 1 ? "l" : "is"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {categorias.map((categoria) => (
            <div key={categoria}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {categoria}
              </h4>
              <div className="space-y-2">
                {produto?.arquivos
                  .filter((arquivo) => arquivo.categoria === categoria)
                  .map((arquivo) => (
                    <div
                      key={arquivo.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                        {arquivo.nome}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => visualizar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Visualizar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => baixar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Baixar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => enviar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Copiar link para enviar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 2: Conectar o modal em `materiais-page.tsx`**

Trocar o import:
```tsx
import { ProdutoCard } from "@/components/materiais/produto-card"
```
por:
```tsx
import { ProdutoCard } from "@/components/materiais/produto-card"
import { ProdutoMateriaisModal } from "@/components/materiais/produto-materiais-modal"
```
E trocar o comentário final:
```tsx
      {/* Task 6 adiciona aqui o modal de arquivos, controlado por produtoAberto/setProdutoAberto */}
    </AppShell>
```
por:
```tsx
      <ProdutoMateriaisModal
        produto={produtoAberto}
        onOpenChange={(open) => {
          if (!open) setProdutoAberto(null)
        }}
      />
    </AppShell>
```

- [ ] **Passo 3: Rodar o build**

```bash
npx tsc --noEmit
npm run build
```
Esperado: ambos passam sem erro.

- [ ] **Passo 4: Verificar manualmente no navegador**

```bash
npm run dev
```
Abrir `http://localhost:5173/materiais`, logado. Confirmar:
- A busca filtra por nome de produto.
- Os chips de categoria filtram os cards.
- Clicar em qualquer um dos 3 botões de um card abre o modal com os arquivos daquele produto, agrupados por categoria.
- "Visualizar" abre o arquivo numa nova aba. "Baixar" faz o download. "Enviar" copia o link e mostra o toast de confirmação.
- A estrela de favorito alterna visualmente e persiste ao recarregar a página (confirma que a Task 3/4 estão funcionando de ponta a ponta).

- [ ] **Passo 5: Commit**

```bash
git add src/components/materiais/produto-materiais-modal.tsx src/pages/materiais/materiais-page.tsx
git commit -m "feat: modal de arquivos por produto na Central de Materiais"
```
