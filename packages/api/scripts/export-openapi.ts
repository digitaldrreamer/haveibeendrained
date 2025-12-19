#!/usr/bin/env bun

/**
 * Export OpenAPI specification as JSON file
 * Used for validation in CI/CD pipelines
 */
import { openApiSpec } from '../src/lib/openapi-spec';
import { writeFileSync } from 'fs';
import { join } from 'path';

const outputPath = join(process.cwd(), 'openapi.json');
writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf-8');
console.log(`OpenAPI spec exported to ${outputPath}`);

