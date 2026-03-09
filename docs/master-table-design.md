# Master Table Design (Draft v1)

## Scope
This document defines the initial `master` schema focused on:

- pieces
- stages
- move patterns (relative coordinates)
- stage rewards

Notes:

- Boss is not a piece-level attribute. It is a stage appearance role.
- Unlock condition is stage progression only for now.
- Publish control is handled by `published_at` / `unpublished_at`.

## Naming and Common Rules

- Schema: `master`
- PK: `<table>_id` (bigint or uuid; pick one policy)
- Time columns: `created_at`, `updated_at`
- Publish columns: `published_at`, `unpublished_at` (NULL means no limit)
- Soft delete is not used in v1. Use `is_active` for temporary stop.

## Tables

### 1) `master.m_piece`
Piece dictionary (no stage context).

| Column | Type | Constraint | Description |
|---|---|---|---|
| `piece_id` | bigint | PK | Piece ID |
| `piece_code` | text | UNIQUE NOT NULL | Internal stable code |
| `kanji` | text | NOT NULL | Display symbol |
| `name` | text | NOT NULL | Display name |
| `move_pattern_id` | bigint | FK NOT NULL | Move pattern |
| `skill_id` | bigint | FK NULL | Skill (nullable) |
| `is_active` | boolean | NOT NULL default true | Operational flag |
| `published_at` | timestamptz | NULL | Publish start |
| `unpublished_at` | timestamptz | NULL | Publish end |
| `created_at` | timestamptz | NOT NULL | Created time |
| `updated_at` | timestamptz | NOT NULL | Updated time |

FK:

- `move_pattern_id` -> `master.m_move_pattern.move_pattern_id`
- `skill_id` -> `master.m_skill.skill_id`

Suggested unique:

- `UNIQUE(piece_code)`

### 2) `master.m_skill`
Skill dictionary.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `skill_id` | bigint | PK | Skill ID |
| `skill_code` | text | UNIQUE NOT NULL | Internal stable code |
| `skill_name` | text | NOT NULL | Skill name |
| `skill_desc` | text | NOT NULL | Skill description |
| `trigger_timing` | text | NULL | Trigger timing hint |
| `is_active` | boolean | NOT NULL default true | Operational flag |
| `published_at` | timestamptz | NULL | Publish start |
| `unpublished_at` | timestamptz | NULL | Publish end |
| `created_at` | timestamptz | NOT NULL | Created time |
| `updated_at` | timestamptz | NOT NULL | Updated time |

### 3) `master.m_move_pattern`
Move pattern header.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `move_pattern_id` | bigint | PK | Move pattern ID |
| `move_code` | text | UNIQUE NOT NULL | Internal stable code |
| `move_name` | text | NOT NULL | Name |
| `is_repeatable` | boolean | NOT NULL default false | Ray-like movement |
| `can_jump` | boolean | NOT NULL default false | Can jump pieces |
| `constraints_json` | jsonb | NULL | Extra constraints for special cases |
| `is_active` | boolean | NOT NULL default true | Operational flag |
| `published_at` | timestamptz | NULL | Publish start |
| `unpublished_at` | timestamptz | NULL | Publish end |
| `created_at` | timestamptz | NOT NULL | Created time |
| `updated_at` | timestamptz | NOT NULL | Updated time |

### 4) `master.m_move_pattern_vector`
Relative coordinate vectors for movement.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `move_pattern_id` | bigint | PK(FK part) | Parent move pattern |
| `dx` | int | PK(FK part) | Relative X (column delta) |
| `dy` | int | PK(FK part) | Relative Y (row delta) |
| `max_step` | int | NOT NULL default 1 | Step limit per vector |
| `capture_only` | boolean | PK part, default false | Capture-only vector |
| `move_only` | boolean | PK part, default false | Move-only vector |

FK:

- `move_pattern_id` -> `master.m_move_pattern.move_pattern_id`

Suggested checks:

- `max_step >= 1`
- `NOT (capture_only AND move_only)`
- `NOT (dx = 0 AND dy = 0)`

### 5) `master.m_stage`
Stage dictionary.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `stage_id` | bigint | PK | Stage ID |
| `stage_no` | int | UNIQUE NOT NULL | Stage number (1..N) |
| `stage_name` | text | NOT NULL | Stage name |
| `unlock_stage_no` | int | NULL | Stage progression unlock condition |
| `reward_group_id` | bigint | FK NULL | Reward group |
| `difficulty` | int | NULL | Optional display/rank |
| `is_active` | boolean | NOT NULL default true | Operational flag |
| `published_at` | timestamptz | NULL | Publish start |
| `unpublished_at` | timestamptz | NULL | Publish end |
| `created_at` | timestamptz | NOT NULL | Created time |
| `updated_at` | timestamptz | NOT NULL | Updated time |

FK:

- `reward_group_id` -> `master.m_reward_group.reward_group_id`

Suggested checks:

- `stage_no >= 1`
- `unlock_stage_no IS NULL OR unlock_stage_no < stage_no`

### 6) `master.m_stage_piece`
Stage appearance list (many-to-many between stage and piece).

| Column | Type | Constraint | Description |
|---|---|---|---|
| `stage_id` | bigint | PK(FK part) | Stage |
| `piece_id` | bigint | PK(FK part) | Piece |
| `role` | text | PK part | Role in this stage (`normal`/`boss`/`elite`/`support`) |
| `weight` | int | NOT NULL default 1 | Spawn weight |

FK:

- `stage_id` -> `master.m_stage.stage_id`
- `piece_id` -> `master.m_piece.piece_id`

Suggested checks:

- `weight >= 1`

### 7) `master.m_stage_initial_placement`
Initial board placement.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `stage_id` | bigint | PK(FK part) | Stage |
| `side` | text | PK part | `player` or `enemy` |
| `row_no` | int | PK part | Row index |
| `col_no` | int | PK part | Column index |
| `piece_id` | bigint | FK NOT NULL | Placed piece |

FK:

- `stage_id` -> `master.m_stage.stage_id`
- `piece_id` -> `master.m_piece.piece_id`

Suggested checks:

- `row_no BETWEEN 0 AND 8`
- `col_no BETWEEN 0 AND 8`

### 8) `master.m_reward_group`
Reward group header.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `reward_group_id` | bigint | PK | Reward group ID |
| `reward_code` | text | UNIQUE NOT NULL | Internal stable code |
| `reward_name` | text | NOT NULL | Display name |
| `is_active` | boolean | NOT NULL default true | Operational flag |
| `published_at` | timestamptz | NULL | Publish start |
| `unpublished_at` | timestamptz | NULL | Publish end |
| `created_at` | timestamptz | NOT NULL | Created time |
| `updated_at` | timestamptz | NOT NULL | Updated time |

### 9) `master.m_reward_group_item`
Reward details.

| Column | Type | Constraint | Description |
|---|---|---|---|
| `reward_group_id` | bigint | PK(FK part) | Parent group |
| `reward_type` | text | PK part | `currency`/`piece`/`item` |
| `target_code` | text | PK part | Reward target |
| `amount` | int | NOT NULL | Reward amount |

FK:

- `reward_group_id` -> `master.m_reward_group.reward_group_id`

Suggested checks:

- `amount >= 1`

## Publish Filter Rule
Master rows are publishable when:

- `is_active = true`
- `published_at IS NULL OR published_at <= now()`
- `unpublished_at IS NULL OR now() < unpublished_at`

## v1 Query Notes

- Boss lookup is from `m_stage_piece.role = 'boss'`.
- Piece move is resolved by:
  1. `m_piece.move_pattern_id`
  2. `m_move_pattern` + `m_move_pattern_vector`
  3. Optional `constraints_json` handling in game logic.

## Out of Scope (v1)

- Gacha, shop, event schedule tables
- User-owned data and progression
- Battle log and replay storage

