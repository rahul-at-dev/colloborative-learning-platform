import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Webhook } from 'svix';
import { Resend } from 'resend';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH']
  }
});

io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  // Client joins a specific room to receive real-time events
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket] Client ${socket.id} joined room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// ─── MongoDB Connection ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch(err => console.error('[MongoDB] Connection error:', err));

// ─── Schemas & Models ────────────────────────────────────────────────────────

const memberSchema = new mongoose.Schema({
  userId:   { type: String, required: true },
  userName: { type: String, required: true },
  role:     { type: String, enum: ['owner', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
});

const joinRequestSchema = new mongoose.Schema({
  userId:      { type: String, required: true },
  userName:    { type: String, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
});

const answerSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const questionSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  content:   { type: String, required: true },
  votes:     { type: Number, default: 0 },
  votedBy:   [{ type: String }],
  answers:   [answerSchema],
  createdAt: { type: Date, default: Date.now },
});

const roomMessageSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const dmRequestSchema = new mongoose.Schema({
  fromUserId:   { type: String, required: true },
  fromUserName: { type: String, required: true },
  toUserId:     { type: String, required: true },
  status:       { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  requestedAt:  { type: Date, default: Date.now },
});

const dmMessageSchema = new mongoose.Schema({
  fromUserId: { type: String, required: true },
  content:    { type: String, required: true },
  sentAt:     { type: Date, default: Date.now },
});

const dmThreadSchema = new mongoose.Schema({
  participants: [{ type: String }], // [userId1, userId2] sorted
  messages:     [dmMessageSchema],
});

const roomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  ownerId:     { type: String, required: true },
  ownerName:   { type: String, required: true },
  inviteToken: { type: String, unique: true, default: () => uuidv4() },
  members:     [memberSchema],
  joinRequests:[joinRequestSchema],
  questions:   [questionSchema],
  messages:    [roomMessageSchema],
  dmRequests:  [dmRequestSchema],
  dmThreads:   [dmThreadSchema],
  createdAt:   { type: Date, default: Date.now },
});

const Room = mongoose.model('Room', roomSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isMember = (room, userId) =>
  room.members.some(m => m.userId === userId);

// ─── Room Routes ─────────────────────────────────────────────────────────────

// Create a room
app.post('/api/rooms', async (req, res) => {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const { name } = req.body;

  if (!userId || !userName) return res.status(401).json({ error: 'Unauthorized' });
  if (!name?.trim())        return res.status(400).json({ error: 'Room name is required' });

  try {
    const room = new Room({
      name:      name.trim(),
      ownerId:   userId,
      ownerName: userName,
      members:   [{ userId, userName, role: 'owner' }],
    });
    await room.save();

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${room.inviteToken}`;
    return res.status(201).json({ room, inviteUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// List rooms (rooms where user is a member)
app.get('/api/rooms', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const rooms = await Room.find({ 'members.userId': userId })
      .select('name ownerId ownerName inviteToken members createdAt');
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get a single room
app.get('/api/rooms/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Access denied' });
    return res.json(room);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Get room info by invite token (public – unauthenticated preview)
app.get('/api/rooms/invite/:token', async (req, res) => {
  try {
    const room = await Room.findOne({ inviteToken: req.params.token })
      .select('name ownerName members inviteToken');
    if (!room) return res.status(404).json({ error: 'Invalid invite link' });
    return res.json(room);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Request to join via invite token
app.post('/api/rooms/join/:token', async (req, res) => {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  if (!userId || !userName) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findOne({ inviteToken: req.params.token });
    if (!room) return res.status(404).json({ error: 'Invalid invite link' });

    // Already a member
    if (isMember(room, userId)) {
      return res.json({ alreadyMember: true, roomId: room._id });
    }

    // Already has a pending request
    const existing = room.joinRequests.find(
      r => r.userId === userId && r.status === 'pending'
    );
    if (existing) return res.status(409).json({ error: 'Join request already pending' });

    room.joinRequests.push({ userId, userName });
    await room.save();
    return res.status(201).json({ message: 'Join request sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process join request' });
  }
});

// Approve / reject a join request (owner only)
app.patch('/api/rooms/:id/join-requests/:reqId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { action } = req.body; // 'approve' | 'reject'
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== userId) return res.status(403).json({ error: 'Only the owner can approve requests' });

    const request = room.joinRequests.id(req.params.reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (action === 'approve') {
      request.status = 'approved';
      room.members.push({ userId: request.userId, userName: request.userName });
    } else {
      request.status = 'rejected';
    }

    await room.save();
    return res.json({ message: `Request ${action}d` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// ─── Questions ───────────────────────────────────────────────────────────────

// Post a question
app.post('/api/rooms/:id/questions', async (req, res) => {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const { content } = req.body;
  if (!userId || !userName) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    room.questions.push({ userId, userName, content: content.trim() });
    await room.save();
    return res.status(201).json(room.questions[room.questions.length - 1]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to post question' });
  }
});

// Upvote a question
app.post('/api/rooms/:id/questions/:qId/vote', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });

    const question = room.questions.id(req.params.qId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    if (question.votedBy.includes(userId)) {
      // toggle off
      question.votedBy.pull(userId);
      question.votes = Math.max(0, question.votes - 1);
    } else {
      question.votedBy.push(userId);
      question.votes += 1;
    }

    await room.save();
    return res.json({ votes: question.votes, votedBy: question.votedBy });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to vote' });
  }
});

// Post an answer
app.post('/api/rooms/:id/questions/:qId/answers', async (req, res) => {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const { content } = req.body;
  if (!userId || !userName) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });

    const question = room.questions.id(req.params.qId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    question.answers.push({ userId, userName, content: content.trim() });
    await room.save();
    return res.status(201).json(question.answers[question.answers.length - 1]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to post answer' });
  }
});

// ─── Room Chat ───────────────────────────────────────────────────────────────

app.get('/api/rooms/:id/messages', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id).select('messages members');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });
    return res.json(room.messages);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/rooms/:id/messages', async (req, res) => {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];
  const { content } = req.body;
  if (!userId || !userName) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    room.messages.push({ userId, userName, content: content.trim() });
    await room.save();
    
    const savedMsg = room.messages[room.messages.length - 1];
    
    // Broadcast the new message to all clients connected to this room
    io.to(req.params.id).emit('new_message', savedMsg);
    
    return res.status(201).json(savedMsg);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── Private DMs ─────────────────────────────────────────────────────────────

// Send a DM request
app.post('/api/rooms/:id/dm-request', async (req, res) => {
  const fromUserId   = req.headers['x-user-id'];
  const fromUserName = req.headers['x-user-name'];
  const { toUserId } = req.body;
  if (!fromUserId || !fromUserName) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, fromUserId)) return res.status(403).json({ error: 'Not a member' });
    if (!isMember(room, toUserId))   return res.status(404).json({ error: 'Target user not a member' });
    if (fromUserId === toUserId)     return res.status(400).json({ error: 'Cannot DM yourself' });

    // Check for existing pending/accepted
    const existing = room.dmRequests.find(
      r => r.fromUserId === fromUserId && r.toUserId === toUserId &&
           ['pending', 'accepted'].includes(r.status)
    );
    if (existing) return res.status(409).json({ error: 'DM request already exists', status: existing.status });

    room.dmRequests.push({ fromUserId, fromUserName, toUserId });
    await room.save();
    return res.status(201).json({ message: 'DM request sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send DM request' });
  }
});

// Get incoming DM requests for the current user
app.get('/api/rooms/:id/dm-requests', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id).select('dmRequests');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const incoming = room.dmRequests.filter(
      r => r.toUserId === userId && r.status === 'pending'
    );
    return res.json(incoming);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch DM requests' });
  }
});

// Accept / reject DM request
app.patch('/api/rooms/:id/dm-request/:reqId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { action } = req.body; // 'accept' | 'reject'
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const dmReq = room.dmRequests.id(req.params.reqId);
    if (!dmReq) return res.status(404).json({ error: 'DM request not found' });
    if (dmReq.toUserId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (action === 'accept') {
      dmReq.status = 'accepted';
      // Create dm thread if not exists
      const participants = [dmReq.fromUserId, dmReq.toUserId].sort();
      const exists = room.dmThreads.find(
        t => t.participants[0] === participants[0] && t.participants[1] === participants[1]
      );
      if (!exists) {
        room.dmThreads.push({ participants, messages: [] });
      }
    } else {
      dmReq.status = 'rejected';
    }

    await room.save();
    return res.json({ message: `DM request ${action}ed` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update DM request' });
  }
});

// Get DM thread messages
app.get('/api/rooms/:id/dm/:peerId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id).select('dmThreads');
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const participants = [userId, req.params.peerId].sort();
    const thread = room.dmThreads.find(
      t => t.participants[0] === participants[0] && t.participants[1] === participants[1]
    );
    return res.json(thread ? thread.messages : []);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
});

// Send DM message
app.post('/api/rooms/:id/dm/:peerId', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { content } = req.body;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!isMember(room, userId)) return res.status(403).json({ error: 'Not a member' });
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

    const participants = [userId, req.params.peerId].sort();
    const thread = room.dmThreads.find(
      t => t.participants[0] === participants[0] && t.participants[1] === participants[1]
    );
    if (!thread) return res.status(404).json({ error: 'No active DM thread. Request must be accepted first.' });

    thread.messages.push({ fromUserId: userId, content: content.trim() });
    await room.save();
    return res.status(201).json(thread.messages[thread.messages.length - 1]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send DM' });
  }
});

// ─── Clerk Webhook ───────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

const getWelcomeEmailHtml = (firstName) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0d1117; color: #e6edf3; padding: 40px 0; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #161b22; border-radius: 12px; padding: 40px; border: 1px solid #22c55e33; }
    .logo { color: #22c55e; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 30px; }
    .title { color: #ffffff; font-size: 22px; margin-bottom: 20px; font-weight: 700; }
    .text { font-size: 16px; line-height: 1.6; color: #8b949e; margin-bottom: 25px; }
    .btn { display: inline-block; background-color: #22c55e; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-align: center; }
    .footer { margin-top: 40px; font-size: 12px; color: #6e7681; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⬡ CollabMate</div>
    <h1 class="title">Welcome to CollabMate, ${firstName}!</h1>
    <p class="text">We're thrilled to have you join our collaborative learning community. You are now ready to create study rooms, ask questions, and learn together with peers.</p>
    <p class="text">Get started by jumping into your first study room and seeing what other students are discussing.</p>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn">Explore CollabMate</a>
    </div>
    <div class="footer">© CollabMate. Built for students, by students.<br>This is an automated message, please do not reply.</div>
  </div>
</body>
</html>
`;

app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) return res.status(500).json({ error: 'Missing CLERK_WEBHOOK_SECRET' });

  const svix_id        = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature)
    return res.status(400).json({ error: 'Missing svix headers' });

  const payload = req.body.toString('utf8');
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    evt = wh.verify(payload, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { type, data } = evt;

  if (type === 'user.created') {
    const emailAddress = data.email_addresses[0]?.email_address;
    const firstName = data.first_name || 'Student';
    console.log(`[Webhook] New user: ${firstName} (${emailAddress})`);

    if (emailAddress && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'CollabMate <onboarding@resend.dev>',
          to: [emailAddress],
          subject: 'Welcome to CollabMate! 🚀',
          html: getWelcomeEmailHtml(firstName),
        });
        console.log(`[Resend] Welcome email sent to ${emailAddress}`);
      } catch (emailErr) {
        console.error('[Resend Exception]', emailErr);
      }
    }
  }

  return res.status(200).json({ success: true });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`CollabMate API & Socket running on http://localhost:${PORT}`));
