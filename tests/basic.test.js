const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

describe('Basic API Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Create a minimal express app for testing
    app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  it('GET /health should return 200', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});