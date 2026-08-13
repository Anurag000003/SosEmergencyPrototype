# React Native Full Course 2026 - Build Kribb (Full Stack App for IOS and Android)
### https://youtu.be/WSppuT4A09Y
<img width="960" height="540" alt="1" src="https://github.com/user-attachments/assets/f38d2b84-38a1-4d7e-964c-9225258de2ac" />


## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start -c
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Supabase Queries

### User Table

```sql
create table users (
  id uuid default gen_random_uuid() primary key,
  user_id text unique not null,
  email text not null,
  first_name text,
  last_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);
```

### User RLS Policies

```sql
-- Enable RLS on users table
alter table users enable row level security;

create policy "Users can insert own row"
on users for insert
with check (user_id = auth.jwt()->>'sub');

create policy "Users can read own row"
on users for select
using (user_id = auth.jwt()->>'sub');

create policy "Users can update own row"
on users for update
using (user_id = auth.jwt()->>'sub');
```

### Medical Storage Bucket

```sql
insert into storage.buckets (id, name, public)
values ('medical_images', 'medical_images', true);

create policy "Public can read medical images"
on storage.objects for select
using (bucket_id = 'medical_images');

create policy "Users can upload medical images"
on storage.objects for insert
with check (
  bucket_id = 'medical_images'
  and auth.jwt()->>'sub' = (storage.foldername(name))[1]
);
```

### SOS Alerts Table

```sql
create table sos_alerts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null references users(user_id) on delete cascade,
  message text not null, -- The patient message PLUS the automated AI Detection Summary (Image or Video)
  image_url text not null, -- Stores URL for both images and MP4 videos
  status text default 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at timestamp with time zone default now()
);


alter table sos_alerts enable row level security;

create policy "Users can insert own SOS"
on sos_alerts for insert
with check (user_id = auth.jwt()->>'sub');

create policy "Users can read own SOS"
on sos_alerts for select
using (user_id = auth.jwt()->>'sub');
```


