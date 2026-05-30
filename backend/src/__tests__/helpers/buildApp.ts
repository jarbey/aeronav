import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';

import { authRoutes } from '../../routes/auth.js';
import { voyagesRoutes } from '../../routes/voyages.js';
import { peopleRoutes } from '../../routes/people.js';
import { aircraftRoutes } from '../../routes/aircraft.js';
import { aerodromesRoutes } from '../../routes/aerodromes.js';

export const JWT_SECRET = 'test_secret';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(fastifyCors, {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(fastifyCookie, {
    secret: JWT_SECRET,
  });

  await app.register(fastifyJwt, {
    secret: JWT_SECRET,
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
  });

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(voyagesRoutes, { prefix: '/api' });
  await app.register(peopleRoutes, { prefix: '/api' });
  await app.register(aircraftRoutes, { prefix: '/api' });
  await app.register(aerodromesRoutes, { prefix: '/api' });

  // Ready the app without listening
  await app.ready();
  return app;
}
