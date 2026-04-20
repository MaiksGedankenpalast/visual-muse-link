---
name: Arkie Chat
description: Arkie ist der KI-Begleiter mit persistenten Chat-Sessions, Mood/Journal-Kontext und Cross-Session-Memory.
type: feature
---

Arkie agiert als strategischer emotionaler Begleiter und Reflexionstool, der gezielt Verhaltensmuster erkennt und kritische Fragen stellt.

## Persistente Sessions
- Tabellen `chat_sessions` (title, last_message_at) und `chat_messages` (role, content) mit RLS auf `user_id = auth.uid()`.
- Beim Öffnen des Drawers landet der User immer auf der **Chat-Home-Ansicht** (Neues Gespräch + Liste). Schließen beendet die aktive Session.
- Session-Titel wird automatisch aus den ersten 60 Zeichen der ersten User-Nachricht gesetzt.
- History-Icon im Chat-Header wechselt zur Listenansicht; "← Zurück" führt zur aktiven Session.

## Kontext-Layering an die Mistral API
1. **System-Prompt** (Edge Function): Dynamisch mit den letzten 14 Mood-Einträgen + bis zu 10 Journal-Excerpts (300 Zeichen).
2. **Cross-Session-Memory** (nur bei neuen Sessions): Erste Assistant-Antwort der letzten 3 Sessions als zusätzliche `system`-Message vorangestellt.
3. **Session-History**: Letzte 20 Nachrichten der aktiven Session, bei >3000 Tokens auf 10 reduziert.
4. **Aktuelle User-Nachricht**.

## Speicherung
- User- und Assistant-Nachrichten werden direkt nach Senden/Empfangen in `chat_messages` persistiert.
- `chat_sessions.last_message_at` wird bei jeder neuen Nachricht aktualisiert.

## Files
- `src/lib/chatSessions.ts` — Session/Message-CRUD, Memory-Builder, Token-aware History.
- `src/components/ArkieChat.tsx` — Home/List/Active-Views, Skeleton-Loading, Empty-States.
- `src/lib/arkieChat.ts` — `sendMessageToArkie` akzeptiert optional `extraSystem` für Cross-Session-Memory.
- `supabase/functions/arkie-chat/index.ts` — Mistral-Integration (`mistral-medium-latest`).
