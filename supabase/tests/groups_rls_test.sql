\set ON_ERROR_STOP 1
insert into auth.users values ('00000000-0000-0000-0000-000000000005');  -- Eve, new user
grant all on all tables in schema public to anon, authenticated;  -- like Supabase defaults (RLS does the work)
-- anon was revoked by the migration; re-grant to prove RLS/revoke still blocks it
create or replace function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', uid, false) $$;
create or replace function pg_temp.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise notice 'ok   % -> %', label, sqlerrm; return; end;
  raise exception 'FAIL % : expected an error', label;
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL %', label; end if; raise notice 'ok   %', label; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- anon sees nothing
set role anon;
select pg_temp.check((select count(*) from profiles) = 0, 'anon reads no profiles');
select pg_temp.check((select count(*) from user_bets) = 0, 'anon reads no bets');
reset role;

-- Dan (member): open column bets of others hidden, closed column visible
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.check((select count(*) from user_bets where column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0, 'member cannot see others'' open bets');
select pg_temp.check((select count(*) from user_bets where column_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 2, 'member sees closed column bets');
select pg_temp.check((select count(*) from profiles) = 4, 'member sees group profiles');
select pg_temp.expect_error($$insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000002',(select id from groups limit 1),
   '[{"game_num":1,"value":["1","X"]},{"game_num":2,"value":["1","X"]},{"game_num":3,"value":["1","X"]},{"game_num":4,"value":["1","X"]},{"game_num":5,"value":["1","X"]},{"game_num":6,"value":["1","X"]}]')$$, 'over the doubles limit');
insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000002',(select id from groups limit 1),'[{"game_num":1,"value":["1","X"]}]');
select pg_temp.check((select correct_guesses from user_bets where user_id = auth.uid() and column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0, 'bet saved and scored');
select pg_temp.expect_error($$insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001',(select id from groups limit 1),'[]')$$, 'closed column rejected');
select pg_temp.expect_error($$insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002',(select id from groups limit 1),'[]')$$, 'betting for someone else rejected');
select pg_temp.expect_error($$update profiles set is_admin = true where id = auth.uid()$$, 'self-promotion to super-admin');
update columns set name = 'hacked';
select pg_temp.check((select count(*) from columns where name = 'hacked') = 0, 'member cannot edit columns');
reset role;

-- Admin sees open bets
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from user_bets where column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 2, 'group admin sees open bets');
reset role;

-- Eve: new user, creates a group
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
insert into profiles (id, name) values (auth.uid(), 'Eve');
select pg_temp.check((select count(*) from profiles) = 1, 'outsider sees only own profile');
select pg_temp.check((select count(*) from groups) = 0, 'outsider sees no groups');
select (pg_temp.check((create_group('Eve FC', 'il', 3, 2, 'open')).name = 'Eve FC', 'create_group'));
select pg_temp.check((select count(*) from group_columns gc join groups g on g.id = gc.group_id where g.name = 'Eve FC') = 1, 'new group gets only open draws');
select pg_temp.expect_error($$update group_columns set max_doubles = 9 where group_id = (select id from groups where name = 'Eve FC')$$, 'override above operator max');
reset role;

-- Bob joins the open group with the link; bets there separately
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.check((select my_status from group_preview((select invite_code from groups where name = 'Eve FC'))) is null, 'hidden group invisible without code');
reset role;
select set_config('test.code', (select invite_code from groups where name = 'Eve FC'), false);
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.check(join_group(current_setting('test.code'))->>'status' = 'member', 'open group: joined at once');
insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',(select id from groups where name = 'Eve FC'),'[{"game_num":1,"value":["1","X","2"]},{"game_num":2,"value":["1","X","2"]}]');
select pg_temp.expect_error($$insert into user_bets (user_id, column_id, group_id, bet_values) values
  ('00000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002',(select id from groups where name = 'Eve FC'),
   '[{"game_num":1,"value":["1","X","2"]},{"game_num":2,"value":["1","X","2"]},{"game_num":3,"value":["1","X","2"]}]')$$, 'group limit (2 triples) enforced');
select pg_temp.check((select count(*) from user_bets where user_id = auth.uid() and column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 1, 'one bet per group (bob has none in main group yet)');
reset role;

-- Eve closes the group; Carol asks to join; Eve approves
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
update groups set join_policy = 'closed' where name = 'Eve FC';
reset role;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.check(join_group(current_setting('test.code'))->>'status' = 'pending', 'closed group: request pending');
select pg_temp.check(not is_group_member((select group_id from group_preview(current_setting('test.code')))), 'not a member while pending');
reset role;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.check((select count(*) from profiles where name = 'Carol') = 1, 'admin sees the requester');
select decide_join_request((select id from groups where name = 'Eve FC'), '00000000-0000-0000-0000-000000000003', true);
select pg_temp.check((select count(*) from group_members m join groups g on g.id = m.group_id where g.name = 'Eve FC') = 3, 'approved -> member');
select pg_temp.expect_error($$delete from group_members where user_id = auth.uid()$$, 'last admin cannot leave');
select set_config('test.old', current_setting('test.code'), false);
select pg_temp.check(regenerate_invite_code((select id from groups where name = 'Eve FC')) <> current_setting('test.old'), 'invite code regenerated');
reset role;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$select join_group(current_setting('test.old'))$$, 'old link stops working');
select pg_temp.expect_error($$select decide_join_request((select id from groups where name = 'Eve FC'), auth.uid(), true)$$, 'non-admin cannot approve');
reset role;

-- results arrive -> everything rescored (super-admin)
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
update columns set games = '[{"game_num":1,"result":"X"},{"game_num":2,"result":"2"},{"game_num":3,"result":null}]' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
insert into columns (name, deadline, max_doubles, max_triples, games) values ('new', '2031-01-01', 5, 4, '[]');
reset role;
select pg_temp.check((select correct_guesses from user_bets where user_id = '00000000-0000-0000-0000-000000000004' and column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 1, 'rescored after results (Dan 1/X on X)');
select pg_temp.check((select correct_guesses from user_bets where user_id = '00000000-0000-0000-0000-000000000002' and column_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 2, 'rescored in second group (Bob)');
select pg_temp.check((select count(*) from group_columns gc join columns c on c.id = gc.column_id where c.name = 'new') = 2, 'new draw offered to both il groups');

-- deleting a group cascades past the last-admin rule
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
delete from groups where name = 'Eve FC';
reset role;
select pg_temp.check((select count(*) from groups) = 1, 'group deleted with its members and bets');
select pg_temp.check((select count(*) from user_bets where user_id = '00000000-0000-0000-0000-000000000002') = 1, 'Bob keeps only his main-group bet');
\echo ALL RLS TESTS PASSED
