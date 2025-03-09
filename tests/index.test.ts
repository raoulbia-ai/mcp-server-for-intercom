import { expect } from 'chai';
import sinon from 'sinon';
import { SecureStdioTransport } from '../src/services/transportService.js';
import { MAX_MESSAGE_SIZE, MAX_REQUESTS_PER_MINUTE } from '../src/config/constants.js';

describe('SecureStdioTransport Security Tests', () => {
    let transport: SecureStdioTransport;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        // Create a new sandbox for each test
        sandbox = sinon.createSandbox();
        // Use the sandbox to create fake timers
        sandbox.useFakeTimers(new Date());
        transport = new SecureStdioTransport();
    });

    afterEach(() => {
        // Restore all faked functions and timers
        sandbox.restore();
    });

    describe('Message Size Limits', () => {
        it('should reject messages larger than MAX_MESSAGE_SIZE', async () => {
            const largeMessage = Buffer.from('x'.repeat(MAX_MESSAGE_SIZE + 1));

            try {
                await transport.handleIncomingMessage(largeMessage);
                expect.fail('Should have thrown size limit error');
            } catch (error: any) {
                expect(error.message).to.include('Message size exceeds limit');
            }
        });

        it('should accept messages within size limit', async () => {
            const validMessage = Buffer.from(JSON.stringify({
                jsonrpc: '2.0',
                method: 'test'
            }));

            try {
                await transport.handleIncomingMessage(validMessage);
            } catch (error) {
                expect.fail('Should not have thrown error');
            }
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits', async () => {
            const message = Buffer.from(JSON.stringify({
                jsonrpc: '2.0',
                method: 'test'
            }));

            // Send MAX_REQUESTS_PER_MINUTE messages
            for (let i = 0; i < MAX_REQUESTS_PER_MINUTE; i++) {
                await transport.handleIncomingMessage(message);
            }

            try {
                // Try one more message
                await transport.handleIncomingMessage(message);
                expect.fail('Should have thrown rate limit error');
            } catch (error: any) {
                expect(error.message).to.include('Rate limit exceeded');
            }
        });

        it('should reset rate limit after interval', async () => {
            const message = Buffer.from(JSON.stringify({
                jsonrpc: '2.0',
                method: 'test'
            }));

            await transport.start();

            // Use all rate limit tokens
            for (let i = 0; i < MAX_REQUESTS_PER_MINUTE; i++) {
                await transport.handleIncomingMessage(message);
            }

            // Advance time by slightly more than 1 minute
            sandbox.clock.tick(61000);

            // Should be able to send message again
            try {
                await transport.handleIncomingMessage(message);
            } catch (error: any) {
                expect.fail(`Should not have thrown error: ${error.message}`);
            }
        });
    });

    describe('Connection Management', () => {
        it('should handle connection lifecycle', async () => {
            await transport.start();
            expect(transport['connectionActive']).to.be.true;

            await transport.close();
            expect(transport['connectionActive']).to.be.false;
        });

        it('should reject messages when disconnected', async () => {
            await transport.close();

            try {
                await transport.send({ jsonrpc: '2.0', method: 'test' });
                expect.fail('Should have thrown connection error');
            } catch (error: any) {
                expect(error.message).to.include('Transport is not connected');
            }
        });
    });
});

// Add force exit after all tests complete
after(() => {
  process.exit(0);
});