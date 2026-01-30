# Study Room Backend Architecture

## 📐 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ useStudyRooms   │  │ useRoomParticipants │ │ StudyRoom Page│  │
│  │     Hook        │  │      Hook        │  │                │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬───────┘  │
└───────────┼────────────────────┼─────────────────────┼──────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT SDK                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  supabase.rpc() │  │ Realtime Channel│  │  Auth Session   │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼─────────────────────┼──────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Edge Function (Optional REST API)        ││
│  │  POST /study-rooms/create   → create_study_room()          ││
│  │  POST /study-rooms/join     → join_study_room()            ││
│  │  POST /study-rooms/leave    → leave_study_room()           ││
│  │  POST /study-rooms/status   → update_focus_status()        ││
│  │  GET  /study-rooms/list     → get_active_rooms()           ││
│  │  GET  /study-rooms/participants → get_room_participants()  ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL RPC Functions                 ││
│  │  (SECURITY DEFINER - bypass RLS for atomic operations)     ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Database Tables                          ││
│  │  study_rooms │ study_room_participants │ room_activity_logs ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Row Level Security (RLS)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Realtime Subscriptions                   ││
│  │  postgres_changes on study_rooms, study_room_participants   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Tables

#### `study_rooms`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Room name (min 3 chars) |
| description | TEXT | Optional description |
| is_public | BOOLEAN | Visibility (default: true) |
| max_participants | INTEGER | Max members (2-50, default: 10) |
| current_members | INTEGER | Current member count |
| room_status | TEXT | 'active' or 'closed' |
| created_by | UUID | Owner's user_id |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `study_room_participants`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| room_id | UUID | FK to study_rooms |
| user_id | UUID | User's ID |
| role | TEXT | 'owner' or 'member' |
| status | TEXT | 'focusing' or 'break' |
| joined_at | TIMESTAMPTZ | Join timestamp |

#### `room_activity_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| room_id | UUID | FK to study_rooms |
| user_id | UUID | User's ID |
| action | TEXT | 'join', 'leave', 'status_change', 'room_created', 'room_closed' |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Event timestamp |

---

## 🔌 API Endpoints

### Edge Function: `/study-rooms`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/study-rooms/create` | POST | Required | Create a new room |
| `/study-rooms/join` | POST | Required | Join a room |
| `/study-rooms/leave` | POST | Required | Leave a room |
| `/study-rooms/status` | POST | Required | Update focus status |
| `/study-rooms/list` | GET | Required | List active rooms |
| `/study-rooms/participants` | GET | Required | Get room participants |

### RPC Functions (Direct Supabase calls)

| Function | Parameters | Returns |
|----------|------------|---------|
| `create_study_room(p_name, p_description, p_is_public, p_max_participants)` | TEXT, TEXT, BOOLEAN, INTEGER | JSONB {success, room_id, error} |
| `join_study_room(p_room_id)` | UUID | JSONB {success, participant_id, error} |
| `leave_study_room(p_room_id)` | UUID | JSONB {success, room_closed, new_owner_id, error} |
| `update_focus_status(p_room_id, p_status)` | UUID, TEXT | JSONB {success, error} |
| `get_active_rooms()` | - | TABLE (id, name, description, ...) |
| `get_room_participants(p_room_id)` | UUID | TABLE (id, user_id, role, status, ...) |

---

## 🧠 Business Logic

### Room Creation
1. Validate user is authenticated
2. Validate name (min 3 chars)
3. Validate max_participants (2-50)
4. Create room with status='active'
5. Auto-join owner with role='owner'
6. Log 'room_created' activity

### Join Room
1. Validate user is authenticated
2. Check room exists and is active
3. Check user not already in room
4. Check room not full (current_members < max_participants)
5. Insert participant with role='member'
6. Update current_members count
7. Log 'join' activity

### Leave Room
1. Validate user is authenticated
2. Check user is in room
3. If user is owner:
   - Find next member (oldest join time)
   - Transfer ownership to them
4. Remove participant
5. If room empty:
   - Set room_status='closed'
   - Log 'room_closed'
6. Update current_members count
7. Log 'leave' activity

### Status Update
1. Validate user is authenticated
2. Validate status ('focusing' or 'break')
3. Update participant status
4. Log 'status_change' activity

---

## 🔁 Realtime Flow

```
User A joins room
        │
        ▼
┌───────────────────┐
│ INSERT INTO       │
│ study_room_       │
│ participants      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Supabase Realtime │
│ postgres_changes  │
└────────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
 User B    User C
 (in room) (in room)
    │         │
    ▼         ▼
 UI Update UI Update
```

### Subscribed Events
- `study_rooms` table changes → refresh room list
- `study_room_participants` table changes → refresh participants
- `room_activity_logs` table changes → activity feed (future)

---

## 🔐 Security

### Row Level Security (RLS)

**study_rooms:**
- SELECT: Public active rooms OR own rooms OR rooms user is member of
- INSERT: Via RPC only (enforced by function)
- UPDATE: Owner only

**study_room_participants:**
- SELECT: Public rooms participants OR own participation
- INSERT/UPDATE/DELETE: Own participation only

**room_activity_logs:**
- SELECT: Rooms user is member of OR public rooms

### Security Measures
1. All mutations go through SECURITY DEFINER functions
2. JWT validation on Edge Functions
3. Input validation (name length, max participants range)
4. Race condition prevention with ON CONFLICT
5. Email addresses excluded from public views

---

## 📈 Scalability Considerations

1. **Indexes** on frequently queried columns:
   - `room_status` (partial index for 'active')
   - `is_public` (partial index for true)
   - `room_id`, `user_id` on participants

2. **Current member count** stored in rooms table (no COUNT() on every query)

3. **Realtime channels** per room (not global)

4. **Activity logs** for analytics (future expansion)

---

## 🧪 Testing Checklist

- [ ] Create room with valid data
- [ ] Create room with invalid name (< 3 chars)
- [ ] Create room with invalid max_participants
- [ ] Join room successfully
- [ ] Join full room (should fail)
- [ ] Join room already joined (should succeed silently)
- [ ] Leave room as member
- [ ] Leave room as owner (ownership transfer)
- [ ] Leave room as last member (room closes)
- [ ] Update status to 'focusing'
- [ ] Update status to 'break'
- [ ] Realtime updates on join/leave
- [ ] Unauthorized access attempts

---

## 🚀 Future Expansion Ready

### Chat (ready for)
- Add `room_messages` table
- Subscribe to messages via Realtime
- RLS based on room membership

### Focus Timer Sync
- Add timer state to rooms or participants
- Broadcast timer events via Realtime Presence

### Learning Analytics
- `room_activity_logs` already captures events
- Add session duration calculations
- Build dashboards from log data

### Document Sharing
- Add `room_documents` table
- Use Supabase Storage for files
- RLS based on room membership
