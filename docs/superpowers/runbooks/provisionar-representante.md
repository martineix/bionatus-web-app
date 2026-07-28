# Runbook: provisionar login de representante

Pré-requisito: você já tem o e-mail do representante e sabe o `codvend` (Sankhya) e/ou `pescod`
(Nexus) dele. Para descobrir o código, se precisar:

```sql
SELECT codvend, vendedor FROM sankhya_vendedores WHERE vendedor ILIKE '%nome do representante%';
SELECT pescod, pesnomfan FROM nexus_pessoas WHERE pesnomfan ILIKE '%nome do representante%';
```

1. Criar o usuário no Supabase Auth (painel → Authentication → Users → Add user), com o e-mail
   fornecido e uma senha temporária. Anotar o UUID gerado (`<PROFILE_ID>`).

2. Verificar se a linha correspondente já existe em `public.profiles` (um trigger cria
   automaticamente ao criar o usuário no Auth):

   ```sql
   SELECT * FROM public.profiles WHERE id = '<PROFILE_ID>';
   ```

   Se não existir, criar manualmente antes de continuar:

   ```sql
   INSERT INTO public.profiles (id, email, role, ativo) VALUES ('<PROFILE_ID>', '<email>', 'user', true);
   ```

3. Marcar o profile como representante e criar o(s) vínculo(s) em `representante_contas`:

   ```sql
   UPDATE public.profiles SET role = 'representante' WHERE id = '<PROFILE_ID>';

   INSERT INTO public.representante_contas (profile_id, sistema, id_representante) VALUES
     ('<PROFILE_ID>', 2, <codvend_sankhya>),  -- se atua no Sankhya
     ('<PROFILE_ID>', 1, <pescod_nexus>);     -- se atua no Nexus (remova a linha que não se aplicar)
   ```

4. Validar:

   ```sql
   SELECT p.email, p.role, rc.sistema, rc.id_representante
   FROM public.profiles p
   JOIN public.representante_contas rc ON rc.profile_id = p.id
   WHERE p.id = '<PROFILE_ID>';
   ```

5. (Opcional, mas recomendado) validar o isolamento antes de entregar a senha, simulando a sessão
   dessa conta via SQL Editor:

   ```sql
   SET LOCAL request.jwt.claims = '{"sub": "<PROFILE_ID>"}';
   SELECT * FROM get_dashboard_kpis(p_data_inicio := '<inicio_mes_atual>', p_data_fim := '<fim_mes_atual>');
   RESET request.jwt.claims;
   ```

   Comparar com o número esperado daquele representante (rodado sem `role='representante'`, ex:
   `SELECT * FROM get_dashboard_kpis(..., p_id_representante := <codigo>)` logado como
   gestor/admin) — devem bater exatamente.

6. Passar a senha temporária para o representante por fora (WhatsApp, verbal, etc.) e confirmar
   que ele consegue logar em `/login` e ver o próprio dashboard — deve aparecer o aviso "Você está
   vendo seus próprios números de desempenho." acima dos filtros.

## Removendo um acesso

Se um representante sair da empresa ou perder o vínculo, basta desativar o profile (não é
necessário apagar nada):

```sql
UPDATE public.profiles SET ativo = false WHERE id = '<PROFILE_ID>';
```

(Isso não bloqueia automaticamente o login — verificar se o restante do app já checa
`profiles.ativo` em algum guard de rota; se não, também é possível desativar o usuário direto no
painel do Supabase Auth.)
