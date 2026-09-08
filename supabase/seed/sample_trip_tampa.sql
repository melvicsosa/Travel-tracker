-- Travel Tracker — sample data: family trip to Tampa, October 2–12, 2026.
--
-- Optional. Run AFTER the init migration and AFTER you have signed in once
-- (so your profile exists). It creates one trip owned by the given user, three
-- travelers and 50 activities. Call it from the SQL editor:
--
--   select public.seed_sample_trip('<your-user-uuid>');
--
-- Find your uuid in Authentication → Users, or with:
--   select id from public.profiles where email = 'you@example.com';

create or replace function public.seed_sample_trip(p_owner uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_trip   uuid;
  v_johan  uuid := gen_random_uuid();
  v_sheila uuid := gen_random_uuid();
  v_sol    uuid := gen_random_uuid();
begin
  insert into public.trips (name, place, start_date, end_date, created_by)
  values ('Viaje familiar a Tampa', 'Tampa, Florida', date '2026-10-02', date '2026-10-12', p_owner)
  returning id into v_trip;

  insert into public.travelers (id, trip_id, name, short_name, color, position) values
    (v_johan,  v_trip, 'Johan',       'JO', '#0E7C86', 0),
    (v_sheila, v_trip, 'Sheila',      'SH', '#B33F72', 1),
    (v_sol,    v_trip, 'Sol de Luna', 'SL', '#C2610F', 2);

  insert into public.activities
    (trip_id, title, place, notes, date, start_min, duration_min, category, booking, traveler_ids)
  values
    (v_trip, 'Llegada a Tampa', 'Aeropuerto Internacional de Tampa (TPA)', 'Llegada aproximada a las 5:00 p. m.', date '2026-10-02', 1020, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Traslado a la casa e instalarse', '', 'Organizar las cosas de Sol de Luna.', date '2026-10-02', 1080, 90, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Cena tranquila en casa', '', '', date '2026-10-02', 1170, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Desayuno en Oxford Exchange', 'Oxford Exchange, Tampa', 'Reservar para el sábado a las 9:00 a. m.', date '2026-10-03', 540, 90, 'food', 'pending', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Tiendas y librería', 'Oxford Exchange', '', date '2026-10-03', 630, 60, 'shopping', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo en Downtown Tampa', 'Downtown Tampa', '', date '2026-10-03', 720, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Paseo por el Tampa Riverwalk', 'Tampa Riverwalk', 'Paseo tranquilo, con sombra y paradas.', date '2026-10-03', 810, 90, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso temprano a casa', '', '', date '2026-10-03', 930, 60, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Salida hacia Clearwater Beach', '', '', date '2026-10-04', 510, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Mañana de playa', 'Clearwater Beach', 'Sombrilla, protector solar y ropa de cambio para Sol.', date '2026-10-04', 570, 150, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso y almuerzo', '', '', date '2026-10-04', 720, 120, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Pool party en casa de Melvin', 'Casa de Melvin', '', date '2026-10-04', 900, 180, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Noche libre', '', '', date '2026-10-04', 1080, 120, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Salida hacia Busch Gardens', '', '', date '2026-10-05', 540, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Día completo en Busch Gardens', 'Busch Gardens Tampa Bay', 'Priorizar animales y áreas familiares; atracciones por turnos para que alguien se quede con Sol.', date '2026-10-05', 600, 480, 'attraction', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso a casa', '', '', date '2026-10-05', 1080, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Florida Aquarium', '701 Channelside Dr, Tampa', '', date '2026-10-06', 540, 180, 'attraction', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo en Sparkman Wharf', 'Channelside / Sparkman Wharf', '', date '2026-10-06', 720, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Café en Brewed Awakenings', 'Brewed Awakenings', '', date '2026-10-06', 810, 45, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'TECO Line Streetcar hacia Ybor', 'TECO Line Streetcar', 'Gratuito y accesible; pasa cada 15 minutos aproximadamente.', date '2026-10-06', 855, 30, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Recorrer Ybor City', 'Ybor City', '', date '2026-10-06', 885, 165, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Cena en Columbia Restaurant', 'Columbia Restaurant, Ybor City', 'Reservar 5:30 o 6:00 p. m. El espectáculo de flamenco requiere reservación aparte.', date '2026-10-06', 1050, 120, 'food', 'pending', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso a casa', '', '', date '2026-10-06', 1170, 45, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Tampa Premium Outlets', 'Tampa Premium Outlets, Lutz', '', date '2026-10-07', 600, 180, 'shopping', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo en los outlets', 'Tampa Premium Outlets', '', date '2026-10-07', 780, 60, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Main Event Wesley Chapel', 'Main Event, Wesley Chapel', 'Arcade, bowling y otras actividades.', date '2026-10-07', 900, 180, 'attraction', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso temprano', '', '', date '2026-10-07', 1080, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Paradeco Coffee', 'Paradeco Coffee Roasters, St. Petersburg', 'Día en St. Petersburg.', date '2026-10-08', 540, 60, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Old Northeast Jewelers', 'Old Northeast Jewelers, St. Pete', 'Valorar pedir cita para ver los relojes con calma. La sucursal de St. Pete abre los jueves de 10:00 a. m. a 5:00 p. m.', date '2026-10-08', 615, 75, 'shopping', 'pending', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo y paseo por Downtown St. Pete', 'Downtown St. Petersburg', '', date '2026-10-08', 720, 120, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'St. Pete Pier', 'St. Pete Pier', '', date '2026-10-08', 840, 150, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Regreso a casa', '', '', date '2026-10-08', 1020, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Topgolf Tampa', 'Topgolf Tampa', 'Reservar una bahía para las 10:00 a. m.; jugar unas dos horas.', date '2026-10-09', 600, 120, 'attraction', 'pending', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo', '', '', date '2026-10-09', 720, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Salida hacia Clearwater', '', '', date '2026-10-09', 870, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Playa y paseo', 'Clearwater Beach', '', date '2026-10-09', 930, 150, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Atardecer en Pier 60', 'Pier 60, Clearwater Beach', '', date '2026-10-09', 1080, 60, 'outdoors', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Cena por la zona', 'Clearwater Beach', '', date '2026-10-09', 1140, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Salida hacia Dade City Farms', '', '', date '2026-10-10', 540, 60, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Pumpkin Patch en Dade City Farms', 'Dade City Farms', 'Comprar entradas con anticipación. Festival los fines de semana de octubre, 10:00 a. m. a 5:00 p. m. Fotos familiares, paseo en tractor y actividades.', date '2026-10-10', 600, 180, 'attraction', 'pending', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo', '', '', date '2026-10-10', 780, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Tarde libre en casa', '', 'Regreso a casa y descanso.', date '2026-10-10', 870, 180, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Mañana libre y desayuno', '', 'Dormir un poco más y descansar.', date '2026-10-11', 540, 150, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Almuerzo temprano', '', '', date '2026-10-11', 690, 90, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Organizar el cuidado de Sol y arreglarse', '', 'Confirmar quién cuidará a Sol de Luna durante el concierto.', date '2026-10-11', 780, 180, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Concierto de los Jonas Brothers', '', '', date '2026-10-11', 1080, 240, 'event', 'confirmed', array[v_johan, v_sheila]::uuid[]),
    (v_trip, 'Desayuno', '', '', date '2026-10-12', 480, 60, 'food', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Equipaje, artículos de Sol y documentos', '', 'Revisar pasaportes y documentos antes de salir.', date '2026-10-12', 540, 120, 'home', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Traslado al aeropuerto', 'Aeropuerto Internacional de Tampa (TPA)', '', date '2026-10-12', 660, 90, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]),
    (v_trip, 'Vuelo de regreso a Santo Domingo', 'TPA → SDQ', 'Ajustar la hora cuando esté confirmado el vuelo.', date '2026-10-12', 780, 150, 'transfer', 'none', array[v_johan, v_sheila, v_sol]::uuid[]);

  return v_trip;
end;
$$;
