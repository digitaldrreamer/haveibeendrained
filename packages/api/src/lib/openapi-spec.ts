/**
 * OpenAPI 3.0 specification for Have I Been Drained Public API
 * This is manually typed and maintained
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Have I Been Drained API',
    version: '1.0.0',
    description: 'Public API for checking Solana wallet security and drainer addresses',
    contact: {
      name: 'API Support',
      email: 'support@haveibeendrained.org',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'https://api.haveibeendrained.org',
      description: 'Production',
    },
    {
      url: 'http://localhost:3001',
      description: 'Development',
    },
  ],
  tags: [
    {
      name: 'Check',
      description: 'Unified endpoint for checking drainer addresses and wallet security',
    },
    {
      name: 'Drainer',
      description: 'Check if an address is a known drainer',
    },
    {
      name: 'Analyze',
      description: 'Perform full wallet security analysis',
    },
    {
      name: 'API Keys',
      description: 'API key management endpoints',
    },
  ],
  paths: {
    '/api/v1/check': {
      get: {
        tags: ['Check'],
        summary: 'Check wallet address (unified endpoint)',
        description: 'Unified endpoint that first checks if the address is a known drainer, then performs full wallet analysis if not.',
        operationId: 'checkWallet',
        parameters: [
          {
            name: 'address',
            in: 'query',
            required: true,
            description: 'Solana wallet address to check',
            schema: {
              type: 'string',
              minLength: 32,
              maxLength: 44,
              example: 'ABC123...',
            },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Transaction limit for analysis (default: 50, max: 200)',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 50,
            },
          },
          {
            name: 'experimental',
            in: 'query',
            required: false,
            description: 'Include experimental detections',
            schema: {
              type: 'boolean',
              default: false,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CheckResponse',
                },
                examples: {
                  drainer: {
                    value: {
                      success: true,
                      type: 'drainer',
                      data: {
                        drainerAddress: 'ABC123...',
                        reportCount: 42,
                        firstSeen: '2024-01-15T10:30:00Z',
                        lastSeen: '2024-12-10T14:20:00Z',
                        totalSolReported: 150.5,
                        recentReporters: ['DEF456...', 'GHI789...'],
                      },
                      timestamp: 1702224000000,
                    },
                  },
                  walletAnalysis: {
                    value: {
                      success: true,
                      type: 'wallet_analysis',
                      data: {
                        walletAddress: 'ABC123...',
                        overallRisk: 'AT_RISK',
                        riskScore: 65,
                        factors: [
                          {
                            type: 'unlimited_approval',
                            severity: 'HIGH',
                            description: 'Unlimited token approval detected',
                          },
                        ],
                        recommendations: ['Revoke unlimited approvals'],
                        checkedAt: '2024-12-10T14:20:00Z',
                      },
                      timestamp: 1702224000000,
                    },
                  },
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/BadRequest',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
          '500': {
            $ref: '#/components/responses/InternalServerError',
          },
        },
      },
    },
    '/api/v1/drainer/{address}': {
      get: {
        tags: ['Drainer'],
        summary: 'Check if address is a known drainer',
        description: 'Quick check to see if an address is a known drainer (faster than full analysis)',
        operationId: 'checkDrainer',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            description: 'Solana wallet address to check',
            schema: {
              type: 'string',
              minLength: 32,
              maxLength: 44,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DrainerResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/BadRequest',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/api/v1/analyze/{address}': {
      get: {
        tags: ['Analyze'],
        summary: 'Perform full wallet analysis',
        description: 'Perform comprehensive wallet security analysis (skips drainer check)',
        operationId: 'analyzeWallet',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            description: 'Solana wallet address to analyze',
            schema: {
              type: 'string',
              minLength: 32,
              maxLength: 44,
            },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 200,
              default: 50,
            },
          },
          {
            name: 'experimental',
            in: 'query',
            required: false,
            schema: {
              type: 'boolean',
              default: false,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/WalletAnalysisResponse',
                },
              },
            },
          },
          '400': {
            $ref: '#/components/responses/BadRequest',
          },
          '429': {
            $ref: '#/components/responses/RateLimitExceeded',
          },
        },
      },
    },
    '/api/v1/keys/invalidate': {
      post: {
        tags: ['API Keys'],
        summary: 'Invalidate and regenerate API key',
        description: 'Invalidates the API key provided in the request (via X-API-Key header or User-Agent) and generates a new one. The new key is sent to the registered email address.',
        operationId: 'invalidateApiKey',
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Reason for invalidation',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Key invalidated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    keyId: { type: 'string' },
                    newKeyId: { type: 'string' },
                    emailSent: { type: 'boolean' },
                    timestamp: { type: 'number' },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
        },
      },
    },
    '/api/v1/keys/me': {
      get: {
        tags: ['API Keys'],
        summary: 'Get current API key information',
        description: 'Retrieve metadata for the API key provided in the request (via X-API-Key header or User-Agent). Returns information without sensitive data.',
        operationId: 'getMyApiKey',
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'API key information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        appName: { type: 'string' },
                        contactEmail: { type: 'string' },
                        rateLimitPerHour: { type: 'integer' },
                        createdAt: { type: 'string' },
                        lastUsedAt: { type: 'string', nullable: true },
                        isActive: { type: 'boolean' },
                      },
                    },
                    timestamp: { type: 'number' },
                  },
                },
              },
            },
          },
          '401': {
            $ref: '#/components/responses/Unauthorized',
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for enterprise tier rate limits. Include in User-Agent or X-API-Key header.',
      },
    },
    schemas: {
      CheckResponse: {
        oneOf: [
          { $ref: '#/components/schemas/DrainerResponse' },
          { $ref: '#/components/schemas/WalletAnalysisResponse' },
        ],
      },
      DrainerResponse: {
        type: 'object',
        required: ['success', 'type', 'data', 'timestamp'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          type: {
            type: 'string',
            enum: ['drainer'],
            example: 'drainer',
          },
          data: {
            nullable: true,
            type: 'object',
            properties: {
              drainerAddress: { type: 'string' },
              reportCount: { type: 'integer' },
              firstSeen: { type: 'string', format: 'date-time' },
              lastSeen: { type: 'string', format: 'date-time' },
              totalSolReported: { type: 'number' },
              recentReporters: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          message: {
            type: 'string',
            description: 'Present when no drainer reports found',
          },
          timestamp: {
            type: 'integer',
            format: 'int64',
          },
        },
      },
      WalletAnalysisResponse: {
        type: 'object',
        required: ['success', 'type', 'data', 'timestamp'],
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          type: {
            type: 'string',
            enum: ['wallet_analysis'],
            example: 'wallet_analysis',
          },
          data: {
            type: 'object',
            properties: {
              walletAddress: { type: 'string' },
              overallRisk: {
                type: 'string',
                enum: ['SAFE', 'AT_RISK', 'DRAINED'],
              },
              riskScore: { type: 'integer', minimum: 0, maximum: 100 },
              factors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    severity: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
              },
              checkedAt: { type: 'string', format: 'date-time' },
            },
          },
          timestamp: {
            type: 'integer',
            format: 'int64',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error', 'timestamp'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'string' },
          retryAfter: { type: 'integer', description: 'Seconds until rate limit resets' },
          timestamp: { type: 'integer', format: 'int64' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request - invalid parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: 'Invalid Solana address',
              timestamp: 1702224000000,
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - API key required or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        headers: {
          'Retry-After': {
            description: 'Seconds until rate limit resets',
            schema: { type: 'integer' },
          },
          'RateLimit-Limit': {
            description: 'Rate limit per window',
            schema: { type: 'integer' },
          },
          'RateLimit-Remaining': {
            description: 'Requests remaining in current window',
            schema: { type: 'integer' },
          },
          'RateLimit-Reset': {
            description: 'Unix timestamp when rate limit resets',
            schema: { type: 'integer' },
          },
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: 'Rate limit exceeded',
              message: 'You have exceeded the rate limit for this endpoint. Please try again later.',
              retryAfter: 3600,
              timestamp: 1702224000000,
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
          },
        },
      },
    },
  },
} as const;

