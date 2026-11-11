-- Seed: TOTO16 toto type, team aliases, one demo open column.

insert into toto_types (code, name_he, name_en, country, default_max_doubles, default_max_triples)
values ('TOTO16', 'טוטו 16', 'Toto 16', 'IL', 5, 4);

insert into team_aliases (he_name, en_name, scoreaxis_team_id, updated_at) values
  ('עירוני טבריה', 'Ironi Tiberias', '62a8009a16e7ba753c560d54', now()),
  ('מ.ס. אשדוד', 'FC Ashdod', '623238c67ceb8c550131ddd4', now()),
  ('מכבי תל אביב', 'Maccabi Tel Aviv', '62322de76d067c3d705eef4c', now()),
  ('בית"ר ירושלים', 'Beitar Jerusalem', '623238c4c0feee1839056d04', now()),
  ('מכבי פתח תקוה', 'Maccabi Petach Tikva', '623238c3a59f94038c2c2b04', now()),
  ('בני יהודה ת"א', 'Bnei Yehuda Tel Aviv', '62321b12adaf4b2bd73de772', now()),
  ('מכבי קביליו יפו', 'Maccabi Kabilio Jaffa', '629e090bad5beb608c213768', now()),
  ('הפועל רעננה', 'Hapoel Raanana', '62321b0aadaf4b2bd73de612', now()),
  ('מכבי אחי נצרת', 'Maccabi Ahi Nazareth', '62321b24adaf4b2bd73dea54', now()),
  ('אברטון', 'Everton', '62321b48adaf4b2bd73df0e2', now()),
  ('בורנמות''', 'Bournemouth', '62321afdadaf4b2bd73de3ba', now()),
  ('נוטינגהאם פורסט', 'Nottingham Forest', '62321b0badaf4b2bd73de632', now()),
  ('קריסטל פאלאס', 'Crystal Palace', '62321b19adaf4b2bd73de88c', now()),
  ('ליברפול', 'Liverpool', '62321afeadaf4b2bd73de3ec', now()),
  ('ברייטון', 'Brighton', '62321b27adaf4b2bd73deae6', now()),
  ('לידס', 'Leeds', '62321b19adaf4b2bd73de882', now()),
  ('טוטנהאם', 'Tottenham', '62321b0fadaf4b2bd73de6f8', now()),
  ('ארסנל', 'Arsenal', '62321b19adaf4b2bd73de890', now()),
  ('קובנטרי', 'Coventry', '62321b09adaf4b2bd73de5d0', now()),
  ('סנדרלנד', 'Sunderland', '62321afdadaf4b2bd73de3c2', now()),
  ('האל', 'Hull', '62321b27adaf4b2bd73deb04', now()),
  ('איפסוויץ''', 'Ipswich', '62321b0cadaf4b2bd73de65c', now()),
  ('ווסטהאם', 'West Ham', '62321b27adaf4b2bd73deae4', now()),
  ('צ''לסי', 'Chelsea', '62321b27adaf4b2bd73deaea', now()),
  ('חטאפה', 'Getafe', '62321b09adaf4b2bd73de5e8', now()),
  ('ריאל סוסיאדד', 'Real Sociedad', '62321b21adaf4b2bd73de9e0', now()),
  ('מאיורקה', 'Mallorca', '62321b60adaf4b2bd73df4dc', now()),
  ('ויאריאל', 'Villarreal', '62321b2aadaf4b2bd73deb7c', now()),
  ('אוביידו', 'Real Oviedo', '62321b04adaf4b2bd73de4d8', now()),
  ('ראיו וייקאנו', 'Rayo Vallecano', '62321b4dadaf4b2bd73df1a6', now()),
  ('סלטה ויגו', 'Celta Vigo', '62321b0aadaf4b2bd73de5ec', now()),
  ('סביליה', 'Sevilla', '62321b2badaf4b2bd73deb86', now()),
  ('ולנסיה', 'Valencia', '62321b15adaf4b2bd73de810', now()),
  ('לבאנטה', 'Levante', '62321b32adaf4b2bd73decee', now()),
  ('אלאבס', 'Deportivo Alaves', '62321b0cadaf4b2bd73de652', now()),
  ('פרייבורג', 'Freiburg', '62321b30adaf4b2bd73dec70', now()),
  ('שטוטגרט', 'VfB Stuttgart', '62321b59adaf4b2bd73df3ce', now()),
  ('אוגסבורג', 'Augsburg', '62321b3aadaf4b2bd73dee58', now()),
  ('בורוסיה מינשנגלדבאך', 'Borussia Moenchengladbach', '62321b28adaf4b2bd73deb12', now()),
  ('המבורג', 'Hamburger SV', '62321b05adaf4b2bd73de530', now()),
  ('מיינץ', 'Mainz 05', '62321b30adaf4b2bd73dec6c', now()),
  ('איינטרכט פרנקפורט', 'Eintracht Frankfurt', '62321b30adaf4b2bd73dec68', now()),
  ('סט. פאולי', 'St. Pauli', '62321b03adaf4b2bd73de4c0', now()),
  ('וולפסבורג', 'Wolfsburg', '62321b30adaf4b2bd73dec76', now()),
  ('אוניון ברלין', 'Union Berlin', '62321b10adaf4b2bd73de706', now()),
  ('באייר לברקוזן', 'Bayer Leverkusen', '62321affadaf4b2bd73de3f4', now()),
  ('לייפציג', 'RB Leipzig', '62321b04adaf4b2bd73de4f0', now()),
  ('היידנהיים', 'FC Heidenheim', '62321b37adaf4b2bd73dede2', now()),
  ('הופנהיים', 'Hoffenheim', '62321b2fadaf4b2bd73dec64', now()),
  ('פאדרבורן', 'Paderborn', '62321b08adaf4b2bd73de5b0', now()),
  ('פ.צ. קלן', 'FC Koln', '62321b04adaf4b2bd73de4f4', now()),
  ('בורוסיה דורטמונד', 'Borussia Dortmund', '62321b03adaf4b2bd73de4c8', now()),
  ('מילאן', 'AC Milan', '62321b28adaf4b2bd73deb24', now()),
  ('אינטר', 'Inter', '62321b07adaf4b2bd73de56e', now()),
  ('יובנטוס', 'Juventus', '62321affadaf4b2bd73de3f8', now()),
  ('לצ''ה', 'Lecce', '62321b01adaf4b2bd73de462', now()),
  ('רומא', 'Roma', '62321b09adaf4b2bd73de5d6', now()),
  ('פרוסינונה', 'Frosinone', '62321b15adaf4b2bd73de804', now()),
  ('ונציה', 'Venezia', '62321b3aadaf4b2bd73dee6a', now()),
  ('ססואולו', 'Sassuolo', '62321b0badaf4b2bd73de63a', now()),
  ('קומו', 'Como', '62321b2aadaf4b2bd73deb72', now()),
  ('ורונה', 'Verona', '62321b04adaf4b2bd73de4f8', now()),
  ('בולוניה', 'Bologna', '62321b1badaf4b2bd73de8d0', now()),
  ('אטאלנטה', 'Atalanta', '62321b1aadaf4b2bd73de8c4', now()),
  ('קרמונזה', 'Cremonese', '62321b32adaf4b2bd73decd6', now()),
  ('טורינו', 'Torino', '62321b3badaf4b2bd73dee74', now()),
  ('אוקזר', 'Auxerre', '62321b07adaf4b2bd73de588', now()),
  ('ניס', 'Nice', '62321b13adaf4b2bd73de7b8', now()),
  ('פ.צ. פאריס', 'Paris FC', '62321b11adaf4b2bd73de748', now()),
  ('שטראסבורג', 'Strasbourg', '62321b13adaf4b2bd73de7c4', now()),
  ('טולוז', 'Toulouse', '62321b05adaf4b2bd73de508', now()),
  ('אנז''ר', 'Angers', '62321b3aadaf4b2bd73dee4c', now())
on conflict (he_name) do update
  set en_name = excluded.en_name,
      scoreaxis_team_id = coalesce(team_aliases.scoreaxis_team_id, excluded.scoreaxis_team_id),
      updated_at = now();

-- Demo column: 16 games, deadline a week out, no results yet.
with teams as (
  select he_name, row_number() over (order by he_name) - 1 as i from team_aliases
)
insert into columns (toto_type_id, name, deadline, max_doubles, max_triples, games)
select t.id, 'Demo column', now() + interval '7 days', t.default_max_doubles, t.default_max_triples,
  (select jsonb_agg(jsonb_build_object(
      'game_num', n,
      'home_team', (select he_name from teams where i = (2 * n - 2)),
      'away_team', (select he_name from teams where i = (2 * n - 1)),
      'game_time', to_char((now() + interval '8 days' + n * interval '15 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'competition', 'Demo',
      'result', null) order by n)
   from generate_series(1, 16) n)
from toto_types t where t.code = 'TOTO16';
