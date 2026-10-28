import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { documentedOperations } from '../src/openapi.js';
import { app, ORIGIN } from './helpers.js';

describe('OpenAPI document', () => {
  it('is served as OpenAPI 3.1 and lists the documented operations', async () => {
    const res = await request(app).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(30);
    // Every request body points at a schema that exists.
    for (const operation of documentedOperations.filter((op) => op.body)) {
      expect(res.body.components.schemas[operation.body!], operation.body).toBeDefined();
    }
  });

  it('only documents endpoints that are routed (no documented path answers the catch-all 404)', async () => {
    for (const operation of documentedOperations) {
      const path = operation.path.replace(/\{\w+\}/g, 'x');
      const res = await request(app)[operation.method](`/api/v1${path}`).set('Origin', ORIGIN).send({});
      const unrouted = res.status === 404 && res.body?.error?.message === 'Endpoint not found';
      expect(unrouted, `${operation.method.toUpperCase()} ${operation.path}`).toBe(false);
    }
  });
});
