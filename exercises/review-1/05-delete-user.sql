-- Task 05. Write the SQL that changes the foreign key here.
alter table "orders"
  drop constraint "orders_user_id_fkey",
  add constraint "orders_user_id_fkey" foreign key ("user_id") references "users"("id") on delete cascade;