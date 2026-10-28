import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/security.js';

/** Largest accepted photo. The web app downsizes before sending, so real uploads are far smaller. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const NAME = /^[a-f0-9]{32}\.(jpg|png|webp|mp3)$/;
/** Largest accepted background-music file. */
export const MAX_MUSIC_BYTES = 6 * 1024 * 1024;

/** The file type is decided from the bytes, never from the client's header or file name. */
function detectType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length > 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'jpg';
  if (
    buffer.length > 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'png';
  if (
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'webp';
  return null;
}

/** MP3 starts with an ID3 tag or an MPEG frame header. */
function isMp3(buffer: Buffer) {
  if (buffer.length < 16) return false;
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return true;
  return buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0;
}

const MIME = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
} as const;

export const uploadDir = path.resolve(env.UPLOAD_DIR);

/** Authenticated upload: the owner sends the image bytes and gets back the stored file name. */
export const photoUploadRouter = Router({ mergeParams: true });
photoUploadRouter.use(requireAuth);
photoUploadRouter.post(
  '/',
  createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 60 }),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_PHOTO_BYTES }),
  async (req, res) => {
    const id = z
      .string()
      .uuid()
      .parse((req.params as { id: string }).id);
    const owned = await prisma.invitation.findFirst({
      where: { id, ownerId: req.auth!.user.id },
      select: { id: true },
    });
    if (!owned) throw notFound('Invitation not found');
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length === 0)
      throw new AppError(400, 'VALIDATION_ERROR', 'validation.photo');
    const type = detectType(body);
    if (!type) throw new AppError(400, 'VALIDATION_ERROR', 'validation.photo');
    const name = `${randomBytes(16).toString('hex')}.${type}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), body, { flag: 'wx' });
    res.status(201).json({ data: { photo: name } });
  },
);

/** Authenticated upload of background music (mp3). */
export const musicUploadRouter = Router({ mergeParams: true });
musicUploadRouter.use(requireAuth);
musicUploadRouter.post(
  '/',
  createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 20 }),
  express.raw({ type: ['audio/mpeg', 'audio/mp3'], limit: MAX_MUSIC_BYTES }),
  async (req, res) => {
    const id = z
      .string()
      .uuid()
      .parse((req.params as { id: string }).id);
    const owned = await prisma.invitation.findFirst({
      where: { id, ownerId: req.auth!.user.id },
      select: { id: true },
    });
    if (!owned) throw notFound('Invitation not found');
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || !isMp3(body))
      throw new AppError(400, 'VALIDATION_ERROR', 'validation.music');
    const name = `${randomBytes(16).toString('hex')}.mp3`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), body, { flag: 'wx' });
    res.status(201).json({ data: { music: name } });
  },
);

/** Customer upload of Design Studio artwork. Stored as sent so PNG transparency survives. */
export const artUploadRouter = Router({ mergeParams: true });
artUploadRouter.use(requireAuth);
artUploadRouter.post(
  '/',
  createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 40 }),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_PHOTO_BYTES }),
  async (req, res) => {
    const id = z
      .string()
      .uuid()
      .parse((req.params as { id: string }).id);
    const owned = await prisma.invitation.findFirst({
      where: { id, ownerId: req.auth!.user.id },
      select: { id: true },
    });
    if (!owned) throw notFound('Invitation not found');
    const body = req.body as unknown;
    const type = Buffer.isBuffer(body) ? detectType(body) : null;
    if (!Buffer.isBuffer(body) || !type)
      throw new AppError(400, 'VALIDATION_ERROR', 'validation.photo');
    const name = `${randomBytes(16).toString('hex')}.${type}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), body, { flag: 'wx' });
    res.status(201).json({ data: { name } });
  },
);

/** Admin upload of template artwork (backgrounds, florals, frames). PNG keeps transparency. */
export const assetUploadRouter = Router();
assetUploadRouter.use(requireRole('ADMIN'));
assetUploadRouter.post(
  '/',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: 6 * 1024 * 1024 }),
  async (req, res) => {
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length === 0)
      throw new AppError(400, 'VALIDATION_ERROR', 'validation.photo');
    const type = detectType(body);
    if (!type) throw new AppError(400, 'VALIDATION_ERROR', 'validation.photo');
    const name = `${randomBytes(16).toString('hex')}.${type}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), body, { flag: 'wx' });
    res.status(201).json({ data: { name } });
  },
);

/** Public read of a stored photo or track. Names are random, so a file is only reachable from the page that uses it. */
export const mediaRouter = Router();
mediaRouter.get('/:name', (req, res) => {
  const { name } = req.params;
  if (!name || !NAME.test(name)) throw notFound('Not found');
  const type = name.split('.')[1] as keyof typeof MIME;
  res.setHeader('Content-Type', MIME[type]);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(path.join(uploadDir, name), (error) => {
    if (error && !res.headersSent)
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
