-- Travel Tracker — restore the schedule of a trip created with seed_sample_trip()
-- back to the original Tampa itinerary (date, start time and duration only).
--
-- Rows are matched by title; repeated titles ("Regreso a casa", "Almuerzo") are
-- paired in chronological order. Activities whose title is not in the seed
-- (added or renamed later) are left untouched. Safe to run more than once.
-- Returns the rows it changed, with their previous values.
--
-- Usage (SQL editor): replace the trip id below if needed, then run.

with params as (
  select '3e036bc2-2421-4373-a33c-634b11b70857'::uuid as trip_id
),
seed (title, date, start_min, duration_min) as (
  values
    ('Llegada a Tampa', date '2026-10-02', 1020, 60),
    ('Traslado a la casa e instalarse', date '2026-10-02', 1080, 90),
    ('Cena tranquila en casa', date '2026-10-02', 1170, 90),
    ('Desayuno en Oxford Exchange', date '2026-10-03', 540, 90),
    ('Tiendas y librería', date '2026-10-03', 630, 60),
    ('Almuerzo en Downtown Tampa', date '2026-10-03', 720, 90),
    ('Paseo por el Tampa Riverwalk', date '2026-10-03', 810, 90),
    ('Regreso temprano a casa', date '2026-10-03', 930, 60),
    ('Salida hacia Clearwater Beach', date '2026-10-04', 510, 60),
    ('Mañana de playa', date '2026-10-04', 570, 150),
    ('Regreso y almuerzo', date '2026-10-04', 720, 120),
    ('Pool party en casa de Melvin', date '2026-10-04', 900, 180),
    ('Noche libre', date '2026-10-04', 1080, 120),
    ('Salida hacia Busch Gardens', date '2026-10-05', 540, 60),
    ('Día completo en Busch Gardens', date '2026-10-05', 600, 480),
    ('Regreso a casa', date '2026-10-05', 1080, 60),
    ('Florida Aquarium', date '2026-10-06', 540, 180),
    ('Almuerzo en Sparkman Wharf', date '2026-10-06', 720, 90),
    ('Café en Brewed Awakenings', date '2026-10-06', 810, 45),
    ('TECO Line Streetcar hacia Ybor', date '2026-10-06', 855, 30),
    ('Recorrer Ybor City', date '2026-10-06', 885, 165),
    ('Cena en Columbia Restaurant', date '2026-10-06', 1050, 120),
    ('Regreso a casa', date '2026-10-06', 1170, 45),
    ('Tampa Premium Outlets', date '2026-10-07', 600, 180),
    ('Almuerzo en los outlets', date '2026-10-07', 780, 60),
    ('Main Event Wesley Chapel', date '2026-10-07', 900, 180),
    ('Regreso temprano', date '2026-10-07', 1080, 60),
    ('Paradeco Coffee', date '2026-10-08', 540, 60),
    ('Old Northeast Jewelers', date '2026-10-08', 615, 75),
    ('Almuerzo y paseo por Downtown St. Pete', date '2026-10-08', 720, 120),
    ('St. Pete Pier', date '2026-10-08', 840, 150),
    ('Regreso a casa', date '2026-10-08', 1020, 60),
    ('Topgolf Tampa', date '2026-10-09', 600, 120),
    ('Almuerzo', date '2026-10-09', 720, 90),
    ('Salida hacia Clearwater', date '2026-10-09', 870, 60),
    ('Playa y paseo', date '2026-10-09', 930, 150),
    ('Atardecer en Pier 60', date '2026-10-09', 1080, 60),
    ('Cena por la zona', date '2026-10-09', 1140, 90),
    ('Salida hacia Dade City Farms', date '2026-10-10', 540, 60),
    ('Pumpkin Patch en Dade City Farms', date '2026-10-10', 600, 180),
    ('Almuerzo', date '2026-10-10', 780, 90),
    ('Tarde libre en casa', date '2026-10-10', 870, 180),
    ('Mañana libre y desayuno', date '2026-10-11', 540, 150),
    ('Almuerzo temprano', date '2026-10-11', 690, 90),
    ('Organizar el cuidado de Sol y arreglarse', date '2026-10-11', 780, 180),
    ('Concierto de los Jonas Brothers', date '2026-10-11', 1080, 240),
    ('Desayuno', date '2026-10-12', 480, 60),
    ('Equipaje, artículos de Sol y documentos', date '2026-10-12', 540, 120),
    ('Traslado al aeropuerto', date '2026-10-12', 660, 90),
    ('Vuelo de regreso a Santo Domingo', date '2026-10-12', 780, 150)
),
seed_ranked as (
  select *, row_number() over (partition by title order by date, start_min) as rn from seed
),
current_ranked as (
  select a.id, a.title, a.date, a.start_min, a.duration_min,
         row_number() over (partition by a.title order by a.date, a.start_min) as rn
  from public.activities a, params p
  where a.trip_id = p.trip_id
),
changed as (
  select c.id, c.title, c.date as old_date, c.start_min as old_start, c.duration_min as old_duration,
         s.date as new_date, s.start_min as new_start, s.duration_min as new_duration
  from current_ranked c
  join seed_ranked s on s.title = c.title and s.rn = c.rn
  where (c.date, c.start_min, c.duration_min) is distinct from (s.date, s.start_min, s.duration_min)
),
applied as (
  update public.activities a
  set date = ch.new_date, start_min = ch.new_start, duration_min = ch.new_duration
  from changed ch
  where a.id = ch.id
  returning a.id
)
select ch.title, ch.old_date, ch.old_start, ch.old_duration, ch.new_date, ch.new_start, ch.new_duration
from changed ch
join applied ap on ap.id = ch.id
order by ch.new_date, ch.new_start;
