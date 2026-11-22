import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, toCompose } from '../src/tools/compose/logic.ts';

test('tokenize splits on spaces, honours quotes and joins line continuations', () => {
  assert.deepEqual(tokenize(`docker run -e "A=b c" -e 'D=e f' \\\n  nginx`), ['docker', 'run', '-e', 'A=b c', '-e', 'D=e f', 'nginx']);
  assert.deepEqual(tokenize('docker run `\n -p 80:80 nginx'), ['docker', 'run', '-p', '80:80', 'nginx']);
  assert.deepEqual(tokenize('a\\ b c'), ['a b', 'c']);
});

test('a typical Open WebUI command becomes a compose service with a named volume and a GPU reservation', () => {
  const { yaml, warnings } = toCompose('docker run -d -p 3000:8080 --gpus all -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main');
  assert.equal(yaml, `services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: always
    ports:
      - "3000:8080"
    volumes:
      - open-webui:/app/backend/data
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
volumes:
  open-webui:
`);
  assert.deepEqual(warnings, []);
});

test('bind mounts stay as they are and are not declared as volumes', () => {
  const { yaml } = toCompose('docker run -v ./data:/data -v /srv/x:/x:ro nginx');
  assert.ok(yaml.includes('- ./data:/data') && yaml.includes('- /srv/x:/x:ro'));
  assert.ok(!yaml.includes('\nvolumes:'));
});

test('environment, env file, network, user and command are carried over; --flag=value works', () => {
  const { yaml } = toCompose('docker run --env=A=1 -e B -e "C=two words" --env-file .env --network=host -u 1000:1000 -w /app alpine sh -c "echo hi"');
  for (const line of ['    environment:', '      - A=1', '      - B', '      - "C=two words"', '    env_file:', '      - .env', '    network_mode: host', '    user: "1000:1000"', '    working_dir: /app', '    command: ["sh", "-c", "echo hi"]'])
    assert.ok(yaml.includes(line + '\n'), line);
});

test('the service is named after the image when there is no --name', () => {
  assert.ok(toCompose('docker run -d redis:7').yaml.startsWith('services:\n  redis:\n    image: redis:7\n'));
  assert.ok(toCompose('docker run ghcr.io/a/b-c:latest').yaml.startsWith('services:\n  b-c:\n'));
});

test('flags with no compose equivalent produce a warning instead of being dropped silently', () => {
  const { warnings } = toCompose('docker run --rm -d --weird-flag x nginx');
  assert.ok(warnings.some((w) => w.includes('--rm')));
  assert.ok(warnings.some((w) => w.includes('--weird-flag')));
});

test('combined short flags are read as booleans (-dit) and a missing image is reported', () => {
  assert.equal(toCompose('docker run -dit nginx').warnings.length, 0);
  assert.equal(toCompose('docker run -d').yaml, '');
  assert.ok(toCompose('docker run -d').warnings.length > 0);
});
