drop extension if exists "pg_net";

alter table "public"."teams" add column "specialty" text;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can upload scanned targets"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'scanned-targets'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Authenticated users can upload training images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'training-corrections'::text));



  create policy "Enable storage access for users based on user_id"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'files'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])))
with check (((bucket_id = 'files'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Public read access for scanned targets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'scanned-targets'::text));



  create policy "Public read access for training images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'training-corrections'::text));



  create policy "Users can delete own training images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'training-corrections'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own training images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'training-corrections'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])))
with check ((bucket_id = 'training-corrections'::text));



