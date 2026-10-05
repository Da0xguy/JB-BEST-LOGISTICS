import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config';
import { Shipment, User } from './models';

let socketServer: Server | undefined;

const userRoom = (userId: string) => `user:${userId}`;
const shipmentRoom = (shipmentId: string) => `shipment:${shipmentId}`;

export const initializeRealtime = (httpServer: HttpServer) => {
  socketServer = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true },
  });

  socketServer.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token === undefined) return next();
      if (typeof token !== 'string') return next(new Error('Invalid session'));
      const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
      if (!payload.sub) return next(new Error('Invalid session'));
      const user = await User.findOne({ _id: payload.sub, status: 'active' }).select('_id mustChangePassword');
      if (!user) return next(new Error('Account is unavailable'));
      if (user.mustChangePassword) return next(new Error('Change your temporary password before continuing'));
      socket.data.userId = user._id.toString();
      return next();
    } catch {
      return next(new Error('Invalid or expired session'));
    }
  });

  socketServer.on('connection', (socket) => {
    if (typeof socket.data.userId === 'string') void socket.join(userRoom(socket.data.userId));
    socket.on('tracking:subscribe', async (trackingNumber: unknown, acknowledge?: (result: { ok: boolean; error?: string }) => void) => {
      try {
        if (typeof trackingNumber !== 'string' || trackingNumber.length > 64) {
          acknowledge?.({ ok: false, error: 'Invalid tracking number' });
          return;
        }
        const shipment = await Shipment.findOne({ trackingId: trackingNumber }).select('_id');
        if (!shipment) {
          acknowledge?.({ ok: false, error: 'Tracking number not found' });
          return;
        }
        await socket.join(shipmentRoom(shipment._id.toString()));
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to subscribe to tracking updates' });
      }
    });
  });

  return socketServer;
};

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  socketServer?.to(userRoom(userId)).emit(event, payload);
};

export const emitToShipment = (shipmentId: string, event: string, payload: unknown) => {
  socketServer?.to(shipmentRoom(shipmentId)).emit(event, payload);
};
