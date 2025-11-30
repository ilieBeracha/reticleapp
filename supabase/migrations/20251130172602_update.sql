
  create policy "Users can insert paper results for own session targets"
  on "public"."paper_target_results"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));



  create policy "Users can update paper results from own sessions"
  on "public"."paper_target_results"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));



  create policy "Users can view paper results from own sessions"
  on "public"."paper_target_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));



  create policy "Users can insert tactical results for own session targets"
  on "public"."tactical_target_results"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));



  create policy "Users can update tactical results from own sessions"
  on "public"."tactical_target_results"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));



  create policy "Users can view tactical results from own sessions"
  on "public"."tactical_target_results"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));



