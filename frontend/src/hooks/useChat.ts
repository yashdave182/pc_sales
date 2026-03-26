import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  email: string;
  name: string | null;
  role: string;
}

export interface Conversation {
  conversation_id: number;
  type: "group" | "direct";
  name: string | null;
  partner?: AppUser;
  last_message_at?: string;
  unread_count: number;
}

export interface ChatMessage {
  message_id: number;
  conversation_id: number;
  sender_email: string;
  sender_name?: string | null;
  content: string;
  mentions: string[];
  is_deleted: boolean;
  created_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(currentUserEmail: string | null | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Refs so realtime callbacks always have fresh values without re-subscribing
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeConvIdRef = useRef<number | null>(null);
  const currentUserEmailRef = useRef(currentUserEmail);
  const getUserNameRef = useRef<(email: string) => string>((e) => e.split("@")[0]);
  const loadConversationsRef = useRef<(() => Promise<void>) | null>(null);

  // Keep refs fresh
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
  useEffect(() => { currentUserEmailRef.current = currentUserEmail; }, [currentUserEmail]);

  // ── Load users ──────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_users")
      .select("email, name, role")
      .eq("is_active", true)
      .order("name");
    if (!error && data) setUsers(data as AppUser[]);
  }, []);

  // ── Name lookup helper ──────────────────────────────────────────────────────
  const getUserName = useCallback(
    (email: string): string => {
      const u = users.find((u) => u.email === email);
      return u?.name || email.split("@")[0];
    },
    [users]
  );

  // Keep getUserName ref fresh so realtime callbacks use current users list
  useEffect(() => {
    getUserNameRef.current = getUserName;
  }, [getUserName]);

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!currentUserEmail) return;
    setLoadingConvs(true);
    try {
      const { data: participations, error: pErr } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_email", currentUserEmail);

      if (pErr || !participations) return;

      const convIds = participations.map((p: any) => p.conversation_id);
      if (convIds.length === 0) { setConversations([]); return; }

      const { data: convs, error: cErr } = await supabase
        .from("chat_conversations")
        .select("*")
        .in("conversation_id", convIds);
      if (cErr || !convs) return;

      const { data: allParticipants } = await supabase
        .from("chat_participants")
        .select("conversation_id, user_email")
        .in("conversation_id", convIds);

      const lastMsgResults = await Promise.allSettled(
        convIds.map((id: number) =>
          supabase
            .from("chat_messages")
            .select("content, created_at")
            .eq("conversation_id", id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()  // returns null (not error) when conversation has no messages
        )
      );

      const { data: receipts } = await supabase
        .from("chat_read_receipts")
        .select("conversation_id, last_read_at")
        .eq("user_email", currentUserEmail)
        .in("conversation_id", convIds);

      const unreadResults = await Promise.all(
        convIds.map(async (id: number) => {
          const receipt = receipts?.find((r: any) => r.conversation_id === id);
          // If no read receipt exists yet, default to start of time so all messages count as unread until user opens chat
          const since = receipt?.last_read_at || "1970-01-01T00:00:00.000Z";
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", id)
            .eq("is_deleted", false)
            .gt("created_at", since)
            .neq("sender_email", currentUserEmail);
          return { id, count: count ?? 0 };
        })
      );

      const enriched: Conversation[] = convs.map((c: any) => {
        const idx = convIds.indexOf(c.conversation_id);
        const lastMsgResult = lastMsgResults[idx];
        const lastMsg =
          lastMsgResult.status === "fulfilled" && lastMsgResult.value.data
            ? lastMsgResult.value.data : null;
        const unread = unreadResults.find((u) => u.id === c.conversation_id);

        let partner: AppUser | undefined;
        if (c.type === "direct" && allParticipants) {
          const partnerEmail = allParticipants
            .filter((p: any) => p.conversation_id === c.conversation_id && p.user_email !== currentUserEmail)
            .map((p: any) => p.user_email)[0];
          if (partnerEmail) {
            const u = users.find((u) => u.email === partnerEmail);
            partner = u || { email: partnerEmail, name: partnerEmail.split("@")[0], role: "" };
          }
        }

        return {
          conversation_id: c.conversation_id,
          type: c.type,
          name: c.type === "group" ? c.name : null,
          partner,
          last_message_at: lastMsg?.created_at || c.created_at,
          unread_count: unread?.count ?? 0,
        };
      });

      enriched.sort((a, b) => {
        if (a.type === "group" && b.type !== "group") return -1;
        if (b.type === "group" && a.type !== "group") return 1;
        return (b.last_message_at || "").localeCompare(a.last_message_at || "");
      });

      setConversations(enriched);

      // Auto-open group on first load: just set the ID.
      // The useEffect below (the single owner) will load messages + subscribe.
      if (!activeConvIdRef.current && enriched.length > 0) {
        const group = enriched.find((c) => c.type === "group");
        setActiveConvId(group?.conversation_id ?? enriched[0].conversation_id);
      }
    } finally {
      setLoadingConvs(false);
    }
  }, [currentUserEmail, users]);

  // Keep loadConversationsRef in sync so global channel can call it
  useEffect(() => { loadConversationsRef.current = loadConversations; }, [loadConversations]);

  // ── Load message history ────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: number) => {
    setMessages([]); // clear immediately so old bubbles don't flash during switch
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", convId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) { console.error("[useChat] loadMessages error:", error); return; }
      setMessages(
        (data || []).map((m: any) => ({
          ...m,
          sender_name: getUserNameRef.current(m.sender_email),
        }))
      );
    } finally {
      setLoadingMsgs(false);
    }
  }, []); // stable — uses ref for getUserName

  // ── Realtime subscription ───────────────────────────────────────────────────
  const subscribeToConversation = useCallback((convId: number) => {
    // Clean up any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`chat-conv-${convId}-${Date.now()}`) // unique name avoids stale channel reuse
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only append if user is still viewing this conversation
          if (activeConvIdRef.current === convId) {
            setMessages((prev) => {
              if (prev.find((m) => m.message_id === newMsg.message_id)) return prev;
              return [...prev, { ...newMsg, sender_name: getUserNameRef.current(newMsg.sender_email) }];
            });
          }
          // Always update sidebar (unread count)
          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversation_id !== convId) return c;
              const isOwn = newMsg.sender_email === currentUserEmailRef.current;
              return {
                ...c,
                last_message_at: newMsg.created_at,
                unread_count:
                  activeConvIdRef.current === convId || isOwn ? 0 : c.unread_count + 1,
              };
            })
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []); // stable — uses refs for all dynamic values

  // ── Global background subscription ─────────────────────────────────────────
  // Listens to ALL chat_messages inserts (no filter). This ensures the sidebar
  // updates for ANY conversation — not just the active one — so DMs received
  // while the user is in group chat still light up with unread counts.
  // The per-conversation subscription (above) handles message-thread updates.
  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentUserEmail) return;

    const globalChannel = supabase
      .channel(`chat-global-${currentUserEmail}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as any;
          const convId = newMsg.conversation_id;
          const isOwn = newMsg.sender_email === currentUserEmailRef.current;
          const isActive = activeConvIdRef.current === convId;

          // Update sidebar for every conversation this message belongs to
          setConversations((prev) => {
            const exists = prev.find((c) => c.conversation_id === convId);
            if (!exists) {
              // New DM conversation appeared — reload the list to get full details
              // Use a microtask to avoid calling async from setState
              Promise.resolve().then(() => loadConversationsRef.current?.());
              return prev;
            }
            return prev.map((c) => {
              if (c.conversation_id !== convId) return c;
              return {
                ...c,
                last_message_at: newMsg.created_at,
                unread_count: isActive || isOwn ? c.unread_count : c.unread_count + 1,
              };
            });
          });
        }
      )
      // ── Read receipts: clear badge when user reads a conversation ───────────
      // This fires when ChatPanel's switchConversation writes a read receipt,
      // so the Layout's separate hook instance also clears its unread count.
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_read_receipts",
          filter: `user_email=eq.${currentUserEmail}`,
        },
        (payload) => {
          const receipt = (payload.new || payload.old) as any;
          if (!receipt?.conversation_id || !receipt?.last_read_at) return;
          const convId = receipt.conversation_id;
          // Clear unread for the conversation that was just read
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === convId ? { ...c, unread_count: 0 } : c
            )
          );
        }
      )
      .subscribe();

    globalChannelRef.current = globalChannel;
    return () => {
      supabase.removeChannel(globalChannel);
      globalChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail]);

  // ── SINGLE OWNER of messages + subscription ─────────────────────────────────
  // This effect is the ONLY place that calls loadMessages + subscribeToConversation.
  // switchConversation just calls setActiveConvId — it does NOT load/subscribe.
  useEffect(() => {
    if (activeConvId === null) return;
    loadMessages(activeConvId);
    subscribeToConversation(activeConvId);
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeConvId, loadMessages, subscribeToConversation]);

  // ── Switch conversation ─────────────────────────────────────────────────────
  // ONLY sets activeConvId + marks read. Does NOT call loadMessages/subscribe.
  const switchConversation = useCallback(
    async (convId: number) => {
      setActiveConvId(convId); // triggers the effect above
      if (currentUserEmailRef.current) {
        await supabase.from("chat_read_receipts").upsert(
          { conversation_id: convId, user_email: currentUserEmailRef.current, last_read_at: new Date().toISOString() },
          { onConflict: "conversation_id,user_email" }
        );
        setConversations((prev) =>
          prev.map((c) => c.conversation_id === convId ? { ...c, unread_count: 0 } : c)
        );
      }
    },
    [] // stable — uses ref for email
  );

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string, mentions: string[] = []) => {
      if (!activeConvIdRef.current || !currentUserEmailRef.current || !content.trim()) return;
      setSendingMsg(true);
      try {
        const { error } = await supabase.from("chat_messages").insert({
          conversation_id: activeConvIdRef.current,
          sender_email: currentUserEmailRef.current,
          content: content.trim(),
          mentions,
        });
        if (error) console.error("[useChat] sendMessage error:", error);

        if (mentions.length > 0 && !error) {
          const senderName = getUserNameRef.current(currentUserEmailRef.current);
          const notifInserts = mentions
            .filter((m) => m !== currentUserEmailRef.current)
            .map((mentionedEmail) => ({
              user_email: mentionedEmail,
              title: `${senderName} mentioned you`,
              message: content.substring(0, 100),
              notification_type: "mention",
              entity_type: "chat",
              action_url: "/chat",
            }));
          if (notifInserts.length > 0) {
            const { error: notifErr } = await supabase.from("notifications").insert(notifInserts);
            if (notifErr) console.error("[useChat] mention notification error:", notifErr);
          }
        }
      } finally {
        setSendingMsg(false);
      }
    },
    [] // stable — uses refs only
  );

  // ── Start or find a DM ─────────────────────────────────────────────────────
  // Uses a SECURITY DEFINER RPC to bypass RLS — client-side inserts kept
  // hitting policy violations. The function handles find-or-create atomically.
  const startDM = useCallback(
    async (targetEmail: string) => {
      const myEmail = currentUserEmailRef.current;
      if (!myEmail || targetEmail === myEmail) return;

      const { data: convId, error } = await supabase.rpc("create_dm_conversation", {
        target_email: targetEmail,
      });

      if (error || convId === null) {
        console.error("[useChat] startDM RPC error:", error);
        return;
      }

      await loadConversations();
      await switchConversation(convId as number);
    },
    [loadConversations, switchConversation]
  );

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserEmail) return;
    loadUsers();
  }, [currentUserEmail, loadUsers]);

  useEffect(() => {
    if (!currentUserEmail || users.length === 0) return;
    loadConversations();
  }, [currentUserEmail, users, loadConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    activeConvId,
    messages,
    users,
    loadingConvs,
    loadingMsgs,
    sendingMsg,
    totalUnread,
    switchConversation,
    sendMessage,
    startDM,
    getUserName,
    reloadConversations: loadConversations,
  };
}
