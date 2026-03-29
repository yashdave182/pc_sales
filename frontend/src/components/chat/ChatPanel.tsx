import React, { useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { useChat } from "../../hooks/useChat";

import MessageThread from "./MessageThread";
import MessageInput from "./MessageInput";


interface ChatPanelProps {
  currentUserEmail: string;
}

export default function ChatPanel({ currentUserEmail }: ChatPanelProps) {
  const theme = useTheme();

  React.useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);


  const {
    conversations,
    activeConvId,
    messages,
    users,
    loadingConvs,
    loadingMsgs,
    sendingMsg,
    switchConversation,
    sendMessage,
  } = useChat(currentUserEmail);

  const activeConv = conversations.find((c) => c.conversation_id === activeConvId) ?? null;

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1, // fill the flex container from Layout
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <MessageThread
          conversation={activeConv}
          messages={messages}
          loading={loadingMsgs}
          currentUserEmail={currentUserEmail}
          users={users}
        />
        {activeConv && (
          <MessageInput
            onSend={sendMessage}
            disabled={sendingMsg}
            users={users}
            currentUserEmail={currentUserEmail}
            allowMentions={activeConv.type === "group"}
          />
        )}
      </Box>


    </Box>
  );
}
