import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateRoomRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  max_participants?: number;
}

interface JoinLeaveRequest {
  room_id: string;
}

interface UpdateStatusRequest {
  room_id: string;
  status: "focusing" | "break";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Route handling
    switch (action) {
      case "create": {
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body: CreateRoomRequest = await req.json();
        
        // Input validation
        if (!body.name || body.name.trim().length < 3) {
          return new Response(
            JSON.stringify({ success: false, error: "INVALID_NAME", message: "Room name must be at least 3 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const maxParticipants = body.max_participants ?? 10;
        if (maxParticipants < 2 || maxParticipants > 50) {
          return new Response(
            JSON.stringify({ success: false, error: "INVALID_MAX_PARTICIPANTS", message: "Max participants must be between 2 and 50" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create room using RPC
        const { data, error } = await supabase.rpc("create_study_room", {
          p_name: body.name.trim(),
          p_description: body.description || null,
          p_is_public: body.is_public ?? true,
          p_max_participants: maxParticipants,
        });

        if (error) {
          console.error("Create room error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "CREATE_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Room created: ${JSON.stringify(data)}`);
        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "join": {
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body: JoinLeaveRequest = await req.json();
        
        if (!body.room_id) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_ROOM_ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("join_study_room", {
          p_room_id: body.room_id,
        });

        if (error) {
          console.error("Join room error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "JOIN_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`User ${userId} joined room: ${body.room_id}`);
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "leave": {
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body: JoinLeaveRequest = await req.json();
        
        if (!body.room_id) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_ROOM_ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("leave_study_room", {
          p_room_id: body.room_id,
        });

        if (error) {
          console.error("Leave room error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "LEAVE_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`User ${userId} left room: ${body.room_id}`);
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const body: UpdateStatusRequest = await req.json();
        
        if (!body.room_id) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_ROOM_ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!["focusing", "break"].includes(body.status)) {
          return new Response(
            JSON.stringify({ success: false, error: "INVALID_STATUS" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("update_focus_status", {
          p_room_id: body.room_id,
          p_status: body.status,
        });

        if (error) {
          console.error("Update status error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "UPDATE_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`User ${userId} status updated in room ${body.room_id}: ${body.status}`);
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        if (req.method !== "GET") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("get_active_rooms");

        if (error) {
          console.error("List rooms error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "LIST_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, rooms: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "participants": {
        if (req.method !== "GET") {
          return new Response(
            JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const roomId = url.searchParams.get("room_id");
        if (!roomId) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_ROOM_ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("get_room_participants", {
          p_room_id: roomId,
        });

        if (error) {
          console.error("Get participants error:", error);
          return new Response(
            JSON.stringify({ success: false, error: "GET_PARTICIPANTS_FAILED", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, participants: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "NOT_FOUND", message: "Invalid endpoint" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "INTERNAL_ERROR", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
