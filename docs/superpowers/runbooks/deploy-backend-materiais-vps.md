# Runbook: subir o backend de Materiais no VPS (PM2)

Servidor: `srv1370270.hstgr.cloud` (mesmo VPS onde o n8n já roda, exposto hoje em
`https://n8n.srv1370270.hstgr.cloud`). Repo do backend:
`https://github.com/martineix/app-backend.git`.

Este runbook é para você (ou quem tiver acesso SSH ao servidor) executar — o Claude não tem
acesso direto a essa máquina.

## 1. Checar o que já existe no servidor

```bash
pm2 list                 # ver processos já rodando e quais portas eles usam
node -v                  # confirmar Node 18+ (o backend usa ESM + import.meta, precisa de Node moderno)
which nginx || which caddy   # confirmar qual proxy reverso expõe o n8n hoje
```

Escolha uma porta livre para o backend (ex.: `3001`, se `3000` já estiver ocupada por outra
coisa) e um subdomínio (sugestão: `materiais-api.srv1370270.hstgr.cloud`, seguindo o mesmo padrão
do n8n).

## 2. Clonar e instalar

```bash
git clone https://github.com/martineix/app-backend.git bionatus-materiais-backend
cd bionatus-materiais-backend
npm ci --omit=dev
```

## 3. Criar o `.env` de produção

Copie o `.env` local como referência, mas com estes cuidados:

- `PORT`: a porta escolhida no passo 1.
- `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` / `GOOGLE_DRIVE_MATERIAIS_FOLDER_ID`:
  mesma service account e pasta usadas localmente (a menos que vocês criem uma conta de serviço
  separada para produção).
- `MATERIAIS_LINK_SECRET`: **gere um valor novo** só para produção (não reaproveite o do `.env`
  local), assim um segredo local exposto nunca invalida os links assinados em produção:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- `SUPABASE_URL` / `SUPABASE_ROLE_KEY` / `SUPABASE_URL_SNK` / `SUPABASE_SNK_ROLEKEY` e as
  variáveis do Sankhya/Nexus: mesmos valores do `.env` local, assumindo que homologação usa o
  mesmo projeto Supabase e os mesmos sistemas de origem. Se homologação tiver um Supabase de
  staging separado, usar as chaves daquele projeto aqui.

## 4. Subir com PM2

```bash
pm2 start src/index.js --name bionatus-materiais-backend
pm2 save
```

Confirmar que subiu limpo:

```bash
pm2 logs bionatus-materiais-backend --lines 30
curl -s http://localhost:<PORTA>/materiais
# esperado: {"status":"error","message":"Token de autenticação ausente."}
```

## 5. Expor publicamente (subdomínio + HTTPS)

Exemplo de bloco nginx (ajustar para o proxy reverso real do servidor, se não for nginx):

```nginx
server {
    listen 80;
    server_name materiais-api.srv1370270.hstgr.cloud;

    location / {
        proxy_pass http://localhost:<PORTA>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
certbot --nginx -d materiais-api.srv1370270.hstgr.cloud
```

## 6. Apontar o frontend de homologação para essa URL

No ambiente de build/deploy do frontend (homologação), configurar:

```
VITE_BACKEND_URL=https://materiais-api.srv1370270.hstgr.cloud
```

e rebuildar o frontend lá. Sem isso, o app quebra ao carregar `/materiais` (o código já lança
erro explícito se `VITE_BACKEND_URL` não estiver definida).

## 7. Teste de fumaça pós-deploy

- Logar no app de homologação, abrir `/materiais` e confirmar que a lista de produtos carrega.
- Testar "Enviar" num arquivo e abrir o link copiado numa aba anônima (sem estar logado) — deve
  abrir o arquivo direto, sem pedir login (é esse o ponto de todo o mecanismo de link assinado).
- `pm2 logs bionatus-materiais-backend` sem erros durante esse teste.

## Atualizações futuras

Para atualizar o código depois de um novo `git push` no repo do backend:

```bash
cd bionatus-materiais-backend
git pull
npm ci --omit=dev
pm2 restart bionatus-materiais-backend
```
