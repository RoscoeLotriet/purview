import { createServer } from 'node:http';

/**
 * Bind :0, read the assigned port, close. Racy by construction: the port is
 * free when returned, not when used. Only for the child process, which cannot
 * report a port it was not given.
 */
export function probeFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'string' || address === null) {
        server.close();
        reject(new Error('probeFreePort: listener reported no port'));
        return;
      }
      const { port } = address;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}
