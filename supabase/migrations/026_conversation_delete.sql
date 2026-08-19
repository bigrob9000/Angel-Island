-- Angel Island: allow participants to permanently delete ended conversations
-- Deletes the chat_invites row; messages cascade. Collaborations keep chat_invite_id = null.

create policy "Participants can delete ended conversations"
  on public.chat_invites for delete to authenticated
  using (
    status = 'accepted'
    and coalesce(conversation_status, 'active') = 'ended'
    and (auth.uid() = sender_id or auth.uid() = receiver_id)
  );
